class PostProcessor {
    constructor() {
        this.machineConfigs = new Map();
        this.postProcessors = new Map();
        this.currentPost = null;
        
        this.loadDefaultPosts();
    }

    loadDefaultPosts() {
        // Generic 3-axis mill
        this.addPostProcessor('generic_3axis', {
            name: 'Generic 3-Axis Mill',
            description: 'Standard 3-axis milling machine',
            extension: 'nc',
            setup: `
G17 G20 G40 G49 G54 G80 G90 G94
`,
            footer: `
G0 Z10
G0 X0 Y0
M30
`,
            formatNumber: (num, decimals = 3) => num.toFixed(decimals),
            formatCoordinate: (axis, value) => `${axis}${this.formatNumber(value)}`
        });

        // Fanuc compatible
        this.addPostProcessor('fanuc', {
            name: 'Fanuc Compatible',
            description: 'Fanuc 0i/16i/18i/21i compatible',
            extension: 'nc',
            setup: `
%
O1000
G17 G20 G40 G49 G54 G80 G90 G94
`,
            footer: `
G0 Z10.
G0 X0. Y0.
M30
%
`,
            formatNumber: (num, decimals = 3) => num.toFixed(decimals).replace('.', '.'),
            formatCoordinate: (axis, value) => `${axis}${this.formatNumber(value)}`
        });

        // Haas compatible
        this.addPostProcessor('haas', {
            name: 'Haas Compatible',
            description: 'Haas CNC mill compatible',
            extension: 'nc',
            setup: `
%
O1000 (PROGRAM NAME)
G17 G20 G40 G49 G54 G80 G90 G94
`,
            footer: `
G0 Z10.
G0 X0. Y0.
M30
%
`,
            formatNumber: (num, decimals = 3) => num.toFixed(decimals).replace('.', '.'),
            formatCoordinate: (axis, value) => `${axis}${this.formatNumber(value)}`
        });

        // Mach3 compatible
        this.addPostProcessor('mach3', {
            name: 'Mach3 Compatible',
            description: 'Mach3 CNC controller compatible',
            extension: 'tap',
            setup: `
(File created: ${new Date().toLocaleDateString()})
G17 G21 G40 G49 G54 G80 G90 G94
`,
            footer: `
G0 Z10
G0 X0 Y0
M30
`,
            formatNumber: (num, decimals = 3) => num.toFixed(decimals),
            formatCoordinate: (axis, value) => `${axis}${this.formatNumber(value)}`
        });

        // LinuxCNC compatible
        this.addPostProcessor('linuxcnc', {
            name: 'LinuxCNC Compatible',
            description: 'LinuxCNC/EMC2 compatible',
            extension: 'ngc',
            setup: `
(File created: ${new Date().toLocaleDateString()})
G17 G21 G40 G49 G54 G80 G90 G94
`,
            footer: `
G0 Z10
G0 X0 Y0
M30
`,
            formatNumber: (num, decimals = 3) => num.toFixed(decimals),
            formatCoordinate: (axis, value) => `${axis}${this.formatNumber(value)}`
        });

        this.setCurrentPost('generic_3axis');
    }

    addPostProcessor(id, config) {
        this.postProcessors.set(id, {
            id: id,
            name: config.name,
            description: config.description,
            extension: config.extension,
            setup: config.setup,
            footer: config.footer,
            formatNumber: config.formatNumber,
            formatCoordinate: config.formatCoordinate,
            customizations: config.customizations || {}
        });
    }

    setCurrentPost(postId) {
        this.currentPost = this.postProcessors.get(postId) || this.postProcessors.get('generic_3axis');
    }

    getCurrentPost() {
        return this.currentPost;
    }

    getAllPosts() {
        return Array.from(this.postProcessors.values());
    }

    generateGCode(toolpath, operations, config = {}) {
        if (!this.currentPost) {
            throw new Error('No post processor selected');
        }

        const post = this.currentPost;
        let gcode = '';

        // Add setup code
        gcode += post.setup.trim() + '\n\n';

        // Add tool information
        gcode += this.generateToolInfo(operations) + '\n';

        // Add safety moves
        gcode += 'G0 Z10\n';
        gcode += 'G0 X0 Y0\n\n';

        // Process toolpath points
        let currentTool = null;
        let currentFeedRate = null;
        let currentSpindleSpeed = null;

        for (const point of toolpath.points) {
            let line = '';

            // Handle tool changes
            if (point.tool && point.tool !== currentTool) {
                line += this.generateToolChange(point.tool);
                currentTool = point.tool;
            }

            // Handle spindle commands
            if (point.spindleSpeed && point.spindleSpeed !== currentSpindleSpeed) {
                line += `S${post.formatNumber(point.spindleSpeed)} `;
                if (!currentSpindleSpeed) {
                    line += 'M3 '; // Start spindle clockwise
                }
                currentSpindleSpeed = point.spindleSpeed;
            }

            // Handle feed rate changes
            if (point.feedRate && point.feedRate !== currentFeedRate) {
                line += `F${post.formatNumber(point.feedRate)} `;
                currentFeedRate = point.feedRate;
            }

            // Handle motion commands
            switch (point.type) {
                case 'rapid':
                    line += 'G0 ';
                    break;
                case 'linear':
                    line += 'G1 ';
                    break;
                case 'arc':
                    line += point.direction === 'cw' ? 'G2 ' : 'G3 ';
                    break;
                case 'drill':
                    line += 'G81 ';
                    break;
                case 'dwell':
                    line += `G4 P${post.formatNumber(point.dwellTime, 1)}`;
                    break;
            }

            // Add coordinates
            if (point.type !== 'dwell') {
                const coordinates = [];
                
                if (point.x !== undefined) coordinates.push(post.formatCoordinate('X', point.x));
                if (point.y !== undefined) coordinates.push(post.formatCoordinate('Y', point.y));
                if (point.z !== undefined) coordinates.push(post.formatCoordinate('Z', point.z));
                
                // Arc parameters
                if (point.type === 'arc') {
                    if (point.i !== undefined) coordinates.push(post.formatCoordinate('I', point.i));
                    if (point.j !== undefined) coordinates.push(post.formatCoordinate('J', point.j));
                    if (point.k !== undefined) coordinates.push(post.formatCoordinate('K', point.k));
                    if (point.r !== undefined) coordinates.push(post.formatCoordinate('R', point.r));
                }

                line += coordinates.join(' ');
            }

            // Add comment if present
            if (point.comment) {
                line += ` ; ${point.comment}`;
            }

            gcode += line.trim() + '\n';
        }

        // Add footer
        gcode += '\n' + post.footer.trim();

        return this.optimizeGCode(gcode);
    }

    generateToolInfo(operations) {
        let toolInfo = '';
        const tools = new Map();

        // Collect unique tools from operations
        for (const op of operations) {
            if (op.tool && !tools.has(op.tool.id)) {
                tools.set(op.tool.id, op.tool);
            }
        }

        // Generate tool table comments
        if (tools.size > 0) {
            toolInfo += '; Tool Table\n';
            for (const [id, tool] of tools) {
                toolInfo += `; T${id} - ${tool.description} - D${tool.diameter}mm\n`;
            }
            toolInfo += '\n';
        }

        return toolInfo;
    }

    generateToolChange(tool) {
        return `T${tool.id} M6\n`;
    }

    optimizeGCode(gcode) {
        const lines = gcode.split('\n');
        const optimized = [];
        let lastCommand = '';
        let lastFeedRate = '';
        let lastSpindleSpeed = '';

        for (const line of lines) {
            let optimizedLine = line;

            // Remove duplicate G-codes
            if (this.isMotionCommand(line)) {
                const command = this.getMotionCommand(line);
                if (command === lastCommand) {
                    optimizedLine = optimizedLine.replace(command, '');
                } else {
                    lastCommand = command;
                }
            }

            // Remove duplicate feed rates
            if (line.includes('F')) {
                const feedRate = this.extractFeedRate(line);
                if (feedRate === lastFeedRate) {
                    optimizedLine = optimizedLine.replace(/F[\d.]+/, '');
                } else {
                    lastFeedRate = feedRate;
                }
            }

            // Remove duplicate spindle speeds
            if (line.includes('S')) {
                const spindleSpeed = this.extractSpindleSpeed(line);
                if (spindleSpeed === lastSpindleSpeed) {
                    optimizedLine = optimizedLine.replace(/S[\d.]+/, '');
                } else {
                    lastSpindleSpeed = spindleSpeed;
                }
            }

            // Clean up extra spaces
            optimizedLine = optimizedLine.replace(/\s+/g, ' ').trim();

            if (optimizedLine) {
                optimized.push(optimizedLine);
            }
        }

        return optimized.join('\n');
    }

    isMotionCommand(line) {
        return /G[0-3]/.test(line);
    }

    getMotionCommand(line) {
        const match = line.match(/G[0-3]/);
        return match ? match[0] : '';
    }

    extractFeedRate(line) {
        const match = line.match(/F([\d.]+)/);
        return match ? match[1] : '';
    }

    extractSpindleSpeed(line) {
        const match = line.match(/S([\d.]+)/);
        return match ? match[1] : '';
    }

    validateGCode(gcode, machineConfig) {
        const errors = [];
        const warnings = [];
        const lines = gcode.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line || line.startsWith(';') || line.startsWith('(')) continue;

            // Check for unsupported commands
            const unsupportedCommands = ['G5', 'G5.1', 'G5.2', 'G6.2', 'G7', 'G8', 'G9', 'G10', 'G11', 'G12', 'G13'];
            for (const cmd of unsupportedCommands) {
                if (line.includes(cmd)) {
                    warnings.push(`Line ${i + 1}: Command ${cmd} may not be supported`);
                }
            }

            // Check for modal command violations
            if (line.includes('G0') && line.includes('G1')) {
                errors.push(`Line ${i + 1}: Multiple motion commands (G0 and G1)`);
            }

            // Check coordinate limits
            const coords = this.extractCoordinates(line);
            for (const [axis, value] of Object.entries(coords)) {
                const limit = machineConfig[`${axis.toLowerCase()}Travel`];
                if (limit && Math.abs(value) > limit / 2) {
                    errors.push(`Line ${i + 1}: ${axis} axis out of bounds (${value} > ${limit / 2})`);
                }
            }

            // Check feed rate limits
            const feedRate = this.extractFeedRate(line);
            if (feedRate && parseFloat(feedRate) > machineConfig.maxFeedRate) {
                warnings.push(`Line ${i + 1}: Feed rate exceeds maximum (${feedRate} > ${machineConfig.maxFeedRate})`);
            }
        }

        return {
            isValid: errors.length === 0,
            errors: errors,
            warnings: warnings
        };
    }

    extractCoordinates(line) {
        const coords = {};
        const regex = /([XYZIJKR])([-]?[\d.]+)/g;
        let match;

        while ((match = regex.exec(line)) !== null) {
            coords[match[1]] = parseFloat(match[2]);
        }

        return coords;
    }

    generateSetupSheet(gcode, operations, workpiece, tools) {
        const setupSheet = {
            programInfo: {
                fileName: `program_${Date.now()}.${this.currentPost.extension}`,
                created: new Date().toISOString(),
                postProcessor: this.currentPost.name,
                totalLines: gcode.split('\n').length
            },
            workpiece: {
                material: workpiece.material,
                dimensions: {
                    width: workpiece.width,
                    height: workpiece.height,
                    depth: workpiece.depth
                },
                stockToLeave: {
                    xy: workpiece.stockToLeaveXY,
                    z: workpiece.stockToLeaveZ
                }
            },
            tools: Array.from(tools.values()).map(tool => ({
                id: tool.id,
                description: tool.description,
                diameter: tool.diameter,
                type: tool.type,
                feedRate: tool.feedRate,
                spindleSpeed: tool.spindleSpeed
            })),
            operations: operations.map(op => ({
                type: op.type,
                tool: op.tool.id,
                depth: op.depth,
                stepDown: op.stepDown,
                feedRate: op.feedRate,
                spindleSpeed: op.spindleSpeed
            })),
            estimatedTime: this.estimateCycleTime(gcode),
            safetyNotes: this.generateSafetyNotes(operations)
        };

        return setupSheet;
    }

    estimateCycleTime(gcode) {
        const lines
