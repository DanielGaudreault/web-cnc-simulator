// Add to CNCSimulator class in simulator.js

// Grid management
createGrid(size = 100, divisions = 10) {
    // Remove existing grid if present
    if (this.gridHelper) {
        this.scene.remove(this.gridHelper);
    }
    
    // Create enhanced grid
    this.gridHelper = new THREE.GridHelper(size, divisions, 0x444444, 0x222222);
    this.gridHelper.position.y = -0.1;
    this.scene.add(this.gridHelper);
    
    // Store grid settings
    this.gridSettings = { size, divisions, visible: true };
}

toggleGrid() {
    if (this.gridHelper) {
        this.gridHelper.visible = !this.gridHelper.visible;
        this.gridSettings.visible = this.gridHelper.visible;
    }
}

updateGrid(size, divisions) {
    this.createGrid(size, divisions);
}

// Enhanced coordinate system
createEnhancedAxes(size = 50) {
    // Remove existing axes if present
    if (this.axesHelper) {
        this.scene.remove(this.axesHelper);
    }
    
    // Create custom axes with better visibility
    const axesGroup = new THREE.Group();
    
    // X-axis (Red)
    const xMaterial = new THREE.LineBasicMaterial({ color: 0xff4444 });
    const xGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(size, 0, 0)
    ]);
    const xAxis = new THREE.Line(xGeometry, xMaterial);
    axesGroup.add(xAxis);
    
    // Y-axis (Green)
    const yMaterial = new THREE.LineBasicMaterial({ color: 0x44ff44 });
    const yGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, size)
    ]);
    const yAxis = new THREE.Line(yGeometry, yMaterial);
    axesGroup.add(yAxis);
    
    // Z-axis (Blue)
    const zMaterial = new THREE.LineBasicMaterial({ color: 0x4444ff });
    const zGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, size, 0)
    ]);
    const zAxis = new THREE.Line(zGeometry, zMaterial);
    axesGroup.add(zAxis);
    
    // Add arrowheads
    this.addArrowHeads(axesGroup, size);
    
    this.axesHelper = axesGroup;
    this.scene.add(this.axesHelper);
}

addArrowHeads(axesGroup, size) {
    const coneGeometry = new THREE.ConeGeometry(0.5, 2, 8);
    
    // X-axis arrow (Red)
    const xCone = new THREE.Mesh(coneGeometry, new THREE.MeshBasicMaterial({ color: 0xff4444 }));
    xCone.position.set(size, 0, 0);
    xCone.rotation.z = -Math.PI / 2;
    axesGroup.add(xCone);
    
    // Y-axis arrow (Green)
    const yCone = new THREE.Mesh(coneGeometry, new THREE.MeshBasicMaterial({ color: 0x44ff44 }));
    yCone.position.set(0, 0, size);
    yCone.rotation.x = Math.PI / 2;
    axesGroup.add(yCone);
    
    // Z-axis arrow (Blue)
    const zCone = new THREE.Mesh(coneGeometry, new THREE.MeshBasicMaterial({ color: 0x4444ff }));
    zCone.position.set(0, size, 0);
    axesGroup.add(zCone);
}

// Update the init method to include enhanced grid and axes
init() {
    this.setupScene();
    this.setupAxesController();
    this.createWorkpiece(100, 100, 20);
    this.createTool();
    this.createGrid(100, 10); // Add this line
    this.createEnhancedAxes(50); // Add this line
    this.setupEventListeners();
    this.animate();
}
