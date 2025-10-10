class GeometryUtils {
    static calculateDistance(point1, point2) {
        const dx = point2.x - point1.x;
        const dy = point2.y - point1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    static calculateAngle(point1, point2) {
        return Math.atan2(point2.y - point1.y, point2.x - point1.x);
    }

    static pointInPolygon(point, polygon) {
        let inside = false;
        const n = polygon.length;
        
        for (let i = 0, j = n - 1; i < n; j = i++) {
            if (((polygon[i].y > point.y) !== (polygon[j].y > point.y)) &&
                (point.x < (polygon[j].x - polygon[i].x) * (point.y - polygon[i].y) / (polygon[j].y - polygon[i].y) + polygon[i].x)) {
                inside = !inside;
            }
        }
        
        return inside;
    }

    static polygonArea(points) {
        let area = 0;
        const n = points.length;
        
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            area += points[i].x * points[j].y;
            area -= points[j].x * points[i].y;
        }
        
        return Math.abs(area) / 2;
    }

    static isClockwise(points) {
        let sum = 0;
        const n = points.length;
        
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            sum += (points[j].x - points[i].x) * (points[j].y + points[i].y);
        }
        
        return sum > 0;
    }

    static offsetPolygon(points, distance) {
        if (points.length < 3) return points;
        
        const isClockwise = this.isClockwise(points);
        const sign = isClockwise ? -1 : 1;
        const offset = distance * sign;
        
        const offsetPoints = [];
        const n = points.length;
        
        for (let i = 0; i < n; i++) {
            const prev = points[(i - 1 + n) % n];
            const curr = points[i];
            const next = points[(i + 1) % n];
            
            // Calculate vectors
            const v1 = { x: curr.x - prev.x, y: curr.y - prev.y };
            const v2 = { x: next.x - curr.x, y: next.y - curr.y };
            
            // Normalize vectors
            const len1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
            const len2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
            
            const n1 = { x: v1.x / len1, y: v1.y / len1 };
            const n2 = { x: v2.x / len2, y: v2.y / len2 };
            
            // Calculate bisector
            const bisector = {
                x: n1.x + n2.x,
                y: n1.y + n2.y
            };
            
            const bisectorLen = Math.sqrt(bisector.x * bisector.x + bisector.y * bisector.y);
            const unitBisector = {
                x: bisector.x / bisectorLen,
                y: bisector.y / bisectorLen
            };
            
            // Calculate offset point
            const angle = Math.acos(n1.x * n2.x + n1.y * n2.y) / 2;
            const offsetDist = offset / Math.sin(angle);
            
            offsetPoints.push({
                x: curr.x + unitBisector.x * offsetDist,
                y: curr.y + unitBisector.y * offsetDist
            });
        }
        
        return offsetPoints;
    }

    static filletCorners(points, radius) {
        if (points.length < 3) return points;
        
        const filletedPoints = [];
        const n = points.length;
        
        for (let i = 0; i < n; i++) {
            const prev = points[(i - 1 + n) % n];
            const curr = points[i];
            const next = points[(i + 1) % n];
            
            // Calculate vectors
            const v1 = { x: prev.x - curr.x, y: prev.y - curr.y };
            const v2 = { x: next.x - curr.x, y: next.y - curr.y };
            
            // Calculate angles
            const angle1 = Math.atan2(v1.y, v1.x);
            const angle2 = Math.atan2(v2.y, v2.x);
            
            let angleDiff = angle2 - angle1;
            if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
            if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
            
            // Calculate fillet points
            const startAngle = angle1 + Math.PI;
            const endAngle = angle2 + Math.PI;
            
            const numSegments = Math.max(3, Math.ceil(Math.abs(angleDiff) * radius));
            
            // Add original point if no fillet
            if (Math.abs(angleDiff) < 0.1 || radius <= 0) {
                filletedPoints.push(curr);
                continue;
            }
            
            // Add fillet arc
            for (let j = 0; j <= numSegments; j++) {
                const t = j / numSegments;
                const angle = startAngle + angleDiff * t;
                
                filletedPoints.push({
                    x: curr.x + Math.cos(angle) * radius,
                    y: curr.y + Math.sin(angle) * radius
                });
            }
        }
        
        return filletedPoints;
    }

    static boundingBox(points) {
        if (points.length === 0) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
        
        const bbox = {
            minX: Infinity, maxX: -Infinity,
            minY: Infinity, maxY: -Infinity
        };
        
        for (const point of points) {
            bbox.minX = Math.min(bbox.minX, point.x);
            bbox.maxX = Math.max(bbox.maxX, point.x);
            bbox.minY = Math.min(bbox.minY, point.y);
            bbox.maxY = Math.max(bbox.maxY, point.y);
        }
        
        return bbox;
    }

    static centerOfMass(points) {
        if (points.length === 0) return { x: 0, y: 0 };
        
        let sumX = 0;
        let sumY = 0;
        
        for (const point of points) {
            sumX += point.x;
            sumY += point.y;
        }
        
        return {
            x: sumX / points.length,
            y: sumY / points.length
        };
    }

    static convexHull(points) {
        if (points.length < 3) return points;
        
        // Find the point with the lowest y-coordinate
        let start = points[0];
        for (const point of points) {
            if (point.y < start.y || (point.y === start.y && point.x < start.x)) {
                start = point;
            }
        }
        
        // Sort points by polar angle with start point
        const sorted = points.filter(p => p !== start).sort((a, b) => {
            const angleA = Math.atan2(a.y - start.y, a.x - start.x);
            const angleB = Math.atan2(b.y - start.y, b.x - start.x);
            
            if (angleA !== angleB) return angleA - angleB;
            return this.calculateDistance(start, a) - this.calculateDistance(start, b);
        });
        
        // Build hull
        const hull = [start, sorted[0]];
        
        for (let i = 1; i < sorted.length; i++) {
            while (hull.length >= 2 && this.crossProduct(
                hull[hull.length - 2],
                hull[hull.length - 1],
                sorted[i]
            ) <= 0) {
                hull.pop();
            }
            hull.push(sorted[i]);
        }
        
        return hull;
    }

    static crossProduct(a, b, c) {
        return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    }

    static lineIntersection(line1, line2) {
        const [p1, p2] = line1;
        const [p3, p4] = line2;
        
        const denominator = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
        
        if (Math.abs(denominator) < 1e-10) {
            return null; // Lines are parallel
        }
        
        const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / denominator;
        const u = -((p1.x - p2.x) * (p1.y - p3.y) - (p1.y - p2.y) * (p1.x - p3.x)) / denominator;
        
        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
            return {
                x: p1.x + t * (p2.x - p1.x),
                y: p1.y + t * (p2.y - p1.y)
            };
        }
        
        return null; // Intersection outside segments
    }

    static polygonIntersection(poly1, poly2) {
        const intersection = [];
        
        for (let i = 0; i < poly1.length; i++) {
            const p1 = poly1[i];
            const p2 = poly1[(i + 1) % poly1.length];
            
            // Check if point is inside other polygon
            if (this.pointInPolygon(p1, poly2)) {
                intersection.push(p1);
            }
            
            // Check for edge intersections
            for (let j = 0; j < poly2.length; j++) {
                const p3 = poly2[j];
                const p4 = poly2[(j + 1) % poly2.length];
                
                const intersect = this.lineIntersection([p1, p2], [p3, p4]);
                if (intersect) {
                    intersection.push(intersect);
                }
            }
        }
        
        // Add points from poly2 that are inside poly1
        for (const point of poly2) {
            if (this.pointInPolygon(point, poly1)) {
                intersection.push(point);
            }
        }
        
        if (intersection.length === 0) return [];
        
        // Return convex hull of intersection points
        return this.convexHull(intersection);
    }

    static polygonUnion(poly1, poly2) {
        const allPoints = [...poly1, ...poly2];
        return this.convexHull(allPoints);
    }

    static polygonDifference(poly1, poly2) {
        // Simple implementation - for production use a robust clipping algorithm
        const result = [];
        
        for (let i = 0; i < poly1.length; i++) {
            const p1 = poly1[i];
            const p2 = poly1[(i + 1) % poly1.length];
            
            if (!this.pointInPolygon(p1, poly2)) {
                result.push(p1);
            }
            
            // Add intersection points as well
            for (let j = 0; j < poly2.length; j++) {
                const p3 = poly2[j];
                const p4 = poly2[(j + 1) % poly2.length];
                
                const intersect = this.lineIntersection([p1, p2], [p3, p4]);
                if (intersect) {
                    result.push(intersect);
                }
            }
        }
        
        return result.length > 0 ? this.convexHull(result) : [];
    }

    static generateGridPoints(width, height, spacing) {
        const points = [];
        const cols = Math.ceil(width / spacing);
        const rows = Math.ceil(height / spacing);
        
        for (let i = 0; i <= cols; i++) {
            for (let j = 0; j <= rows; j++) {
                points.push({
                    x: i * spacing - width / 2,
                    y: j * spacing - height / 2
                });
            }
        }
        
        return points;
    }

    static generateCirclePoints(center, radius, segments = 32) {
        const points = [];
        
        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            points.push({
                x: center.x + Math.cos(angle) * radius,
                y: center.y + Math.sin(angle) * radius
            });
        }
        
        return points;
    }

    static generateSpiralPoints(center, startRadius, endRadius, turns, segmentsPerTurn = 32) {
        const points = [];
        const totalSegments = turns * segmentsPerTurn;
        
        for (let i = 0; i <= totalSegments; i++) {
            const t = i / totalSegments;
            const angle = t * Math.PI * 2 * turns;
            const radius = startRadius + (endRadius - startRadius) * t;
            
            points.push({
                x: center.x + Math.cos(angle) * radius,
                y: center.y + Math.sin(angle) * radius
            });
        }
        
        return points;
    }

    static simplifyPolygon(points, tolerance = 0.1) {
        if (points.length <= 2) return points;
        
        // Douglas-Peucker algorithm
        let maxDistance = 0;
        let maxIndex = 0;
        const end = points.length - 1;
        
        for (let i = 1; i < end; i++) {
            const distance = this.pointToLineDistance(points[i], points[0], points[end]);
            if (distance > maxDistance) {
                maxDistance = distance;
                maxIndex = i;
            }
        }
        
        if (maxDistance > tolerance) {
            const left = this.simplifyPolygon(points.slice(0, maxIndex + 1), tolerance);
            const right = this.simplifyPolygon(points.slice(maxIndex), tolerance);
            return left.slice(0, -1).concat(right);
        } else {
            return [points[0], points[end]];
        }
    }

    static pointToLineDistance(point, lineStart, lineEnd) {
        const A = point.x - lineStart.x;
        const B = point.y - lineStart.y;
        const C = lineEnd.x - lineStart.x;
        const D = lineEnd.y - lineStart.y;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        
        if (lenSq !== 0) {
            param = dot / lenSq;
        }

        let xx, yy;

        if (param < 0) {
            xx = lineStart.x;
            yy = lineStart.y;
        } else if (param > 1) {
            xx = lineEnd.x;
            yy = lineEnd.y;
        } else {
            xx = lineStart.x + param * C;
            yy = lineStart.y + param * D;
        }

        const dx = point.x - xx;
        const dy = point.y - yy;
        
        return Math.sqrt(dx * dx + dy * dy);
    }

    static offsetPoint(point, distance, angle) {
        return {
            x: point.x + Math.cos(angle) * distance,
            y: point.y + Math.sin(angle) * distance
        };
    }

    static interpolatePoints(point1, point2, t) {
        return {
            x: point1.x + (point2.x - point1.x) * t,
            y: point1.y + (point2.y - point1.y) * t
        };
    }

    static calculateArcPoints(center, radius, startAngle, endAngle, segments = 32) {
        const points = [];
        const angleDiff = endAngle - startAngle;
        const segmentAngle = angleDiff / segments;
        
        for (let i = 0; i <= segments; i++) {
            const angle = startAngle + segmentAngle * i;
            points.push({
                x: center.x + Math.cos(angle) * radius,
                y: center.y + Math.sin(angle) * radius
            });
        }
        
        return points;
    }

    static fitPointsToRectangle(points) {
        const bbox = this.boundingBox(points);
        return [
            { x: bbox.minX, y: bbox.minY },
            { x: bbox.maxX, y: bbox.minY },
            { x: bbox.maxX, y: bbox.maxY },
            { x: bbox.minX, y: bbox.maxY }
        ];
    }

    static calculatePathLength(points) {
        let length = 0;
        
        for (let i = 1; i < points.length; i++) {
            length += this.calculateDistance(points[i - 1], points[i]);
        }
        
        return length;
    }

    static resamplePoints(points, targetSegmentLength) {
        if (points.length < 2) return points;
        
        const resampled = [points[0]];
        let currentLength = 0;
        
        for (let i = 1; i < points.length; i++) {
            const segmentLength = this.calculateDistance(points[i - 1], points[i]);
            const segments = Math.ceil(segmentLength / targetSegmentLength);
            
            for (let j = 1; j <= segments; j++) {
                const t = j / segments;
                resampled.push(this.interpolatePoints(points[i - 1], points[i], t));
            }
        }
        
        return resampled;
    }
}
