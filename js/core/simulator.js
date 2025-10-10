class CNCSimulator {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.workpiece = null;
        this.tool = null;
        this.toolpath = null;
        this.isSimulating = false;
        this.simulationSpeed = 1.0;
        this.currentStep = 0;
        this.totalSteps = 0;
        this.materialRemoval = null;
        this.collisionDetector = new CollisionDetector();
        this.machineModel = new MachineModel();
        
        this.init();
    }

    init() {
        this.setupScene();
        this.setupRenderer();
        this.setupEventListeners();
        this.createDefaultWorkpiece();
        this.animate();
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a1a);

        // Camera setup
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(200, 200, 200);
        this.camera.lookAt(0, 0, 0);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(100, 100, 100);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);

        // Grid and axes
        this.createGrid(300, 30);
        this.createAxes(50);
    }

    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    createDefaultWorkpiece() {
        this.createWorkpiece(100, 100, 25);
    }

    createWorkpiece(width, height, depth) {
        // Remove existing workpiece
        if (this.workpiece) {
            this.scene.remove(this.workpiece.mesh);
        }

        // Create workpiece geometry
        const geometry = new THREE.BoxGeometry(width, depth, height);
        const material = new THREE.MeshPhongMaterial({
            color: 0x8888ff,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.y = depth / 2;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        this.scene.add(mesh);

        // Create material removal system
        this.materialRemoval = new MaterialRemovalSystem(width, height, depth, 2.0);
        
        this.workpiece = {
            mesh: mesh,
            width: width,
            height: height,
            depth: depth,
            materialRemoval: this.materialRemoval
        };

        return this.workpiece;
    }

    createTool(toolData) {
        if (this.tool) {
            this.scene.remove(this.tool.mesh);
        }

        const toolGroup = new THREE.Group();

        // Tool holder
        const holderGeometry = new THREE.CylinderGeometry(toolData.shankDiameter / 2, toolData.shankDiameter / 2, 20, 16);
        const holderMaterial = new THREE.MeshPhongMaterial({ color: 0x666666 });
        const holder = new THREE.Mesh(holderGeometry, holderMaterial);
        toolGroup.add(holder);

        // Tool cutter
        const toolGeometry = new THREE.CylinderGeometry(toolData.diameter / 2, toolData.diameter / 2, 30, 16);
        const toolMaterial = new THREE.MeshPhongMaterial({ color: 0xff4444 });
        const cutter = new THREE.Mesh(toolGeometry, toolMaterial);
        cutter.position.y = -25;
        toolGroup.add(cutter);

        this.scene.add(toolGroup);

        this.tool = {
            mesh: toolGroup,
            data: toolData,
            position: new THREE.Vector3(0, 0, 0)
        };

        this.tool.mesh.visible = false;
        return this.tool;
    }

    loadToolpath(toolpath) {
        this.toolpath = toolpath;
        this.currentStep = 0;
        this.totalSteps = toolpath.points.length;
        
        this.visualizeToolpath(toolpath);
    }

    visualizeToolpath(toolpath) {
        // Remove existing toolpath visualization
        if (this.toolpathVisualization) {
            this.scene.remove(this.toolpathVisualization);
        }

        const points = [];
        const colors = [];
        const color = new THREE.Color();

        // Create toolpath visualization with color coding
        for (let i = 0; i < toolpath.points.length; i++) {
            const point = toolpath.points[i];
            points.push(new THREE.Vector3(point.x, point.z + 1, point.y)); // Adjust for coordinate system

            // Color coding: rapid=red, linear=green, arc=blue, drill=yellow
            switch (point.type) {
                case 'rapid':
                    color.set(0xff4444);
                    break;
                case 'linear':
                    color.set(0x44ff44);
                    break;
                case 'arc':
                    color.set(0x4444ff);
                    break;
                case 'drill':
                    color.set(0xffff44);
                    break;
                default:
                    color.set(0xffffff);
            }

            colors.push(color.r, color.g, color.b);
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setFromPoints(points);
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        const material = new THREE.LineBasicMaterial({ 
            vertexColors: true,
            linewidth: 2
        });

        this.toolpathVisualization = new THREE.Line(geometry, material);
        this.scene.add(this.toolpathVisualization);
    }

    async runSimulation() {
        if (!this.toolpath || this.isSimulating) return;

        this.isSimulating = true;
        this.tool.mesh.visible = true;
        
        const startTime = Date.now();
        let lastFrameTime = startTime;

        while (this.isSimulating && this.currentStep < this.totalSteps) {
            const currentTime = Date.now();
            const deltaTime = (currentTime - lastFrameTime) * this.simulationSpeed;
            
            if (deltaTime >= 16) { // ~60 FPS
                await this.executeStep(this.currentStep);
                this.currentStep++;
                lastFrameTime = currentTime;
                
                // Update UI
                this.updateSimulationProgress();
                
                // Small delay to allow UI updates
                await new Promise(resolve => setTimeout(resolve, 0));
            } else {
                await new Promise(resolve => setTimeout(resolve, 1));
            }
        }

        this.isSimulating = false;
        this.tool.mesh.visible = false;
        this.onSimulationComplete();
    }

    async executeStep(stepIndex) {
        const point = this.toolpath.points[stepIndex];
        const nextPoint = stepIndex < this.totalSteps - 1 ? this.toolpath.points[stepIndex + 1] : null;

        // Move tool to position
        await this.moveToolTo(point);

        // Check for material removal
        if (point.type === 'linear' && point.z < 0) {
            this.simulateCut(point, nextPoint);
        }

        // Check for collisions
        const collision = this.collisionDetector.checkCollision(this.tool, this.workpiece, this.machineModel);
        if (collision.hasCollision) {
            this.onCollisionDetected(collision);
            this.pauseSimulation();
        }
    }

    async moveToolTo(targetPoint) {
        const startPos = this.tool.position.clone();
        const endPos = new THREE.Vector3(targetPoint.x, targetPoint.z + 10, targetPoint.y);
        const distance = startPos.distanceTo(endPos);
        const duration = distance / (targetPoint.feedRate || 1000) * 1000; // Convert to ms
        
        const steps = Math.max(2, Math.ceil(duration / 16)); // At least 2 steps
        const stepDuration = duration / steps;

        for (let i = 0; i <= steps; i++) {
            if (!this.isSimulating) break;

            const t = i / steps;
            const currentPos = new THREE.Vector3().lerpVectors(startPos, endPos, t);
            
            this.tool.position.copy(currentPos);
            this.tool.mesh.position.copy(currentPos);

            // Update workpiece visualization if cutting
            if (targetPoint.z < 0 && targetPoint.type === 'linear') {
                this.updateMaterialRemoval(currentPos, this.tool.data.diameter);
            }

            await new Promise(resolve => setTimeout(resolve, stepDuration));
        }
    }

    simulateCut(point, nextPoint) {
        if (!this.materialRemoval) return;

        const toolPos = new THREE.Vector3(point.x, point.z, point.y);
        const toolRadius = this.tool.data.diameter / 2;

        // Remove material along tool path
        if (nextPoint && nextPoint.type === 'linear' && nextPoint.z < 0) {
            const nextToolPos = new THREE.Vector3(nextPoint.x, nextPoint.z, nextPoint.y);
            this.materialRemoval.removeMaterialAlongPath(toolPos, nextToolPos, toolRadius);
        } else {
            this.materialRemoval.removeMaterialAtPoint(toolPos, toolRadius);
        }

        // Update workpiece visualization
        this.updateWorkpieceAppearance();
    }

    updateMaterialRemoval(toolPos, toolDiameter) {
        if (!this.materialRemoval) return;

        const groundPos = new THREE.Vector3(toolPos.x, 0, toolPos.z);
        this.materialRemoval.removeMaterialAtPoint(groundPos, toolDiameter / 2);
        this.updateWorkpieceAppearance();
    }

    updateWorkpieceAppearance() {
        if (!this.workpiece || !this.materialRemoval) return;

        const removalFactor = this.materialRemoval.getRemovalFactor();
        const workpiece = this.workpiece.mesh;

        // Update color based on material removal
        const baseColor = new THREE.Color(0x8888ff);
        const cutColor = new THREE.Color(0x444488);
        workpiece.material.color.lerpColors(baseColor, cutColor, removalFactor);

        // Update opacity
        workpiece.material.opacity = 0.8 - (removalFactor * 0.3);
    }

    pauseSimulation() {
        this.isSimulating = false;
    }

    stopSimulation() {
        this.isSimulating = false;
        this.currentStep = 0;
        
        if (this.tool) {
            this.tool.mesh.visible = false;
            this.tool.position.set(0, 0, 0);
            this.tool.mesh.position.set(0, 0, 0);
        }

        // Reset workpiece
        if (this.workpiece && this.materialRemoval) {
            this.materialRemoval.reset();
            this.updateWorkpieceAppearance();
        }

        this.updateSimulationProgress();
    }

    setSimulationSpeed(speed) {
        this.simulationSpeed = Math.max(0.1, Math.min(10.0, speed));
    }

    updateSimulationProgress() {
        const progress = this.totalSteps > 0 ? (this.currentStep / this.totalSteps) * 100 : 0;
        const event = new CustomEvent('simulationProgress', {
            detail: {
                progress: progress,
                currentStep: this.currentStep,
                totalSteps: this.totalSteps,
                isRunning: this.isSimulating
            }
        });
        window.dispatchEvent(event);
    }

    onSimulationComplete() {
        const event = new CustomEvent('simulationComplete', {
            detail: {
                totalSteps: this.totalSteps,
                success: true
            }
        });
        window.dispatchEvent(event);
    }

    onCollisionDetected(collision) {
        const event = new CustomEvent('simulationCollision', {
            detail: collision
        });
        window.dispatchEvent(event);
    }

    createGrid(size, divisions) {
        const gridHelper = new THREE.GridHelper(size, divisions, 0x444444, 0x222222);
        gridHelper.position.y = -0.1;
        this.scene.add(gridHelper);
    }

    createAxes(size) {
        const axesHelper = new THREE.AxesHelper(size);
        this.scene.add(axesHelper);
    }

    setupEventListeners() {
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Simulation control events
        window.addEventListener('startSimulation', () => this.runSimulation());
        window.addEventListener('pauseSimulation', () => this.pauseSimulation());
        window.addEventListener('stopSimulation', () => this.stopSimulation());
        window.addEventListener('setSimulationSpeed', (e) => this.setSimulationSpeed(e.detail.speed));
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.renderer.render(this.scene, this.camera);
    }

    getDomElement() {
        return this.renderer.domElement;
    }

    // Advanced simulation features
    estimateCycleTime() {
        if (!this.toolpath) return 0;

        let totalTime = 0;
        let currentPos = new THREE.Vector3(0, 0, 0);

        for (const point of this.toolpath.points) {
            const distance = currentPos.distanceTo(new THREE.Vector3(point.x, point.z, point.y));
            const feedRate = point.feedRate || 1000; // mm/min
            const feedMmPerSec = feedRate / 60;

            if (point.type === 'rapid') {
                totalTime += distance / (feedMmPerSec * 3); // Rapid moves are faster
            } else {
                totalTime += distance / feedMmPerSec;
            }

            if (point.type === 'dwell') {
                totalTime += point.dwellTime || 0;
            }

            currentPos.set(point.x, point.z, point.y);
        }

        return totalTime;
    }

    generateSimulationReport() {
        const cycleTime = this.estimateCycleTime();
        const materialRemoved = this.materialRemoval ? this.materialRemoval.getRemovedVolume() : 0;
        
        return {
            cycleTime: cycleTime,
            materialRemoved: materialRemoved,
            toolChanges: this.countToolChanges(),
            rapidMoves: this.countMoveType('rapid'),
            cuttingMoves: this.countMoveType('linear'),
            arcMoves: this.countMoveType('arc'),
            drillMoves: this.countMoveType('drill'),
            efficiency: this.calculateEfficiency()
        };
    }

    countMoveType(type) {
        return this.toolpath ? this.toolpath.points.filter(p => p.type === type).length : 0;
    }

    countToolChanges() {
        // Count tool changes based on tool commands
        return 0; // Implement based on actual toolpath analysis
    }

    calculateEfficiency() {
        if (!this.toolpath) return 0;
        
        const totalMoves = this.toolpath.points.length;
        const cuttingMoves = this.countMoveType('linear') + this.countMoveType('arc');
        return totalMoves > 0 ? (cuttingMoves / totalMoves) * 100 : 0;
    }
}

class MaterialRemovalSystem {
    constructor(width, height, depth, resolution) {
        this.width = width;
        this.height = height;
        this.depth = depth;
        this.resolution = resolution;
        
        this.voxelGrid = this.createVoxelGrid();
        this.removedVolume = 0;
        this.totalVolume = width * height * depth;
    }

    createVoxelGrid() {
        const grid = [];
        const xSize = Math.ceil(this.width / this.resolution);
        const ySize = Math.ceil(this.depth / this.resolution);
        const zSize = Math.ceil(this.height / this.resolution);

        for (let x = 0; x < xSize; x++) {
            grid[x] = [];
            for (let y = 0; y < ySize; y++) {
                grid[x][y] = [];
                for (let z = 0; z < zSize; z++) {
                    grid[x][y][z] = true; // true = material present
                }
            }
        }

        return grid;
    }

    removeMaterialAtPoint(point, radius) {
        const voxelRadius = Math.ceil(radius / this.resolution);
        const centerVoxel = this.worldToVoxel(point);

        let removed = 0;

        for (let x = -voxelRadius; x <= voxelRadius; x++) {
            for (let y = -voxelRadius; y <= voxelRadius; y++) {
                for (let z = -voxelRadius; z <= voxelRadius; z++) {
                    const voxelX = centerVoxel.x + x;
                    const voxelY = centerVoxel.y + y;
                    const voxelZ = centerVoxel.z + z;

                    if (this.isInGrid(voxelX, voxelY, voxelZ) && 
                        this.voxelGrid[voxelX][voxelY][voxelZ] &&
                        this.isInSphere(x, y, z, voxelRadius)) {
                        
                        this.voxelGrid[voxelX][voxelY][voxelZ] = false;
                        removed++;
                    }
                }
            }
        }

        this.removedVolume += removed * Math.pow(this.resolution, 3);
    }

    removeMaterialAlongPath(start, end, radius) {
        const steps = Math.ceil(start.distanceTo(end) / this.resolution);
        
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const point = new THREE.Vector3().lerpVectors(start, end, t);
            this.removeMaterialAtPoint(point, radius);
        }
    }

    worldToVoxel(worldPos) {
        return {
            x: Math.floor((worldPos.x + this.width / 2) / this.resolution),
            y: Math.floor(worldPos.y / this.resolution),
            z: Math.floor((worldPos.z + this.height / 2) / this.resolution)
        };
    }

    isInGrid(x, y, z) {
        return x >= 0 && x < this.voxelGrid.length &&
               y >= 0 && y < this.voxelGrid[0].length &&
               z >= 0 && z < this.voxelGrid[0][0].length;
    }

    isInSphere(x, y, z, radius) {
        return (x * x + y * y + z * z) <= (radius * radius);
    }

    getRemovalFactor() {
        return this.removedVolume / this.totalVolume;
    }

    getRemovedVolume() {
        return this.removedVolume;
    }

    reset() {
        this.voxelGrid = this.createVoxelGrid();
        this.removedVolume = 0;
    }
}

class CollisionDetector {
    checkCollision(tool, workpiece, machine) {
        // Check tool-workpiece collision
        const toolCollision = this.checkToolWorkpieceCollision(tool, workpiece);
        if (toolCollision.hasCollision) return toolCollision;

        // Check machine limits
        const limitCollision = this.checkMachineLimits(tool, machine);
        if (limitCollision.hasCollision) return limitCollision;

        // Check tool-holder collision
        const holderCollision = this.checkToolHolderCollision(tool, workpiece);
        if (holderCollision.hasCollision) return holderCollision;

        return { hasCollision: false };
    }

    checkToolWorkpieceCollision(tool, workpiece) {
        const toolPos = tool.position;
        const toolRadius = tool.data.diameter / 2;

        // Simple bounding box check
        const workpieceBounds = {
            minX: -workpiece.width / 2,
            maxX: workpiece.width / 2,
            minY: 0,
            maxY: workpiece.depth,
            minZ: -workpiece.height / 2,
            maxZ: workpiece.height / 2
        };

        const collision = 
            toolPos.x - toolRadius < workpieceBounds.minX ||
            toolPos.x + toolRadius > workpieceBounds.maxX ||
            toolPos.z - toolRadius < workpieceBounds.minZ ||
            toolPos.z + toolRadius > workpieceBounds.maxZ;

        return {
            hasCollision: collision,
            type: collision ? 'tool_workpiece' : 'none',
            severity: collision ? 'warning' : 'none',
            message: collision ? 'Tool exceeds workpiece boundaries' : ''
        };
    }

    checkMachineLimits(tool, machine) {
        const toolPos = tool.position;

        const collision = 
            Math.abs(toolPos.x) > machine.xTravel / 2 ||
            Math.abs(toolPos.y) > machine.zTravel ||
            Math.abs(toolPos.z) > machine.yTravel / 2;

        return {
            hasCollision: collision,
            type: collision ? 'machine_limits' : 'none',
            severity: collision ? 'error' : 'none',
            message: collision ? 'Tool exceeds machine travel limits' : ''
        };
    }

    checkToolHolderCollision(tool, workpiece) {
        // Check if tool holder hits workpiece
        const holderBottom = tool.position.y - 10; // Approximate holder length
        const collision = holderBottom < 0; // Holder below workpiece surface

        return {
            hasCollision: collision,
            type: collision ? 'tool_holder' : 'none',
            severity: collision ? 'error' : 'none',
            message: collision ? 'Tool holder collision with workpiece' : ''
        };
    }
}

class MachineModel {
    constructor() {
        this.xTravel = 500; // mm
        this.yTravel = 400; // mm
        this.zTravel = 300; // mm
        this.maxRPM = 10000;
        this.maxFeedRate = 10000;
        this.accuracy = 0.001;
    }
}
