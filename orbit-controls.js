// Minimal standalone version of OrbitControls
// Based on three.js r132 examples
THREE.OrbitControls = function(object, domElement) {
  this.object = object;
  this.domElement = domElement;
  this.enableDamping = true;
  this.dampingFactor = 0.05;
  
  // Internal variables
  const scope = this;
  const EPS = 0.000001;
  const changeEvent = { type: 'change' };
  let spherical = new THREE.Spherical();
  let sphericalDelta = new THREE.Spherical();
  let scale = 1;
  let panOffset = new THREE.Vector3();
  
  // Event handlers
  function onMouseDown(event) {
    if (event.button === 0) {
      // Left click - rotate
      rotateStart.set(event.clientX, event.clientY);
    } else if (event.button === 2) {
      // Right click - pan
      panStart.set(event.clientX, event.clientY);
    }
    
    document.addEventListener('mousemove', onMouseMove, false);
    document.addEventListener('mouseup', onMouseUp, false);
  }
  
  function onMouseMove(event) {
    if (event.button === 0) {
      rotateEnd.set(event.clientX, event.clientY);
      rotateDelta.subVectors(rotateEnd, rotateStart);
      rotateStart.copy(rotateEnd);
      
      // Rotation
      sphericalDelta.theta -= 2 * Math.PI * rotateDelta.x / scope.domElement.clientHeight;
      sphericalDelta.phi -= 2 * Math.PI * rotateDelta.y / scope.domElement.clientHeight;
    } else if (event.button === 2) {
      panEnd.set(event.clientX, event.clientY);
      panDelta.subVectors(panEnd, panStart);
      panStart.copy(panEnd);
      
      // Panning
      panOffset.x += (panDelta.x * 0.5);
      panOffset.y -= (panDelta.y * 0.5);
    }
    
    scope.update();
  }
  
  function onMouseUp() {
    document.removeEventListener('mousemove', onMouseMove, false);
    document.removeEventListener('mouseup', onMouseUp, false);
  }
  
  function onMouseWheel(event) {
    // Zoom
    scale *= Math.pow(0.95, event.deltaY > 0 ? 1 : -1);
    scope.update();
  }
  
  // Initialize
  const rotateStart = new THREE.Vector2();
  const rotateEnd = new THREE.Vector2();
  const rotateDelta = new THREE.Vector2();
  const panStart = new THREE.Vector2();
  const panEnd = new THREE.Vector2();
  const panDelta = new THREE.Vector2();
  
  this.domElement.addEventListener('contextmenu', (event) => event.preventDefault(), false);
  this.domElement.addEventListener('mousedown', onMouseDown, false);
  this.domElement.addEventListener('wheel', onMouseWheel, false);
  
  this.update = function() {
    const offset = new THREE.Vector3();
    offset.copy(this.object.position).sub(panOffset);
    
    // Rotation
    spherical.setFromVector3(offset);
    spherical.theta += sphericalDelta.theta;
    spherical.phi += sphericalDelta.phi;
    spherical.makeSafe();
    sphericalDelta.set(0, 0, 0);
    
    // Apply scale
    const newPosition = new THREE.Vector3().setFromSpherical(spherical).multiplyScalar(scale);
    this.object.position.copy(newPosition.add(panOffset));
    this.object.lookAt(panOffset);
    
    // Damping
    if (this.enableDamping) {
      sphericalDelta.theta *= (1 - this.dampingFactor);
      sphericalDelta.phi *= (1 - this.dampingFactor);
      panOffset.multiplyScalar(1 - this.dampingFactor);
      scale = 1 + (scale - 1) * (1 - this.dampingFactor);
    } else {
      sphericalDelta.set(0, 0, 0);
      panOffset.set(0, 0, 0);
      scale = 1;
    }
    
    this.dispatchEvent(changeEvent);
  };
  
  this.dispose = function() {
    this.domElement.removeEventListener('contextmenu', preventDefault, false);
    this.domElement.removeEventListener('mousedown', onMouseDown, false);
    this.domElement.removeEventListener('wheel', onMouseWheel, false);
  };
};

THREE.OrbitControls.prototype = Object.create(THREE.EventDispatcher.prototype);
THREE.OrbitControls.prototype.constructor = THREE.OrbitControls;
