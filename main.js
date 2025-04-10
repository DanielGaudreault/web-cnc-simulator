function detectFileFormat(buffer, fileName) {
    const header = new Uint8Array(buffer.slice(0, 4));
    const headerStr = String.fromCharCode(...header);
    const ext = fileName.split('.').pop().toLowerCase();

    console.log('File header:', headerStr, 'Extension:', ext);
    if (headerStr === 'MCAM' || headerStr === 'MMC2') return 'MCAM';
    if (ext === 'gcode' || ext === 'nc' || ext === 'tap' || headerStr.startsWith('%') || new TextDecoder().decode(buffer).match(/G[0-1]/)) return 'GCODE';
    return 'UNKNOWN';
}

document.addEventListener('DOMContentLoaded', () => {
    const viewer = new CNCViewer();
    const fileInput = document.getElementById('file-input');
    const gcodeInput = document.getElementById('gcode-input');
    const viewToggleBtn = document.getElementById('view-toggle');
    const ctrlFastRewind = document.getElementById('ctrl-fastrewind');
    const ctrlRewind = document.getElementById('ctrl-rewind');
    const ctrlPlayReverse = document.getElementById('ctrl-play-reverse');
    const ctrlStop = document.getElementById('ctrl-stop');
    const ctrlPlayStart = document.getElementById('ctrl-play-start'); // New play button
    const ctrlPlay = document.getElementById('ctrl-play');
    const ctrlFwd = document.getElementById('ctrl-fwd');
    const ctrlFastFwd = document.getElementById('ctrl-fastfwd');
    const speedSlider = document.getElementById('speed-slider');
    const resetViewBtn = document.getElementById('reset-view');
    const toggleMaterialBtn = document.getElementById('toggle-material');
    const exportBtn = document.getElementById('export-btn');
    const plotFileBtn = document.getElementById('plot-file-btn');
    const clearPlotBtn = document.getElementById('clear-plot');
    const settingsPlotBtn = document.getElementById('settings-plot');
    const vcHomeBtn = document.getElementById('vc-home');
    const saveBtn = document.getElementById('save-btn');
    const openFileBtn = document.getElementById('open-file-btn');
    const sampleCircleBtn = document.getElementById('sample-circle-btn');
    const sampleSquareBtn = document.getElementById('sample-square-btn');
    const redoBtn = document.getElementById('redo-btn');
    const undoBtn = document.getElementById('undo-btn');
    const loadingOverlay = document.getElementById('loading-overlay');

    const sampleCircleGcode = `
        G21 ; Set units to millimeters
        G90 ; Absolute positioning
        T1 M6 ; Tool change to tool 1
        G0 X0 Y0 Z5 ; Move to starting position
        G1 Z-1 F100 ; Lower tool
        G2 X0 Y0 I10 J0 F200 ; Draw circle (radius 10mm)
        G0 Z5 ; Raise tool
    `;

    const sampleSquareGcode = `
        G21 ; Set units to millimeters
        G90 ; Absolute positioning
        T1 M6 ; Tool change to tool 1
        G0 X-10 Y-10 Z5 ; Move to starting position
        G1 Z-1 F100 ; Lower tool
        G1 X10 Y-10 F200 ; Draw square
        G1 X10 Y10
        G1 X-10 Y10
        G1 X-10 Y-10
        G0 Z5 ; Raise tool
    `;

    openFileBtn.addEventListener('click', () => {
        fileInput.click();
    });

    function loadFile(file) {
        loadingOverlay.style.display = 'flex';
        const reader = new FileReader();

        reader.onload = () => {
            const buffer = reader.result;
            const format = detectFileFormat(buffer, file.name);

            if (format === 'MCAM') {
                const parser = new McamParser(buffer);
                const data = parser.parse();
                if (data.success) {
                    viewer.loadToolpaths(data.toolpaths);
                    viewer.updateInfo(file, data);
                    gcodeInput.value = data.geometry ? 'Binary MCAM file - toolpaths only (not editable)' : gcodeInput.value;
                } else {
                    alert(`MCAM parsing failed: ${data.error}`);
                }
            } else if (format === 'GCODE') {
                const text = new TextDecoder().decode(buffer);
                gcodeInput.value = text;
                const parser = new GcodeParser(text);
                const data = parser.parse();
                if (data.success) {
                    viewer.loadToolpaths(data.toolpaths);
                    viewer.updateInfo(file, data);
                } else {
                    alert('G-code parsing failed');
                }
            } else {
                alert(`Unsupported file format: ${format}`);
            }
            loadingOverlay.style.display = 'none';
        };

        reader.readAsArrayBuffer(file);
    }

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) loadFile(file);
    });

    viewToggleBtn.addEventListener('click', () => {
        viewer.toggleView();
        viewToggleBtn.classList.toggle('active');
    });

    ctrlFastRewind.addEventListener('click', () => {
        viewer.fastRewind();
    });

    ctrlRewind.addEventListener('click', () => {
        viewer.skipBackward();
    });

    ctrlPlayReverse.addEventListener('click', () => {
        if (viewer.animating && viewer.animationData?.direction < 0) {
            viewer.stopSimulation();
        } else {
            viewer.startSimulation(-1);
        }
    });

    ctrlStop.addEventListener('click', () => {
        viewer.stopSimulation();
    });

    ctrlPlayStart.addEventListener('click', () => {
        viewer.startSimulation(1); // Dedicated play button always starts forward
    });

    ctrlPlay.addEventListener('click', () => {
        if (viewer.animating && viewer.animationData?.direction > 0) {
            viewer.stopSimulation();
        } else {
            viewer.startSimulation(1);
        }
    });

    ctrlFwd.addEventListener('click', () => {
        viewer.skipForward();
    });

    ctrlFastFwd.addEventListener('click', () => {
        viewer.fastForward();
    });

    speedSlider.addEventListener('input', (e) => {
        viewer.setSpeed(e.target.value);
    });

    resetViewBtn.addEventListener('click', () => {
        viewer.resetView();
    });

    toggleMaterialBtn.addEventListener('click', () => {
        viewer.toggleMaterial();
    });

    exportBtn.addEventListener('click', () => {
        viewer.exportToSTL();
    });

    plotFileBtn.addEventListener('click', () => {
        viewer.plotGcode();
    });

    clearPlotBtn.addEventListener('click', () => {
        viewer.clearPlot();
    });

    settingsPlotBtn.addEventListener('click', () => {
        alert('Settings functionality not implemented yet.'); // Placeholder for future settings
    });

    vcHomeBtn.addEventListener('click', () => {
        viewer.setView('home');
    });

    saveBtn.addEventListener('click', () => {
        const gcodeText = gcodeInput.value;
        if (!gcodeText.trim()) {
            alert('No G-code to save.');
            return;
        }
        const blob = new Blob([gcodeText], { type: 'text/plain' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'gcode.nc';
        link.click();
    });

    sampleCircleBtn.addEventListener('click', () => {
        gcodeInput.value = sampleCircleGcode;
        viewer.plotGcode();
    });

    sampleSquareBtn.addEventListener('click', () => {
        gcodeInput.value = sampleSquareGcode;
        viewer.plotGcode();
    });

    redoBtn.addEventListener('click', () => {
        viewer.redo();
    });

    undoBtn.addEventListener('click', () => {
        viewer.undo();
    });
});
