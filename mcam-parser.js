class McamParser {
    constructor(buffer) {
        this.buffer = buffer;
        this.dataView = new DataView(buffer);
        this.offset = 0;
        this.littleEndian = true;
        this.supportedVersions = [1, 2, 3]; // Supported MCAM versions
    }

    parse() {
        try {
            const header = this.parseHeader();
            
            // Version check
            if (!this.supportedVersions.includes(header.version)) {
                throw new Error(`Unsupported MCAM version: ${header.version}. Supported versions: ${this.supportedVersions.join(', ')}`);
            }

            const geometry = this.parseGeometry(header.version);
            const toolpaths = this.parseToolpaths(header.version);
            
            return {
                success: true,
                header,
                geometry,
                toolpaths
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    parseHeader() {
        // Check minimum file size
        if (this.buffer.byteLength < 16) {
            throw new Error('File too small to be a valid MCAM file');
        }

        const magic = this.readString(4);
        if (magic !== 'MCAM' && magic !== 'MCAM') {
            // Some MCAM files might have different capitalization
            throw new Error(`Invalid MCAM file format. Expected 'MCAM' header, got '${magic}'`);
        }
        
        const version = this.readUint32();
        const fileSize = this.readUint32();
        
        // Verify declared file size matches actual size
        if (fileSize !== this.buffer.byteLength) {
            throw new Error(`File size mismatch. Header claims ${fileSize} bytes, actual size ${this.buffer.byteLength} bytes`);
        }
        
        const creationDate = this.readUint64();
        const units = this.readByte();
        
        return {
            version,
            fileSize,
            creationDate: new Date(creationDate / 10000 - 11644473600000), // Windows ticks to JS Date
            units: units === 0 ? 'mm' : 'inch',
            isValid: true
        };
    }

    parseGeometry(version) {
        // Version-specific geometry parsing
        if (version === 1) {
            return this.parseGeometryV1();
        } else if (version === 2) {
            return this.parseGeometryV2();
        } else {
            return this.parseGeometryV3();
        }
    }

    parseGeometryV1() {
        const vertexCount = this.readUint32();
        if (vertexCount > 1000000) {
            throw new Error(`Suspiciously high vertex count: ${vertexCount}`);
        }

        const vertices = new Float32Array(vertexCount * 3);
        for (let i = 0; i < vertexCount; i++) {
            vertices[i * 3] = this.readFloat();
            vertices[i * 3 + 1] = this.readFloat();
            vertices[i * 3 + 2] = this.readFloat();
        }

        const faceCount = this.readUint32();
        if (faceCount > 2000000) {
            throw new Error(`Suspiciously high face count: ${faceCount}`);
        }

        const faces = new Uint32Array(faceCount * 3);
        for (let i = 0; i < faceCount; i++) {
            faces[i * 3] = this.readUint32();
            faces[i * 3 + 1] = this.readUint32();
            faces[i * 3 + 2] = this.readUint32();
        }

        return { vertices, faces };
    }

    parseToolpaths(version) {
        const pathCount = this.readUint16();
        if (pathCount > 1000) {
            throw new Error(`Suspiciously high toolpath count: ${pathCount}`);
        }

        const toolpaths = [];
        for (let i = 0; i < pathCount; i++) {
            try {
                toolpaths.push(this.readToolpath(version));
            } catch (error) {
                console.warn(`Error parsing toolpath ${i}: ${error.message}`);
                continue; // Skip corrupt toolpaths but continue parsing
            }
        }
        return toolpaths;
    }

    // ... (keep existing helper methods like readUint32, readFloat, etc.)
}
