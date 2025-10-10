// Main CNC Simulator Class
class CNCSimulator {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.axesScene = null;
        this.axesCamera = null;
        this.axesRenderer = null;
        this.workpiece = null;
        this.tool = null;
        this.toolPath = null;
        this.isSimulating = false;
        this.simulationSpeed = 5;
        this.currentCommandIndex = 0;
        this.gcodeCommands = [];
        this.currentPosition = { x: 0, y: 0, z: 0 };
        this.isDragging = false;
        this.previousMousePosition = { x: 0, y: 0 };
        this.operationCount = 0;
        this.startTime = 0;
        this.elapsedTime = 0;
        
        this.init();
    }

    init() {
        this.setupScene();
        this.setupAxesController();
        this.createWorkpiece(100, 100, 20);
        this.createTool();
        this.setupEventListeners();
        this.animate();
    }

    setupScene() {
        const canvas = document.getElementById('viewport');
        
        // Main Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1e1e1e);

        // Camera
        this.camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
        this.camera.position.set(150, 150, 150);
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ 
            canvas, 
            antialias: true,
            alpha: true 
        });
        this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Enhanced Lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 50, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);

        const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
        fillLight.position.set(-50, -50, 50);
        this.scene.add(fillLight);

        // Grid Helper
        const gridHelper = new THREE.GridHelper(200, 20, 0x444444, 0x222222);
        gridHelper.position.y = -0.1;
        this.scene.add(gridHelper);

        // Enhanced Axes Helper
        const axesHelper = new THREE.AxesHelper(50);
        this.scene.add(axesHelper);

        // Add some reference objects
        this.addReferenceObjects();
    }

    setupAxesController() {
        const axesCanvas = document.getElementById('axesViewport');
        
        // Axes Scene
        this.axesScene = new THREE.Scene();
        this.axesScene.background = new THREE.Color(0x2d2d2d);

        // Axes Camera
        this.axesCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
        this.axesCamera.position.set(5, 5, 5);
        this.axesCamera.lookAt(0, 0, 0);

        // Axes Renderer
        this.axesRenderer = new THREE.WebGLRenderer({ 
            canvas: axesCanvas,
            antialias: true,
            alpha: true 
        });
        this.axesRenderer.setSize(130, 130);
        this.axesRenderer.setClearColor(0x000000, 0);

        // Create coordinate system for axes controller
        this.createAxesSystem();

        // Add a simple representation of the main camera
        this.createCameraRepresentation();

        // Setup axes controller event listeners
        this.setupAxesEventListeners();
    }

    createAxesSystem() {
        // Create colored axes
        const axesSize = 3;
        
        // X-axis (Red)
        const xAxis = new THREE.ArrowHelper(
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(0, 0, 0),
            axesSize,
            0xff4444,
            0.3,
            0.2
        );
        this.axesScene.add(xAxis);

        // Y-axis (Green)
        const yAxis = new THREE.ArrowHelper(
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(0, 0, 0),
            axesSize,
            0x44ff44,
            0.3,
            0.2
        );
        this.axesScene.add(yAxis);

        // Z-axis (Blue)
        const zAxis = new THREE.ArrowHelper(
            new THREE.Vector3(0, 0, 1),
            new THREE.Vector3(0, 0, 0),
            axesSize,
            0x4444ff,
            0.3,
            0.2
        );
        this.axesScene.add(zAxis);

        // Add labels
        this.addAxisLabels();

        // Add a grid in the XY plane
        const grid = new THREE.GridHelper(6, 6, 0x888888, 0x444444);
        grid.rotation.x = Math.PI / 2;
        this.axesScene.add(grid);
    }

    addAxisLabels() {
        // This is a simplified version - in a full implementation,
        // you'd create text geometries for X, Y, Z labels
        const labelMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        
        // Simple spheres as placeholder labels
        const xLabel = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), labelMaterial);
        xLabel.position.set(3.2, 0, 0);
        this.axesScene.add(xLabel);

        const yLabel = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), labelMaterial);
        yLabel.position.set(0, 3.2, 0);
        this.axesScene.add(yLabel);

        const zLabel = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), labelMaterial);
        zLabel.position.set(0, 0, 3.2);
        this.axesScene.add(zLabel);
    }

    createCameraRepresentation() {
        // Create a simple pyramid to represent the main camera
        const pyramidGeometry = new THREE.ConeGeometry(0.3, 0.8, 4);
        const pyramidMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffff00,
            transparent: true,
            opacity: 0.7
        });
        this.cameraPyramid = new THREE.Mesh(pyramidGeometry, pyramidMaterial);
        this.cameraPyramid.rotation.y = Math.PI / 4;
        this.axesScene.add(this.cameraPyramid);
    }

    setupAxesEventListeners() {
        const axesCanvas = document.getElementById('axesViewport');
        let isDragging = false;
        let previousMousePosition = { x: 0, y: 0 };

        axesCanvas.addEventListener('mousedown', (e) => {
            isDragging = true;
            previousMousePosition = { x: e.clientX, y: e.clientY };
            axesCanvas.style.cursor = 'grabbing';
        });

        axesCanvas.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const deltaMove = {
                x: e.clientX - previousMousePosition.x,
                y: e.clientY - previousMousePosition.y
            };

            // Rotate main camera based on axes controller interaction
            this.rotateMainCamera(deltaMove);

            previousMousePosition = { x: e.clientX, y: e.clientY };
        });

        axesCanvas.addEventListener('mouseup', () => {
            isDragging = false;
            axesCanvas.style.cursor = 'grab';
        });

        axesCanvas.addEventListener('mouseleave', () => {
            isDragging = false;
            axesCanvas.style.cursor = 'default';
        });

        axesCanvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.zoomMainCamera(e.deltaY > 0 ? -1 : 1);
        });

        axesCanvas.style.cursor = 'grab';
    }

    rotateMainCamera(delta) {
        // Convert delta movement to rotation
        const deltaRotationQuaternion = new THREE.Quaternion()
            .setFromEuler(new THREE.Euler(
                THREE.MathUtils.degToRad(delta.y * 0.5),
                THREE.MathUtils.degToRad(delta.x * 0.5),
                0,
                'XYZ'
            ));

        // Apply rotation to camera position
        this.camera.position.applyQuaternion(deltaRotationQuaternion);
        this.camera.lookAt(0, 0, 0);

        // Update axes controller camera representation
        this.updateCameraPyramid();
    }

    zoomMainCamera(direction) {
        const zoomSpeed = 10;
        const zoomVector = new THREE.Vector3()
            .subVectors(this.camera.position, new THREE.Vector3(0, 0, 0))
            .normalize()
            .multiplyScalar(zoomSpeed * direction);

        this.camera.position.add(zoomVector);
        
        // Don't zoom too close or too far
        const distance = this.camera.position.length();
        if (distance < 30 || distance > 500) {
            this.camera.position.sub(zoomVector);
        }

        this.camera.lookAt(0, 0, 0);
        this.updateCameraPyramid();
    }

    updateCameraPyramid() {
        if (!this.cameraPyramid) return;

        // Position the pyramid to represent main camera direction
        const direction = new THREE.Vector3()
            .subVectors(this.camera.position, new THREE.Vector3(0, 0, 0))
            .normalize()
            .multiplyScalar(4);

        this.cameraPyramid.position.copy(direction);
        this.cameraPyramid.lookAt(0, 0, 0);
    }

    addReferenceObjects() {
        // Add corner markers for workpiece reference
        const markerGeometry = new THREE.SphereGeometry(2, 8, 8);
        const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });

        const positions = [
            { x: -50, y: 0, z: -50 }, { x: 50, y: 0, z: -50 },
            { x: -50, y: 0, z: 50 }, { x: 50, y: 0, z: 50 }
        ];

        positions.forEach(pos => {
            const marker = new THREE.Mesh(markerGeometry, markerMaterial);
            marker.position.set(pos.x, pos.y, pos.z);
            this.scene.add(marker);
        });
    }

    createWorkpiece(width = 100, height = 100, depth = 20) {
        if (this.workpiece) {
            this.scene.remove(this.workpiece);
        }

        const geometry = new THREE.BoxGeometry(width, depth, height);
        const material = new THREE.MeshPhongMaterial({ 
            color: 0x888888,
            transparent: true,
            opacity: 0.8,
            shininess: 30
        });
        
        this.workpiece = new THREE.Mesh(geometry, material);
        this.workpiece.position.y = depth / 2;
        this.workpiece.castShadow = true;
        this.workpiece.receiveShadow = true;
        this.scene.add(this.workpiece);

        this.workpiece.userData = {
            originalGeometry: geometry.clone(),
            materialRemoved: false,
            width: width,
            height: height,
            depth: depth
        };
    }

    createTool() {
        if (this.tool) {
            this.scene.remove(this.tool);
        }

        const toolGroup = new THREE.Group();

        // Tool holder
        const holderGeometry = new THREE.CylinderGeometry(4, 4, 15, 16);
        const holderMaterial = new THREE.MeshPhongMaterial({ color: 0x666666 });
        const holder = new THREE.Mesh(holderGeometry, holderMaterial);
        toolGroup.add(holder);

        // Cutting tool
        const toolGeometry = new THREE.CylinderGeometry(3, 3, 20, 16);
        const toolMaterial = new THREE.MeshPhongMaterial({ color: 0xff4444 });
        const cutter = new THREE.Mesh(toolGeometry, toolMaterial);
        cutter.position.y = -17.5;
        toolGroup.add(cutter);

        this.tool = toolGroup;
        this.tool.visible = false;
        this.scene.add(this.tool);
    }

    parseGCode(gcode) {
        this.gcodeCommands = [];
        this.operationCount = 0;
        const lines = gcode.split('\n');
        
        lines.forEach(line => {
            const command = this.parseLine(line.trim());
            if (command) {
                this.gcodeCommands.push(command);
                if (command.type === 'G1' || command.type === 'G2' || command.type === 'G3') {
                    this.operationCount++;
                }
            }
        });
        
        this.updateStats();
        this.visualizeToolpath();
        return this.gcodeCommands;
    }

    parseLine(line) {
        if (!line || line.startsWith(';')) return null;

        const parts = line.split(';')[0].trim().split(/\s+/);
        if (parts.length === 0) return null;

        const command = { type: 'unknown', parameters: {}, original: line };

        parts.forEach(part => {
            const code = part[0].toUpperCase();
            const value = parseFloat(part.substring(1));

            if (code === 'G' || code === 'M') {
                command.type = code + value;
            } else if ('XYZFIJKR'.includes(code)) {
                command.parameters[code] = value;
            }
        });

        return command;
    }

    visualizeToolpath() {
        if (this.toolPath) {
            this.scene.remove(this.toolPath);
        }

        const points = [];
        let currentPos = { x: 0, y: 0, z: 0 };

        this.gcodeCommands.forEach(cmd => {
            if (cmd.type === 'G0' || cmd.type === 'G1' || cmd.type === 'G2' || cmd.type === 'G3') {
                const newPos = {
                    x: cmd.parameters.X !== undefined ? cmd.parameters.X : currentPos.x,
                    y: cmd.parameters.Y !== undefined ? cmd.parameters.Y : currentPos.y,
                    z: cmd.parameters.Z !== undefined ? cmd.parameters.Z : currentPos.z
                };
                
                points.push(new THREE.Vector3(currentPos.x, currentPos.z + 0.1, currentPos.y));
                points.push(new THREE.Vector3(newPos.x, newPos.z + 0.1, newPos.y));
                
                currentPos = { ...newPos };
            }
        });

        if (points.length > 0) {
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineBasicMaterial({ 
                color: 0x00ff00,
                linewidth: 2
            });
            this.toolPath = new THREE.LineSegments(geometry, material);
            this.scene.add(this.toolPath);
        }
    }

    async startSimulation() {
        if (this.isSimulating) return;
        
        this.isSimulating = true;
        this.currentCommandIndex = 0;
        this.currentPosition = { x: 0, y: 0, z: 0 };
        this.tool.visible = true;
        this.startTime = Date.now();
        this.elapsedTime = 0;

        const gcode = document.getElementById('gcodeEditor').value;
        this.parseGCode(gcode);

        document.getElementById('simulationInfo').textContent = 'Simulation Running';
        document.getElementById('simulationInfo').classList.add('simulating');

        while (this.isSimulating && this.currentCommandIndex < this.gcodeCommands.length) {
            await this.executeCommand(this.gcodeCommands[this.currentCommandIndex]);
            this.currentCommandIndex++;
            
            this.elapsedTime = Date.now() - this.startTime;
            this.updateStats();
            
            await new Promise(resolve => 
                setTimeout(resolve, 100 / this.simulationSpeed)
            );
        }

        this.isSimulating = false;
        this.tool.visible = false;
        document.getElementById('simulationInfo').textContent = 'Simulation Complete';
        document.getElementById('simulationInfo').classList.remove('simulating');
    }

    async executeCommand(command) {
        document.getElementById('simulationInfo').textContent = 
            `Executing: ${command.original || command.type}`;
        document.getElementById('currentOp').textContent = command.original || command.type;

        switch (command.type) {
            case 'G0': // Rapid move
            case 'G1': // Linear move
                await this.moveTool(command);
                break;
            case 'G2': // Circular move CW
            case 'G3': // Circular move CCW
                await this.circularMove(command);
                break;
            case 'G17': // XY plane selection
            case 'G21': // Millimeter units
            case 'G90': // Absolute positioning
                // Update machine state display
                this.updateMachineState(command);
                break;
            case 'M30': // Program end
                this.isSimulating = false;
                break;
        }

        this.updateCoordinates();
    }

    updateMachineState(command) {
        const stateElement = document.getElementById('machineState');
        let html = '';
        
        if (command.type === 'G21') html += '<div>Units: MM</div>';
        if (command.type === 'G90') html += '<div>Mode: Absolute</div>';
        if (command.type === 'G17') html += '<div>Plane: XY</div>';
        
        stateElement.innerHTML = html;
    }

    async moveTool(command) {
        const target = {
            x: command.parameters.X !== undefined ? command.parameters.X : this.currentPosition.x,
            y: command.parameters.Y !== undefined ? command.parameters.Y : this.currentPosition.y,
            z: command.parameters.Z !== undefined ? command.parameters.Z : this.currentPosition.z
        };

        const steps = 20;
        for (let i = 0; i <= steps; i++) {
            if (!this.isSimulating) break;
            
            const t = i / steps;
            this.currentPosition.x = this.lerp(this.currentPosition.x, target.x, t);
            this.currentPosition.y = this.lerp(this.currentPosition.y, target.y, t);
            this.currentPosition.z = this.lerp(this.currentPosition.z, target.z, t);
            
            this.tool.position.set(
                this.currentPosition.x,
                this.currentPosition.z + 10,
                this.currentPosition.y
            );

            if (command.type === 'G1' && this.currentPosition.z < 0) {
                this.simulateMaterialRemoval();
            }

            await new Promise(resolve => setTimeout(resolve, 10));
        }
    }

    async circularMove(command) {
        const center = {
            x: this.currentPosition.x + (command.parameters.I || 0),
            y: this.currentPosition.y + (command.parameters.J || 0)
        };
        
        const radius = Math.sqrt(
            Math.pow(command.parameters.I || 0, 2) + 
            Math.pow(command.parameters.J || 0, 2)
        );

        const startAngle = Math.atan2(
            this.currentPosition.y - center.y,
            this.currentPosition.x - center.x
        );

        const endAngle = startAngle + (command.type === 'G2' ? -Math.PI * 2 : Math.PI * 2);
        const steps = 36;

        for (let i = 0; i <= steps; i++) {
            if (!this.isSimulating) break;
            
            const angle = this.lerp(startAngle, endAngle, i / steps);
            this.currentPosition.x = center.x + Math.cos(angle) * radius;
            this.currentPosition.y = center.y + Math.sin(angle) * radius;
            
            this.tool.position.set(
                this.currentPosition.x,
                this.currentPosition.z + 10,
                this.currentPosition.y
            );

            if (this.currentPosition.z < 0) {
                this.simulateMaterialRemoval();
            }

            await new Promise(resolve => setTimeout(resolve, 20));
        }
    }

    simulateMaterialRemoval() {
        if (!this.workpiece.userData.materialRemoved) {
            this.workpiece.material.opacity = 0.6;
            this.workpiece.material.color.setHex(0x666666);
            this.workpiece.userData.materialRemoved = true;
            
            // Update material removed percentage
            this.updateStats();
        }
    }

    lerp(start, end, factor) {
        return start + (end - start) * factor;
