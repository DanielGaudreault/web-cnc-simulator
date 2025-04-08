class McamParser {
  constructor(buffer) {
    this.buffer = buffer;
    this.dataView = new DataView(buffer);
    this.offset = 0;
  }

  parse() {
    const header = this.parseHeader();
    const geometry = this.parseGeometry();
    const toolpaths = this.parseToolpaths();
    
    return {
      header,
      geometry,
      toolpaths
    };
  }

  parseHeader() {
    const magic = this.readString(4);
    if (magic !== 'MCAM') throw new Error('Invalid MCAM file format');
    
    return {
      version: this.readUint32(),
      creationDate: this.readUint64(),
      units: this.readByte() === 0 ? 'mm' : 'inch'
    };
  }

  parseGeometry() {
    const vertexCount = this.readUint32();
    const vertices = new Float32Array(vertexCount * 3);
    
    for (let i = 0; i < vertexCount; i++) {
      vertices[i * 3] = this.readFloat();
      vertices[i * 3 + 1] = this.readFloat();
      vertices[i * 3 + 2] = this.readFloat();
    }
    
    const faceCount = this.readUint32();
    const faces = new Uint32Array(faceCount * 3);
    
    for (let i = 0; i < faceCount; i++) {
      faces[i * 3] = this.readUint32();
      faces[i * 3 + 1] = this.readUint32();
      faces[i * 3 + 2] = this.readUint32();
    }
    
    return { vertices, faces };
  }

  parseToolpaths() {
    const pathCount = this.readUint16();
    const toolpaths = [];
    
    for (let i = 0; i < pathCount; i++) {
      toolpaths.push(this.readToolpath());
    }
    
    return toolpaths;
  }

  readToolpath() {
    const toolNumber = this.readUint16();
    const pointCount = this.readUint32();
    const points = [];
    
    for (let i = 0; i < pointCount; i++) {
      points.push({
        x: this.readFloat(),
        y: this.readFloat(),
        z: this.readFloat(),
        feedRate: this.readFloat()
      });
    }
    
    return {
      toolNumber,
      points
    };
  }

  // Helper methods
  readUint32() {
    const value = this.dataView.getUint32(this.offset, true);
    this.offset += 4;
    return value;
  }

  readFloat() {
    const value = this.dataView.getFloat32(this.offset, true);
    this.offset += 4;
    return value;
  }

  readString(length) {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += String.fromCharCode(this.dataView.getUint8(this.offset++));
    }
    return result;
  }
}
