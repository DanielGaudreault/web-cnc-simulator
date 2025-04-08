class PostProcessor {
  constructor(machineConfig) {
    this.config = machineConfig;
    this.gCode = [];
    this.currentPosition = { x: 0, y: 0, z: 0 };
  }

  generate(toolpaths) {
    this.gCode = [];
    this.writeHeader();
    
    toolpaths.forEach(path => {
      this.processToolpath(path);
    });
    
    this.writeFooter();
    return this.gCode.join('\n');
  }

  processToolpath(path) {
    this.gCode.push(`(Tool Change: ${path.toolNumber})`);
    this.gCode.push(`T${path.toolNumber} M6`);
    this.gCode.push(`S${path.spindleSpeed} M3`);
    
    path.positions.forEach(pos => {
      const gCommand = pos.isRapidMove ? 'G00' : `G01 F${path.feedRate}`;
      this.gCode.push(`${gCommand} X${pos.x.toFixed(3)} Y${pos.y.toFixed(3)} Z${pos.z.toFixed(3)}`);
    });
  }

  writeHeader() {
    this.gCode.push('%');
    this.gCode.push(`(Post Processor: ${this.config.postName})`);
    this.gCode.push('G21 G40 G49 G80 G90');
  }

  writeFooter() {
    this.gCode.push('M05');
    this.gCode.push('G91 G28 Z0');
    this.gCode.push('G28 X0 Y0');
    this.gCode.push('M30');
    this.gCode.push('%');
  }
}

module.exports = PostProcessor;
