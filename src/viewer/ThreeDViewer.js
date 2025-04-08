import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

class ThreeDViewer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, 
      this.container.clientWidth / this.container.clientHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    
    this.init();
  }

  init() {
    // Setup renderer
    this.renderer.setSize(
      this.container.clientWidth, 
      this.container.clientHeight
    );
    this.container.appendChild(this.renderer.domElement);
    
    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1);
    this.scene.add(directionalLight);
    
    // Axes helper
    this.scene.add(new THREE.AxesHelper(5));
    
    // Camera position
    this.camera.position.z = 10;
    
    // Animation loop
    this.animate();
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  loadGeometry(geometryData) {
    // Clear existing geometry
    this.clearScene();
    
    // Process meshes
    geometryData.meshes.forEach(meshData => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', 
        new THREE.BufferAttribute(meshData.vertices, 3));
      geometry.setIndex(new THREE.BufferAttribute(meshData.faces, 1));
      
      const material = new THREE.MeshPhongMaterial({ 
        color: 0x00ff00, 
        wireframe: false,
        side: THREE.DoubleSide
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      this.scene.add(mesh);
    });
    
    // Center and zoom to fit
    this.zoomToFit();
  }

  loadToolpaths(toolpathData) {
    // Implementation for toolpath visualization
    toolpathData.forEach(path => {
      const points = path.positions.map(p => 
        new THREE.Vector3(p.x, p.y, p.z));
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      
      const material = new THREE.LineBasicMaterial({ 
        color: this.getToolColor(path.toolNumber),
        linewidth: 2
      });
      
      const line = new THREE.Line(geometry, material);
      this.scene.add(line);
    });
  }

  zoomToFit() {
    // Implementation to center and zoom to all visible objects
    const box = new THREE.Box3().setFromObject(this.scene);
    const size = box.getSize(new THREE.Vector3()).length();
    const center = box.getCenter(new THREE.Vector3());
    
    this.camera.position.copy(center);
    this.camera.position.z += size * 1.5;
    this.controls.target.copy(center);
    this.controls.update();
  }

  clearScene() {
    // Remove all non-light, non-helper objects
    this.scene.children.forEach(child => {
      if (!(child instanceof THREE.Light || 
            child instanceof THREE.AxesHelper)) {
        this.scene.remove(child);
      }
    });
  }
}

export default ThreeDViewer;
