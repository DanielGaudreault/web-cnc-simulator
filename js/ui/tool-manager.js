class ToolManager {
    constructor() {
        this.toolLibrary = new Map();
        this.currentTool = null;
        this.defaultTools = new Map();
        
        this.init();
    }

    init() {
        this.createDefaultTools();
        this.loadFromLocalStorage();
    }

    createDefaultTools() {
        // End Mills
        this.addTool({
            id: 1,
            type: 'endmill',
            diameter: 3.175,
            shankDiameter: 6,
            length: 38,
            flutes: 2,
            material: 'carbide',
            description: '1/8" 2-Flute End Mill',
            surfaceSpeed: 150,
            feedPerTooth: 0.05
        });

        this.addTool({
            id: 2,
            type: 'endmill',
            diameter: 6,
            shankDiameter: 6,
            length: 50,
            flutes: 3,
            material: 'carbide',
            description: '6mm 3-Flute End Mill',
            surfaceSpeed: 120,
            feedPerTooth: 0.08
        });

        this.addTool({
            id: 3,
            type: 'endmill',
            diameter: 10,
            shankDiameter: 10,
            length: 60,
            flutes: 4,
            material: 'carbide',
            description: '10mm 4-Flute End Mill',
            surfaceSpeed: 100,
            feedPerTooth: 0.1
        });

        // Ball Nose
        this.addTool({
            id: 4,
            type: 'ballnose',
            diameter: 6,
            shankDiameter: 6,
            length: 50,
            flutes: 2,
            material: 'carbide',
            description: '6mm Ball Nose',
            surfaceSpeed: 120,
            feedPerTooth: 0.06
        });

        // Drills
        this.addTool({
            id: 5,
            type: 'drill',
            diameter: 3,
            shankDiameter: 6,
            length: 60,
            pointAngle: 118,
            material: 'HSS',
            description: '3mm Drill Bit',
            surfaceSpeed: 30,
            feedPerTooth: 0.1
        });

        this.addTool({
            id: 6,
            type: 'drill',
            diameter: 6,
            shankDiameter: 6,
            length: 80,
            pointAngle: 118,
            material: 'HSS',
            description: '6mm Drill Bit',
            surfaceSpeed: 25,
            feedPerTooth: 0.15
        });

        // Face Mill
        this.addTool({
            id: 7,
            type: 'facemill',
            diameter: 25,
            shankDiameter: 16,
            length: 60,
            inserts: 3,
            material: 'carbide',
            description: '25mm Face Mill',
            surfaceSpeed: 200,
            feedPerTooth: 0.1
        });

        // V-Bit
        this.addTool({
            id: 8,
            type: 'vbit',
            diameter: 6,
            shankDiameter: 6,
            length: 50,
            angle: 90,
            material: 'carbide',
            description: '90° V-Bit',
            surfaceSpeed: 100,
            feedPerTooth: 0.05
        });
    }

    addTool(toolData) {
        const tool = new Tool(toolData);
        this.toolLibrary.set(tool.id, tool);
        this.saveToLocalStorage();
        return tool;
    }

    getTool(id) {
        return this.toolLibrary.get(id);
    }

    getAllTools() {
        return Array.from(this.toolLibrary.values());
    }

    getToolsByType(type) {
        return this.getAllTools().filter(tool => tool.type === type);
    }

    updateTool(id, updates) {
        const tool = this.toolLibrary.get(id);
        if (tool) {
            Object.assign(tool, updates);
            this.saveToLocalStorage();
            return true;
        }
        return false;
    }

    deleteTool(id) {
        const deleted = this.toolLibrary.delete(id);
        if (deleted) {
            this.saveToLocalStorage();
        }
        return deleted;
    }

    calculateCuttingParameters(tool, material) {
        const rpm = tool.calculateSpindleSpeed(material);
        const feedRate = tool.calculateFeedRate(material);
        const chipLoad = tool.feedPerTooth;
        const surfaceSpeed = tool.surfaceSpeed;

        return {
            spindleSpeed: rpm,
            feedRate: feedRate,
            plungeRate: feedRate * 0.5, // Typically 50% of feed rate
            chipLoad: chipLoad,
            surfaceSpeed: surfaceSpeed,
            stepDown: tool.diameter * 0.5, // 50% of tool diameter
            stepOver: tool.diameter * 0.4  // 40% of tool diameter
        };
    }

    suggestTool(operationType, material, constraints = {}) {
        const suitableTools = this.getAllTools().filter(tool => {
            // Filter by operation type
            if (!this.isToolSuitableForOperation(tool, operationType)) {
                return false;
            }

            // Filter by material compatibility
            if (!this.isToolMaterialCompatible(tool, material)) {
                return false;
            }

            // Apply constraints
            if (constraints.maxDiameter && tool.diameter > constraints.maxDiameter) {
                return false;
            }

            if (constraints.minDiameter && tool.diameter < constraints.minDiameter) {
                return false;
            }

            if (constraints.requiredType && tool.type !== constraints.requiredType) {
                return false;
            }

            return true;
        });

        // Sort by suitability (you can implement more sophisticated ranking)
        suitableTools.sort((a, b) => {
            // Prefer tools closer to desired diameter
            if (constraints.optimalDiameter) {
                const aDiff = Math.abs(a.diameter - constraints.optimalDiameter);
                const bDiff = Math.abs(b.diameter - constraints.optimalDiameter);
                return aDiff - bDiff;
            }

            // Default: prefer smaller tools for finer work
            return a.diameter - b.diameter;
        });

        return suitableTools.length > 0 ? suitableTools[0] : null;
    }

    isToolSuitableForOperation(tool, operationType) {
        const suitability = {
            endmill: ['contour', 'pocket', 'face', 'slot'],
            ballnose: ['3d', 'contour', 'pocket'],
            drill: ['drill', 'bore'],
            facemill: ['face'],
            vbit: ['engrave', 'chamfer']
        };

        return suitability[tool.type] && suitability[tool.type].includes(operationType);
    }

    isToolMaterialCompatible(tool, material) {
        const compatibility = {
            carbide: ['aluminum', 'steel', 'stainless', 'titanium', 'plastics', 'wood'],
            HSS: ['aluminum', 'plastics', 'wood'],
            cobalt: ['steel', 'stainless', 'titanium']
        };

        return compatibility[tool.material] && compatibility[tool.material].includes(material);
    }

    generateToolTable() {
        const tools = this.getAllTools();
        let table = '; Tool Table\n';
        table += '; T# - Description - Diameter - Type\n';

        tools.forEach(tool => {
            table += `; T${tool.id} - ${tool.description} - D${tool.diameter}mm - ${tool.type}\n`;
        });

        return table;
    }

    exportToolLibrary(format = 'json') {
        const tools = this.getAllTools().map(tool => ({
            id: tool.id,
            type: tool.type,
            diameter: tool.diameter,
            shankDiameter: tool.shankDiameter,
            length: tool.length,
            flutes: tool.flutes,
            material: tool.material,
            description: tool.description,
            surfaceSpeed: tool.surfaceSpeed,
            feedPerTooth: tool.feedPerTooth
        }));

        switch (format) {
            case 'json':
                return JSON.stringify(tools, null, 2);
            case 'csv':
                return this.convertToCSV(tools);
            case 'xml':
                return this.convertToXML(tools);
            default:
                return tools;
        }
    }

    importToolLibrary(data, format = 'json') {
        try {
            let tools;
            
            switch (format) {
                case 'json':
                    tools = typeof data === 'string' ? JSON.parse(data) : data;
                    break;
                case 'csv':
                    tools = this.parseCSV(data);
                    break;
                case 'xml':
                    tools = this.parseXML(data);
                    break;
                default:
                    throw new Error(`Unsupported format: ${format}`);
            }

            if (Array.isArray(tools)) {
                tools.forEach(toolData => {
                    this.addTool(toolData);
                });
                return true;
            }

            return false;
        } catch (error) {
            console.error('Tool library import error:', error);
            return false;
        }
    }

    convertToCSV(tools) {
        if (tools.length === 0) return '';
        
        const headers = Object.keys(tools[0]);
        const csv = [
            headers.join(','),
            ...tools.map(tool => headers.map(header => tool[header]).join(','))
        ].join('\n');
        
        return csv;
    }

    parseCSV(csv) {
        const lines = csv.split('\n');
        const headers = lines[0].split(',');
        
        return lines.slice(1).map(line => {
            const values = line.split(',');
            const tool = {};
            
            headers.forEach((header, index) => {
                tool[header] = values[index];
            });
            
            return tool;
        });
    }

    saveToLocalStorage() {
        const tools = this.getAllTools().map(tool => ({
            id: tool.id,
            type: tool.type,
            diameter: tool.diameter,
            shankDiameter: tool.shankDiameter,
            length: tool.length,
            flutes: tool.flutes,
            material: tool.material,
            description: tool.description,
            surfaceSpeed: tool.surfaceSpeed,
            feedPerTooth: tool.feedPerTooth
        }));

        localStorage.setItem('webcnc_tool_library', JSON.stringify(tools));
    }

    loadFromLocalStorage() {
        const stored = localStorage.getItem('webcnc_tool_library');
        if (stored) {
            try {
                const tools = JSON.parse(stored);
                tools.forEach(toolData => {
                    this.addTool(toolData);
                });
            } catch (error) {
                console.error('Error loading tool library from localStorage:', error);
            }
        }
    }

    createToolFromTemplate(templateType, diameter) {
        const templates = {
            endmill: {
                type: 'endmill',
                flutes: diameter <= 3 ? 2 : diameter <= 6 ? 3 : 4,
                material: 'carbide',
                surfaceSpeed: 120,
                feedPerTooth: diameter <= 3 ? 0.05 : diameter <= 6 ? 0.08 : 0.1
            },
            drill: {
                type: 'drill',
                pointAngle: 118,
                material: 'HSS',
                surfaceSpeed: 25,
                feedPerTooth: 0.1
            },
            ballnose: {
                type: 'ballnose',
                flutes: 2,
                material: 'carbide',
                surfaceSpeed: 100,
                feedPerTooth: 0.06
            }
        };

        const template = templates[templateType];
        if (!template) return null;

        return {
            ...template,
            diameter: diameter,
            shankDiameter: Math.min(diameter * 2, 10),
            length: diameter * 8,
            description: `${diameter}mm ${templateType}`
        };
    }

    validateTool(tool) {
        const errors = [];
        const warnings = [];

        // Required fields
        if (!tool.id) errors.push('Tool ID is required');
        if (!tool.type) errors.push('Tool type is required');
        if (!tool.diameter || tool.diameter <= 0) errors.push('Valid diameter is required');
        if (!tool.description) warnings.push('Tool description is recommended');

        // Logical constraints
        if (tool.shankDiameter < tool.diameter) {
            warnings.push('Shank diameter should be greater than or equal to cutting diameter');
        }

        if (tool.length < tool.diameter * 2) {
            warnings.push('Tool length seems short for the diameter');
        }

        if (tool.surfaceSpeed <= 0) {
            errors.push('Surface speed must be positive');
        }

        if (tool.feedPerTooth <= 0) {
            errors.push('Feed per tooth must be positive');
        }

        return {
            isValid: errors.length === 0,
            errors: errors,
            warnings: warnings
        };
    }

    getToolStatistics() {
        const tools = this.getAllTools();
        
        return {
            totalTools: tools.length,
            byType: this.groupBy(tools, 'type'),
            byMaterial: this.groupBy(tools, 'material'),
            diameterRange: {
                min: Math.min(...tools.map(t => t.diameter)),
                max: Math.max(...tools.map(t => t.diameter)),
                average: tools.reduce((sum, t) => sum + t.diameter, 0) / tools.length
            }
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
}

class Tool {
    constructor(data) {
        this.id = data.id;
        this.type = data.type;
        this.diameter = data.diameter;
        this.shankDiameter = data.shankDiameter || data.diameter;
        this.length = data.length || 50;
        this.flutes = data.flutes || 1;
        this.material = data.material || 'carbide';
        this.description = data.description || '';
        this.surfaceSpeed = data.surfaceSpeed || 100;
        this.feedPerTooth = data.feedPerTooth || 0.1;
        
        // Additional properties based on tool type
        this.pointAngle = data.pointAngle; // For drills
        this.cornerRadius = data.cornerRadius || 0; // For corner radius end mills
        this.angle = data.angle; // For V-bits
        this.inserts = data.inserts; // For face mills
    }

    calculateSpindleSpeed(material) {
        // RPM = (Surface Speed * 1000) / (π * Diameter)
        const materialFactor = this.getMaterialFactor(material);
        const adjustedSurfaceSpeed = this.surfaceSpeed * materialFactor;
        return Math.round((adjustedSurfaceSpeed * 1000) / (Math.PI * this.diameter));
    }

    calculateFeedRate(material) {
        // Feed Rate (mm/min) = RPM * Flutes * Feed per Tooth
        const rpm = this.calculateSpindleSpeed(material);
        return Math.round(rpm * this.flutes * this.feedPerTooth);
    }

    getMaterialFactor(material) {
        const factors = {
            'aluminum': 1.2,
            'brass': 1.1,
            'plastic': 1.3,
            'wood': 1.5,
            'steel': 0.8,
            'stainless': 0.7,
            'titanium': 0.6
        };
        
        return factors[material] || 1.0;
    }

    getStepDownRecommendation() {
        const recommendations = {
            'endmill': this.diameter * 0.5,
            'ballnose': this.diameter * 0.3,
            'drill': this.diameter * 2,
            'facemill': this.diameter * 0.1,
            'vbit': this.diameter * 0.2
        };
        
        return recommendations[this.type] || this.diameter * 0.5;
    }

    getStepOverRecommendation() {
        const recommendations = {
            'endmill': this.diameter * 0.4,
            'ballnose': this.diameter * 0.2,
            'facemill': this.diameter * 0.6,
            'vbit': this.diameter * 0.1
        };
        
        return recommendations[this.type] || this.diameter * 0.4;
    }

    getDisplayName() {
        return `T${this.id} - ${this.description}`;
    }

    clone() {
        return new Tool({...this});
    }
}
