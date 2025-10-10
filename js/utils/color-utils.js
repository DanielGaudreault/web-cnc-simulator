class ColorUtils {
    static hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    static rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    static hslToRgb(h, s, l) {
        let r, g, b;

        if (s === 0) {
            r = g = b = l; // achromatic
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };

            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }

        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
    }

    static rgbToHsl(r, g, b) {
        r /= 255, g /= 255, b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0; // achromatic
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }

        return { h, s, l };
    }

    static interpolateColors(color1, color2, factor) {
        if (arguments.length < 3) { factor = 0.5; }
        const result = {
            r: Math.round(color1.r + factor * (color2.r - color1.r)),
            g: Math.round(color1.g + factor * (color2.g - color1.g)),
            b: Math.round(color1.b + factor * (color2.b - color1.b))
        };
        return result;
    }

    static generateColorPalette(baseColor, count = 5) {
        const palette = [];
        const hsl = this.rgbToHsl(baseColor.r, baseColor.g, baseColor.b);
        
        for (let i = 0; i < count; i++) {
            const newHsl = {
                h: (hsl.h + (i / count)) % 1,
                s: Math.max(0.3, Math.min(0.8, hsl.s * (0.8 + i * 0.1))),
                l: Math.max(0.2, Math.min(0.8, hsl.l * (0.7 + i * 0.06)))
            };
            palette.push(this.hslToRgb(newHsl.h, newHsl.s, newHsl.l));
        }
        
        return palette;
    }

    static getContrastColor(backgroundColor) {
        // Calculate relative luminance
        const rgb = [backgroundColor.r / 255, backgroundColor.g / 255, backgroundColor.b / 255];
        const luminance = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
        return luminance > 0.5 ? { r: 0, g: 0, b: 0 } : { r: 255, g: 255, b: 255 };
    }

    static colorToThreeJS(color) {
        if (typeof color === 'string') {
            return new THREE.Color(color);
        } else if (color.r !== undefined) {
            return new THREE.Color(color.r / 255, color.g / 255, color.b / 255);
        }
        return new THREE.Color(0xffffff);
    }
}
