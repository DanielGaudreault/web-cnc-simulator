class McamParser {
    constructor(buffer) {
        this.buffer = buffer;
        this.dataView = new DataView(buffer);
        this.offset = 0;
        this.littleEndian = true;
        this.supportedVersions = [1, 2, 3];
    }

    parse() {
        console.log('MCAM Parser: File size:', this.buffer.byteLength);
        try {
            this.checkFileSize();
            const header = this.parseHeader();
            console.log('MCAM Header:', header);
            if (!this.supportedVersions.includes(header.version)) throw new Error(`Unsupported MCAM version ${header.version}`);
            const geometry = this.parseGeometry(header.version);
            console.log('MCAM Geometry: vertices=', geometry.vertices.length / 3, 'faces=', geometry.faces.length / 3);
            const toolpaths = this.parseToolpaths(header.version);
            console.log('MCAM Toolpaths:', toolpaths.length);
            return { success: true, header, geometry, toolpaths };
        } catch (error) {
            console.error('MCAM Binary Parsing Failed:', error.message);
            const text = new TextDecoder().decode(this.buffer);
            console.log('MCAM Fallback: First 100 chars:', text.slice(0, 100));
            const gcodeParser = new GcodeParser(text);
            const gcodeData = gcodeParser.parse();
            if (gcodeData.success && gcodeData.toolpaths.length > 0) {
                console.log('MCAM Fallback: Found valid G-code');
                return { success: true, toolpaths: gcodeData.toolpaths, units: gcodeData.units };
            }
            return { success: false, error: `MCAM parsing failed: ${error.message}` };
        }
    }

    checkFileSize() { 
        if (this.buffer.byteLength < 16) throw new Error('File too small');
    }

    parseHeader() {
        const magic = this.readString(4);
        if (!['MCAM', 'MMC2'].includes(magic)) throw new Error(`Invalid header: ${magic}`);
        const version = this.readUint32();
        const fileSize = this.readUint32();
        if (fileSize > this.buffer.byteLength) throw new Error('File size mismatch');
        return { 
            version, 
            fileSize, 
            creationDate: this.readUint64(), 
            units: this.readByte() === 0 ? 'mm' : 'inch' 
        };
    }

    parseGeometry(version) {
        const vertexCount = this.readUint32();
        if (vertexCount > 1000000) throw new Error('Excessive vertex count');
        const vertices = new Float32Array(vertexCount * 3);
        for (let i = 0; i < vertexCount; i++) {
            if (this.offset + 12 > this.buffer.byteLength) throw new Error('Unexpected end of file at vertices');
            vertices[i * 3] = this.readFloat();
            vertices[i * 3 + 1] = this.readFloat();
            vertices[i * 3 + 2] = this.readFloat();
        }
        const faceCount = this.readUint32();
        if (faceCount > 2000000) throw new Error('Excessive face count');
        const faces = new Uint32Array(faceCount * 3);
        for (let i = 0; i < faceCount; i++) {
            if (this.offset + 12 > this.buffer.byteLength) throw new Error('Unexpected end of file at faces');
            faces[i * 3] = this.readUint32();
            faces[i * 3 + 1] = this.readUint32();
            faces[i * 3 + 2] = this.readUint32();
        }
        return { vertices, faces };
    }

    parseToolpaths(version) {
        if (this.offset + 2 > this.buffer.byteLength) throw new Error('Unexpected end of file at toolpath count');
        const pathCount = this.readUint16();
        const toolpaths = [];
        for (let i = 0; i < pathCount; i++) {
            if (this.offset + 6 > this.buffer.byteLength) throw new Error('Unexpected end of file at toolpath header');
            toolpaths.push({ toolNumber: this.readUint16(), points: this.readPathPoints() });
        }
        return toolpaths;
    }

    readPathPoints() {
        const pointCount = this.readUint32();
        const points = [];
        for (let i = 0; i < pointCount; i++) {
            if (this.offset + 16 > this.buffer.byteLength) throw new Error('Unexpected end of file at toolpath points');
            points.push({ 
                x: this.readFloat(), 
                y: this.readFloat(), 
                z: this.readFloat(), 
                feedRate: this.readFloat(),
                a: 0
            });
        }
        return points;
    }

    readUint32() { 
        if (this.offset + 4 > this.buffer.byteLength) throw new Error('Buffer overflow at Uint32');
        const v = this.dataView.getUint32(this.offset, this.littleEndian); 
        this.offset += 4; 
        return v; 
    }
    readUint16() { 
        if (this.offset + 2 > this.buffer.byteLength) throw new Error('Buffer overflow at Uint16');
        const v = this.dataView.getUint16(this.offset, this.littleEndian); 
        this.offset += 2; 
        return v; 
    }
    readFloat() { 
        if (this.offset + 4 > this.buffer.byteLength) throw new Error('Buffer overflow at Float');
        const v = this.dataView.getFloat32(this.offset, this.littleEndian); 
        this.offset += 4; 
        return v; 
    }
    readByte() { 
        if (this.offset + 1 > this.buffer.byteLength) throw new Error('Buffer overflow at Byte');
        const v = this.dataView.getUint8(this.offset); 
        this.offset += 1; 
        return v; 
    }
    readUint64() { 
        if (this.offset + 8 > this.buffer.byteLength) throw new Error('Buffer overflow at Uint64');
        const l = this.readUint32(); 
        const r = this.readUint32(); 
        return l + 2 ** 32 * r; 
    }
    readString(length) {
        if (this.offset + length > this.buffer.byteLength) throw new Error('Buffer overflow at String');
        let result = '';
        for (let i = 0; i < length; i++) {
            const char = this.readByte();
            if (char !== 0) result += String.fromCharCode(char);
        }
        return result;
    }
}

class GcodeParser {
    constructor(text) {
        this.text = text;
    }

    parse() {
        const lines = this.text.split('\n');
        const toolpaths = [];
        let currentTool = 0;
        let points = [];
        let lastPos = { x: 0, y: 0, z: 0, a: 0, feedRate: 0 };
        let units = 'mm';

        lines.forEach(line => {
            line = line.trim().toUpperCase();
            if (!line || line.startsWith(';') || line.startsWith('(')) return;
            if (line.includes('G20')) units = 'inch';
            if (line.includes('G21')) units = 'mm';
            if (line.startsWith('T')) {
                if (points.length) toolpaths.push({ toolNumber: currentTool, points });
                points = [];
                currentTool = parseInt(line.match(/T(\d+)/)?.[1]) || 0;
            } else if (line.match(/G[0-1]/) || (line.includes('G254') || line.includes('G605'))) {
                const coords = line.match(/[XYZA][-\d.]+|F[\d.]+/g) || [];
                const point = { ...lastPos };
                coords.forEach(c => {
                    const value = parseFloat(c.substring(1));
                    if (c[0] === 'X') point.x = value;
                    if (c[0] === 'Y') point.y = value;
                    if (c[0] === 'Z') point.z = value;
                    if (c[0] === 'A') point.a = value;
                    if (c[0] === 'F') point.feedRate = value;
                });
                points.push(point);
                lastPos = { ...point };
            }
        });

        if (points.length) toolpaths.push({ toolNumber: currentTool, points });
        return { success: true, toolpaths, units };
    }
}
