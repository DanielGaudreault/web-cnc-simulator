class OperationManager {
    constructor() {
        this.operations = new Map();
        this.currentOperation = null;
        this.operationTemplates = new Map();
        
        this.init();
    }

    init() {
        this.createOperationTemplates();
        this.setupEventListeners();
    }

    createOperationTemplates() {
        // Contour Operation Template
        this.operationTemplates.set('contour', {
            name: 'Contour',
            type: 'contour',
            icon: '📐',
            description: 'Profile machining along geometry',
            parameters: {
                geometry: null,
                tool: null,
                depth: -10,
                stepDown: 2,
                feedRate: 1000,
                spindleSpeed: 8000,
                stockToLeave: 0,
                leadIn: 'tangent',
                leadOut: 'tangent',
                climb: true,
                compensation: 'wear'
            }
        });

        // Pocket Operation Template
        this.operationTemplates.set('pocket', {
            name: 'Pocket',
            type: 'pocket',
            icon: '🕳️',
            description: 'Clear material from enclosed areas',
            parameters: {
                geometry: null,
                tool: null,
                depth: -10,
                stepDown: 2,
                stepOver: 0.5,
                feedRate: 1000,
                spindleSpeed: 8000,
                stockToLeave: 0,
                pattern: 'zigzag',
                finishPass: true,
                ramp: 'helical'
            }
        });

        // Drill Operation Template
        this.operationTemplates.set('drill', {
            name: 'Drill',
            type: 'drill',
            icon: '🔩',
            description: 'Drilling operations at points',
            parameters: {
                points: [],
                tool: null,
                depth: -15,
                peckDepth: 3,
                feedRate: 300,
                spindleSpeed: 5000,
                dwell: 0,
                clearance: 5,
                retract: 2,
                cycle: 'g81'
            }
        });

        // Face Operation Template
        this.operationTemplates.set('face', {
            name: 'Face',
            type: 'face',
            icon: '⬜',
            description: 'Face milling for surface finishing',
            parameters: {
                geometry: null,
                tool: null,
                depth: -1,
                stepOver: 0.6,
                feedRate: 1200,
                spindleSpeed: 6000,
                stockToLeave: 0,
                pattern: 'zigzag'
            }
        });

        // Engrave Operation Template
        this.operationTemplates.set('engrave', {
            name: 'Engrave',
            type: 'engrave',
            icon: '✏️',
            description: 'Text and line engraving',
            parameters: {
                geometry: null,
                tool: null,
                depth: -0.5,
                feedRate: 600,
                spindleSpeed: 12000,
                stockToLeave: 0
            }
        });
    }

    createOperation(type, parameters = {}) {
        const template = this.operationTemplates.get(type);
        if (!template) {
            throw new Error(`Unknown operation type: ${type}`);
        }

        const operation = {
            id: this.generateOperationId(),
            name: `${template.name} ${this.operations.size + 1}`,
            type: type,
            icon: template.icon,
            description: template.description,
            parameters: { ...template.parameters, ...parameters },
            enabled: true,
            toolpath: null,
            simulationData: null,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        this.operations.set(operation.id, operation);
        this.currentOperation = operation.id;
        
        this.onOperationCreated(operation);
        return operation;
    }

    generateOperationId() {
        return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    getOperation(id) {
        return this.operations.get(id);
    }

    getAllOperations() {
        return Array.from(this.operations.values());
    }

    getEnabledOperations() {
        return this.getAllOperations().filter(op => op.enabled);
    }

    updateOperation(id, updates) {
        const operation = this.operations.get(id);
        if (operation) {
            Object.assign(operation, updates);
            operation.updatedAt = new Date();
            this.onOperationUpdated(operation);
            return true;
        }
        return false;
    }

    deleteOperation(id) {
        const operation = this.operations.get(id);
        if (operation) {
            this.operations.delete(id);
            
            if (this.currentOperation === id) {
                this.currentOperation = this.operations.size > 0 ? 
                    Array.from(this.operations.keys())[0] : null;
            }
            
            this.onOperationDeleted(operation);
            return true;
        }
        return false;
    }

    reorderOperations(operationIds) {
        const newOperations = new Map();
        const existingOperations = new Map(this.operations);

        operationIds.forEach(id => {
            const operation = existingOperations.get(id);
            if (operation) {
                newOperations.set(id, operation);
            }
        });

        // Add any remaining operations
        existingOperations.forEach((operation, id) => {
            if (!newOperations.has(id)) {
                newOperations.set(id, operation);
            }
        });

        this.operations = newOperations;
        this.onOperationsReordered();
    }

    generateToolpath(operationId) {
        const operation = this.operations.get(operationId);
        if (!operation) return null;

        try {
            const toolpath = this.calculateToolpath(operation);
            operation.toolpath = toolpath;
            operation.updatedAt = new Date();
            
            this.onToolpathGenerated(operation, toolpath);
            return toolpath;
        } catch (error) {
            this.onToolpathError(operation, error);
            return null;
        }
    }

    generateAllToolpaths() {
        const results = [];
        
        this.getEnabledOperations().forEach(operation => {
            const toolpath = this.generateToolpath(operation.id);
            results.push({
                operation: operation,
                toolpath: toolpath,
                success: !!toolpath
            });
        });

        return results;
    }

    calculateToolpath(operation) {
        const toolpath = new Toolpath();
        
        switch (operation.type) {
            case 'contour':
                return this.calculateContourToolpath(operation);
            case 'pocket':
                return this.calculatePocketToolpath(operation);
            case 'drill':
                return this.calculateDrillToolpath(operation);
            case 'face':
                return this.calculateFaceToolpath(operation);
            case 'engrave':
                return this.calculateEngraveToolpath(operation);
            default:
                throw new Error(`Unsupported operation type: ${operation.type}`);
        }
    }

    calculateContourToolpath(operation) {
        const { geometry, tool, depth, stepDown, feedRate, spindleSpeed, climb, leadIn, leadOut } = operation.parameters;
        const toolpath = new Toolpath();
        
        // Implementation for contour toolpath calculation
        // This would include:
        // - Geometry offset for tool compensation
        // - Step-down handling
        // - Lead-in/lead-out moves
        // - Climb vs conventional milling
        
        return toolpath;
    }

    calculatePocketToolpath(operation) {
        const { geometry, tool, depth, stepDown, stepOver, feedRate, pattern, ramp } = operation.parameters;
        const toolpath = new Toolpath();
        
        // Implementation for pocket toolpath calculation
        // This would include:
        // - Pocket clearing patterns (zigzag, offset, spiral)
        // - Step-down handling
        // - Ramp entry moves
        // - Finish passes
        
        return toolpath;
    }

    calculateDrillToolpath(operation) {
        const { points, tool, depth, peckDepth, feedRate, clearance, retract, cycle } = operation.parameters;
        const toolpath = new Toolpath();
        
        // Implementation for drill toolpath calculation
        // This would include:
        // - Peck drilling cycles
        // - Clearance plane management
        // - Different drill cycles (G81, G83, etc.)
        
        return toolpath;
    }

    calculateFaceToolpath(operation) {
        const { geometry, tool, depth, stepOver, feedRate, pattern } = operation.parameters;
        const toolpath = new Toolpath();
        
        // Implementation for face milling toolpath
        // This would include:
        // - Face milling patterns
        // - Step-over calculation
        // - Overlap management
        
        return toolpath;
    }

    calculateEngraveToolpath(operation) {
        const { geometry, tool, depth, feedRate } = operation.parameters;
        const toolpath = new Toolpath();
        
        // Implementation for engraving toolpath
        // This would include:
        // - Text and geometry following
        // - Depth control for V-bits
        // - Optimal path planning
        
        return toolpath;
    }

    validateOperation(operation) {
        const errors = [];
        const warnings = [];

        // Check required parameters
        if (!operation.parameters.tool) {
            errors.push('Tool is required');
        }

        if (!operation.parameters.geometry && operation.type !== 'drill') {
            errors.push('Geometry is required');
        }

        if (operation.type === 'drill' && (!operation.parameters.points || operation.parameters.points.length === 0)) {
            errors.push('Drill points are required');
        }

        // Check parameter validity
        if (operation.parameters.depth > 0) {
            errors.push('Depth must be negative');
        }

        if (operation.parameters.stepDown <= 0) {
            errors.push('Step down must be positive');
        }

        if (operation.parameters.feedRate <= 0) {
            errors.push('Feed rate must be positive');
        }

        if (operation.parameters.spindleSpeed <= 0) {
            errors.push('Spindle speed must be positive');
        }

        // Warnings for potentially problematic settings
        if (operation.parameters.stepDown > operation.parameters.tool?.diameter) {
            warnings.push('Step down is larger than tool diameter');
        }

        if (operation.parameters.feedRate > 5000) {
            warnings.push('High feed rate detected');
        }

        return {
            isValid: errors.length === 0,
            errors: errors,
            warnings: warnings
        };
    }

    estimateMachiningTime(operation) {
        if (!operation.toolpath) return 0;

        let totalTime = 0;
        let currentPos = { x: 0, y: 0, z: 0 };

        for (const point of operation.toolpath.points) {
            const distance = this.calculateDistance(currentPos, point);
            const feedRate = point.feedRate || operation.parameters.feedRate;
            const feedMmPerSec = feedRate / 60;

            if (point.type === 'rapid') {
                totalTime += distance / (feedMmPerSec * 3); // Rapid moves are faster
            } else {
                totalTime += distance / feedMmPerSec;
            }

            if (point.type === 'dwell') {
                totalTime += point.dwellTime || 0;
            }

            currentPos = point;
        }

        return totalTime;
    }

    calculateDistance(pos1, pos2) {
        const dx = (pos2.x || 0) - (pos1.x || 0);
        const dy = (pos2.y || 0) - (pos1.y || 0);
        const dz = (pos2.z || 0) - (pos1.z || 0);
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    getOperationStatistics() {
        const operations = this.getAllOperations();
        
        return {
            totalOperations: operations.length,
            enabledOperations: operations.filter(op => op.enabled).length,
            byType: this.groupBy(operations, 'type'),
            totalMachiningTime: operations.reduce((sum, op) => sum + this.estimateMachiningTime(op), 0),
            toolUsage: this.calculateToolUsage(operations)
        };
    }

    groupBy(array, key) {
        return array.reduce((groups, item) => {
            const group = item[key];
            groups[group] = groups[group] || [];
            groups[group].push(item);
            return groups;
        }, {});
    }

    calculateToolUsage(operations) {
        const toolUsage = new Map();
        
        operations.forEach(operation => {
            const tool = operation.parameters.tool;
            if (tool) {
                const usage = toolUsage.get(tool.id) || { tool: tool, count: 0, totalTime: 0 };
                usage.count++;
                usage.totalTime += this.estimateMachiningTime(operation);
                toolUsage.set(tool.id, usage);
            }
        });

        return Array.from(toolUsage.values());
    }

    exportOperations(format = 'json') {
        const operations = this.getAllOperations().map(op => ({
            id: op.id,
            name: op.name,
            type: op.type,
            parameters: op.parameters,
            enabled: op.enabled,
            createdAt: op.createdAt,
            updatedAt: op.updatedAt
        }));

        switch (format) {
            case 'json':
                return JSON.stringify(operations, null, 2);
            case 'xml':
                return this.convertToXML(operations);
            default:
                return operations;
        }
    }

    importOperations(data, format = 'json') {
        try {
            let operations;
            
            switch (format) {
                case 'json':
                    operations = typeof data === 'string' ? JSON.parse(data) : data;
                    break;
                case 'xml':
                    operations = this.parseXML(data);
                    break;
                default:
                    throw new Error(`Unsupported format: ${format}`);
            }

            if (Array.isArray(operations)) {
                operations.forEach(opData => {
                    this.createOperation(opData.type, opData.parameters);
                });
                return true;
            }

            return false;
        } catch (error) {
            console.error('Operations import error:', error);
            return false;
        }
    }

    setupEventListeners() {
        // Operation-related event listeners
        window.addEventListener('operationSelected', (event) => {
            this.currentOperation = event.detail.operationId;
        });

        window.addEventListener('generateAllToolpaths', () => {
            this.generateAllToolpaths();
        });

        window.addEventListener('validateAllOperations', () => {
            this.validateAllOperations();
        });
    }

    onOperationCreated(operation) {
        const event = new CustomEvent('operationCreated', { detail: { operation } });
        window.dispatchEvent(event);
    }

    onOperationUpdated(operation) {
        const event = new CustomEvent('operationUpdated', { detail: { operation } });
        window.dispatchEvent(event);
    }

    onOperationDeleted(operation) {
        const event = new CustomEvent('operationDeleted', { detail: { operation } });
        window.dispatchEvent(event);
    }

    onOperationsReordered() {
        const event = new CustomEvent('operationsReordered');
        window.dispatchEvent(event);
    }

    onToolpathGenerated(operation, toolpath) {
        const event = new CustomEvent('toolpathGenerated', {
            detail: { operation, toolpath }
        });
        window.dispatchEvent(event);
    }

    onToolpathError(operation, error) {
        const event = new CustomEvent('toolpathError', {
            detail: { operation, error }
        });
        window.dispatchEvent(event);
    }

    validateAllOperations() {
        const results = [];
        
        this.getAllOperations().forEach(operation => {
            const validation = this.validateOperation(operation);
            results.push({
                operation: operation,
                validation: validation
            });
        });

        const event = new CustomEvent('allOperationsValidated', {
            detail: { results }
        });
        window.dispatchEvent(event);

        return results;
    }

    optimizeOperationOrder() {
        const operations = this.getEnabledOperations();
        
        // Simple optimization: group by tool to minimize tool changes
        operations.sort((a, b) => {
            const toolA = a.parameters.tool?.id || '';
            const toolB = b.parameters.tool?.id || '';
            return toolA.localeCompare(toolB);
        });

        this.reorderOperations(operations.map(op => op.id));
        return operations;
    }

    generateOperationReport() {
        const operations = this.getEnabledOperations();
        const report = {
            summary: {
                totalOperations: operations.length,
                totalTime: operations.reduce((sum, op) => sum + this.estimateMachiningTime(op), 0),
                toolsUsed: [...new Set(operations.map(op => op.parameters.tool?.id).filter(Boolean))]
            },
            operations: operations.map(op => ({
                name: op.name,
                type: op.type,
                tool: op.parameters.tool?.description,
                depth: op.parameters.depth,
                estimatedTime: this.estimateMachiningTime(op),
                status: op.toolpath ? 'Toolpath Generated' : 'No Toolpath'
            })),
            recommendations: this.generateRecommendations(operations)
        };

        return report;
    }

    generateRecommendations(operations) {
        const recommendations = [];

        // Check for potential optimizations
        operations.forEach(op => {
            if (op.parameters.stepDown > op.parameters.tool?.diameter * 0.8) {
                recommendations.push(`Consider reducing step down for ${op.name} (currently ${op.parameters.stepDown}mm)`);
            }

            if (op.parameters.feedRate < 100) {
                recommendations.push(`Low feed rate detected in ${op.name} - consider increasing for better efficiency`);
            }
        });

        // Check for tool changes
        const tools = operations.map(op => op.parameters.tool?.id).filter(Boolean);
        const uniqueTools = [...new Set(tools)];
        if (uniqueTools.length > 3) {
            recommendations.push('Multiple tool changes detected - consider consolidating operations by tool');
        }

        return recommendations;
    }
}

class Toolpath {
    constructor(points = []) {
        this.points = points;
        this.bounds = this.calculateBounds();
        this.totalLength = this.calculateTotalLength();
    }

    addPoint(point) {
        this.points.push(point);
        this.bounds = this.calculateBounds();
        this.totalLength = this.calculateTotalLength();
    }

    calculateBounds() {
        if (this.points.length === 0) {
            return { minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0 };
        }

        const bounds = {
            minX: Infinity, maxX: -Infinity,
            minY: Infinity, maxY: -Infinity,
            minZ: Infinity, maxZ: -Infinity
        };

        this.points.forEach(point => {
            bounds.minX = Math.min(bounds.minX, point.x || 0);
            bounds.maxX = Math.max(bounds.maxX, point.x || 0);
            bounds.minY = Math.min(bounds.minY, point.y || 0);
            bounds.maxY = Math.max(bounds.maxY, point.y || 0);
            bounds.minZ = Math.min(bounds.minZ, point.z || 0);
            bounds.maxZ = Math.max(bounds.maxZ, point.z || 0);
        });

        return bounds;
    }

    calculateTotalLength() {
        let length = 0;
        
        for (let i = 1; i < this.points.length; i++) {
            const prev = this.points[i - 1];
            const curr = this.points[i];
            length += this.calculateDistance(prev, curr);
        }

        return length;
    }

    calculateDistance(p1, p2) {
        const dx = (p2.x || 0) - (p1.x || 0);
        const dy = (p2.y || 0) - (p1.y || 0);
        const dz = (p2.z || 0) - (p1.z || 0);
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    getRapidMoveCount() {
        return this.points.filter(p => p.type === 'rapid').length;
    }

    getCuttingMoveCount() {
        return this.points.filter(p => p.type === 'linear' || p.type === 'arc').length;
    }

    getBoundsSize() {
        return {
            width: this.bounds.maxX - this.bounds.minX,
            height: this.bounds.maxY - this.bounds.minY,
            depth: this.bounds.maxZ - this.bounds.minZ
        };
    }
}
