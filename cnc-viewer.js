class CNCViewer {
    constructor() {
        this.canvas2D = document.getElementById('canvas-2d');
        this.ctx2D = this.canvas2D.getContext('2d');
        this.scene = new THREE.Scene();
        this.camera3D = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer3D = new THREE.WebGLRenderer({ canvas: document.getElementById('canvas-3d'), antialias: true });
        this.controls = new THREE.OrbitControls(this.camera3D, this.renderer3D.domElement);
        this.toolpaths = [];
        this.is2DView = false;
        this.showMaterial = false;
        this.materialMesh = null;
        this.animating = false;
        this.animationFrameId = null;
        this.currentToolNumber = 'N/A';
        this.viewcubeScene = new THREE.Scene();
        this.viewcubeCamera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        this.viewcubeRenderer = new THREE.WebGLRenderer({ 
            canvas: document.getElementById('viewcube-canvas'), 
            antialias: true 
        });
        this.init();
        this.initViewcube();
    }

    init() {
        this.resizeCanvas();
        this.ctx2D.strokeStyle = '#0000ff';
        this.ctx2D.lineWidth = 1;

        this.renderer3D.setSize(this.canvas2D.width, this.canvas2D.height);
        this.camera3D.position.set(50, 50, 50);
        this.camera3D.lookAt(0, 0, 0);
        this.controls.enableDSamplers(this.controls);
        this.controls.enableDamping = true;
        this.controls.target.set(0, 0, 0);
        this.scene.add(new THREE.AmbientLight(0x404040));
        const light = new THREE.DirectionalLight(0xffffff, 0.8);
        light.position.set(1, 1, 1);
        this.scene.add(light);

        const grid = new THREE.GridHelper(100, 100, 0x888888, 0x888888);
        grid.position.set(0, 0, -0.1);
        this.scene.add(grid);

        this.animate();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    initViewcube() {
        this.viewcubeRenderer.setSize(100, 100);
        this.viewcubeCamera.position.set(2, 2, 2);
        this.viewcubeCamera.lookAt(0, 0, 0);

        const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
        const cubeMaterial = new THREE.MeshBasicMaterial({ color: 0x888888, wireframe: true });
        const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
        this.viewcubeScene.add(cube);

        const axesHelper = new THREE.AxesHelper(1.5);
        this.viewcubeScene.add(axesHelper);
    }

    resizeCanvas() {
        const container = document.getElementById('canvas-container');
        this.canvas2D.width = container.clientWidth;
        this.canvas2D.height = container.clientHeight;
        this.renderer3D.setSize(container.clientWidth, container.clientHeight);
        this.camera3D.aspect = container.clientWidth / container.clientHeight;
        this.camera3D.updateProjectionMatrix();
    }

    loadToolpaths(toolpaths) {
        this.toolpaths = toolpaths;
        this.showMaterial = true;
        this.render2D();
        this.render3D();
        this.loadMaterial();
    }

    render2D() {
        this.ctx2D.clearRect(0, 0, this.canvas2D.width, this.canvas2D.height);
        const scale = Math.min(this.canvas2D.width, this.canvas2D.height) / 100;
        const offsetX = this.canvas2D.width / 2;
        const offsetY = this.canvas2D.height / 2;

        this.ctx2D.strokeStyle = '#888888';
        this.ctx2D.lineWidth = 0.5;
        for (let i = -50; i <= 50; i += 5) {
            this.ctx2D.beginPath();
            this.ctx2D.moveTo(i * scale + offsetX, -50 * scale + offsetY);
            this.ctx2D.lineTo(i * scale + offsetX, 50 * scale + offsetY);
            this.ctx2D.stroke();
            this.ctx2D.beginPath();
            this.ctx2D.moveTo(-50 * scale + offsetX, i * scale + offsetY);
            this.ctx2D.lineTo(50 * scale + offsetX, i * scale + offsetY);
            this.ctx2D.stroke();
        }

        this.ctx2D.strokeStyle = '#0000ff';
        this.ctx2D.lineWidth = 1;
        this.toolpaths.forEach(tp => {
            this.ctx2D.beginPath();
            tp.points.forEach((p, i) => {
                const x = p.x * scale + offsetX;
                const y = p.y * scale + offsetY;
                if (i === 0) this.ctx2D.moveTo(x, y);
                else this.ctx2D.lineTo(x, y);
            });
            this.ctx2D.stroke();
        });
    }

    render3D() {
        this.scene.children.filter(obj => obj.userData.isToolpath || obj === this.materialMesh).forEach(obj => this.scene.remove(obj));
        this.toolpaths.forEach(tp => {
            const points = tp.points.map(p => {
                const vec = new THREE.Vector3(p.x, p.y, p.z);
                vec.applyAxisAngle(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(p.a || 0));
                return vec;
            });
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineBasicMaterial({ color: 0x0000ff });
            const line = new THREE.Line(geometry, material);
            line.userData.isToolpath = true;
            this.scene.add(line);
        });
    }

    loadMaterial() {
        if (this.materialMesh) this.scene.remove(this.materialMesh);
        if (!this.showMaterial || !this.toolpaths.length) return;

        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
        this.toolpaths.forEach(tp => {
            tp.points.forEach(p => {
                minX = Math.min(minX, p.x);
                minY = Math.min(minY, p.y);
                minZ = Math.min(minZ, p.z);
                maxX = Math.max(maxX, p.x);
                maxY = Math.max(maxY, p.y);
                maxZ = Math.max(maxZ, p.z);
            });
        });

        const width = Math.max(maxX - minX + 10, 50);
        const height = Math.max(maxY - minY + 10, 50);
        const depth = Math.max(maxZ - minZ + 10, 50);
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const material = new THREE.MeshPhongMaterial({ 
            color: 0xaaaaaa, 
            transparent: true, 
            opacity: 0.7,
            shininess: 30
        });
        this.materialMesh = new THREE.Mesh(geometry, material);
        this.materialMesh.position.set((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2);
        this.scene.add(this.materialMesh);
    }

    toggleView() {
        this.is2DView = !this.is2DView;
        this.canvas2D.style.display = this.is2DView ? 'block' : 'none';
        this.canvas3D.style.display = this.is2DView ? 'none' : 'block';
        if (this.is2DView) this.render2D();
    }

    toggleMaterial() {
        this.showMaterial = !this.showMaterial;
        if (this.materialMesh) this.materialMesh.visible = this.showMaterial;
        if (this.showMaterial && !this.materialMesh && this.toolpaths.length) this.loadMaterial();
    }

    resetView() {
        if (this.is2DView) {
            this.render2D();
        } else {
            this.camera3D.position.set(50, 50, 50);
            this.controls.target.set(0, 0, 0);
            this.controls.update();
            this.viewcubeCamera.position.set(2, 2, 2);
            this.viewcubeCamera.lookAt(0, 0, 0);
        }
    }

    setView(view) {
        if (this.is2DView) return;
        const distance = 75;
        switch (view) {
            case 'top':
                this.camera3D.position.set(0, distance, 0);
                this.viewcubeCamera.position.set(0, 2, 0);
                break;
            case 'front':
                this.camera3D.position.set(0, 0, distance);
                this.viewcubeCamera.position.set(0, 0, 2);
                break;
            case 'right':
                this.camera3D.position.set(distance, 0, 0);
                this.viewcubeCamera.position.set(2, 0, 0);
                break;
            case 'home':
                this.camera3D.position.set(50, 50, 50);
                this.viewcubeCamera.position.set(2, 2, 2);
                break;
        }
        this.controls.target.set(0, 0, 0);
        this.controls.update();
        this.viewcubeCamera.lookAt(0, 0, 0);
    }

    startSimulation(direction = 1) {
        if (!this.toolpaths.length) return;
        this.animating = true;
        if (!this.animationData) {
            this.animationData = { 
                currentPath: direction > 0 ? 0 : this.toolpaths.length - 1, 
                currentPoint: direction > 0 ? 0 : this.toolpaths[direction > 0 ? 0 : this.toolpaths.length - 1].points.length - 1, 
                speed: 0.05,
                direction
            };
        } else {
            this.animationData.direction = direction;
        }
        document.getElementById(direction > 0 ? 'ctrl-play' : 'ctrl-play-reverse').classList.add('active');
        this.togglePlayPause(direction > 0 ? 'ctrl-play' : 'ctrl-play-reverse', true);
    }

    stopSimulation() {
        this.animating = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        document.getElementById('ctrl-play').classList.remove('active');
        document.getElementById('ctrl-play-reverse').classList.remove('active');
        this.togglePlayPause('ctrl-play', false);
        this.togglePlayPause('ctrl-play-reverse', false);
    }

    skipBackward(steps = 1) {
        if (!this.toolpaths.length || !this.animationData) return;
        this.animationData.currentPath = Math.max(0, this.animationData.currentPath - steps);
        this.animationData.currentPoint = 0;
        if (!this.animating) this.updateSimulation();
    }

    skipForward(steps = 1) {
        if (!this.toolpaths.length || !this.animationData) return;
        this.animationData.currentPath = Math.min(
            this.toolpaths.length - 1,
            this.animationData.currentPath + steps
        );
        this.animationData.currentPoint = 0;
        if (!this.animating) this.updateSimulation();
    }

    fastRewind() {
        this.skipBackward(5);
    }

    fastForward() {
        this.skipForward(5);
    }

    setSpeed(speed) {
        if (this.animationData) {
            this.animationData.speed = parseFloat(speed);
        }
    }

    exportToSTL() {
        if (!this.materialMesh) return;
        const exporter = new THREE.STLExporter();
        const stlString = exporter.parse(this.materialMesh);
        const blob = new Blob([stlString], { type: 'text/plain' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'cnc_model.stl';
        link.click();
    }

    togglePlayPause(buttonId, isPlaying) {
        const playBtn = document.getElementById(`${buttonId === 'ctrl-play' ? 'play-btn' : 'play-btn-reverse'}`);
        const pauseBtn = document.getElementById(`${buttonId === 'ctrl-play' ? 'pause-btn' : 'pause-btn-reverse'}`);
        playBtn.style.display = isPlaying ? 'none' : '';
        pauseBtn.style.display = isPlaying ? '' : 'none';
    }

    plotGcode() {
        const gcodeText = document.getElementById('gcode-input').value;
        if (!gcodeText.trim()) {
            alert('No G-code to plot. Please enter or upload G-code first.');
            return;
        }
        const parser = new GcodeParser(gcodeText);
        const data = parser.parse();
        if (data.success) {
            this.loadToolpaths(data.toolpaths);
            this.updateInfo(null, data);
        } else {
            alert('Failed to parse G-code. Please check the syntax.');
        }
    }

    clearPlot() {
        this.toolpaths = [];
        this.stopSimulation();
        this.ctx2D.clearRect(0, 0, this.canvas2D.width, this.canvas2D.height);
        this.scene.children.filter(obj => obj.userData.isToolpath || obj === this.materialMesh).forEach(obj => this.scene.remove(obj));
        if (this.materialMesh) {
            this.scene.remove(this.materialMesh);
            this.materialMesh = null;
        }
        this.updateInfo(null, { toolpaths: [], units: 'N/A' });
        document.getElementById('current-tool').textContent = 'N/A';
    }

    updateInfo(file, data) {
        document.getElementById('file-name').textContent = file ? file.name : 'None';
        document.getElementById('file-size').textContent = file ? `${(file.size / 1024).toFixed(2)} KB` : '0 KB';
        document.getElementById('toolpath-count').textContent = data.toolpaths.length;
        document.getElementById('units').textContent = data.units || data.header?.units || 'N/A';

        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
        data.toolpaths.forEach(tp => {
            tp.points.forEach(p => {
                minX = Math.min(minX, p.x);
                minY = Math.min(minY, p.y);
                minZ = Math.min(minZ, p.z);
                maxX = Math.max(maxX, p.x);
                maxY = Math.max(maxY, p.y);
                maxZ = Math.max(maxZ, p.z);
            });
        });
        document.getElementById('bounds').textContent = data.toolpaths.length ? 
            `X: ${minX.toFixed(1)}-${maxX.toFixed(1)}, Y: ${minY.toFixed(1)}-${maxY.toFixed(1)}, Z: ${minZ.toFixed(1)}-${maxZ.toFixed(1)}` : 
            'N/A';
    }

    updateSimulation() {
        if (!this.animating || !this.animationData) return;
        const { currentPath, currentPoint, speed, direction } = this.animationData;
        
        if (currentPath >= this.toolpaths.length || currentPath < 0) {
            this.stopSimulation();
            return;
        }

        const path = this.toolpaths[currentPath];
        const pointIndex = Math.floor(currentPoint);
        
        if (pointIndex >= path.points.length || pointIndex < 0) {
            this.animationData.currentPath += direction;
            this.animationData.currentPoint = direction > 0 ? 0 : path.points.length - 1;
            return;
        }

        const point = path.points[pointIndex];
        this.currentToolNumber = path.toolNumber;
        document.getElementById('current-tool').textContent = this.currentToolNumber;

        if (this.is2DView) {
            this.render2D();
            const scale = Math.min(this.canvas2D.width, this.canvas2D.height) / 100;
            const offsetX = this.canvas2D.width / 2;
            const offsetY = this.canvas2D.height / 2;
            this.ctx2D.fillStyle = '#ff0000';
            this.ctx2D.beginPath();
            this.ctx2D.arc(point.x * scale + offsetX, point.y * scale + offsetY, 1, 0, 2 * Math.PI);
            this.ctx2D.fill();
        } else {
            const tool = new THREE.Mesh(
                new THREE.CylinderGeometry(0.5, 0.5, 1.5, 16),
                new THREE.MeshBasicMaterial({ color: 0xff0000 })
            );
            tool.position.set(point.x, point.y, point.z);
            tool.rotation.x = THREE.MathUtils.degToRad(point.a || 0) + Math.PI / 2;
            tool.userData.isToolpath = true;
            this.scene.add(tool);
            setTimeout(() => this.scene.remove(tool), 100);
        }

        this.animationData.currentPoint += speed * direction;
    }

    animate() {
        this.animationFrameId = requestAnimationFrame(() => this.animate());
        this.updateSimulation();
        if (!this.is2DView) {
            this.controls.update();
            this.renderer3D.render(this.scene, this.camera3D);
            const cameraDirection = new THREE.Vector3();
            this.camera3D.getWorldDirection(cameraDirection);
            this.viewcubeCamera.position.copy(cameraDirection).multiplyScalar(-2).add(new THREE.Vector3(0, 0, 0));
            this.viewcubeCamera.lookAt(0, 0, 0);
            this.viewcubeRenderer.render(this.viewcubeScene, this.viewcubeCamera);
        }
    }
}
