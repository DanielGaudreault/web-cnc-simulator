class ThreeDViewer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75, 
      this.container.clientWidth / this.container.clientHeight, 
      0.1, 
      1000
    );
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.controls = null;
    
    this.init();
  }

  init() {
    // Renderer setup
    this.renderer.setSize(
      this.container.clientWidth, 
      this.container.clientHeight
    );
    this.renderer.setClearColor(0xf0f0f0);
    this.container.appendChild(this.renderer.domElement);
    
    // Camera position
    this.camera.position.set(0, 0, 50);
    
    // Controls
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.25;
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1);
    this.scene.add(directionalLight);
    
    // Grid helper
    const gridHelper = new THREE.GridHelper(100, 100);
    this.scene.add(gridHelper);
    
    // Axes helper
    const axesHelper = new THREE.AxesHelper(10);
    this.scene.add(axesHelper);
    
    // Animation loop
    this.animate();
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  loadGeometry(geometryData) {
    // Clear previous geometry
    this.clearSceneExceptHelpers();
    
    // Create new geometry
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position', 
      new THREE.BufferAttribute(geometryData.vertices, 3)
    );
    geometry.setIndex(
      new THREE.BufferAttribute(geometryData.faces, 1)
    );
    geometry.computeVertexNormals();
    
    const material = new THREE.MeshPhongMaterial({ 
      color: 0x2194ce,
      specular: 0x111111,
      shininess: 30,
      side: THREE.DoubleSide
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    this.scene.add(mesh);
    
    // Auto-zoom to fit
    this.zoomToObject(mesh);
  }

  renderToolpaths(toolpaths) {
    // Remove old toolpaths
    this.scene.children
      .filter(obj => obj.userData.isToolpath)
      .forEach(obj => this.scene.remove(obj));
    
    // Add new toolpaths
    toolpaths.forEach(toolpath => {
      const points = toolpath.points.map(p => new THREE.Vector3(p.x, p.y, p.z));
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      
      const material = new THREE.LineBasicMaterial({
        color: this.getToolColor(toolpath.toolNumber),
        linewidth: 2
      });
      
      const line = new THREE.Line(geometry, material);
      line.userData.isToolpath = true;
      this.scene.add(line);
    });
  }

  getToolColor(toolNumber) {
    const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff];
    return colors[toolNumber % colors.length];
  }

  zoomToObject(object) {
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3()).length();
    const center = box.getCenter(new THREE.Vector3());
    
    this.camera.position.copy(center);
    this.camera.position.z += size * 1.5;
    this.controls.target.copy(center);
    this.controls.update();
  }

  clearSceneExceptHelpers() {
    this.scene.children.forEach(child => {
      if (!(child instanceof THREE.GridHelper || 
            child instanceof THREE.AxesHelper || 
            child instanceof THREE.Light)) {
        this.scene.remove(child);
      }
    });
  }
}
