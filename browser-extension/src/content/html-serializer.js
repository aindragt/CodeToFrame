/**
 * @file html-serializer.js
 * @description Modul untuk melakukan serialisasi rekursif dari DOMNodeTree yang sudah diekstrak
 * menjadi string HTML dengan inline CSS absolut. Ini diperlukan agar Figma Clipboard Engine
 * dapat membaca dan merender ulang elemen-elemen web secara native di kanvas Figma.
 */

/**
 * Escape karakter khusus HTML untuk mencegah isu keamanan dan parsing.
 *
 * @param {string} text - String teks mentah.
 * @returns {string} String yang aman.
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
 * Format border radius menjadi properti CSS inline.
 *
 * @param {Object} radius - Bounding border radius per corner.
 * @returns {string|undefined} String CSS border-radius.
 */
function formatBorderRadius(radius) {
  if (!radius) return undefined;
  const { topLeft, topRight, bottomRight, bottomLeft } = radius;
  if (topLeft === 0 && topRight === 0 && bottomRight === 0 && bottomLeft === 0) return undefined;
  if (topLeft === topRight && topRight === bottomRight && bottomRight === bottomLeft) {
    return `${topLeft}px`;
  }
  return `${topLeft}px ${topRight}px ${bottomRight}px ${left}px`;
}

/**
 * Format dominant border menjadi properti CSS inline.
 *
 * @param {Object} border - Objek border.
 * @returns {string|undefined} String CSS border.
 */
function formatBorder(border) {
  if (!border || border.width === 0 || border.style === 'none') return undefined;
  const { r, g, b, a } = border.color || { r: 0, g: 0, b: 0, a: 1 };
  return `${border.width}px ${border.style} rgba(${r}, ${g}, ${b}, ${a})`;
}

/**
 * Format padding flexbox menjadi properti CSS inline.
 *
 * @param {Object} padding - Objek padding.
 * @returns {string|undefined} String CSS padding.
 */
function formatPadding(padding) {
  if (!padding) return undefined;
  const { top, right, bottom, left } = padding;
  if (top === 0 && right === 0 && bottom === 0 && left === 0) return undefined;
  return `${top}px ${right}px ${bottom}px ${left}px`;
}

/**
 * Membangun string CSS inline dari properti yang valid.
 *
 * @param {Object} properties - Map properti CSS.
 * @returns {string} String style inline.
 */
function buildStyleString(properties) {
  return Object.entries(properties)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}: ${value}`)
    .join('; ');
}

/**
 * Melakukan serialisasi rekursif dari parsed DOM node tree ke format string HTML yang diperkaya
 * dengan inline styles agar dapat dibaca secara langsung oleh Figma.
 *
 * @param {Object} domNode - Objek parsed DOM node.
 * @returns {string} String HTML hasil serialisasi.
 */
export function serializeToInlineHTML(domNode) {
  if (!domNode) return '';

  const styles = domNode.styles || {};

  // 1. Tipe SVG / VECTOR
  if (domNode.type === 'SVG' && domNode.svgContent) {
    return domNode.svgContent;
  }

  // 2. Tipe TEXT
  if (domNode.type === 'TEXT') {
    const typo = styles.typography || {};
    const textColor = styles.textColor || { r: 0, g: 0, b: 0, a: 1 };
    
    const textStyle = buildStyleString({
      'position': 'absolute',
      'left': `${domNode.x}px`,
      'top': `${domNode.y}px`,
      'width': `${domNode.width}px`,
      'height': `${domNode.height}px`,
      'font-family': typo.fontFamily ? `"${typo.fontFamily}"` : 'Inter, sans-serif',
      'font-size': typo.fontSize ? `${typo.fontSize}px` : '16px',
      'font-weight': typo.fontWeight ? String(typo.fontWeight) : '400',
      'line-height': typo.lineHeight ? `${typo.lineHeight}px` : 'normal',
      'letter-spacing': typo.letterSpacing ? `${typo.letterSpacing}px` : 'normal',
      'text-align': (typo.textAlign || 'LEFT').toLowerCase(),
      'color': `rgba(${textColor.r}, ${textColor.g}, ${textColor.b}, ${textColor.a})`,
      'text-decoration': typo.textDecoration === 'UNDERLINE' ? 'underline' : (typo.textDecoration === 'STRIKETHROUGH' ? 'line-through' : 'none'),
      'opacity': styles.opacity !== undefined ? String(styles.opacity) : '1',
      'margin': '0'
    });

    const tagName = domNode.tagName || 'p';
    return `<${tagName} style="${textStyle}">${escapeHtml(domNode.textContent || '')}</${tagName}>`;
  }

  // 3. Tipe IMAGE
  if (domNode.type === 'IMAGE' && domNode.imageSrc) {
    const imgStyle = buildStyleString({
      'position': 'absolute',
      'left': `${domNode.x}px`,
      'top': `${domNode.y}px`,
      'width': `${domNode.width}px`,
      'height': `${domNode.height}px`,
      'object-fit': 'cover',
      'border-radius': formatBorderRadius(styles.borderRadius),
      'opacity': styles.opacity !== undefined ? String(styles.opacity) : '1'
    });
    return `<img src="${domNode.imageSrc}" style="${imgStyle}" alt="image" />`;
  }

  // 4. Tipe FRAME / Container (div, section, button, dll.)
  const bg = styles.backgroundColor || null;
  let bgCss = undefined;
  if (bg) {
    bgCss = `rgba(${bg.r}, ${bg.g}, ${bg.b}, ${bg.a})`;
  }

  const isFlex = styles.layout && styles.layout.mode === 'FLEX';
  const layout = styles.layout || {};

  const containerStyle = buildStyleString({
    'position': isFlex ? 'relative' : 'absolute',
    'left': isFlex ? undefined : `${domNode.x}px`,
    'top': isFlex ? undefined : `${domNode.y}px`,
    'width': `${domNode.width}px`,
    'height': `${domNode.height}px`,
    'background-color': bgCss,
    'border-radius': formatBorderRadius(styles.borderRadius),
    'border': formatBorder(styles.border),
    'opacity': styles.opacity !== undefined ? String(styles.opacity) : '1',
    'overflow': styles.overflow === 'hidden' ? 'hidden' : 'visible',
    'box-shadow': styles.boxShadow && styles.boxShadow.length > 0 ? '0px 4px 6px rgba(0,0,0,0.1)' : undefined,
    // Flexbox / Auto Layout styles
    'display': isFlex ? 'flex' : 'block',
    'flex-direction': isFlex ? (layout.direction === 'COLUMN' ? 'column' : 'row') : undefined,
    'gap': isFlex ? `${layout.gap}px` : undefined,
    'padding': isFlex ? formatPadding(layout.padding) : undefined,
    'justify-content': isFlex ? (layout.justifyContent === 'CENTER' ? 'center' : (layout.justifyContent === 'FLEX_END' ? 'flex-end' : 'flex-start')) : undefined,
    'align-items': isFlex ? (layout.alignItems === 'CENTER' ? 'center' : (layout.alignItems === 'FLEX_END' ? 'flex-end' : 'stretch')) : undefined,
    'flex-wrap': isFlex && layout.wrap ? 'wrap' : undefined
  });

  const childrenHtml = (domNode.children || [])
    .map(child => serializeToInlineHTML(child))
    .join('\n');

  const tagName = domNode.tagName || 'div';
  return `<${tagName} style="${containerStyle}">\n${childrenHtml}\n</${tagName}>`;
}
