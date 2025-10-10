class FileIO {
    constructor() {
        this.supportedFormats = {
            import: ['.nc', '.txt', '.gcode', '.ngc', '.tap', '.json', '.dxf', '.svg', '.stl', '.step', '.iges'],
            export: ['.nc', '.txt', '.gcode', '.json', '.csv', '.dxf', '.svg', '.html', '.pdf']
        };
    }

    async openFile(options = {}) {
        return new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = options.accept || this.supportedFormats.import.join(',');
            
            input.onchange = (event) => {
                const file = event.target.files[0];
                if (!file) {
                    reject(new Error('No file selected'));
                    return;
                }

                this.readFile(file, options)
                    .then(resolve)
                    .catch(reject);
            };

            input.click();
        });
    }

    async readFile(file, options = {}) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                try {
                    const result = this.processFileContent(event.target.result, file, options);
                    resolve({
                        name: file.name,
                        size: file.size,
                        type: file.type,
                        content: result,
                        file: file
                    });
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => reject(new Error('Failed to read file'));

            switch (options.readAs || this.getReadMethod(file)) {
                case 'text':
                    reader.readAsText(file);
                    break;
                case 'binary':
                    reader.readAsArrayBuffer(file);
                    break;
                case 'dataURL':
                    reader.readAsDataURL(file);
                    break;
                default:
                    reader.readAsText(file);
            }
        });
    }

    getReadMethod(file) {
        const extension = this.getFileExtension(file.name);
        
        if (['.stl', '.step', '.iges'].includes(extension)) {
            return 'binary';
        } else if (['.jpg', '.jpeg', '.png', '.gif'].includes(extension)) {
            return 'dataURL';
        } else {
            return 'text';
        }
    }

    processFileContent(content, file, options) {
        const extension = this.getFileExtension(file.name);
        
        switch (extension) {
            case '.json':
                return JSON.parse(content);
            case '.nc':
            case '.txt':
            case '.gcode':
            case '.ngc':
            case '.tap':
                return this.parseGCode(content);
            case '.dxf':
                return this.parseDXF(content);
            case '.svg':
                return this.parseSVG(content);
            case '.stl':
                return this.parseSTL(content);
            default:
                return content;
        }
    }

    parseGCode(content) {
        return {
            type: 'gcode',
            content: content,
            lines: content.split('\n').map((line, index) => ({
                number: index + 1,
                content: line.trim(),
                original: line
            }))
        };
    }

    parseDXF(content) {
        // Simplified DXF parser - in production use a proper DXF library
        const entities = [];
        const lines = content.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].trim() === '0' && lines[i + 1] && lines[i + 1].trim() === 'SECTION') {
                // Start of section
                const sectionType = lines[i + 3] && lines[i + 3].trim();
                if (sectionType === 'ENTITIES') {
                    // Parse entities section
                    entities.push(...this.parseDXFEntities(lines, i + 4));
                }
            }
        }
        
        return {
            type: 'dxf',
            entities: entities,
            content: content
        };
    }

    parseDXFEntities(lines, startIndex) {
        const entities = [];
        let i = startIndex;
        
        while (i < lines.length) {
            if (lines[i].trim() === '0' && lines[i + 1] && lines[i + 1].trim() === 'ENDSEC') {
                break;
            }
            
            if (lines[i].trim() === '0') {
                const entityType = lines[i + 1] && lines[i + 1].trim();
                const entity = this.parseDXFEntity(lines, i, entityType);
                if (entity) {
                    entities.push(entity);
                }
            }
            i++;
        }
        
        return entities;
    }

    parseDXFEntity(lines, startIndex, entityType) {
        // Simplified entity parsing
        switch (entityType) {
            case 'LINE':
                return this.parseDXFLine(lines, startIndex);
            case 'CIRCLE':
                return this.parseDXFCircle(lines, startIndex);
            case 'ARC':
                return this.parseDXFArc(lines, startIndex);
            case 'LWPOLYLINE':
                return this.parseDXFPolyline(lines, startIndex);
            default:
                return null;
        }
    }

    parseDXFLine(lines, startIndex) {
        let x1, y1, x2, y2;
        let i = startIndex;
        
        while (i < lines.length && lines[i].trim() !== '0') {
            const code = lines[i].trim();
            const value = lines[i + 1] && lines[i + 1].trim();
            
            if (code === '10') x1 = parseFloat(value);
            if (code === '20') y1 = parseFloat(value);
            if (code === '11') x2 = parseFloat(value);
            if (code === '21') y2 = parseFloat(value);
            
            i += 2;
        }
        
        return x1 !== undefined ? {
            type: 'line',
            start: { x: x1, y: y1 },
            end: { x: x2, y: y2 }
        } : null;
    }

    parseSVG(content) {
        // Simplified SVG parser
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'image/svg+xml');
        const paths = [];
        
        // Extract path data
        const pathElements = doc.querySelectorAll('path');
        pathElements.forEach(path => {
            const d = path.getAttribute('d');
            if (d) {
                paths.push({
                    type: 'path',
                    data: d,
                    transform: path.getAttribute('transform')
                });
            }
        });
        
        // Extract other shapes
        const circles = doc.querySelectorAll('circle');
        circles.forEach(circle => {
            paths.push({
                type: 'circle',
                cx: parseFloat(circle.getAttribute('cx')),
                cy: parseFloat(circle.getAttribute('cy')),
                r: parseFloat(circle.getAttribute('r'))
            });
        });
        
        return {
            type: 'svg',
            paths: paths,
            content: content
        };
    }

    parseSTL(content) {
        // Basic STL parser for ASCII format
        if (typeof content === 'string') {
            return this.parseASCIISTL(content);
        } else {
            return this.parseBinarySTL(content);
        }
    }

    parseASCIISTL(content) {
        const vertices = [];
        const lines = content.split('\n');
        let currentNormal = null;
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            if (trimmed.startsWith('facet normal')) {
                const parts = trimmed.split(/\s+/);
                currentNormal = {
                    x: parseFloat(parts[2]),
                    y: parseFloat(parts[3]),
                    z: parseFloat(parts[4])
                };
            } else if (trimmed.startsWith('vertex')) {
                const parts = trimmed.split(/\s+/);
                vertices.push({
                    x: parseFloat(parts[1]),
                    y: parseFloat(parts[2]),
                    z: parseFloat(parts[3]),
                    normal: currentNormal
                });
            }
        }
        
        return {
            type: 'stl',
            format: 'ascii',
            vertices: vertices
        };
    }

    parseBinarySTL(arrayBuffer) {
        // Basic binary STL parser
        const dataView = new DataView(arrayBuffer);
        const vertices = [];
        let offset = 80; // Skip header
        
        const numTriangles = dataView.getUint32(offset, true);
        offset += 4;
        
        for (let i = 0; i < numTriangles; i++) {
            // Skip normal
            offset += 12;
            
            // Read vertices
            for (let j = 0; j < 3; j++) {
                vertices.push({
                    x: dataView.getFloat32(offset, true),
                    y: dataView.getFloat32(offset + 4, true),
                    z: dataView.getFloat32(offset + 8, true)
                });
                offset += 12;
            }
            
            // Skip attribute byte count
            offset += 2;
        }
        
        return {
            type: 'stl',
            format: 'binary',
            vertices: vertices
        };
    }

    async saveFile(content, options = {}) {
        return new Promise((resolve, reject) => {
            try {
                const blob = this.createBlob(content, options);
                const url = URL.createObjectURL(blob);
                
                const a = document.createElement('a');
                a.href = url;
                a.download = options.filename || this.generateFilename(options);
                a.style.display = 'none';
                
                document.body.appendChild(a);
                a.click();
                
                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    resolve(true);
                }, 100);
            } catch (error) {
                reject(error);
            }
        });
    }

    createBlob(content, options) {
        const type = options.type || this.getMimeType(options.format);
        
        if (typeof content === 'string') {
            return new Blob([content], { type });
        } else if (content instanceof ArrayBuffer) {
            return new Blob([content], { type });
        } else {
            return new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
        }
    }

    getMimeType(format) {
        const mimeTypes = {
            '.nc': 'text/plain',
            '.txt': 'text/plain',
            '.gcode': 'text/plain',
            '.json': 'application/json',
            '.csv': 'text/csv',
            '.html': 'text/html',
            '.pdf': 'application/pdf',
            '.dxf': 'application/dxf',
            '.svg': 'image/svg+xml'
        };
        
        return mimeTypes[format] || 'text/plain';
    }

    generateFilename(options) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const baseName = options.baseName || 'webcnc';
        const format = options.format || '.nc';
        
        return `${baseName}_${timestamp}${format}`;
    }

    getFileExtension(filename) {
        return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2).toLowerCase();
    }

    async exportGCode(gcode, options = {}) {
        const content = this.formatGCodeForExport(gcode, options);
        return this.saveFile(content, {
            ...options,
            format: '.nc',
            baseName: options.filename || 'program'
        });
    }

    formatGCodeForExport(gcode, options) {
        if (typeof gcode === 'string') {
            return gcode;
        }
        
        if (Array.isArray(gcode)) {
            return gcode.map(cmd => this.formatGCodeCommand(cmd, options)).join('\n');
        }
        
        return JSON.stringify(gcode, null, 2);
    }

    formatGCodeCommand(command, options) {
        if (typeof command === 'string') {
            return command;
        }
        
        if (command.type === 'comment') {
            return `; ${command.value}`;
        }
        
        if (command.type === 'command') {
            let line = command.code || '';
            
            // Add parameters
            for (const [axis, value] of Object.entries(command.parameters)) {
                if (axis !== 'VAR') {
                    line += ` ${axis}${this.formatNumber(value, options)}`;
                }
            }
            
            // Add comment
            if (command.comment) {
                line += ` ; ${command.comment}`;
            }
            
            return line;
        }
        
        return '';
    }

    formatNumber(value, options) {
        const decimals = options.decimals || 3;
        return value.toFixed(decimals);
    }

    async exportSetupSheet(setupSheet, options = {}) {
        const content = this.formatSetupSheet(setupSheet, options);
        return this.saveFile(content, {
            ...options,
            format: '.html',
            baseName: options.filename || 'setup_sheet'
        });
    }

    formatSetupSheet(setupSheet, options) {
        return `
<!DOCTYPE html>
<html>
<head>
    <title>${setupSheet.programInfo.fileName} - Setup Sheet</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .section { margin-bottom: 30px; border: 1px solid #ccc; padding: 20px; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { border: 1px solid #ccc; padding: 8px 12px; text-align: left; }
        th { background-color: #f5f5f5; font-weight: bold; }
        .warning { color: #d35400; font-weight: bold; }
        .critical { color: #c0392b; font-weight: bold; }
        .header { background: #2c3e50; color: white; padding: 15px; margin-bottom: 20px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>CNC Setup Sheet</h1>
        <p><strong>Program:</strong> ${setupSheet.programInfo.fileName}</p>
        <p><strong>Created:</strong> ${new Date(setupSheet.programInfo.created).toLocaleString()}</p>
    </div>

    <div class="section">
        <h2>Workpiece Information</h2>
        <table>
            <tr><th>Material</th><td>${setupSheet.workpiece.material}</td></tr>
            <tr><th>Dimensions</th><td>${setupSheet.workpiece.dimensions.width} × ${setupSheet.workpiece.dimensions.height} × ${setupSheet.workpiece.depth} mm</td></tr>
            <tr><th>Stock to Leave (XY)</th><td>${setupSheet.workpiece.stockToLeave.xy} mm</td></tr>
            <tr><th>Stock to Leave (Z)</th><td>${setupSheet.workpiece.stockToLeave.z} mm</td></tr>
        </table>
    </div>

    <div class="section">
        <h2>Tool List</h2>
        <table>
            <tr>
                <th>Tool #</th>
                <th>Description</th>
                <th>Diameter</th>
                <th>Type</th>
                <th>Feed Rate</th>
                <th>Spindle Speed</th>
            </tr>
            ${setupSheet.tools.map(tool => `
                <tr>
                    <td>${tool.id}</td>
                    <td>${tool.description}</td>
                    <td>${tool.diameter} mm</td>
                    <td>${tool.type}</td>
                    <td>${tool.feedRate} mm/min</td>
                    <td>${tool.spindleSpeed} RPM</td>
                </tr>
            `).join('')}
        </table>
    </div>

    <div class="section">
        <h2>Operations</h2>
        <table>
            <tr>
                <th>Operation</th>
                <th>Tool</th>
                <th>Depth</th>
                <th>Step Down</th>
                <th>Feed Rate</th>
                <th>Spindle Speed</th>
            </tr>
            ${setupSheet.operations.map(op => `
                <tr>
                    <td>${op.type}</td>
                    <td>T${op.tool}</td>
                    <td>${op.depth} mm</td>
                    <td>${op.stepDown} mm</td>
                    <td>${op.feedRate} mm/min</td>
                    <td>${op.spindleSpeed} RPM</td>
                </tr>
            `).join('')}
        </table>
    </div>

    <div class="section">
        <h2>Safety Notes</h2>
        <ul>
            ${setupSheet.safetyNotes.map(note => `
                <li class="warning">${note}</li>
            `).join('')}
        </ul>
    </div>

    <div class="section">
        <h2>Program Summary</h2>
        <table>
            <tr><th>Estimated Cycle Time</th><td>${Math.round(setupSheet.estimatedTime / 60)} minutes</td></tr>
            <tr><th>Total Operations</th><td>${setupSheet.operations.length}</td></tr>
            <tr><th>Tools Used</th><td>${setupSheet.tools.length}</td></tr>
        </table>
    </div>
</body>
</html>`;
    }

    async exportProject(projectData, options = {}) {
        const content = JSON.stringify(projectData, null, 2);
        return this.saveFile(content, {
            ...options,
            format: '.json',
            baseName: options.filename || 'webcnc_project'
        });
    }

    async importProject(file) {
        const result = await this.readFile(file, { readAs: 'text' });
        
        if (result.content.type === 'json') {
            return result.content.content;
        } else {
            throw new Error('Invalid project file format');
        }
    }

    // Utility methods for file handling
    validateFileSize(file, maxSizeMB = 10) {
        const maxSize = maxSizeMB * 1024 * 1024;
        if (file.size > maxSize) {
            throw new Error(`File size exceeds ${maxSizeMB}MB limit`);
        }
        return true;
    }

    validateFileType(file, allowedTypes = []) {
        const extension = this.getFileExtension(file.name);
        if (allowedTypes.length > 0 && !allowedTypes.includes(extension)) {
            throw new Error(`File type ${extension} not supported`);
        }
        return true;
    }

    getFileInfo(file) {
        return {
            name: file.name,
            size: this.formatFileSize(file.size),
            type: file.type,
            extension: this.getFileExtension(file.name),
            lastModified: new Date(file.lastModified).toLocaleString()
        };
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Drag and drop support
    setupDropZone(element, callbacks) {
        element.addEventListener('dragover', (event) => {
            event.preventDefault();
            element.classList.add('drag-over');
        });

        element.addEventListener('dragleave', (event) => {
            event.preventDefault();
            element.classList.remove('drag-over');
        });

        element.addEventListener('drop', async (event) => {
            event.preventDefault();
            element.classList.remove('drag-over');
            
            const files = Array.from(event.dataTransfer.files);
            
            for (const file of files) {
                try {
                    const result = await this.readFile(file);
                    if (callbacks.onFileLoaded) {
                        callbacks.onFileLoaded(result);
                    }
                } catch (error) {
                    if (callbacks.onError) {
                        callbacks.onError(error, file);
                    }
                }
            }
        });
    }

    // Recent files management
    getRecentFiles() {
        try {
            return JSON.parse(localStorage.getItem('webcnc_recent_files') || '[]');
        } catch {
            return [];
        }
    }

    addRecentFile(fileInfo) {
        const recentFiles = this.getRecentFiles();
        
        // Remove if already exists
        const existingIndex = recentFiles.findIndex(f => f.path === fileInfo.path);
        if (existingIndex !== -1) {
            recentFiles.splice(existingIndex, 1);
        }
        
        // Add to beginning
        recentFiles.unshift(fileInfo);
        
        // Keep only last 10 files
        if (recentFiles.length > 10) {
            recentFiles.splice(10);
        }
        
        localStorage.setItem('webcnc_recent_files', JSON.stringify(recentFiles));
    }

    clearRecentFiles() {
        localStorage.removeItem('webcnc_recent_files');
    }
}
