class GCodeParser {
    constructor() {
        this.commands = [];
        this.currentLine = 0;
        this.modalGroups = new Map();
        this.variables = new Map();
        this.setupModalGroups();
    }

    setupModalGroups() {
        // Modal groups definition
        this.modalGroups.set('motion', {
            group: 1,
            codes: ['G0', 'G1', 'G2', 'G3', 'G80', 'G81', 'G82', 'G83', 'G84', 'G85', 'G86', 'G87', 'G88', 'G89'],
            current: 'G0'
        });

        this.modalGroups.set('plane', {
            group: 2,
            codes: ['G17', 'G18', 'G19'],
            current: 'G17'
        });

        this.modalGroups.set('units', {
            group: 3,
            codes: ['G20', 'G21'],
            current: 'G21'
        });

        this.modalGroups.set('distance', {
            group: 4,
            codes: ['G90', 'G91'],
            current: 'G90'
        });

        this.modalGroups.set('feedrate', {
            group: 5,
            codes: ['G93', 'G94', 'G95'],
            current: 'G94'
        });

        this.modalGroups.set('coordinate', {
            group: 6,
            codes: ['G54', 'G55', 'G56', 'G57', 'G58', 'G59'],
            current: 'G54'
        });

        this.modalGroups.set('cuttercomp', {
            group: 7,
            codes: ['G40', 'G41', 'G42'],
            current: 'G40'
        });

        this.modalGroups.set('spindle', {
            group: 8,
            codes: ['M3', 'M4', 'M5'],
            current: 'M5'
        });

        this.modalGroups.set('coolant', {
            group: 9,
            codes: ['M7', 'M8', 'M9'],
            current: 'M9'
        });
    }

    parse(gcode) {
        this.commands = [];
        this.currentLine = 0;
        
        const lines = gcode.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (this.parseLine(line, i + 1)) {
                this.currentLine++;
            }
        }
        
        return this.commands;
    }

    parseLine(line, lineNumber) {
        if (!line || line.startsWith(';') || line.startsWith('(')) {
            // Comment line
            this.commands.push({
                type: 'comment',
                line: lineNumber,
                original: line,
                value: line.replace(/^[;(]\s*/, '').replace(/[;)]\s*$/, '')
            });
            return true;
        }

        // Remove inline comments
        const codeLine = line.split(';')[0].split('(')[0].trim();
        if (!codeLine) return true;

        const tokens = this.tokenize(codeLine);
        const command = {
            type: 'command',
            line: lineNumber,
            original: line,
            tokens: tokens,
            code: null,
            parameters: {},
            modalUpdates: new Map()
        };

        for (const token of tokens) {
            if (this.isGCode(token)) {
                command.code = token;
                this.updateModalGroups(token);
            } else if (this.isMCode(token)) {
                command.code = token;
                this.updateModalGroups(token);
            } else if (this.isParameter(token)) {
                const param = this.parseParameter(token);
                if (param) {
                    command.parameters[param.axis] = param.value;
                }
            } else if (this.isVariable(token)) {
                this.parseVariable(token, command);
            }
        }

        // Update command with current modal state
        command.modalState = this.getModalState();
        this.commands.push(command);
        
        return true;
    }

    tokenize(line) {
        const tokens = [];
        let currentToken = '';
        let inWord = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === ' ' || char === '\t') {
                if (inWord && currentToken) {
                    tokens.push(currentToken);
                    currentToken = '';
                    inWord = false;
                }
                continue;
            }

            if (/[a-zA-Z]/.test(char)) {
                if (!inWord && currentToken) {
                    tokens.push(currentToken);
                    currentToken = '';
                }
                inWord = true;
                currentToken += char;
            } else if (/[0-9.-]/.test(char)) {
                currentToken += char;
            } else if (char === '[') {
                // Start of expression
                if (currentToken) {
                    tokens.push(currentToken);
                    currentToken = '';
                }
                currentToken += char;
            } else if (char === ']') {
                // End of expression
                currentToken += char;
                tokens.push(currentToken);
                currentToken = '';
                inWord = false;
            }
        }

        if (currentToken) {
            tokens.push(currentToken);
        }

        return tokens;
    }

    isGCode(token) {
        return /^G\d+(\.\d+)?$/.test(token);
    }

    isMCode(token) {
        return /^M\d+(\.\d+)?$/.test(token);
    }

    isParameter(token) {
        return /^[XYZABCUVWIJKRFPQ]\-?[\d.]+$/.test(token);
    }

    isVariable(token) {
        return token.startsWith('[') && token.endsWith(']');
    }

    parseParameter(token) {
        const axis = token[0];
        const valueStr = token.substring(1);
        const value = parseFloat(valueStr);
        
        if (isNaN(value)) {
            return null;
        }

        return { axis, value };
    }

    parseVariable(token, command) {
        const expression = token.slice(1, -1); // Remove brackets
        try {
            const value = this.evaluateExpression(expression);
            command.parameters['VAR'] = value;
            command.variableExpression = expression;
        } catch (error) {
            command.parameters['VAR'] = 0;
            command.variableError = error.message;
        }
    }

    evaluateExpression(expression) {
        // Simple expression evaluator
        // Supports basic arithmetic and variables
        let expr = expression;
        
        // Replace variables with their values
        expr = expr.replace(/#(\d+)/g, (match, varNum) => {
            return this.variables.get(parseInt(varNum)) || 0;
        });
        
        // Evaluate the expression
        // Note: In a real implementation, you'd want a more robust evaluator
        return Function(`"use strict"; return (${expr})`)();
    }

    updateModalGroups(code) {
        for (const [name, group] of this.modalGroups) {
            if (group.codes.includes(code)) {
                group.current = code;
            }
        }
    }

    getModalState() {
        const state = {};
        for (const [name, group] of this.modalGroups) {
            state[name] = group.current;
        }
        return state;
    }

    validate() {
        const errors = [];
        const warnings = [];
        let currentModal = this.getModalState();

        for (const command of this.commands) {
            if (command.type !== 'command') continue;

            // Check for modal conflicts
            const modalConflicts = this.checkModalConflicts(command, currentModal);
            warnings.push(...modalConflicts);

            // Check for parameter validity
            const paramErrors = this.checkParameters(command);
            errors.push(...paramErrors);

            // Update current modal state
            if (command.modalUpdates.size > 0) {
                currentModal = { ...currentModal, ...Object.fromEntries(command.modalUpdates) };
            }
        }

        return { errors, warnings, isValid: errors.length === 0 };
    }

    checkModalConflicts(command, currentModal) {
        const warnings = [];
        
        // Check for rapid move with feed rate
        if (command.code === 'G0' && 'F' in command.parameters) {
            warnings.push(`Line ${command.line}: Feed rate specified with rapid move (G0)`);
        }

        // Check for circular moves without proper parameters
        if ((command.code === 'G2' || command.code === 'G3') && 
            !('I' in command.parameters || 'J' in command.parameters || 'K' in command.parameters || 'R' in command.parameters)) {
            warnings.push(`Line ${command.line}: Circular move without I/J/K or R parameters`);
        }

        return warnings;
    }

    checkParameters(command) {
        const errors = [];

        // Check for valid axis values
        for (const [axis, value] of Object.entries(command.parameters)) {
            if (axis.match(/[XYZABCUVW]/) && !isFinite(value)) {
                errors.push(`Line ${command.line}: Invalid value for axis ${axis}`);
            }
        }

        // Check feed rate
        if ('F' in command.parameters && command.parameters.F <= 0) {
            errors.push(`Line ${command.line}: Feed rate must be positive`);
        }

        // Check spindle speed
        if ('S' in command.parameters && command.parameters.S < 0) {
            errors.push(`Line ${command.line}: Spindle speed cannot be negative`);
        }

        return errors;
    }

    optimize(commands = this.commands) {
        const optimized = [];
        let lastCommand = null;

        for (const command of commands) {
            if (command.type !== 'command') {
                optimized.push(command);
                continue;
            }

            const optimizedCommand = this.optimizeCommand(command, lastCommand);
            if (optimizedCommand) {
                optimized.push(optimizedCommand);
                lastCommand = optimizedCommand;
            }
        }

        return optimized;
    }

    optimizeCommand(command, lastCommand) {
        if (!lastCommand) return command;

        // Remove duplicate modal commands
        if (command.code && lastCommand.code === command.code) {
            if (this.isModalCommand(command.code)) {
                // Check if parameters are also the same
                if (this.areParametersEqual(command.parameters, lastCommand.parameters)) {
                    return null; // Skip duplicate modal command
                }
            }
        }

        // Remove unnecessary axis commands if value hasn't changed
        const filteredParams = {};
        for (const [axis, value] of Object.entries(command.parameters)) {
            if (axis.match(/[XYZABC]/)) {
                if (lastCommand.parameters[axis] !== value) {
                    filteredParams[axis] = value;
                }
            } else {
                filteredParams[axis] = value;
            }
        }

        if (Object.keys(filteredParams).length === 0 && command.code === lastCommand.code) {
            return null;
        }

        return {
            ...command,
            parameters: filteredParams
        };
    }

    isModalCommand(code) {
        for (const group of this.modalGroups.values()) {
            if (group.codes.includes(code)) {
                return true;
            }
        }
        return false;
    }

    areParametersEqual(params1, params2) {
        const keys1 = Object.keys(params1);
        const keys2 = Object.keys(params2);
        
        if (keys1.length !== keys2.length) return false;
        
        for (const key of keys1) {
            if (params1[key] !== params2[key]) {
                return false;
            }
        }
        
        return true;
    }

    generateToolpath(commands = this.commands) {
        const toolpath = new Toolpath();
        let currentPosition = { x: 0, y: 0, z: 0 };
        let currentFeedRate = 1000;
        let currentSpindleSpeed = 0;
        let currentTool = 1;

        for (const command of commands) {
            if (command.type !== 'command') continue;

            const point = {
                x: command.parameters.X !== undefined ? command.parameters.X : currentPosition.x,
                y: command.parameters.Y !== undefined ? command.parameters.Y : currentPosition.y,
                z: command.parameters.Z !== undefined ? command.parameters.Z : currentPosition.z,
                type: this.getMoveType(command.code),
                feedRate: command.parameters.F || currentFeedRate,
                spindleSpeed: command.parameters.S || currentSpindleSpeed,
                tool: currentTool,
                line: command.line,
                comment: command.original.includes(';') ? command.original.split(';')[1].trim() : ''
            };

            // Update tool if specified
            if (command.code === 'M6' && command.parameters.T) {
                currentTool = command.parameters.T;
            }

            // Update feed rate if specified
            if (command.parameters.F) {
                currentFeedRate = command.parameters.F;
            }

            // Update spindle speed if specified
            if (command.parameters.S) {
                currentSpindleSpeed = command.parameters.S;
            }

            // Handle circular interpolation
            if (command.code === 'G2' || command.code === 'G3') {
                point.type = 'arc';
                point.direction = command.code === 'G2' ? 'cw' : 'ccw';
                point.i = command.parameters.I || 0;
                point.j = command.parameters.J || 0;
                point.k = command.parameters.K || 0;
                point.r = command.parameters.R;
            }

            // Handle drill cycles
            if (command.code.startsWith('G8')) {
                point.type = 'drill';
                point.cycle = command.code;
                point.retract = command.parameters.R;
                point.dwell = command.parameters.P;
            }

            toolpath.addPoint(point);
            currentPosition = { x: point.x, y: point.y, z: point.z };
        }

        return toolpath;
    }

    getMoveType(code) {
        switch (code) {
            case 'G0': return 'rapid';
            case 'G1': return 'linear';
            case 'G2': 
            case 'G3': return 'arc';
            case 'G4': return 'dwell';
            default: return 'unknown';
        }
    }

    estimateMachiningTime(toolpath) {
        let totalTime = 0;
        let currentPos = { x: 0, y: 0, z: 0 };

        for (const point of toolpath.points) {
            const distance = this.calculateDistance(currentPos, point);
            const feedRate = point.feedRate || 1000;
            const feedMmPerSec = feedRate / 60;

            if (point.type === 'rapid') {
                totalTime += distance / (feedMmPerSec * 3); // Rapid moves are faster
            } else {
                totalTime += distance / feedMmPerSec;
            }

            if (point.type === 'dwell') {
                totalTime += point.dwell || 0;
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

    // Advanced analysis methods
    analyzeToolChanges(commands = this.commands) {
        const toolChanges = [];
        let currentTool = 1;

        for (const command of commands) {
            if (command.type === 'command' && command.code === 'M6') {
                const newTool = command.parameters.T || currentTool;
                if (newTool !== currentTool) {
                    toolChanges.push({
                        line: command.line,
                        fromTool: currentTool,
                        toTool: newTool,
                        position: command.parameters
                    });
                    currentTool = newTool;
                }
            }
        }

        return toolChanges;
    }

    findRapidMoves(commands = this.commands) {
        return commands.filter(cmd => 
            cmd.type === 'command' && cmd.code === 'G0'
        );
    }

    getBounds(commands = this.commands) {
        const bounds = {
            minX: Infinity, maxX: -Infinity,
            minY: Infinity, maxY: -Infinity,
            minZ: Infinity, maxZ: -Infinity
        };

        for (const command of commands) {
            if (command.type === 'command') {
                if (command.parameters.X !== undefined) {
                    bounds.minX = Math.min(bounds.minX, command.parameters.X);
                    bounds.maxX = Math.max(bounds.maxX, command.parameters.X);
                }
                if (command.parameters.Y !== undefined) {
                    bounds.minY = Math.min(bounds.minY, command.parameters.Y);
                    bounds.maxY = Math.max(bounds.maxY, command.parameters.Y);
                }
                if (command.parameters.Z !== undefined) {
                    bounds.minZ = Math.min(bounds.minZ, command.parameters.Z);
                    bounds.maxZ = Math.max(bounds.maxZ, command.parameters.Z);
                }
            }
        }

        // Handle infinite values
        if (!isFinite(bounds.minX)) bounds.minX = 0;
        if (!isFinite(bounds.maxX)) bounds.maxX = 0;
        if (!isFinite(bounds.minY)) bounds.minY = 0;
        if (!isFinite(bounds.maxY)) bounds.maxY = 0;
        if (!isFinite(bounds.minZ)) bounds.minZ = 0;
        if (!isFinite(bounds.maxZ)) bounds.maxZ = 0;

        return bounds;
    }

    // Export methods
    toJSON(commands = this.commands) {
        return JSON.stringify(commands, null, 2);
    }

    toCSV(commands = this.commands) {
        const headers = ['Line', 'Type', 'Code', 'X', 'Y', 'Z', 'F', 'S', 'Tool', 'Comment'];
        const rows = [headers.join(',')];

        for (const command of commands) {
            const row = [
                command.line,
                command.type,
                command.code || '',
                command.parameters.X || '',
                command.parameters.Y || '',
                command.parameters.Z || '',
                command.parameters.F || '',
                command.parameters.S || '',
                command.parameters.T || '',
                command.comment || ''
            ];
            rows.push(row.join(','));
        }

        return rows.join('\n');
    }
}
