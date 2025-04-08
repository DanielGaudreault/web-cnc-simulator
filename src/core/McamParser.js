const BinaryReader = require('./utilities/BinaryReader');
const GeometryProcessor = require('./GeometryProcessor');
const ToolpathProcessor = require('./ToolpathProcessor');

class McamParser {
  constructor(fileBuffer) {
    this.reader = new BinaryReader(fileBuffer);
    this.geometry = new GeometryProcessor();
    this.toolpaths = new ToolpathProcessor();
    this.machineSettings = null;
  }

  parse() {
    try {
      // Read file header
      const header = this.readHeader();
      
      // Process geometry data
      this.geometry.process(this.reader);
      
      // Process toolpaths
      this.toolpaths.process(this.reader);
      
      // Process machine settings
      this.machineSettings = this.readMachineSettings();
      
      return {
        success: true,
        geometry: this.geometry.getData(),
        toolpaths: this.toolpaths.getData(),
        machineSettings: this.machineSettings
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  readHeader() {
    // MCAM files typically start with a version identifier
    const magicNumber = this.reader.readString(4);
    if (magicNumber !== 'MCAM') {
      throw new Error('Invalid MCAM file format');
    }
    
    return {
      version: this.reader.readUInt32(),
      fileSize: this.reader.readUInt32(),
      creationDate: this.reader.readUInt64()
    };
  }

  readMachineSettings() {
    // Implementation depends on MCAM version
    return {
      units: this.reader.readByte() === 0 ? 'metric' : 'imperial',
      machineType: this.reader.readString(32),
      axisConfig: this.reader.readString(16)
    };
  }
}

module.exports = McamParser;
