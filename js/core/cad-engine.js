class CADEngine {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.objects = new Map();
        this.selection = new Set();
        this.grid = null;
        this.axes = null;
        
        this.init();
    }

    init() {
        this.setupScene();
        this.setupLights();
        this.createGrid();
        this.createAxes();
        this.setupEventListeners();
    }

    setupScene() {
        // Main 3D scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a1a);

        // Camera
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(150, 150, 150);
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    setupLights() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);

        // Directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 50, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);

        // Fill light
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
        fillLight.position.set(-50, -50, 50);
        this.scene.add(fillLight);
    }

    createGrid(size = 200, divisions = 20) {
        if (this.grid) {
            this.scene.remove(this.grid);
        }

        this.grid = new THREE.GridHelper(size, divisions, 0x444444, 0x222222);
        this.grid.position.y = -0.1;
        this.scene.add(this.grid);
    }

    createAxes(size = 50) {
        if (this.axes) {
            this.scene.remove(this.axes);
        }

        this.axes = new THREE.AxesHelper(size);
        this.scene.add(this.axes);
    }

    createWorkpiece(width, height, depth) {
        const geometry = new THREE.BoxGeometry(width, depth, height);
        const material = new THREE.MeshPhongMaterial({
            color: 0x888888,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });

        const workpiece = new THREE.Mesh(geometry, material);
        workpiece.position.y = depth / 2;
        workpiece.userData = { type: 'workpiece', width, height, depth };
        
        this.addObject(workpiece, 'workpiece');
        return workpiece;
    }

    createGeometryFromPoints(points, closed = false) {
        const shape = new THREE.Shape();
        
        if (points.length > 0) {
            shape.moveTo(points[0].x, points[0].y);
            
            for (let i = 1; i < points.length; i++) {
                shape.lineTo(points[i].x, points[i].y);
            }
            
            if (closed) {
                shape.lineTo(points[0].x, points[0].y);
            }
        }

        const geometry = new THREE.ShapeGeometry(shape);
        const material = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.5
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2; // Lay flat on XY plane
        
        this.addObject(mesh, 'geometry');
        return mesh;
    }

    createCircle(center, radius, segments = 32) {
        const shape = new THREE.Shape();
        shape.absarc(center.x, center.y, radius, 0, Math.PI * 2, false);
        
        const geometry = new THREE.ShapeGeometry(shape);
        const material = new THREE.MeshBasicMaterial({
            color: 0x0088ff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.5
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2;
        
        this.addObject(mesh, 'geometry');
        return mesh;
    }

    createRectangle(corner1, corner2) {
        const points = [
            { x: corner1.x, y: corner1.y },
            { x: corner2.x, y: corner1.y },
            { x: corner2.x, y: corner2.y },
            { x: corner1.x, y: corner2.y }
        ];

        return this.createGeometryFromPoints(points, true);
    }

    createLine(points, color = 0xff0000) {
        const geometry = new THREE.BufferGeometry().setFromPoints(
            points.map(p => new THREE.Vector3(p.x, 0, p.y))
        );

        const material = new THREE.LineBasicMaterial({ color });
        const line = new THREE.Line(geometry, material);
        
        this.addObject(line, 'geometry');
        return line;
    }

    addObject(object, type) {
        const id = `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        object.userData.id = id;
        object.userData.type = type;
        
        this.objects.set(id, object);
        this.scene.add(object);
        
        return id;
    }

    removeObject(id) {
        const object = this.objects.get(id);
        if (object) {
            this.scene.remove(object);
            this.objects.delete(id);
            this.deselectObject(id);
        }
    }

    selectObject(id) {
        const object = this.objects.get(id);
        if (object) {
            this.selection.add(id);
            
            // Highlight selected object
            if (object.material) {
                object.userData.originalColor = object.material.color.getHex();
                object.material.color.setHex(0xffff00); // Yellow highlight
            }
        }
    }

    deselectObject(id) {
        const object = this.objects.get(id);
        if (object && this.selection.has(id)) {
            this.selection.delete(id);
            
            // Restore original color
            if (object.material && object.userData.originalColor) {
                object.material.color.setHex(object.userData.originalColor);
            }
        }
    }

    clearSelection() {
        for (const id of this.selection) {
            this.deselectObject(id);
        }
        this.selection.clear();
    }

    getSelectedObjects() {
        return Array.from(this.selection).map(id => this.objects.get(id));
    }

    transformSelected(transformation) {
        for (const id of this.selection) {
            const object = this.objects.get(id);
            if (object) {
                if (transformation.position) {
                    object.position.copy(transformation.position);
                }
                if (transformation.rotation) {
                    object.rotation.copy(transformation.rotation);
                }
                if (transformation.scale) {
                    object.scale.copy(transformation.scale);
                }
            }
        }
    }

    exportGeometry(format = 'json') {
        const exportData = {
            version: '1.0',
            objects: []
        };

        for (const [id, object] of this.objects) {
            if (object.userData.type === 'geometry') {
                const geometryData = this.serializeGeometry(object);
                exportData.objects.push({
                    id: id,
                    type: object.userData.type,
                    geometry: geometryData,
                    position: object.position.toArray(),
                    rotation: object.rotation.toArray(),
                    scale: object.scale.toArray()
                });
            }
        }

        switch (format) {
            case 'json':
                return JSON.stringify(exportData, null, 2);
            case 'svg':
                return this.exportToSVG();
            case 'dxf':
                return this.exportToDXF();
            default:
                return exportData;
        }
    }

    serializeGeometry(object) {
        if (object.geometry instanceof THREE.BufferGeometry) {
            const positions = object.geometry.attributes.position.array;
            const vertices = [];
            
            for (let i = 0; i < positions.length; i += 3) {
                vertices.push({
                    x: positions[i],
                    y: positions[i + 1],
                    z: positions[i + 2]
                });
            }
            
            return {
                type: 'buffer',
                vertices: vertices
            };
        }
        
        return null;
    }

    importGeometry(data, format = 'json') {
        try {
            let importData;
            
            switch (format) {
                case 'json':
                    importData = typeof data === 'string' ? JSON.parse(data) : data;
                    break;
                case 'svg':
                    importData = this.importFromSVG(data);
                    break;
                case 'dxf':
                    importData = this.importFromDXF(data);
                    break;
                default:
                    throw new Error(`Unsupported format: ${format}`);
            }

            this.processImportData(importData);
            return true;
        } catch (error) {
            console.error('Import error:', error);
            return false;
        }
    }

    processImportData(importData) {
        if (importData.objects && Array.isArray(importData.objects)) {
            for (const objData of importData.objects) {
                this.createGeometryFromImport(objData);
            }
        }
    }

    createGeometryFromImport(objData) {
        // Create geometry based on import data
        // This would handle different geometry types from various file formats
    }

    setupEventListeners() {
        // Mouse events for selection and manipulation
        this.renderer.domElement.addEventListener('click', (event) => this.handleClick(event));
        this.renderer.domElement.addEventListener('mousemove', (event) => this.handleMouseMove(event));
        this.renderer.domElement.addEventListener('contextmenu', (event) => this.handleContextMenu(event));
        
        // Keyboard events
        document.addEventListener('keydown', (event) => this.handleKeyDown(event));
        
        // Window resize
        window.addEventListener('resize', () => this.handleResize());
    }

    handleClick(event) {
        // Implement object picking
        const mouse = new THREE.Vector2();
        const rect = this.renderer.domElement.getBoundingClientRect();
        
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);

        const intersects = raycaster.intersectObjects(Array.from(this.objects.values()));
        
        if (intersects.length > 0) {
            const object = intersects[0].object;
            if (event.shiftKey) {
                // Add to selection
                this.selectObject(object.userData.id);
            } else {
                // Replace selection
                this.clearSelection();
                this.selectObject(object.userData.id);
            }
        } else {
            this.clearSelection();
        }
    }

    handleMouseMove(event) {
        // Implement mouse hover effects and dragging
    }

    handleContextMenu(event) {
        event.preventDefault();
        // Show context menu for selected objects
    }

    handleKeyDown(event) {
        switch (event.key) {
            case 'Delete':
            case 'Backspace':
                this.deleteSelected();
                break;
            case 'Escape':
                this.clearSelection();
                break;
            case 'a':
                if (event.ctrlKey) {
                    event.preventDefault();
                    this.selectAll();
                }
                break;
        }
    }

    handleResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    deleteSelected() {
        for (const id of this.selection) {
            this.removeObject(id);
        }
        this.clearSelection();
    }

    selectAll() {
        for (const [id, object] of this.objects) {
            if (object.userData.type === 'geometry') {
                this.selectObject(id);
            }
        }
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.render();
    }

    // Advanced geometry operations
    offsetGeometry(geometry, distance) {
        // Implement geometry offsetting for tool compensation
    }

    filletCorners(geometry, radius) {
        // Implement corner filleting
    }

    chamferCorners(geometry, distance) {
        // Implement corner chamfering
    }

    booleanOperation(geometry1, geometry2, operation) {
        // Implement boolean operations (union, difference, intersection)
    }

    // Measurement tools
    measureDistance(point1, point2) {
        return point1.distanceTo(point2);
    }

    measureAngle(vector1, vector2) {
        return vector1.angleTo(vector2);
    }

    // Viewport controls
    zoomToFit() {
        // Calculate bounding box of all objects and fit to view
        const bbox = new THREE.Box3();
        
        for (const object of this.objects.values()) {
            bbox.expandByObject(object);
        }
        
        const center = bbox.getCenter(new THREE.Vector3());
        const size = bbox.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = this.camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / Math.sin(fov / 2));
        
        cameraZ *= 1.5; // Add some padding
        
        this.camera.position.copy(center);
        this.camera.position.z += cameraZ;
        this.camera.lookAt(center);
    }

    setView(viewType) {
        const center = new THREE.Vector3(0, 0, 0);
        
        switch (viewType) {
            case 'top':
                this.camera.position.set(0, 200, 0);
                this.camera.up.set(0, 0, -1);
                break;
            case 'front':
                this.camera.position.set(0, 0, 200);
                this.camera.up.set(0, 1, 0);
                break;
            case 'right':
                this.camera.position.set(200, 0, 0);
                this.camera.up.set(0, 1, 0);
                break;
            case 'isometric':
                this.camera.position.set(150, 150, 150);
                this.camera.up.set(0, 1, 0);
                break;
        }
        
        this.camera.lookAt(center);
    }
}

// Geometry utilities
class GeometryUtils {
    static offsetPolygon(points, distance) {
        // Implementation of polygon offsetting
    }

    static filletPolygon(points, radius) {
        // Implementation of polygon filleting
    }

    static calculateArea(points) {
        // Calculate polygon area using shoelace formula
        let area = 0;
        const n = points.length;
        
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            area += points[i].x * points[j].y;
            area -= points[j].x * points[i].y;
        }
        
        return Math.abs(area) / 2;
    }

    static isClockwise(points) {
        // Determine if polygon is clockwise
        let sum = 0;
        const n = points.length;
        
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            sum += (points[j].x - points[i].x) * (points[j].y + points[i].y);
        }
        
        return sum > 0;
    }

    static pointInPolygon(point, polygon) {
        // Ray casting algorithm for point in polygon test
        let inside = false;
        const n = polygon.length;
        
        for (let i = 0, j = n - 1; i < n; j = i++) {
            if (((polygon[i].y > point.y) !== (polygon[j].y > point.y)) &&
                (point.x < (polygon[j].x - polygon[i].x) * (point.y - polygon[i].y) / (polygon[j].y - polygon[i].y) + polygon[i].x)) {
                inside = !inside;
            }
        }
        
        return inside;
    }
}
