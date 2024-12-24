
export const TEXT_COLOR = "#000000";

export class ColorMapper {
  constructor() {
    this.typeColorMap = {};
    this.currentIndex = 0;
  }

  /**
   * Generates a dynamic color based on the input number using the Golden Angle.
   * @param {number} number - The input number to generate color.
   * @returns {string} - The generated color in HSL format.
   */
  getDynamicColor(number) {
    const goldenAngle = 137.508; // Degrees
    const hue = (number * goldenAngle) % 360;
    return this.hslToRgb(hue, 70, 50);
  }

  /**
   * Returns a color for the given string. If the string is already mapped, returns the existing color.
   * Otherwise, generates a new color, maps it to the string, and returns the new color.
   * @param {string} str - The input string to get the color for.
   * @returns {string} - The color associated with the input string.
   */
  getColor(str) {
    if (this.typeColorMap.hasOwnProperty(str)) {
      return this.typeColorMap[str];
    } else {
      const color = this.getDynamicColor(this.currentIndex);
      this.typeColorMap[str] = color;
      this.currentIndex++;
      return color;
    }
  }
  /**
   * Converts HSL color values to RGB hexadecimal format.
   *
   * @param {number} h - Hue value in degrees [0, 360).
   * @param {number} s - Saturation percentage [0, 100].
   * @param {number} l - Lightness percentage [0, 100].
   * @returns {string} - RGB color in hexadecimal format (e.g., "#FF00FF").
   */
  hslToRgb(h, s, l) {
    // Convert saturation and lightness from percentages to [0, 1]
    s /= 100;
    l /= 100;

    const c = (1 - Math.abs(2 * l - 1)) * s; // Chroma
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;

    let rPrime, gPrime, bPrime;

    if (h >= 0 && h < 60) {
      rPrime = c;
      gPrime = x;
      bPrime = 0;
    } else if (h >= 60 && h < 120) {
      rPrime = x;
      gPrime = c;
      bPrime = 0;
    } else if (h >= 120 && h < 180) {
      rPrime = 0;
      gPrime = c;
      bPrime = x;
    } else if (h >= 180 && h < 240) {
      rPrime = 0;
      gPrime = x;
      bPrime = c;
    } else if (h >= 240 && h < 300) {
      rPrime = x;
      gPrime = 0;
      bPrime = c;
    } else {
      rPrime = c;
      gPrime = 0;
      bPrime = x;
    }

    // Convert to RGB [0, 255] and add m
    const r = Math.round((rPrime + m) * 255);
    const g = Math.round((gPrime + m) * 255);
    const b = Math.round((bPrime + m) * 255);

    // Convert to hexadecimal and pad with zeros if necessary
    const toHex = (num) => {
      const hex = num.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
  }
  /**
   * Parses an HSL string and converts it to RGB hexadecimal format.
   *
   * @param {string} hslString - HSL color string (e.g., "hsl(300, 70%, 50%)").
   * @returns {string} - RGB color in hexadecimal format (e.g., "#FF00FF").
   */
  hslStringToHex(hslString) {
    // Regular expression to extract H, S, and L values
    const regex = /hsl\(\s*(\d+),\s*(\d+)%,\s*(\d+)%\s*\)/i;
    const result = regex.exec(hslString);

    if (!result) {
      throw new Error("Invalid HSL string format. Expected format: 'hsl(h, s%, l%)'");
    }

    const h = parseInt(result[1], 10);
    const s = parseInt(result[2], 10);
    const l = parseInt(result[3], 10);

    return this.hslToRgb(h, s, l);
  }

  /**
   * Returns a color based on the relationship value.
   * -1 -> Pastel Blue (#ADD8E6)
   *  0 -> Gray (#808080)
   *  1 -> Pastel Red (#FFB6C1)
   * Smoothly transitions between these colors for values between -1 and 1.
   *
   * @param {string} relationship - The relationship value as a string.
   * @returns {string} - The corresponding color in hexadecimal format.
   */
  getRelationshipColor(relationship) {
    const num = parseFloat(relationship);
    if (isNaN(num) || num < -1 || num > 1) {
      return "#808080"; // Default Gray
    }

    let h, s, l;

    if (num < 0) {
      // Transition from Pastel Blue to Gray
      const t = Math.abs(num); // 0 (for -0) to 1 (for -1)
      h = 200 - 200 * t; // 200 -> 0
      s = 100 - 100 * t; // 100% -> 0%
      l = 80 - 30 * t;    // 80% -> 50%
    } else if (num > 0) {
      // Transition from Gray to Pastel Red
      const t = num; // 0 (for 0) to 1 (for 1)
      h = 0;        // Stay at 0 for red
      s = 0 + 100 * t; // 0% -> 100%
      l = 50 + 30 * t; // 50% -> 80%
    } else {
      // num === 0
      return "#808080"; // Gray
    }

    return this.hslToRgb(h, s, l);
  }

}

export function drawRoundRect(
    ctx/*: CanvasRenderingContext2D*/,
    x/*: number*/,
    y/*: number*/,
    width/*: number*/,
    height/*: number*/,
    radius/*: number*/,
  )/*: void*/ {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
  

/**
 * Calculates the size of a line based on the relationship value.
 *
 * @param {string} relationship - The relationship value as a string.
 * @param {number} defaultSize - The default size of the line.
 * @returns {number} - The calculated size of the line.
 */
export function getLineSize(relationship, defaultSize) {
    const num = parseFloat(relationship);
    if (!isNaN(num) && num >= -1 && num <= 1) {
      return Math.abs(num) * defaultSize;
    }
    return defaultSize;
  }
  