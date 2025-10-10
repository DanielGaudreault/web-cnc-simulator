class CAMEngine {
    constructor() {
        this.operations = [];
        this.toolLibrary = new ToolLibrary();
        this.machine = new Machine();
        this.material = new Material();
        this.workpiece = new Workpiece();
        
        this.init();
    }

    init() {
        this.setupDefaultTools();
        this.setupDefaultOperations();
    }

    setupDefaultTools() {
        // End Mills
        this.toolLibrary.addTool({
            id: 'em-3mm',
            type: 'endmill',
            diameter: 3,
            flutes: 2,
            material: 'carbide',
            description: '3mm 2-Flute End Mill'
        });

        this.toolLibrary.addTool({
            id: 'em-6mm',
            type: 'endmill',
            diameter: 6,
            flutes: 3,
            material: 'carbide',
            description: '6mm 3-Flute End Mill'
        });

        this.toolLibrary.addTool({
            id: 'em-10mm',
            type: 'endmill',
            diameter: 10,
            flutes: 4,
            material: 'carbide',
            description: '10mm 4-Flute End Mill'
        });

        // Drills
        this.toolLibrary.addTool({
            id: 'drill-3mm',
            type: 'drill',
            diameter: 3,
            pointAngle: 118,
            material: 'HSS',
            description: '3mm Drill Bit'
        });

        this.toolLibrary.addTool({
            id: 'drill-6mm',
            type: 'drill',
            diameter: 6,
            pointAngle: 118,
            material: 'HSS',
            description: '6mm Drill Bit'
        });

        // Ball Nose
        this.toolLibrary.addTool({
            id: 'bn-6mm',
            type: 'ballnose',
            diameter: 6,
            flutes: 2,
            material: 'carbide',
            description: '6mm Ball Nose'
        });
    }

    createContourOperation(geometry, parameters = {}) {
        const op = new ContourOperation({
            geometry: geometry,
            tool: parameters.tool || this.toolLibrary.getTool('em-6mm'),
            depth: parameters.depth || -10,
            stepDown: parameters.stepDown || 2,
            feedRate: parameters.feedRate || 1000,
            spindleSpeed: parameters.spindleSpeed || 8000,
            stockToLeave: parameters.stockToLeave || 0,
            leadIn: parameters.leadIn || 'tangent',
            leadOut: parameters.leadOut || 'tangent',
            climb: parameters.climb !== undefined ? parameters.climb : true,
            compensation: parameters.compensation || 'wear'
        });

        this.operations.push(op);
        return op;
    }

    createPocketOperation(geometry, parameters = {}) {
        const op = new PocketOperation({
            geometry: geometry,
            tool: parameters.tool || this.toolLibrary.getTool('em-6mm'),
            depth: parameters.depth || -10,
            stepDown: parameters.stepDown || 2,
            stepOver: parameters.stepOver || 0.5,
            feedRate: parameters.feedRate || 1000,
            spindleSpeed: parameters.spindleSpeed || 8000,
            stockToLeave: parameters.stockToLeave || 0,
            pattern: parameters.pattern || 'zigzag',
            finishPass: parameters.finishPass || true,
            ramp: parameters.ramp || 'helical'
        });

        this.operations.push(op);
        return op;
    }

    createDrillOperation(points, parameters = {}) {
        const op = new DrillOperation({
            points: points,
            tool: parameters.tool || this.toolLibrary.getTool('drill-3mm'),
            depth: parameters.depth || -15,
            peckDepth: parameters.peckDepth || 3,
            feedRate: parameters.feedRate || 300,
            spindleSpeed: parameters.spindleSpeed || 5000,
            dwell: parameters.dwell || 0,
            clearance: parameters.clearance || 5,
            retract: parameters.retract || 2
        });

        this.operations.push(op);
        return op;
    }

    generateToolpath(operation) {
        if (!operation) {
            // Generate all operations
            return this.operations.map(op => this.generateOperationToolpath(op));
        }
        
        return this.generateOperationToolpath(operation);
    }

    generateOperationToolpath(operation) {
        const toolpath = new Toolpath();
        
        switch(operation.type) {
            case 'contour':
                return this.generateContourToolpath(operation);
            case 'pocket':
                return this.generatePocketToolpath(operation);
            case 'drill':
                return this.generateDrillToolpath(operation);
            case 'face':
                return this.generateFaceToolpath(operation);
            case 'engrave':
                return this.generateEngraveToolpath(operation);
        }
        
        return toolpath;
    }

    generateContourToolpath(operation) {
        const toolpath = new Toolpath();
        const geometry = operation.geometry;
        const tool = operation.tool;
        const depth = operation.depth;
        const stepDown = operation.stepDown;
        
        let currentDepth = 0;
        
        // Rapid to safe height
        toolpath.addPoint({ x: 0, y: 0, z: 50, type: 'rapid' });
        
        while (currentDepth > depth) {
            currentDepth = Math.max(currentDepth - stepDown, depth);
            
            // Lead-in move
            const startPoint = this.calculateLeadIn(geometry, tool, operation.leadIn);
            toolpath.addPoint({ ...startPoint, z: 5, type: 'rapid' });
            toolpath.addPoint({ ...startPoint, z: currentDepth, type: 'linear', feed: operation.feedRate });
            
            // Main contour
            const contourPoints = this.generateContourPoints(geometry, tool, operation);
            contourPoints.forEach(point => {
                toolpath.addPoint({ ...point, z: currentDepth, type: 'linear', feed: operation.feedRate });
            });
            
            // Lead-out move
            const endPoint = this.calculateLeadOut(geometry, tool, operation.leadOut);
            toolpath.addPoint({ ...endPoint, z: currentDepth, type: 'linear', feed: operation.feedRate });
            toolpath.addPoint({ ...endPoint, z: 5, type: 'rapid' });
        }
        
        return toolpath;
    }

    generatePocketToolpath(operation) {
        const toolpath = new Toolpath();
        const geometry = operation.geometry;
        const tool = operation.tool;
        const depth = operation.depth;
        const stepDown = operation.stepDown;
        const stepOver = tool.diameter * operation.stepOver;
        
        let currentDepth = 0;
        
        toolpath.addPoint({ x: 0, y: 0, z: 50, type: 'rapid' });
        
        while (currentDepth > depth) {
            currentDepth = Math.max(currentDepth - stepDown, depth);
            
            // Helical ramp entry
            if (operation.ramp === 'helical') {
                this.generateHelicalRamp(toolpath, geometry, currentDepth, operation);
            } else {
                // Plunge entry
                const startPoint = this.findPocketStartPoint(geometry);
                toolpath.addPoint({ ...startPoint, z: 5, type: 'rapid' });
                toolpath.addPoint({ ...startPoint, z: currentDepth, type: 'linear', feed: operation.feedRate / 2 });
            }
            
            // Pocket clearing pattern
            const pocketPoints = this.generatePocketPoints(geometry, tool, stepOver, operation.pattern);
            pocketPoints.forEach(point => {
                toolpath.addPoint({ ...point, z: currentDepth, type: 'linear', feed: operation.feedRate });
            });
            
            // Lift to safe height
            toolpath.addPoint({ x: pocketPoints[pocketPoints.length-1].x, y: pocketPoints[pocketPoints.length-1].y, z: 5, type: 'rapid' });
        }
        
        return toolpath;
    }

    generateDrillToolpath(operation) {
        const toolpath = new Toolpath();
        const points = operation.points;
        const tool = operation.tool;
        
        toolpath.addPoint({ x: 0, y: 0, z: 50, type: 'rapid' });
        
        points.forEach(point => {
            // Rapid to point
            toolpath.addPoint({ x: point.x, y: point.y, z: operation.clearance, type: 'rapid' });
            
            if (operation.peckDepth) {
                // Peck drilling cycle
                let currentDepth = 0;
                while (currentDepth > operation.depth) {
                    currentDepth = Math.max(currentDepth - operation.peckDepth, operation.depth);
                    toolpath.addPoint({ x: point.x, y: point.y, z: currentDepth, type: 'linear', feed: operation.feedRate });
                    toolpath.addPoint({ x: point.x, y: point.y, z: operation.retract, type: 'rapid' });
                }
            } else {
                // Standard drilling
                toolpath.addPoint({ x: point.x, y: point.y, z: operation.depth, type: 'linear', feed: operation.feedRate });
                toolpath.addPoint({ x: point.x, y: point.y, z: operation.clearance, type: 'rapid' });
            }
            
            // Dwell at bottom
            if (operation.dwell > 0) {
                toolpath.addPoint({ x: point.x, y: point.y, z: operation.depth, type: 'dwell', time: operation.dwell });
            }
        });
        
        return toolpath;
    }

    calculateLeadIn(geometry, tool, leadInType) {
        // Calculate lead-in moves based on geometry and tool
        switch(leadInType) {
            case 'tangent':
                return this.calculateTangentLeadIn(geometry, tool);
            case 'perpendicular':
                return this.calculatePerpendicularLeadIn(geometry, tool);
            case 'radial':
                return this.calculateRadialLeadIn(geometry, tool);
            default:
                return this.calculateTangentLeadIn(geometry, tool);
        }
    }

    calculateLeadOut(geometry, tool, leadOutType) {
        // Calculate lead-out moves
        switch(leadOutType) {
            case 'tangent':
                return this.calculateTangentLeadOut(geometry, tool);
            case 'perpendicular':
                return this.calculatePerpendicularLeadOut(geometry, tool);
            case 'radial':
                return this.calculateRadialLeadOut(geometry, tool);
            default:
                return this.calculateTangentLeadOut(geometry, tool);
        }
    }

    generateContourPoints(geometry, tool, operation) {
        // Generate contour points with tool compensation
        const points = [];
        const offset = operation.climb ? tool.diameter / 2 : -tool.diameter / 2;
        
        // Apply tool compensation to geometry
        const compensatedGeometry = this.offsetGeometry(geometry, offset);
        
        // Convert geometry to points
        if (compensatedGeometry.isClosed) {
            points.push(...compensatedGeometry.points);
            points.push(compensatedGeometry.points[0]); // Close the contour
        } else {
            points.push(...compensatedGeometry.points);
        }
        
        return points;
    }

    generatePocketPoints(geometry, tool, stepOver, pattern) {
        const points = [];
        const bounds = geometry.getBoundingBox();
        
        switch(pattern) {
            case 'zigzag':
                return this.generateZigZagPocket(bounds, tool, stepOver);
            case 'offset':
                return this.generateOffsetPocket(geometry, tool, stepOver);
            case 'morph':
                return this.generateMorphPocket(geometry, tool, stepOver);
            default:
                return this.generateZigZagPocket(bounds, tool, stepOver);
        }
    }

    generateZigZagPocket(bounds, tool, stepOver) {
        const points = [];
        const toolRadius = tool.diameter / 2;
        const startX = bounds.minX + toolRadius;
        const endX = bounds.maxX - toolRadius;
        const startY = bounds.minY + toolRadius;
        const endY = bounds.maxY - toolRadius;
        
        let y = startY;
        let direction = 1;
        
        while (y <= endY) {
            if (direction > 0) {
                points.push({ x: startX, y: y });
                points.push({ x: endX, y: y });
            } else {
                points.push({ x: endX, y: y });
                points.push({ x: startX, y: y });
            }
            y += stepOver;
            direction *= -1;
        }
        
        return points;
    }

    generateHelicalRamp(toolpath, geometry, targetDepth, operation) {
        const center = geometry.getCenter();
        const rampRadius = operation.tool.diameter * 0.8;
        const rampSteps = Math.ceil(Math.abs(targetDepth) / 0.5); // 0.5mm per revolution
        
        for (let i = 0; i < rampSteps; i++) {
            const angle = (i / rampSteps) * Math.PI * 2;
            const z = (i / rampSteps) * targetDepth;
            const x = center.x + Math.cos(angle) * rampRadius;
            const y = center.y + Math.sin(angle) * rampRadius;
            
            toolpath.addPoint({ x, y, z, type: 'linear', feed: operation.feedRate });
        }
    }

    optimizeToolpath(toolpath) {
        // Implement toolpath optimization:
        // 1. Shortest path optimization
        // 2. Reduce air moves
        // 3. Optimize feed rates
        // 4. Remove unnecessary moves
        
        return this.applyShortestPath(toolpath);
    }

    applyShortestPath(toolpath) {
        // Traveling salesman problem for toolpath optimization
        const points = toolpath.points.slice();
        const optimized = [points[0]]; // Start with first point
        
        points.splice(0, 1);
        
        while (points.length > 0) {
            let nearestIndex = 0;
            let nearestDistance = this.distance(optimized[optimized.length-1], points[0]);
            
            for (let i = 1; i < points.length; i++) {
                const dist = this.distance(optimized[optimized.length-1], points[i]);
                if (dist < nearestDistance) {
                    nearestDistance = dist;
                    nearestIndex = i;
                }
            }
            
            optimized.push(points[nearestIndex]);
            points.splice(nearestIndex, 1);
        }
        
        return new Toolpath(optimized);
    }

    distance(p1, p2) {
        return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    }

    calculateCycleTime(toolpath) {
        let time = 0;
        let currentPos = { x: 0, y: 0, z: 0 };
        
        for (const point of toolpath.points) {
            const distance = this.distance(currentPos, point);
            const feed = point.feed || 1000; // mm/min
            const feedMps = feed / 60; // mm/sec
            
            if (point.type === 'rapid') {
                time += distance / (feedMps * 3); // Rapid is 3x faster
            } else {
                time += distance / feedMps;
            }
            
            if (point.type === 'dwell') {
                time += point.time || 0;
            }
            
            currentPos = point;
        }
        
        return time;
    }

    verifyToolpath(toolpath) {
        const warnings = [];
        const errors = [];
        
        // Check for rapid moves into material
        for (let i = 1; i < toolpath.points.length; i++) {
            const prev = toolpath.points[i-1];
            const curr = toolpath.points[i];
            
            if (prev.type === 'rapid' && curr.z < 0 && prev.z > 0) {
                warnings.push(`Rapid move into material at point ${i}`);
            }
            
            // Check for excessive stepover
            if (curr.type === 'linear' && prev.type === 'linear') {
                const moveDistance = this.distance(prev, curr);
                if (moveDistance < toolpath.tool.diameter * 0.1) {
                    warnings.push(`Very short move at point ${i}, consider optimizing`);
                }
            }
        }
        
        // Check machine limits
        for (const point of toolpath.points) {
            if (Math.abs(point.x) > this.machine.xTravel) {
                errors.push(`X axis out of bounds: ${point.x}`);
            }
            if (Math.abs(point.y) > this.machine.yTravel) {
                errors.push(`Y axis out of bounds: ${point.y}`);
            }
            if (Math.abs(point.z) > this.machine.zTravel) {
                errors.push(`Z axis out of bounds: ${point.z}`);
            }
        }
        
        return { warnings, errors, isValid: errors.length === 0 };
    }
}

// Supporting Classes
class Toolpath {
    constructor(points = []) {
        this.points = points;
        this.tool = null;
        this.operation = null;
    }

    addPoint(point) {
        this.points.push(point);
    }

    getBounds() {
        if (this.points.length === 0) return null;
        
        const bounds = {
            minX: Infinity, maxX: -Infinity,
            minY: Infinity, maxY: -Infinity,
            minZ: Infinity, maxZ: -Infinity
        };
        
        for (const point of this.points) {
            bounds.minX = Math.min(bounds.minX, point.x);
            bounds.maxX = Math.max(bounds.maxX, point.x);
            bounds.minY = Math.min(bounds.minY, point.y);
            bounds.maxY = Math.max(bounds.maxY, point.y);
            bounds.minZ = Math.min(bounds.minZ, point.z);
            bounds.maxZ = Math.max(bounds.maxZ, point.z);
        }
        
        return bounds;
    }

    getLength() {
        let length = 0;
        for (let i = 1; i < this.points.length; i++) {
            length += this.distance(this.points[i-1], this.points[i]);
        }
        return length;
    }

    distance(p1, p2) {
        return Math.sqrt(
            Math.pow(p2.x - p1.x, 2) +
            Math.pow(p2.y - p1.y, 2) +
            Math.pow(p2.z - p1.z, 2)
        );
    }
}

class ContourOperation {
    constructor(parameters) {
        this.type = 'contour';
        this.geometry = parameters.geometry;
        this.tool = parameters.tool;
        this.depth = parameters.depth;
        this.stepDown = parameters.stepDown;
        this.feedRate = parameters.feedRate;
        this.spindleSpeed = parameters.spindleSpeed;
        this.stockToLeave = parameters.stockToLeave;
        this.leadIn = parameters.leadIn;
        this.leadOut = parameters.leadOut;
        this.climb = parameters.climb;
        this.compensation = parameters.compensation;
        this.id = this.generateId();
    }

    generateId() {
        return `contour_${Date.now()}`;
    }
}

class PocketOperation {
    constructor(parameters) {
        this.type = 'pocket';
        this.geometry = parameters.geometry;
        this.tool = parameters.tool;
        this.depth = parameters.depth;
        this.stepDown = parameters.stepDown;
        this.stepOver = parameters.stepOver;
        this.feedRate = parameters.feedRate;
        this.spindleSpeed = parameters.spindleSpeed;
        this.stockToLeave = parameters.stockToLeave;
        this.pattern = parameters.pattern;
        this.finishPass = parameters.finishPass;
        this.ramp = parameters.ramp;
        this.id = this.generateId();
    }

    generateId() {
        return `pocket_${Date.now()}`;
    }
}

class DrillOperation {
    constructor(parameters) {
        this.type = 'drill';
        this.points = parameters.points;
        this.tool = parameters.tool;
        this.depth = parameters.depth;
        this.peckDepth = parameters.peckDepth;
        this.feedRate = parameters.feedRate;
        this.spindleSpeed = parameters.spindleSpeed;
        this.dwell = parameters.dwell;
        this.clearance = parameters.clearance;
        this.retract = parameters.retract;
        this.id = this.generateId();
    }

    generateId() {
        return `drill_${Date.now()}`;
    }
}

class ToolLibrary {
    constructor() {
        this.tools = new Map();
    }

    addTool(toolData) {
        const tool = new Tool(toolData);
        this.tools.set(tool.id, tool);
        return tool;
    }

    getTool(id) {
        return this.tools.get(id);
    }

    getAllTools() {
        return Array.from(this.tools.values());
    }

    getToolsByType(type) {
        return this.getAllTools().filter(tool => tool.type === type);
    }
}

class Tool {
    constructor(data) {
        this.id = data.id;
        this.type = data.type;
        this.diameter = data.diameter;
        this.flutes = data.flutes || 1;
        this.material = data.material;
        this.description = data.description;
        this.length = data.length || 50;
        this.shankDiameter = data.shankDiameter || data.diameter;
        this.cornerRadius = data.cornerRadius || 0;
        this.pointAngle = data.pointAngle || 0;
        
        // Cutting parameters
        this.surfaceSpeed = data.surfaceSpeed || 100; // m/min
        this.feedPerTooth = data.feedPerTooth || 0.1; // mm
    }

    calculateSpindleSpeed(material) {
        // RPM = (Surface Speed * 1000) / (π * Diameter)
        return Math.round((this.surfaceSpeed * 1000) / (Math.PI * this.diameter));
    }

    calculateFeedRate(material) {
        // Feed Rate = RPM * Flutes * Feed per Tooth
        const rpm = this.calculateSpindleSpeed(material);
        return Math.round(rpm * this.flutes * this.feedPerTooth);
    }
}

class Machine {
    constructor() {
        this.type = '3axis';
        this.xTravel = 500;
        this.yTravel = 400;
        this.zTravel = 300;
        this.maxRPM = 10000;
        this.maxFeedRate = 10000;
        this.accuracy = 0.001;
    }
}

class Material {
    constructor() {
        this.name = 'Aluminum 6061';
        this.type = 'aluminum';
        this.hardness = 'HB95';
        this.surfaceSpeed = 100; // m/min
        this.feedPerTooth = 0.1; // mm
    }
}

class Workpiece {
    constructor() {
        this.width = 100;
        this.height = 100;
        this.depth = 25;
        this.material = new Material();
        this.stockToLeaveXY = 0;
        this.stockToLeaveZ = 0;
    }
}
