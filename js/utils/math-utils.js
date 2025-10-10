class MathUtils {
    static clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    static lerp(start, end, factor) {
        return start + (end - start) * factor;
    }

    static inverseLerp(start, end, value) {
        return (value - start) / (end - start);
    }

    static remap(value, inMin, inMax, outMin, outMax) {
        return outMin + (outMax - outMin) * this.inverseLerp(inMin, inMax, value);
    }

    static degreesToRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    static radiansToDegrees(radians) {
        return radians * (180 / Math.PI);
    }

    static randomRange(min, max) {
        return Math.random() * (max - min) + min;
    }

    static randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    static distance(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    }

    static distance3D(x1, y1, z1, x2, y2, z2) {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2 + (z2 - z1) ** 2);
    }

    static magnitude(vector) {
        return Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z);
    }

    static normalize(vector) {
        const mag = this.magnitude(vector);
        if (mag === 0) return { x: 0, y: 0, z: 0 };
        return {
            x: vector.x / mag,
            y: vector.y / mag,
            z: vector.z / mag
        };
    }

    static dotProduct(v1, v2) {
        return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
    }

    static crossProduct(v1, v2) {
        return {
            x: v1.y * v2.z - v1.z * v2.y,
            y: v1.z * v2.x - v1.x * v2.z,
            z: v1.x * v2.y - v1.y * v2.x
        };
    }

    static angleBetweenVectors(v1, v2) {
        const dot = this.dotProduct(v1, v2);
        const mag1 = this.magnitude(v1);
        const mag2 = this.magnitude(v2);
        return Math.acos(dot / (mag1 * mag2));
    }

    static matrixMultiply(a, b) {
        const result = [
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
        ];

        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                for (let k = 0; k < 4; k++) {
                    result[i][j] += a[i][k] * b[k][j];
                }
            }
        }

        return result;
    }

    static createRotationMatrix(angleX, angleY, angleZ) {
        const cosX = Math.cos(angleX);
        const sinX = Math.sin(angleX);
        const cosY = Math.cos(angleY);
        const sinY = Math.sin(angleY);
        const cosZ = Math.cos(angleZ);
        const sinZ = Math.sin(angleZ);

        return [
            [
                cosY * cosZ,
                -cosY * sinZ,
                sinY,
                0
            ],
            [
                sinX * sinY * cosZ + cosX * sinZ,
                -sinX * sinY * sinZ + cosX * cosZ,
                -sinX * cosY,
                0
            ],
            [
                -cosX * sinY * cosZ + sinX * sinZ,
                cosX * sinY * sinZ + sinX * cosZ,
                cosX * cosY,
                0
            ],
            [0, 0, 0, 1]
        ];
    }

    static createTranslationMatrix(x, y, z) {
        return [
            [1, 0, 0, x],
            [0, 1, 0, y],
            [0, 0, 1, z],
            [0, 0, 0, 1]
        ];
    }

    static createScaleMatrix(sx, sy, sz) {
        return [
            [sx, 0, 0, 0],
            [0, sy, 0, 0],
            [0, 0, sz, 0],
            [0, 0, 0, 1]
        ];
    }

    static transformPoint(matrix, point) {
        const x = point.x * matrix[0][0] + point.y * matrix[0][1] + point.z * matrix[0][2] + matrix[0][3];
        const y = point.x * matrix[1][0] + point.y * matrix[1][1] + point.z * matrix[1][2] + matrix[1][3];
        const z = point.x * matrix[2][0] + point.y * matrix[2][1] + point.z * matrix[2][2] + matrix[2][3];
        const w = point.x * matrix[3][0] + point.y * matrix[3][1] + point.z * matrix[3][2] + matrix[3][3];

        return {
            x: x / w,
            y: y / w,
            z: z / w
        };
    }

    static solveQuadratic(a, b, c) {
        const discriminant = b * b - 4 * a * c;
        
        if (discriminant < 0) {
            return [];
        } else if (discriminant === 0) {
            return [-b / (2 * a)];
        } else {
            const sqrtDiscriminant = Math.sqrt(discriminant);
            return [
                (-b - sqrtDiscriminant) / (2 * a),
                (-b + sqrtDiscriminant) / (2 * a)
            ];
        }
    }

    static solveCubic(a, b, c, d) {
        // Convert to depressed cubic: t^3 + pt + q = 0
        const p = (3 * a * c - b * b) / (3 * a * a);
        const q = (2 * b * b * b - 9 * a * b * c + 27 * a * a * d) / (27 * a * a * a);
        
        const discriminant = (q * q) / 4 + (p * p * p) / 27;
        
        if (discriminant > 0) {
            // One real root
            const u = Math.cbrt(-q / 2 + Math.sqrt(discriminant));
            const v = Math.cbrt(-q / 2 - Math.sqrt(discriminant));
            return [u + v - b / (3 * a)];
        } else if (discriminant === 0) {
            // Multiple real roots
            const u = Math.cbrt(-q / 2);
            const root1 = 2 * u - b / (3 * a);
            const root2 = -u - b / (3 * a);
            return [root1, root2];
        } else {
            // Three real roots
            const phi = Math.acos(-q / 2 * Math.sqrt(-27 / (p * p * p))) / 3;
            const r = 2 * Math.sqrt(-p / 3);
            
            return [
                r * Math.cos(phi) - b / (3 * a),
                r * Math.cos(phi - 2 * Math.PI / 3) - b / (3 * a),
                r * Math.cos(phi + 2 * Math.PI / 3) - b / (3 * a)
            ];
        }
    }

    static bezierPoint(t, p0, p1, p2, p3) {
        const u = 1 - t;
        const tt = t * t;
        const uu = u * u;
        const uuu = uu * u;
        const ttt = tt * t;

        const x = uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x;
        const y = uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y;
        const z = uuu * p0.z + 3 * uu * t * p1.z + 3 * u * tt * p2.z + ttt * p3.z;

        return { x, y, z };
    }

    static bezierTangent(t, p0, p1, p2, p3) {
        const u = 1 - t;
        
        const dx = 3 * u * u * (p1.x - p0.x) + 
                  6 * u * t * (p2.x - p1.x) + 
                  3 * t * t * (p3.x - p2.x);
                  
        const dy = 3 * u * u * (p1.y - p0.y) + 
                  6 * u * t * (p2.y - p1.y) + 
                  3 * t * t * (p3.y - p2.y);
                  
        const dz = 3 * u * u * (p1.z - p0.z) + 
                  6 * u * t * (p2.z - p1.z) + 
                  3 * t * t * (p3.z - p2.z);

        return this.normalize({ x: dx, y: dy, z: dz });
    }

    static catmullRomPoint(t, p0, p1, p2, p3) {
        const t2 = t * t;
        const t3 = t2 * t;

        return {
            x: 0.5 * ((2 * p1.x) +
                      (-p0.x + p2.x) * t +
                      (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
                      (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
            y: 0.5 * ((2 * p1.y) +
                      (-p0.y + p2.y) * t +
                      (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
                      (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
            z: 0.5 * ((2 * p1.z) +
                      (-p0.z + p2.z) * t +
                      (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 +
                      (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3)
        };
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

        return null;
    }

    static pointLineDistance(point, lineStart, lineEnd) {
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

    static circleIntersection(c1, r1, c2, r2) {
        const dx = c2.x - c1.x;
        const dy = c2.y - c1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > r1 + r2 || distance < Math.abs(r1 - r2)) {
            return []; // No intersection
        }

        const a = (r1 * r1 - r2 * r2 + distance * distance) / (2 * distance);
        const h = Math.sqrt(r1 * r1 - a * a);

        const x2 = c1.x + a * (c2.x - c1.x) / distance;
        const y2 = c1.y + a * (c2.y - c1.y) / distance;

        const intersection1 = {
            x: x2 + h * (c2.y - c1.y) / distance,
            y: y2 - h * (c2.x - c1.x) / distance
        };

        const intersection2 = {
            x: x2 - h * (c2.y - c1.y) / distance,
            y: y2 + h * (c2.x - c1.x) / distance
        };

        return [intersection1, intersection2];
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

    static polygonCentroid(points) {
        let x = 0, y = 0;
        const n = points.length;
        let area = 0;

        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            const cross = points[i].x * points[j].y - points[j].x * points[i].y;
            area += cross;
            x += (points[i].x + points[j].x) * cross;
            y += (points[i].y + points[j].y) * cross;
        }

        area *= 3;
        return {
            x: x / area,
            y: y / area
        };
    }

    static isPointInPolygon(point, polygon) {
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
            return this.distance(start.x, start.y, a.x, a.y) - this.distance(start.x, start.y, b.x, b.y);
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

    static fitPoints(points, targetWidth, targetHeight) {
        const bbox = this.boundingBox(points);
        const scaleX = targetWidth / (bbox.maxX - bbox.minX);
        const scaleY = targetHeight / (bbox.maxY - bbox.minY);
        const scale = Math.min(scaleX, scaleY);

        return points.map(point => ({
            x: (point.x - bbox.minX) * scale,
            y: (point.y - bbox.minY) * scale
        }));
    }

    static fibonacciSphere(samples = 100) {
        const points = [];
        const phi = Math.PI * (3 - Math.sqrt(5)); // golden angle in radians

        for (let i = 0; i < samples; i++) {
            const y = 1 - (i / (samples - 1)) * 2; // y goes from 1 to -1
            const radius = Math.sqrt(1 - y * y); // radius at y

            const theta = phi * i; // golden angle increment

            const x = Math.cos(theta) * radius;
            const z = Math.sin(theta) * radius;

            points.push({ x, y, z });
        }

        return points;
    }

    static noise(x, y = 0, z = 0) {
        // Simple hash-based noise function
        function hash(n) {
            n = (n << 13) ^ n;
            return 1 - ((n * (n * n * 15731 + 789221) + 1376312589) & 0x7fffffff) / 1073741824;
        }

        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        const Z = Math.floor(z) & 255;

        x -= Math.floor(x);
        y -= Math.floor(y);
        z -= Math.floor(z);

        const u = this.fade(x);
        const v = this.fade(y);
        const w = this.fade(z);

        const A = this.p[X] + Y, AA = this.p[A] + Z, AB = this.p[A + 1] + Z;
        const B = this.p[X + 1] + Y, BA = this.p[B] + Z, BB = this.p[B + 1] + Z;

        return this.lerp(
            w,
            this.lerp(
                v,
                this.lerp(u, this.grad(this.p[AA], x, y, z), this.grad(this.p[BA], x - 1, y, z)),
                this.lerp(u, this.grad(this.p[AB], x, y - 1, z), this.grad(this.p[BB], x - 1, y - 1, z))
            ),
            this.lerp(
                v,
                this.lerp(u, this.grad(this.p[AA + 1], x, y, z - 1), this.grad(this.p[BA + 1], x - 1, y, z - 1)),
                this.lerp(u, this.grad(this.p[AB + 1], x, y - 1, z - 1), this.grad(this.p[BB + 1], x - 1, y - 1, z - 1))
            )
        );
    }

    static fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    static grad(hash, x, y, z) {
        const h = hash & 15;
        const u = h < 8 ? x : y;
        const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }

    static p = [
        151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140, 36, 103, 30, 69, 142,
        8, 99, 37, 240, 21, 10, 23, 190, 6, 148, 247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117,
        35, 11, 32, 57, 177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175, 74, 165, 71,
        134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122, 60, 211, 133, 230, 220, 105, 92, 41,
        55, 46, 245, 40, 244, 102, 143, 54, 65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89,
        18, 169, 200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64, 52, 217, 226,
        250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206, 59, 227, 47, 16, 58, 17, 182,
        189, 28, 42, 223, 183, 170, 213, 119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43,
        172, 9, 129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104, 218, 246, 97,
        228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241, 81, 51, 145, 235, 249, 14, 239, 107,
        49, 192, 214, 31, 181, 199, 106, 157, 184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 138,
        236, 205, 93, 222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180
    ];

    static perlinNoise(x, y = 0, z = 0, octaves = 4, persistence = 0.5) {
        let total = 0;
        let frequency = 1;
        let amplitude = 1;
        let maxValue = 0;

        for (let i = 0; i < octaves; i++) {
            total += this.noise(x * frequency, y * frequency, z * frequency) * amplitude;
            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= 2;
        }

        return total / maxValue;
    }
}
