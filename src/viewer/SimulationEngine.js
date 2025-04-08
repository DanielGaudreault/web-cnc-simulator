import * as THREE from 'three';
import { Octree } from 'three/examples/jsm/math/Octree';

class SimulationEngine {
  constructor(viewer) {
    this.viewer = viewer;
    this.octree = new Octree();
    this.materialRemoval = new THREE.Group();
    this.cuttingTools = new Map();
  }

  init(stockGeometry) {
    // Create octree for collision detection
    this.octree.fromGraphNode(this.viewer.scene);
    
    // Setup material removal visualization
    this.viewer.scene.add(this.materialRemoval);
  }

  simulate(toolpaths) {
    toolpaths.forEach(path => {
      const tool = this.getToolMesh(path.toolNumber);
      this.simulateToolpath(tool, path);
    });
  }

  simulateToolpath(tool, path) {
    path.positions.forEach((pos, i) => {
      // Update tool position
      tool.position.set(pos.x, pos.y, pos.z);
      
      // Check for collisions
      const collisions = this.octree.intersectSphere(tool.geometry.boundingSphere);
      
      if (collisions.length > 0) {
        this.processMaterialRemoval(tool, pos);
      }
    });
  }

  processMaterialRemoval(tool, position) {
    // Create removal geometry (simplified example)
    const removalGeometry = new THREE.SphereGeometry(tool.radius, 16, 16);
    const removalMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xff0000,
      transparent: true,
      opacity: 0.7
    });
    
    const removalMesh = new THREE.Mesh(removalGeometry, removalMaterial);
    removalMesh.position.copy(position);
    this.materialRemoval.add(removalMesh);
  }

  getToolMesh(toolNumber) {
    if (!this.cuttingTools.has(toolNumber)) {
      const toolGeometry = new THREE.CylinderGeometry(0.5, 0.5, 5, 16);
      const toolMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
      const toolMesh = new THREE.Mesh(toolGeometry, toolMaterial);
      this.cuttingTools.set(toolNumber, toolMesh);
    }
    return this.cuttingTools.get(toolNumber);
  }
}

export default SimulationEngine;
