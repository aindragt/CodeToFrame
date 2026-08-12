/**
 * @file utils.js
 * @description Kumpulan fungsi utilitas murni (pure functions) yang bersifat helper untuk modul-modul utama.
 * Memuat pengolah warna, penanganan gradient, pemetaan font, dan parser data.
 */

/**
 * Mem-parse string warna CSS (rgb, rgba, hex) dan mengonversinya langsung ke format warna Figma.
 * Format warna Figma menggunakan format RGB dengan skala 0 hingga 1 (bukan 0-255).
 * Output menyertakan nilai alpha (opacity) secara terpisah jika format asalnya memiliki alpha.
 *
 * @param {string} cssColorString - String warna CSS mentah (e.g., 'rgb(255, 0, 0)', '#FF0000', 'rgba(0,0,0,0.5)').
 * @returns {{r: number, g: number, b: number, a: number}|null} Objek warna standar Figma (r,g,b,a skala 0-1) atau null jika gagal.
 *
 * @example
 * parseRGBAToFigma('rgb(59, 130, 246)')      // -> { r: 0.2314, g: 0.5098, b: 0.9647, a: 1 }
 * parseRGBAToFigma('rgba(0, 0, 0, 0.5)')     // -> { r: 0, g: 0, b: 0, a: 0.5 }
 * parseRGBAToFigma('#3B82F6')                // -> { r: 0.2314, g: 0.5098, b: 0.9647, a: 1 }
 * parseRGBAToFigma('transparent')            // -> { r: 0, g: 0, b: 0, a: 0 }
 */
export function parseRGBAToFigma(cssColorString) {
  // Defensive Programming: validasi tipe data input
  if (!cssColorString || typeof cssColorString !== 'string') {
    return null;
  }

  const trimmed = cssColorString.trim().toLowerCase();

  // Penanganan kasus khusus: transparent / rgba transparan penuh
  if (trimmed === 'transparent' || trimmed === 'rgba(0, 0, 0, 0)' || trimmed === 'rgba(0,0,0,0)') {
    return { r: 0, g: 0, b: 0, a: 0 };
  }

  // Helper untuk clamp nilai numerik
  const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

  // Helper untuk normalisasi 0-255 menjadi 0-1 (dibulatkan 4 desimal)
  const normalize = (val) => parseFloat((clamp(val, 0, 255) / 255).toFixed(4));

  // 1. Regex untuk format rgb(r, g, b) atau rgba(r, g, b, a)
  const rgbMatch = trimmed.match(
    /rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*([\d.]+))?\s*\)/
  );
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10);
    const g = parseInt(rgbMatch[2], 10);
    const b = parseInt(rgbMatch[3], 10);
    const a = rgbMatch[4] !== undefined ? clamp(parseFloat(rgbMatch[4]), 0, 1) : 1;

    return {
      r: normalize(r),
      g: normalize(g),
      b: normalize(b),
      a: parseFloat(a.toFixed(4)),
    };
  }

  // 2. Regex untuk format HEX (#RGB, #RRGGBB, #RRGGBBAA)
  const hexMatch = trimmed.match(/^#([0-9a-f]{3,8})$/);
  if (hexMatch) {
    const hex = hexMatch[1];

    // Shorthand 3-digit: #RGB -> #RRGGBB
    if (hex.length === 3) {
      return {
        r: normalize(parseInt(hex[0] + hex[0], 16)),
        g: normalize(parseInt(hex[1] + hex[1], 16)),
        b: normalize(parseInt(hex[2] + hex[2], 16)),
        a: 1,
      };
    }

    // Standard 6-digit: #RRGGBB
    if (hex.length === 6) {
      return {
        r: normalize(parseInt(hex.slice(0, 2), 16)),
        g: normalize(parseInt(hex.slice(2, 4), 16)),
        b: normalize(parseInt(hex.slice(4, 6), 16)),
        a: 1,
      };
    }

    // Extended 8-digit: #RRGGBBAA (dengan alpha)
    if (hex.length === 8) {
      const alphaRaw = parseInt(hex.slice(6, 8), 16);
      return {
        r: normalize(parseInt(hex.slice(0, 2), 16)),
        g: normalize(parseInt(hex.slice(2, 4), 16)),
        b: normalize(parseInt(hex.slice(4, 6), 16)),
        a: parseFloat((clamp(alphaRaw, 0, 255) / 255).toFixed(4)),
      };
    }
  }

  // Fallback apabila format tidak dikenali
  return null;
}
