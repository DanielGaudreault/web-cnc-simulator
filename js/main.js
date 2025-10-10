class WebCNCApp {
    constructor() {
        this.cadEngine = null;
        this.camEngine = null;
        this.simulator = null;
        this.postProcessor = null;
        this.toolManager = null;
        this.operationManager = null;
        this.viewportManager = null;
        this.fileIO = null;
        
        this.currentProject = null;
        this.isInitialized = false;
        
        this.init();
    }

    async init() {
        try {
            // Initialize core components
            this.fileIO = new FileIO();
            this.toolManager = new ToolManager();
            this.operationManager = new OperationManager();
            this.postProcessor = new PostProcessor();
            
            // Initialize 3D components
            await this.init3DComponents();
            
            // Setup UI event handlers
            this.setupEventHandlers();
            
            // Load default project
            this.createNewProject();
            
            this.isInitialized = true;
            console.log('WebCNC Pro initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize WebCNC Pro:', error);
            this.showError('Initialization Error', error.message);
        }
    }

    async init3DComponents() {
        // Wait for Three.js to load if using CDN
        if (typeof THREE === 'undefined') {
            await this.loadThreeJS();
        }
        
        this.cadEngine = new CADEngine();
        this.camEngine = new CAMEngine();
        this.simulator = new CNCSimulator();
        this.viewportManager = new ViewportManager();
        
        // Setup component communication
        this.setupComponentCommunication();
    }

    loadThreeJS() {
        return new Promise((resolve, reject) => {
            if (typeof THREE !== 'undefined') {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    setupComponentCommunication() {
        // CAD to CAM communication
        window.addEventListener('geometryCreated', (event) => {
            this.camEngine.addGeometry(event.detail.geometry);
        });

        // CAM to Simulator communication
        window.addEventListener('toolpathGenerated', (event) => {
            this.simulator.loadToolpath(event.detail.toolpath);
        });

        // Operation manager events
        window.addEventListener('operationCreated', (event) => {
            this.updateOperationsUI();
        });

        window.addEventListener('toolpathGenerated', (event) => {
            this.updateToolpathVisualization(event.detail.toolpath);
        });

        // Simulation events
        window.addEventListener('simulationProgress', (event) => {
            this.updateSimulationProgress(event.detail);
        });

        window.addEventListener('simulationComplete', (event) => {
            this.onSimulationComplete(event.detail);
        });
    }

    setupEventHandlers() {
        // File menu
        document.getElementById('newProject').addEventListener('click', () => this.createNewProject());
        document.getElementById('openProject').addEventListener('click', () => this.openProject());
        document.getElementById('saveProject').addEventListener('click', () => this.saveProject());
        document.getElementById('exportGCode').addEventListener('click', () => this.exportGCode());

        // View menu
        document.getElementById('viewTop').addEventListener('click', () => this.setView('top'));
        document.getElementById('viewFront').addEventListener('click', () => this.setView('front'));
        document.getElementById('viewRight').addEventListener('click', () => this.setView('right'));
        document.getElementById('viewIsometric').addEventListener('click', () => this.setView('isometric'));

        // Machine menu
        document.getElementById('machineSetup').addEventListener('click', () => this.showMachineSetup());
        document.getElementById('postProcessor').addEventListener('click', () => this.showPostProcessorDialog());
        document.getElementById('simulationSetup').addEventListener('click', () => this.showSimulationSetup());

        // Tools menu
        document.getElementById('toolLibrary').addEventListener('click', () => this.showToolLibrary());
        document.getElementById('createTool').addEventListener('click', () => this.createNewTool());
        document.getElementById('importTools').addEventListener('click', () => this.importToolLibrary());

        // Operations menu
        document.getElementById('opContour').addEventListener('click', () => this.createContourOperation());
        document.getElementById('opPocket').addEventListener('click', () => this.createPocketOperation());
        document.getElementById('opDrill').addEventListener('click', () => this.createDrillOperation());
        document.getElementById('opFace').addEventListener('click', () => this.createFaceOperation());
        document.getElementById('opEngrave').addEventListener('click', () => this.createEngraveOperation());

        // Simulation controls
        document.getElementById('runSimulation').addEventListener('click', () => this.runSimulation());
        document.getElementById('pauseSimulation').addEventListener('click', () => this.pauseSimulation());
        document.getElementById('stopSimulation').addEventListener('click', () => this.stopSimulation());

        // G-code editor
        document.getElementById('formatGCode').addEventListener('click', () => this.formatGCode());
        document.getElementById('validateGCode').addEventListener('click', () => this.validateGCode());
        document.getElementById('optimizeGCode').addEventListener('click', () => this.optimizeGCode());

        // Window events
        window.addEventListener('resize', () => this.onWindowResize());
        window.addEventListener('beforeunload', (event) => this.onBeforeUnload(event));
    }

    createNewProject() {
        this.currentProject = {
            id: `project_${Date.now()}`,
            name: 'New Project',
            created: new Date(),
            modified: new Date(),
            workpiece: {
                width: 100,
                height: 100,
                depth: 25,
                material: 'aluminum'
            },
            operations: [],
            tools: [],
            settings: {
                units: 'mm',
                tolerance: 0.01,
                safeHeight: 10
            }
        };

        // Reset components
        this.operationManager.operations.clear();
        this.cadEngine.clearScene();
        this.simulator.stopSimulation();

        // Create default workpiece
        this.createWorkpiece(100, 100, 25);

        this.updateUI();
        this.showNotification('New project created', 'success');
    }

    async openProject() {
        try {
            const result = await this.fileIO.openFile({
                accept: '.json',
                description: 'WebCNC Project Files'
            });

            this.currentProject = result.content;
            
            // Restore project state
            await this.restoreProjectState(this.currentProject);
            
            this.updateUI();
            this.showNotification('Project loaded successfully', 'success');
            
        } catch (error) {
            this.showError('Open Project Error', error.message);
        }
    }

    async saveProject() {
        if (!this.currentProject) return;

        try {
            // Update project data
            this.currentProject.modified = new Date();
            this.currentProject.operations = this.operationManager.getAllOperations();
            this.currentProject.tools = this.toolManager.getAllTools();

            await this.fileIO.exportProject(this.currentProject, {
                filename: this.currentProject.name
            });

            this.showNotification('Project saved successfully', 'success');
            
        } catch (error) {
            this.showError('Save Project Error', error.message);
        }
    }

    async restoreProjectState(project) {
        // Restore workpiece
        if (project.workpiece) {
            this.createWorkpiece(
                project.workpiece.width,
                project.workpiece.height,
                project.workpiece.depth
            );
        }

        // Restore tools
        if (project.tools) {
            project.tools.forEach(toolData => {
                this.toolManager.addTool(toolData);
            });
        }

        // Restore operations
        if (project.operations) {
            project.operations.forEach(opData => {
                this.operationManager.createOperation(opData.type, opData.parameters);
            });
        }
    }

    createWorkpiece(width, height, depth) {
        this.cadEngine.createWorkpiece(width, height, depth);
        this.simulator.createWorkpiece(width, height, depth);
        
        // Update UI
        document.getElementById('wpWidth').value = width;
        document.getElementById('wpHeight').value = height;
        document.getElementById('wpDepth').value = depth;
    }

    // Operation creation methods
    createContourOperation() {
        const operation = this.operationManager.createOperation('contour', {
            tool: this.toolManager.getTool(1), // Default tool
            depth: -10,
            stepDown: 2,
            feedRate: 1000,
            spindleSpeed: 8000
        });
        
        this.showOperationDialog(operation);
    }

    createPocketOperation() {
        const operation = this.operationManager.createOperation('pocket', {
            tool: this.toolManager.getTool(2),
            depth: -8,
            stepDown: 2,
            stepOver: 0.5,
            feedRate: 800,
            spindleSpeed: 10000
        });
        
        this.showOperationDialog(operation);
    }

    createDrillOperation() {
        const operation = this.operationManager.createOperation('drill', {
            tool: this.toolManager.getTool(5), // Drill tool
            depth: -15,
            peckDepth: 3,
            feedRate: 300,
            spindleSpeed: 5000
        });
        
        this.showOperationDialog(operation);
    }

    showOperationDialog(operation) {
        // Implementation for operation property dialog
        const dialog = this.createOperationDialog(operation);
        document.body.appendChild(dialog);
    }

    createOperationDialog(operation) {
        const dialog = document.createElement('div');
        dialog.className = 'modal';
        dialog.innerHTML = `
            <div class="modal-content">
                <span class="close">&times;</span>
                <h3>${operation.type} Operation</h3>
                <div class="operation-properties">
                    ${this.generateOperationProperties(operation)}
                </div>
                <div class="dialog-buttons">
                    <button class="btn-primary" onclick="app.applyOperationChanges('${operation.id}')">Apply</button>
                    <button class="btn-secondary" onclick="app.closeDialog(this)">Cancel</button>
                </div>
            </div>
        `;
        
        return dialog;
    }

    generateOperationProperties(operation) {
        // Generate property controls based on operation type
        // This would create input fields for all operation parameters
        return `
            <div class="property-group">
                <label>Tool</label>
                <select id="opTool_${operation.id}">
                    ${this.toolManager.getAllTools().map(tool => 
                        `<option value="${tool.id}" ${tool.id === operation.parameters.tool?.id ? 'selected' : ''}>
                            ${tool.description}
                        </option>`
                    ).join('')}
                </select>
            </div>
            <div class="property-group">
                <label>Depth</label>
                <input type="number" id="opDepth_${operation.id}" value="${operation.parameters.depth}" step="0.1">
            </div>
            <div class="property-group">
                <label>Step Down</label>
                <input type="number" id="opStepDown_${operation.id}" value="${operation.parameters.stepDown}" step="0.1">
            </div>
        `;
    }

    applyOperationChanges(operationId) {
        const operation = this.operationManager.getOperation(operationId);
        if (!operation) return;

        // Update operation parameters from UI
        const toolId = document.getElementById(`opTool_${operationId}`).value;
        const depth = parseFloat(document.getElementById(`opDepth_${operationId}`).value);
        const stepDown = parseFloat(document.getElementById(`opStepDown_${operationId}`).value);

        operation.parameters.tool = this.toolManager.getTool(parseInt(toolId));
        operation.parameters.depth = depth;
        operation.parameters.stepDown = stepDown;

        this.operationManager.updateOperation(operationId, operation);
        this.closeDialog();
        this.showNotification('Operation updated', 'success');
    }

    // Simulation methods
    async runSimulation() {
        if (!this.operationManager.getEnabledOperations().length) {
            this.showError('Simulation Error', 'No operations to simulate');
            return;
        }

        try {
            // Generate toolpaths for all operations
            const results = this.operationManager.generateAllToolpaths();
            
            // Check for errors
            const errors = results.filter(r => !r.success);
            if (errors.length > 0) {
                this.showError('Toolpath Generation Error', 
                    `${errors.length} operations failed to generate toolpaths`);
                return;
            }

            // Combine toolpaths
            const combinedToolpath = this.combineToolpaths(
                results.map(r => r.toolpath).filter(Boolean)
            );

            // Load into simulator
            this.simulator.loadToolpath(combinedToolpath);
            
            // Run simulation
            await this.simulator.runSimulation();
            
        } catch (error) {
            this.showError('Simulation Error', error.message);
        }
    }

    combineToolpaths(toolpaths) {
        const combined = new Toolpath();
        
        for (const toolpath of toolpaths) {
            combined.points.push(...toolpath.points);
        }
        
        return combined;
    }

    pauseSimulation() {
        this.simulator.pauseSimulation();
    }

    stopSimulation() {
        this.simulator.stopSimulation();
    }

    updateSimulationProgress(progress) {
        document.getElementById('simProgress').style.width = `${progress.progress}%`;
        document.getElementById('simStatus').textContent = 
            `Step ${progress.currentStep} of ${progress.totalSteps}`;
    }

    onSimulationComplete(details) {
        this.showNotification(`Simulation completed in ${details.totalSteps} steps`, 'success');
        
        // Generate simulation report
        const report = this.simulator.generateSimulationReport();
        this.showSimulationReport(report);
    }

    // G-code methods
    async exportGCode() {
        if (!this.operationManager.getEnabledOperations().length) {
            this.showError('Export Error', 'No operations to export');
            return;
        }

        try {
            // Generate toolpaths
            const results = this.operationManager.generateAllToolpaths();
            const toolpaths = results.map(r => r.toolpath).filter(Boolean);
            
            // Combine toolpaths
            const combinedToolpath = this.combineToolpaths(toolpaths);
            
            // Get operations for post-processing
            const operations = this.operationManager.getEnabledOperations();
            
            // Generate G-code
            const gcode = this.postProcessor.generateGCode(combinedToolpath, operations, {
                workpiece: this.currentProject.workpiece,
                tools: this.toolManager.getAllTools()
            });

            // Export file
            await this.fileIO.exportGCode(gcode, {
                filename: this.currentProject.name
            });

            this.showNotification('G-code exported successfully', 'success');
            
        } catch (error) {
            this.showError('Export Error', error.message);
        }
    }

    formatGCode() {
        const editor = document.getElementById('gcodeEditor');
        if (!editor) return;

        // Basic formatting logic
        const lines = editor.value.split('\n');
        const formatted = lines.map(line => {
            return line.trim().replace(/\s+/g, ' ');
        }).filter(line => line.length > 0).join('\n');
        
        editor.value = formatted;
        this.showNotification('G-code formatted', 'info');
    }

    validateGCode() {
        const editor = document.getElementById('gcodeEditor');
        if (!editor) return;

        const parser = new GCodeParser();
        const commands = parser.parse(editor.value);
        const validation = parser.validate(commands);

        if (validation.isValid) {
            this.showNotification('G-code validation passed', 'success');
        } else {
            this.showError('G-code Validation Errors', 
                validation.errors.join('\n'));
        }
    }

    optimizeGCode() {
        const editor = document.getElementById('gcodeEditor');
        if (!editor) return;

        const parser = new GCodeParser();
        const commands = parser.parse(editor.value);
        const optimized = parser.optimize(commands);
        
        editor.value = parser.formatGCodeForExport(optimized);
        this.showNotification('G-code optimized', 'success');
    }

    // UI update methods
    updateUI() {
        this.updateOperationsUI();
        this.updateToolsUI();
        this.updateProjectInfo();
    }

    updateOperationsUI() {
        const container = document.getElementById('operationsList');
        if (!container) return;

        const operations = this.operationManager.getAllOperations();
        
        container.innerHTML = operations.map(op => `
            <div class="operation-item ${op.id === this.operationManager.currentOperation ? 'active' : ''}" 
                 onclick="app.selectOperation('${op.id}')">
                <div class="operation-icon ${op.type}">${op.icon}</div>
                <div class="operation-info">
                    <div class="operation-name">${op.name}</div>
                    <div class="operation-type">${op.type}</div>
                </div>
                <div class="operation-actions">
                    <button class="icon-btn" onclick="app.generateToolpath('${op.id}')" title="Generate Toolpath">⚡</button>
                    <button class="icon-btn" onclick="app.deleteOperation('${op.id}')" title="Delete">🗑️</button>
                </div>
            </div>
        `).join('');
    }

    updateToolsUI() {
        const container = document.getElementById('toolList');
        if (!container) return;

        const tools = this.toolManager.getAllTools();
        
        container.innerHTML = tools.map(tool => `
            <div class="tool-item" onclick="app.selectTool(${tool.id})">
                <div class="tool-icon"></div>
                <div class="tool-info">
                    <div class="tool-name">T${tool.id} - ${tool.description}</div>
                    <div class="tool-specs">Ø${tool.diameter}mm ${tool.type}</div>
                </div>
            </div>
        `).join('');
    }

    updateProjectInfo() {
        if (!this.currentProject) return;

        document.title = `${this.currentProject.name} - WebCNC Pro`;
        
        const infoElement = document.getElementById('projectInfo');
        if (infoElement) {
            infoElement.textContent = `${this.currentProject.name} - ${this.currentProject.operations.length} operations`;
        }
    }

    // Utility methods
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-header">
                <span class="notification-title">${type.toUpperCase()}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
            </div>
            <div class="notification-message">${message}</div>
        `;

        const container = document.getElementById('notificationContainer') || this.createNotificationContainer();
        container.appendChild(notification);

        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    createNotificationContainer() {
        const container = document.createElement('div');
        container.id = 'notificationContainer';
        container.className = 'notification-container';
        document.body.appendChild(container);
        return container;
    }

    showError(title, message) {
        this.showNotification(`${title}: ${message}`, 'error');
    }

    setView(viewType) {
        this.viewportManager.setView('main', viewType);
    }

    onWindowResize() {
        if (this.viewportManager) {
            this.viewportManager.onWindowResize();
        }
    }

    onBeforeUnload(event) {
        if (this.hasUnsavedChanges()) {
            event.preventDefault();
            event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            return event.returnValue;
        }
    }

    hasUnsavedChanges() {
        // Implement logic to check for unsaved changes
        return false;
    }

    // Public methods for UI callbacks
    selectOperation(operationId) {
        this.operationManager.currentOperation = operationId;
        this.updateOperationsUI();
    }

    selectTool(toolId) {
        // Implementation for tool selection
    }

    generateToolpath(operationId) {
        this.operationManager.generateToolpath(operationId);
    }

    deleteOperation(operationId) {
        if (confirm('Are you sure you want to delete this operation?')) {
            this.operationManager.deleteOperation(operationId);
            this.updateOperationsUI();
        }
    }

    closeDialog(button) {
        const dialog = button.closest('.modal');
        if (dialog) {
            dialog.remove();
        }
    }

    // Additional dialog methods
    showToolLibrary() {
        // Implementation for tool library dialog
    }

    showMachineSetup() {
        // Implementation for machine setup dialog
    }

    showPostProcessorDialog() {
        // Implementation for post processor dialog
    }

    showSimulationReport(report) {
        // Implementation for simulation report dialog
    }
}

// Global app instance
let app;

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    app = new WebCNCApp();
});

// Make app globally available for HTML event handlers
window.app = app;
