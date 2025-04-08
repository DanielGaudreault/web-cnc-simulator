class BinaryReader {
  constructor(buffer) {
    this.buffer = buffer;
    this.position = 0;
    this.littleEndian = true;
    this.dataView = new DataView(buffer);
  }

  readByte() {
    const value = this.dataView.getUint8(this.position);
    this.position += 1;
    return value;
  }

  readUInt32() {
    const value = this.dataView.getUint32(this.position, this.littleEndian);
    this.position += 4;
    return value;
  }

  readFloat() {
    const value = this.dataView.getFloat32(this.position, this.littleEndian);
    this.position += 4;
    return value;
  }

  readString(length) {
    let result = '';
    for (let i = 0; i < length; i++) {
      const char = this.readByte();
      if (char !== 0) result += String.fromCharCode(char);
    }
    return result;
  }

  skip(bytes) {
    this.position += bytes;
  }
}

module.exports = BinaryReader;
