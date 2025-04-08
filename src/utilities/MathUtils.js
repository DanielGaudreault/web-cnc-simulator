class MathUtils {
  static ramerDouglasPeucker(points, epsilon) {
    if (points.length <= 2) return points;
    
    let maxDistance = 0;
    let index = 0;
    const end = points.length - 1;
    
    for (let i = 1; i < end; i++) {
      const distance = this.perpendicularDistance(
        points[i], points[0], points[end]
      );
      
      if (distance > maxDistance) {
        index = i;
        maxDistance = distance;
      }
    }
    
    if (maxDistance > epsilon) {
      const left = this.ramerDouglasPeucker(points.slice(0, index + 1), epsilon);
      const right = this.ramerDouglasPeucker(points.slice(index), epsilon);
      return left.slice(0, -1).concat(right);
    }
    
    return [points[0], points[end]];
  }

  static perpendicularDistance(point, lineStart, lineEnd) {
    const area = Math.abs(
      (lineEnd.x - lineStart.x) * (lineStart.y - point.y) -
      (lineStart.x - point.x) * (lineEnd.y - lineStart.y)
    );
    
    const lineLength = Math.sqrt(
      Math.pow(lineEnd.x - lineStart.x, 2) +
      Math.pow(lineEnd.y - lineStart.y, 2)
    );
    
    return area / lineLength;
  }

  static calculateToolEngagementAngle(toolpath) {
    // Advanced calculation for tool engagement
    const angles = [];
    for (let i = 1; i < toolpath.length - 1; i++) {
      const prev = toolpath[i-1];
      const curr = toolpath[i];
      const next = toolpath[i+1];
      
      const v1 = { x: curr.x - prev.x, y: curr.y - prev.y };
      const v2 = { x: next.x - curr.x, y: next.y - curr.y };
      
      const dot = v1.x * v2.x + v1.y * v2.y;
      const det = v1.x * v2.y - v1.y * v2.x;
      angles.push(Math.atan2(det, dot));
    }
    
    return angles.reduce((a, b) => a + b, 0) / angles.length;
  }
}

module.exports = MathUtils;
