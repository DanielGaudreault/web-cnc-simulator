const MathUtils = require('../utilities/MathUtils');

class ToolpathOptimizer {
  constructor(toolpaths, machineSettings) {
    this.toolpaths = toolpaths;
    this.machine = machineSettings;
    this.optimizedPaths = [];
  }

  optimize() {
    this.toolpaths.forEach(path => {
      const optimized = this.processPath(path);
      this.optimizedPaths.push(optimized);
    });
    return this.optimizedPaths;
  }

  processPath(path) {
    // Apply feed rate optimization
    if (this.machine.maxFeedRate) {
      path.feedRate = Math.min(path.feedRate, this.machine.maxFeedRate);
    }
    
    // Smooth toolpath
    path.positions = this.applySmoothing(path.positions);
    
    // Optimize rapid moves
    path = this.optimizeRapidMoves(path);
    
    return path;
  }

  applySmoothing(points, tolerance = 0.01) {
    return MathUtils.ramerDouglasPeucker(points, tolerance);
  }

  optimizeRapidMoves(path) {
    // Detect rapid move sequences and optimize
    const optimized = [];
    let rapidSequence = [];
    
    path.positions.forEach((point, i) => {
      if (point.isRapidMove) {
        rapidSequence.push(point);
      } else {
        if (rapidSequence.length > 0) {
          optimized.push(...this.optimizeRapidSequence(rapidSequence));
          rapidSequence = [];
        }
        optimized.push(point);
      }
    });
    
    return { ...path, positions: optimized };
  }
}

module.exports = ToolpathOptimizer;
