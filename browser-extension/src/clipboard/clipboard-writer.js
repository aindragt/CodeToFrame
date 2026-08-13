/**
 * @file clipboard-writer.js
 * @description Modul untuk menulis payload desain terstruktur ke clipboard OS dengan metode
 * dual-MIME (text/html dan text/plain) agar langsung dikenali oleh kanvas Figma secara native.
 */

/**
 * Escape string HTML khusus untuk keamanan dan mencegah parsing error.
 *
 * @param {string} text - String mentah.
 * @returns {string} String ter-escape.
 */
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Format border-radius ke format CSS inline.
 *
 * @param {Object} radius - Objek borderRadius {topLeft, topRight, bottomRight, bottomLeft}.
 * @returns {string|undefined} String CSS border-radius atau undefined.
 */
function formatBorderRadius(radius) {
  if (!radius) return undefined;
  const { topLeft, topRight, bottomRight, bottomLeft } = radius;
  if (topLeft === 0 && topRight === 0 && bottomRight === 0 && bottomLeft === 0) return undefined;
  if (topLeft === topRight && topRight === bottomRight && bottomRight === bottomLeft) {
    return `${topLeft}px`;
  }
  return `${topLeft}px ${topRight}px ${bottomRight}px ${bottomLeft}px`;
}

/**
 * Format border ke format CSS inline.
 *
 * @param {Object} border - Objek border {width, color, style}.
 * @returns {string|undefined} String CSS border atau undefined.
 */
function formatBorder(border) {
  if (!border || border.width === 0 || border.style === 'none') return undefined;
  const { r, g, b, a } = border.color || { r: 0, g: 0, b: 0, a: 1 };
  // Konversi balik skala 0-1 figma ke 0-255 untuk CSS inline
  const red = Math.round(r * 255);
  const green = Math.round(g * 255);
  const blue = Math.round(b * 255);
  return `${border.width}px ${border.style} rgba(${red}, ${green}, ${blue}, ${a ?? 1})`;
}

/**
 * Format padding ke format CSS inline.
 *
 * @param {Object} padding - Objek padding {top, right, bottom, left}.
 * @returns {string|undefined} String CSS padding atau undefined.
 */
function formatPadding(padding) {
  if (!padding) return undefined;
  const { top, right, bottom, left } = padding;
  if (top === 0 && right === 0 && bottom === 0 && left === 0) return undefined;
  return `${top}px ${right}px ${bottom}px ${left}px`;
}

/**
 * Membuat inline style string dari key-value properti CSS.
 *
 * @param {Object} props - Objek properti CSS.
 * @returns {string} Inline style string.
 */
function buildInlineStyle(props) {
  return Object.entries(props)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}: ${value}`)
    .join('; ');
}

/**
 * Membangun string HTML terstruktur dengan inline CSS berdasarkan tree node Figma.
 *
 * @param {Object} node - Figma root node.
 * @returns {string} String HTML yang valid untuk clipboard.
 */
export function buildHtmlPayload(node) {
  if (!node) return '';

  try {
    const styles = node.styles || {};

    // 1. Tipe TEXT
    if (node.type === 'TEXT') {
      const typo = node.typography || {};
      const textColor = styles.textColor || { r: 0, g: 0, b: 0, a: 1 };
      const r = Math.round((textColor.r || 0) * 255);
      const g = Math.round((textColor.g || 0) * 255);
      const b = Math.round((textColor.b || 0) * 255);
      const a = textColor.a !== undefined ? textColor.a : 1;

      const inlineStyle = buildInlineStyle({
        'font-family': typo.fontFamily ? `"${typo.fontFamily}"` : 'Inter, sans-serif',
        'font-size': typo.fontSize ? `${typo.fontSize}px` : '16px',
        'font-weight': typo.fontWeight ? String(typo.fontWeight) : '400',
        'line-height': typo.lineHeight ? `${typo.lineHeight}px` : 'normal',
        'letter-spacing': typo.letterSpacing ? `${typo.letterSpacing}px` : 'normal',
        'text-align': (typo.textAlign || 'LEFT').toLowerCase(),
        'color': `rgba(${r}, ${g}, ${b}, ${a})`,
        'text-decoration': typo.textDecoration === 'UNDERLINE' ? 'underline' : (typo.textDecoration === 'STRIKETHROUGH' ? 'line-through' : 'none'),
        'opacity': styles.opacity !== undefined ? String(styles.opacity) : '1',
        'position': 'absolute',
        'left': `${node.x}px`,
        'top': `${node.y}px`,
        'width': `${node.width}px`,
        'height': `${node.height}px`,
        'margin': '0'
      });

      return `<p style="${inlineStyle}">${escapeHtml(node.textContent || '')}</p>`;
    }

    // 2. Tipe IMAGE / RECTANGLE dengan image url
    if (node.imageUrl) {
      const inlineStyle = buildInlineStyle({
        'position': 'absolute',
        'left': `${node.x}px`,
        'top': `${node.y}px`,
        'width': `${node.width}px`,
        'height': `${node.height}px`,
        'object-fit': 'cover',
        'border-radius': formatBorderRadius(styles.borderRadius),
        'opacity': styles.opacity !== undefined ? String(styles.opacity) : '1'
      });
      return `<img src="${node.imageUrl}" style="${inlineStyle}" alt="${escapeHtml(node.name)}" />`;
    }

    // 3. Tipe VECTOR (SVG)
    if (node.type === 'VECTOR' && node.svgContent) {
      // Figma mengenali SVG native saat paste HTML
      return node.svgContent;
    }

    // 4. Tipe FRAME / Container
    const bg = styles.backgroundColor || null;
    let backgroundCss = undefined;
    if (bg) {
      const r = Math.round((bg.r || 0) * 255);
      const g = Math.round((bg.g || 0) * 255);
      const b = Math.round((bg.b || 0) * 255);
      const a = bg.a !== undefined ? bg.a : 1;
      backgroundCss = `rgba(${r}, ${g}, ${b}, ${a})`;
    }

    // Deteksi flex layout inline CSS
    const isFlex = node.layout && node.layout.layoutMode;
    const inlineStyle = buildInlineStyle({
      'position': isFlex ? 'relative' : 'absolute',
      'left': isFlex ? undefined : `${node.x}px`,
      'top': isFlex ? undefined : `${node.y}px`,
      'width': `${node.width}px`,
      'height': `${node.height}px`,
      'background-color': backgroundCss,
      'border-radius': formatBorderRadius(styles.borderRadius),
      'border': formatBorder(styles.border),
      'opacity': styles.opacity !== undefined ? String(styles.opacity) : '1',
      'overflow': styles.overflow === 'hidden' ? 'hidden' : 'visible',
      'box-shadow': styles.boxShadow && styles.boxShadow.length > 0 ? '0px 4px 6px rgba(0,0,0,0.1)' : undefined, // basic shadow format untuk browser parse
      // Flex styles
      'display': isFlex ? 'flex' : 'block',
      'flex-direction': isFlex ? (node.layout.layoutMode === 'VERTICAL' ? 'column' : 'row') : undefined,
      'gap': isFlex ? `${node.layout.itemSpacing}px` : undefined,
      'padding': isFlex ? `${node.layout.paddingTop}px ${node.layout.paddingRight}px ${node.layout.paddingBottom}px ${node.layout.paddingLeft}px` : undefined,
      'justify-content': isFlex ? (node.layout.primaryAxisAlignItems === 'CENTER' ? 'center' : (node.layout.primaryAxisAlignItems === 'MAX' ? 'flex-end' : 'flex-start')) : undefined,
      'align-items': isFlex ? (node.layout.counterAxisAlignItems === 'CENTER' ? 'center' : (node.layout.counterAxisAlignItems === 'MAX' ? 'flex-end' : 'stretch')) : undefined,
      'flex-wrap': isFlex && node.layout.layoutWrap === 'WRAP' ? 'wrap' : undefined
    });

    const childrenHtml = (node.children || [])
      .map(child => buildHtmlPayload(child))
      .join('\n');

    return `<div style="${inlineStyle}">\n${childrenHtml}\n</div>`;
  } catch (error) {
    console.error('[CodeToFrame] Error building HTML payload for node:', node.name, error.message);
    return '';
  }
}

/**
 * Menulis payload data ExtractionPayload ke clipboard OS secara asinkron.
 *
 * @param {Object} payload - Payload desain terstruktur (ExtractionPayload).
 * @returns {Promise<{success: boolean, method: string, error?: string}>} Status penulisan clipboard.
 */
export async function writeToClipboard(payload) {
  if (!payload || !payload.rootNode) {
    return { success: false, method: 'none', error: 'Payload tidak valid.' };
  }

  const jsonString = JSON.stringify(payload, null, 2);
  const htmlPayload = buildHtmlPayload(payload.rootNode);

  // Bungkus dalam tag HTML standar dengan metadata pendukung agar aman di-parsing oleh parser browser/Figma
  const wrappedHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
</head>
<body>
${htmlPayload}
</body>
</html>`;

  try {
    // 1. Coba metode ClipboardItem (Dual MIME)
    if (typeof ClipboardItem !== 'undefined') {
      const clipboardItem = new ClipboardItem({
        'text/html': new Blob([wrappedHtml], { type: 'text/html' }),
        'text/plain': new Blob([jsonString], { type: 'text/plain' })
      });

      await navigator.clipboard.write([clipboardItem]);
      return { success: true, method: 'native' };
    }
  } catch (error) {
    console.warn('[CodeToFrame] navigator.clipboard.write (MIME) gagal, menggunakan fallback writeText:', error.message);
  }

  try {
    // 2. Fallback ke writeText (JSON String biasa)
    await navigator.clipboard.writeText(jsonString);
    return { success: true, method: 'fallback-text' };
  } catch (fallbackError) {
    console.error('[CodeToFrame] Semua metode clipboard gagal:', fallbackError.message);
    return { success: false, method: 'none', error: fallbackError.message };
  }
}
