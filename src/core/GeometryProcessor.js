const MathUtils = require('../utilities/MathUtils');

class GeometryProcessor {
  constructor() {
    this.meshes = [];
    this.curves = [];
    this.surfaces = [];
  }

  process(reader) {
    const geometryCount = reader.readUInt32();
    
    for (let i = 0; i < geometryCount; i++) {
      const geomType = reader.readByte();
      const geomSize = reader.readUInt32();
      
      switch(geomType) {
        case 0x01: // Mesh
          this.meshes.push(this.readMesh(reader));
          break;
        case 0x02: // NURBS Curve
          this.curves.push(this.readCurve(reader));
          break;
        case 0x03: // Surface
          this.surfaces.push(this.readSurface(reader));
          break;
        default:
          reader.skip(geomSize);
      }
    }
  }

  readMesh(reader) {
    const vertexCount = reader.readUInt32();
    const vertices = new Float32Array(vertexCount * 3);
    
    for (let i = 0; i < vertexCount; i++) {
      vertices[i*3] = reader.readFloat();
      vertices[i*3+1] = reader.readFloat();
      vertices[i*3+2] = reader.readFloat();
    }
    
    const faceCount = reader.readUInt32();
    const faces = new Uint32Array(faceCount * 3);
    
    for (let i = 0; i < faceCount; i++) {
      faces[i*3] = reader.readUInt32();
      faces[i*3+1] = reader.readUInt32();
      faces[i*3+2] = reader.readUInt32();
    }
    
    return { vertices, faces };
  }

  getData() {
    return {
      meshes: this.meshes,
      curves: this.curves,
      surfaces: this.surfaces
    };
  }
}

module.exports = GeometryProcessor;
