class ViewportManager {
    constructor() {
        this.viewports = new Map();
        this.activeViewport = null;
        this.cameraControllers = new Map();
        this.renderers = new Map();
        
        this.init();
    }

    init() {
        this.createViewports();
        this.setupEventListeners();
        this.startAnimationLoop();
    }

    createViewports() {
        // Main 3D viewport
        this.createViewport('main', {
            type: 'perspective',
            position: [150, 150, 150],
            lookAt: [0, 0, 0],
            fov: 75,
            controls: 'orbit'
        });

        // Top view
        this.createViewport('top', {
            type: 'orthographic',
            position: [0, 200, 0],
            lookAt: [0, 0, 0],
            up: [0, 0, -1],
            size: 100,
            controls: 'pan'
        });

        // Front view
        this.createViewport('front', {
            type: 'orthographic',
            position: [0, 0, 200],
            lookAt: [0, 0, 0],
            size: 100,
            controls: 'pan'
        });

        // Right view
        this.createViewport('right', {
            type: 'orthographic',
            position: [200, 0, 0],
            lookAt: [0, 0, 0],
            size: 100,
            controls: 'pan'
        });

        this.setActiveViewport('main');
    }

    createViewport(id, config) {
        const canvas = document.getElementById(`${id}Canvas`);
        if (!canvas) return;

        // Scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1a1a1a);

        // Camera
        let camera;
        if (config.type === 'perspective') {
            camera = new THREE.PerspectiveCamera(
                config.fov || 75,
                canvas.clientWidth / canvas.clientHeight,
                0.1,
                1000
            );
        } else {
            const aspect = canvas.clientWidth / canvas.clientHeight;
            const size = config.size || 100;
            camera = new THREE.OrthographicCamera(
                -size * aspect, size * aspect,
                size, -size,
                0.1,
                1000
            );
        }

        camera.position.fromArray(config.position || [0, 0, 0]);
        camera.lookAt(new THREE.Vector3().fromArray(config.lookAt || [0, 0, 0]));
        
        if (config.up) {
            camera.up.fromArray(config.up);
        }

        // Renderer
        const renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
            alpha: true
        });
        renderer.setSize(canvas.clientWidth, canvas.clientHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Controls
        let controls;
        if (config.controls === 'orbit') {
            controls = new OrbitControls(camera, canvas);
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;
        } else if (config.controls === 'pan') {
            controls = this.createPanControls(camera, canvas);
        }

        // Grid and axes
        this.addGridAndAxes(scene);

        const viewport = {
            id: id,
            canvas: canvas,
            scene: scene,
            camera: camera,
            renderer: renderer,
            controls: controls,
            config: config,
            objects: new Map(),
            overlays: new Map()
        };

        this.viewports.set(id, viewport);
        this.cameraControllers.set(id, controls);
        this.renderers.set(id, renderer);

        return viewport;
    }

    createPanControls(camera, canvas) {
        // Simple pan controls for 2D views
        let isDragging = false;
        let previousMouse = { x: 0, y: 0 };
        const panSpeed = 0.01;

        const onMouseDown = (event) => {
            isDragging = true;
            previousMouse = { x: event.clientX, y: event.clientY };
            canvas.style.cursor = 'grabbing';
        };

        const onMouseMove = (event) => {
            if (!isDragging) return;

            const deltaX = event.clientX - previousMouse.x;
            const deltaY = event.clientY - previousMouse.y;

            // Pan camera
            camera.position.x -= deltaX * panSpeed * camera.zoom;
            camera.position.z -= deltaY * panSpeed * camera.zoom;

            previousMouse = { x: event.clientX, y: event.clientY };
        };

        const onMouseUp = () => {
            isDragging = false;
            canvas.style.cursor = 'grab';
        };

        const onWheel = (event) => {
            event.preventDefault();
            const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
            camera.zoom = Math.max(0.1, Math.min(10, camera.zoom * zoomFactor));
            camera.updateProjectionMatrix();
        };

        canvas.addEventListener('mousedown', onMouseDown);
        canvas.addEventListener('mousemove', onMouseMove);
        canvas.addEventListener('mouseup', onMouseUp);
        canvas.addEventListener('wheel', onWheel);
        canvas.style.cursor = 'grab';

        return {
            dispose: () => {
                canvas.removeEventListener('mousedown', onMouseDown);
                canvas.removeEventListener('mousemove', onMouseMove);
                canvas.removeEventListener('mouseup', onMouseUp);
                canvas.removeEventListener('wheel', onWheel);
            }
        };
    }

    addGridAndAxes(scene) {
        // Grid
        const grid = new THREE.GridHelper(200, 20, 0x444444, 0x222222);
        grid.position.y = -0.1;
        scene.add(grid);

        // Axes
        const axes = new THREE.AxesHelper(50);
        scene.add(axes);
    }

    setActiveViewport(viewportId) {
        this.activeViewport = viewportId;
        
        // Update UI to show active viewport
        this.viewports.forEach((viewport, id) => {
            const element = viewport.canvas.parentElement;
            if (element) {
                element.classList.toggle('active', id === viewportId);
            }
        });

        this.onViewportActivated(viewportId);
    }

    getActiveViewport() {
        return this.viewports.get(this.activeViewport);
    }

    addObject(viewportId, object, id = null) {
        const viewport = this.viewports.get(viewportId);
        if (!viewport) return null;

        const objectId = id || `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        object.userData.id = objectId;
        
        viewport.scene.add(object);
        viewport.objects.set(objectId, object);

        return objectId;
    }

    removeObject(viewportId, objectId) {
        const viewport = this.viewports.get(viewportId);
        if (!viewport) return false;

        const object = viewport.objects.get(objectId);
        if (object) {
            viewport.scene.remove(object);
            viewport.objects.delete(objectId);
            return true;
        }

        return false;
    }

    addOverlay(viewportId, overlay) {
        const viewport = this.viewports.get(viewportId);
        if (viewport) {
            viewport.overlays.set(overlay.id, overlay);
            viewport.scene.add(overlay.mesh);
        }
    }

    removeOverlay(viewportId, overlayId) {
        const viewport = this.viewports.get(viewportId);
        if (viewport) {
            const overlay = viewport.overlays.get(overlayId);
            if (overlay) {
                viewport.scene.remove(overlay.mesh);
                viewport.overlays.delete(overlayId);
            }
        }
    }

    setView(viewportId, viewType) {
        const viewport = this.viewports.get(viewportId);
        if (!viewport) return;

        const camera = viewport.camera;
        const center = new THREE.Vector3(0, 0, 0);

        switch (viewType) {
            case 'top':
                camera.position.set(0, 200, 0);
                camera.up.set(0, 0, -1);
                camera.lookAt(center);
                break;
            case 'front':
                camera.position.set(0, 0, 200);
                camera.up.set(0, 1, 0);
                camera.lookAt(center);
                break;
            case 'right':
                camera.position.set(200, 0, 0);
                camera.up.set(0, 1, 0);
                camera.lookAt(center);
                break;
            case 'isometric':
                camera.position.set(150, 150, 150);
                camera.up.set(0, 1, 0);
                camera.lookAt(center);
                break;
            case 'bottom':
                camera.position.set(0, -200, 0);
                camera.up.set(0, 0, 1);
                camera.lookAt(center);
                break;
            case 'back':
                camera.position.set(0, 0, -200);
                camera.up.set(0, 1, 0);
                camera.lookAt(center);
                break;
            case 'left':
                camera.position.set(-200, 0, 0);
                camera.up.set(0, 1, 0);
                camera.lookAt(center);
                break;
        }

        if (viewport.controls && viewport.controls.update) {
            viewport.controls.update();
        }
    }

    zoomToFit(viewportId, objects = []) {
        const viewport = this.viewports.get(viewportId);
        if (!viewport) return;

        const bbox = new THREE.Box3();
        
        // Add all objects in the viewport to bounding box
        viewport.objects.forEach(object => {
            bbox.expandByObject(object);
        });

        // Add specified objects
        objects.forEach(object => {
            bbox.expandByObject(object);
        });

        if (bbox.isEmpty()) {
            bbox.setFromPoints([new THREE.Vector3(-50, -50, -50), new THREE.Vector3(50, 50, 50)]);
        }

        const center = bbox.getCenter(new THREE.Vector3());
        const size = bbox.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const camera = viewport.camera;

        if (camera instanceof THREE.PerspectiveCamera) {
            const fov = camera.fov * (Math.PI / 180);
            let cameraZ = Math.abs(maxDim / Math.sin(fov / 2));
            cameraZ *= 1.5; // Add padding

            camera.position.copy(center);
            camera.position.z += cameraZ;
            camera.lookAt(center);
        } else {
            // Orthographic camera
            const aspect = camera.right / camera.top;
            const zoom = Math.min(10, 100 / maxDim); // Adjust zoom level
            camera.zoom = zoom;
            camera.position.copy(center);
            camera.updateProjectionMatrix();
        }

        if (viewport.controls && viewport.controls.update) {
            viewport.controls.update();
        }
    }

    takeScreenshot(viewportId, format = 'image/png', quality = 1) {
        const viewport = this.viewports.get(viewportId);
        if (!viewport) return null;

        const renderer = viewport.renderer;
        return renderer.domElement.toDataURL(format, quality);
    }

    startAnimationLoop() {
        const animate = () => {
            requestAnimationFrame(animate);

            this.viewports.forEach(viewport => {
                if (viewport.controls && viewport.controls.update) {
                    viewport.controls.update();
                }
                viewport.renderer.render(viewport.scene, viewport.camera);
            });
        };

        animate();
    }

    setupEventListeners() {
        // Viewport click events
        this.viewports.forEach((viewport, id) => {
            viewport.canvas.addEventListener('click', () => {
                this.setActiveViewport(id);
            });
        });

        // Window resize
        window.addEventListener('resize', () => this.onWindowResize());

        // Keyboard shortcuts
        document.addEventListener('keydown', (event) => this.handleKeyDown(event));
    }

    onWindowResize() {
        this.viewports.forEach(viewport => {
            const canvas = viewport.canvas;
            const camera = viewport.camera;
            const renderer = viewport.renderer;

            if (camera instanceof THREE.PerspectiveCamera) {
                camera.aspect = canvas.clientWidth / canvas.clientHeight;
                camera.updateProjectionMatrix();
            } else {
                // Orthographic camera
                const aspect = canvas.clientWidth / canvas.clientHeight;
                const size = viewport.config.size || 100;
                camera.left = -size * aspect;
                camera.right = size * aspect;
                camera.top = size;
                camera.bottom = -size;
                camera.updateProjectionMatrix();
            }

            renderer.setSize(canvas.clientWidth, canvas.clientHeight);
        });
    }

    handleKeyDown(event) {
        if (!this.activeViewport) return;

        const viewport = this.getActiveViewport();
        if (!viewport) return;

        const camera = viewport.camera;
        const moveSpeed = 10;

        switch (event.key) {
            case 'ArrowUp':
                camera.position.z -= moveSpeed;
                break;
            case 'ArrowDown':
                camera.position.z += moveSpeed;
                break;
            case 'ArrowLeft':
                camera.position.x -= moveSpeed;
                break;
            case 'ArrowRight':
                camera.position.x += moveSpeed;
                break;
            case 'Home':
                this.zoomToFit(this.activeViewport);
                break;
            case '1':
                this.setView(this.activeViewport, 'top');
                break;
            case '2':
                this.setView(this.activeViewport, 'front');
                break;
            case '3':
                this.setView(this.activeViewport, 'right');
                break;
            case '4':
                this.setView(this.activeViewport, 'isometric');
                break;
        }

        if (viewport.controls && viewport.controls.update) {
            viewport.controls.update();
        }
    }

    onViewportActivated(viewportId) {
        const event = new CustomEvent('viewportActivated', {
            detail: { viewportId }
        });
        window.dispatchEvent(event);
    }

    // Utility methods
    worldToScreen(viewportId, worldPosition) {
        const viewport = this.viewports.get(viewportId);
        if (!viewport) return null;

        const vector = worldPosition.clone();
        vector.project(viewport.camera);

        const x = (vector.x * 0.5 + 0.5) * viewport.canvas.clientWidth;
        const y = (-vector.y * 0.5 + 0.5) * viewport.canvas.clientHeight;

        return { x, y };
    }

    screenToWorld(viewportId, screenX, screenY, depth = 0) {
        const viewport = this.viewports.get(viewportId);
        if (!viewport) return null;

        const vector = new THREE.Vector3(
            (screenX / viewport.canvas.clientWidth) * 2 - 1,
            -(screenY / viewport.canvas.clientHeight) * 2 + 1,
            depth
        );

        vector.unproject(viewport.camera);
        return vector;
    }

    raycast(viewportId, screenX, screenY, objects = null) {
        const viewport = this.viewports.get(viewportId);
        if (!viewport) return [];

        const mouse = new THREE.Vector2();
        mouse.x = (screenX / viewport.canvas.clientWidth) * 2 - 1;
        mouse.y = -(screenY / viewport.canvas.clientHeight) * 2 + 1;

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, viewport.camera);

        const targets = objects || Array.from(viewport.objects.values());
        return raycaster.intersectObjects(targets, true);
    }

    // Advanced features
    createMeasurementTool(viewportId) {
        const viewport = this.viewports.get(viewportId);
        if (!viewport) return null;

        const measurement = {
            points: [],
            lines: [],
            labels: [],
            isActive: false
        };

        const onMouseClick = (event) => {
            if (!measurement.isActive) return;

            const rect = viewport.canvas.getBoundingClientRect();
            const screenX = event.clientX - rect.left;
            const screenY = event.clientY - rect.top;

            const worldPos = this.screenToWorld(viewportId, screenX, screenY, 0);
            if (worldPos) {
                measurement.points.push(worldPos.clone());

                if (measurement.points.length >= 2) {
                    this.createMeasurementLine(viewportId, measurement);
                }
            }
        };

        viewport.canvas.addEventListener('click', onMouseClick);

        return {
            start: () => { measurement.isActive = true; },
            stop: () => { measurement.isActive = false; },
            clear: () => {
                measurement.points = [];
                measurement.lines.forEach(line => viewport.scene.remove(line));
                measurement.labels.forEach(label => viewport.scene.remove(label));
                measurement.lines = [];
                measurement.labels = [];
            },
            dispose: () => {
                viewport.canvas.removeEventListener('click', onMouseClick);
                this.clear();
            }
        };
    }

    createMeasurementLine(viewportId, measurement) {
        const viewport = this.viewports.get(viewportId);
        const points = measurement.points;
        const start = points[points.length - 2];
        const end = points[points.length - 1];

        // Create line
        const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
        const material = new THREE.LineBasicMaterial({ color: 0xffff00 });
        const line = new THREE.Line(geometry, material);
        viewport.scene.add(line);
        measurement.lines.push(line);

        // Create distance label
        const distance = start.distanceTo(end);
        const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        this.createDistanceLabel(viewportId, midPoint, distance, measurement);
    }

    createDistanceLabel(viewportId, position, distance, measurement) {
        // This would create a sprite or DOM element for the distance label
        // Implementation depends on your preferred labeling method
    }

    // Section views
    createSectionView(viewportId, plane) {
        const viewport = this.viewports.get(viewportId);
        if (!viewport) return null;

        // Create clipping plane
        const clipPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(
            new THREE.Vector3().fromArray(plane.normal),
            new THREE.Vector3().fromArray(plane.point)
        );

        // Apply clipping to all objects
        viewport.objects.forEach(object => {
            if (object.material) {
                object.material.clippingPlanes = [clipPlane];
                object.material.clipShadows = true;
            }
        });

        return {
            plane: clipPlane,
            dispose: () => {
                viewport.objects.forEach(object => {
                    if (object.material) {
                        object.material.clippingPlanes = null;
                    }
                });
            }
        };
    }

    // Visual styles
    setVisualStyle(viewportId, style) {
        const viewport = this.viewports.get(viewportId);
        if (!viewport) return;

        switch (style) {
            case 'wireframe':
                this.applyWireframeStyle(viewport);
                break;
            case 'shaded':
                this.applyShadedStyle(viewport);
                break;
            case 'hidden-line':
                this.applyHiddenLineStyle(viewport);
                break;
            case 'x-ray':
                this.applyXRayStyle(viewport);
                break;
        }
    }

    applyWireframeStyle(viewport) {
        viewport.objects.forEach(object => {
            if (object.material) {
                object.material.wireframe = true;
                object.material.transparent = true;
                object.material.opacity = 0.7;
            }
        });
    }

    applyShadedStyle(viewport) {
        viewport.objects.forEach(object => {
            if (object.material) {
                object.material.wireframe = false;
                object.material.transparent = false;
                object.material.opacity = 1;
            }
        });
    }

    applyHiddenLineStyle(viewport) {
        // More complex implementation for hidden line removal
    }

    applyXRayStyle(viewport) {
        viewport.objects.forEach(object => {
            if (object.material) {
                object.material.transparent = true;
                object.material.opacity = 0.3;
            }
        });
    }
}

// OrbitControls implementation (simplified)
class OrbitControls {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;
        
        this.enabled = true;
        this.enableRotate = true;
        this.enableZoom = true;
        this.enablePan = true;
        
        this.rotateSpeed = 1.0;
        this.zoomSpeed = 1.0;
        this.panSpeed = 1.0;
        
        this.target = new THREE.Vector3();
        this.minDistance = 0;
        this.maxDistance = Infinity;
        
        this.spherical = new THREE.Spherical();
        this.sphericalDelta = new THREE.Spherical();
        
        this.scale = 1;
        this.panOffset = new THREE.Vector3();
        
        this.zoomChanged = false;
        
        this.mouseButtons = {
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.PAN
        };
        
        this.state =
