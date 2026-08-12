/**
 * @file style-extractor.js
 * @description Modul untuk membaca computed style (getComputedStyle) dan geometri (getBoundingClientRect)
 * dari elemen DOM dan mengekstraknya ke dalam visual properties terstandarisasi.
 */

import { parseRGBAToFigma } from '../utils/utils.js';

/**
 * Mengekstrak seluruh properti visual CSS dari elemen DOM.
 *
 * @param {HTMLElement} element - Elemen DOM target ekstraksi.
 * @returns {Object} Objek properti visual yang berhasil diekstrak.
 */
export function extractAllStyles(element) {
  if (!element || !(element instanceof HTMLElement)) {
    return getDefaultStyles();
  }

  try {
    const computedStyle = window.getComputedStyle(element);
    if (!computedStyle) {
      return getDefaultStyles();
    }

    const rect = element.getBoundingClientRect();
    const basicStyles = extractBasicStyles(computedStyle);
    const typographyStyles = extractTypography(element, computedStyle);
    const flexboxStyles = extractFlexbox(computedStyle);

    return {
      ...basicStyles,
      typography: typographyStyles,
      layout: flexboxStyles,
      // Properti tambahan sesuai skema PRD & ARCHITECTURE
      overflow: computedStyle.overflow || 'visible',
      textColor: parseRGBAToFigma(computedStyle.color)
    };
  } catch (error) {
    console.error('[CodeToFrame] Error mengekstrak style elemen:', element.tagName, error.message);
    return getDefaultStyles();
  }
}

/**
 * Mengembalikan objek style default/fallback yang aman.
 *
 * @returns {Object} Objek style default.
 */
export function getDefaultStyles() {
  return {
    backgroundColor: null,
    backgroundGradient: null,
    backgroundImageUrl: null,
    border: { width: 0, color: { r: 0, g: 0, b: 0, a: 0 }, style: 'none' },
    borderRadius: { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 },
    boxShadow: [],
    opacity: 1,
    overflow: 'visible',
    typography: null,
    layout: {
      mode: 'NONE',
      direction: 'ROW',
      gap: 0,
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      justifyContent: 'FLEX_START',
      alignItems: 'STRETCH',
      wrap: false
    },
    textColor: null
  };
}

/**
 * Mengekstrak gaya visual dasar (backgroundColor, opacity, border, border-radius, dan box-shadow).
 *
 * @param {CSSStyleDeclaration} computedStyle - Hasil computed style elemen.
 * @returns {Object} Objek properti gaya visual dasar.
 */
export function extractBasicStyles(computedStyle) {
  if (!computedStyle) return {};

  // 1. Background Color
  const rawBgColor = computedStyle.backgroundColor;
  const backgroundColor = parseRGBAToFigma(rawBgColor);

  // 2. Opacity
  const opacity = computedStyle.opacity !== undefined ? parseFloat(computedStyle.opacity) : 1;

  // 3. Border (Dominan / Terbesar dari 4 sisi)
  const border = extractBorder(computedStyle);

  // 4. Border Radius
  const borderRadius = {
    topLeft: parseFloat(computedStyle.borderTopLeftRadius) || 0,
    topRight: parseFloat(computedStyle.borderTopRightRadius) || 0,
    bottomRight: parseFloat(computedStyle.borderBottomRightRadius) || 0,
    bottomLeft: parseFloat(computedStyle.borderBottomLeftRadius) || 0,
  };

  // 5. Box Shadow
  const boxShadow = extractBoxShadowList(computedStyle.boxShadow);

  // 6. Background Image/Gradient Placeholder
  const backgroundGradient = extractBackgroundGradient(computedStyle.backgroundImage);
  const backgroundImageUrl = extractBackgroundImageUrl(computedStyle.backgroundImage);

  return {
    backgroundColor,
    backgroundGradient,
    backgroundImageUrl,
    border,
    borderRadius,
    boxShadow,
    opacity: isNaN(opacity) ? 1 : opacity
  };
}

/**
 * Mengekstrak detail background gradient dari string CSS background-image.
 *
 * @param {string} rawBgImage - Nilai background-image mentah.
 * @returns {Object|null} GradientData atau null.
 */
function extractBackgroundGradient(rawBgImage) {
  if (!rawBgImage || !rawBgImage.includes('linear-gradient')) return null;

  try {
    const match = rawBgImage.match(/linear-gradient\((.+)\)/);
    if (!match) return null;

    const inner = match[1];
    const parts = inner.split(/,(?![^(]*\))/);
    let angleDeg = 180;
    let startIndex = 0;

    const firstPart = parts[0].trim();
    if (firstPart.endsWith('deg')) {
      angleDeg = parseFloat(firstPart);
      startIndex = 1;
    } else if (firstPart.startsWith('to ')) {
      const dirMap = {
        'to top': 0,
        'to right': 90,
        'to bottom': 180,
        'to left': 270,
        'to top right': 45,
        'to bottom right': 135,
        'to bottom left': 225,
        'to top left': 315
      };
      angleDeg = dirMap[firstPart] !== undefined ? dirMap[firstPart] : 180;
      startIndex = 1;
    }

    const colorStops = [];
    const totalStops = parts.length - startIndex;

    for (let i = startIndex; i < parts.length; i++) {
      const stopStr = parts[i].trim();
      const colorMatch = stopStr.match(/rgba?\([^)]+\)|#[0-9a-fA-F]{3,8}/);
      if (!colorMatch) continue;

      const color = parseRGBAToFigma(colorMatch[0]);
      if (!color) continue;

      const posMatch = stopStr.match(/([\d.]+)%/);
      const position = posMatch
        ? parseFloat(posMatch[1]) / 100
        : (i - startIndex) / (totalStops - 1);

      colorStops.push({ color, position });
    }

    if (colorStops.length < 2) return null;

    return { angleDeg, colorStops };
  } catch (e) {
    return null;
  }
}

/**
 * Mengekstrak background image URL jika bernilai url(...).
 *
 * @param {string} rawBgImage - Nilai background-image mentah.
 * @returns {string|null} URL image atau null.
 */
function extractBackgroundImageUrl(rawBgImage) {
  if (!rawBgImage || !rawBgImage.includes('url(')) return null;

  try {
    const match = rawBgImage.match(/url\(['"]?([^'"]+?)['"]?\)/);
    return match ? match[1] : null;
  } catch (e) {
    return null;
  }
}

/**
 * Mengekstrak dominant border dari keempat sisi elemen.
 *
 * @param {CSSStyleDeclaration} computedStyle - Hasil computed style elemen.
 * @returns {Object} BorderData.
 */
function extractBorder(computedStyle) {
  const sides = [
    { width: parseFloat(computedStyle.borderTopWidth) || 0, color: computedStyle.borderTopColor, style: computedStyle.borderTopStyle },
    { width: parseFloat(computedStyle.borderRightWidth) || 0, color: computedStyle.borderRightColor, style: computedStyle.borderRightStyle },
    { width: parseFloat(computedStyle.borderBottomWidth) || 0, color: computedStyle.borderBottomColor, style: computedStyle.borderBottomStyle },
    { width: parseFloat(computedStyle.borderLeftWidth) || 0, color: computedStyle.borderLeftColor, style: computedStyle.borderLeftStyle }
  ];

  // Cari border dominan (lebar terbesar)
  const dominant = sides.reduce((max, side) => side.width > max.width ? side : max, sides[0]);

  if (dominant.width === 0 || dominant.style === 'none') {
    return { width: 0, color: { r: 0, g: 0, b: 0, a: 0 }, style: 'none' };
  }

  return {
    width: Math.round(dominant.width),
    color: parseRGBAToFigma(dominant.color) || { r: 0, g: 0, b: 0, a: 1 },
    style: dominant.style || 'solid'
  };
}

/**
 * Mem-parse properti CSS box-shadow menjadi array representasi ShadowEffect.
 *
 * @param {string} rawShadow - Properti box-shadow mentah dari CSS.
 * @returns {Array<Object>} List of ShadowEffects.
 */
function extractBoxShadowList(rawShadow) {
  if (!rawShadow || rawShadow === 'none') return [];

  try {
    const shadows = [];
    const parts = rawShadow.split(/,(?![^(]*\))/);

    for (const part of parts) {
      const trimmed = part.trim();
      const isInset = trimmed.includes('inset');
      const cleaned = trimmed.replace('inset', '').trim();

      const colorMatch = cleaned.match(/rgba?\([^)]+\)/);
      const color = colorMatch ? parseRGBAToFigma(colorMatch[0]) : { r: 0, g: 0, b: 0, a: 0.25 };

      const withoutColor = cleaned.replace(/rgba?\([^)]+\)/, '').trim();
      const numbers = withoutColor.match(/-?[\d.]+/g);
      const values = numbers ? numbers.map(Number) : [0, 0, 0, 0];

      shadows.push({
        type: isInset ? 'INNER_SHADOW' : 'DROP_SHADOW',
        offsetX: values[0] || 0,
        offsetY: values[1] || 0,
        blur: Math.max(0, values[2] || 0),
        spread: values[3] || 0,
        color
      });
    }

    return shadows;
  } catch (error) {
    return [];
  }
}

/**
 * Mengekstrak gaya tipografi dari elemen teks.
 *
 * @param {HTMLElement} element - Elemen DOM target.
 * @param {CSSStyleDeclaration} computedStyle - Hasil computed style elemen.
 * @returns {Object|null} Objek TypographyData atau null jika elemen tidak memiliki teks.
 */
export function extractTypography(element, computedStyle) {
  if (!element || !computedStyle) return null;

  // Lakukan deteksi apakah elemen ini memiliki teks yang terlihat
  const textContent = element.innerText || element.textContent || '';
  if (textContent.trim().length === 0) {
    return null;
  }

  // 1. Font Family (Ambil nama font utama pertama)
  let fontFamily = 'Inter';
  if (computedStyle.fontFamily) {
    fontFamily = computedStyle.fontFamily.split(',')[0].trim().replace(/['"]/g, '');
  }

  // 2. Font Size
  const fontSize = parseFloat(computedStyle.fontSize) || 16;

  // 3. Font Weight
  const fontWeight = parseInt(computedStyle.fontWeight, 10) || 400;

  // 4. Font Style (Mapping font weight ke deskriptor gaya Figma)
  const fontStyle = mapFontWeightToStyle(fontWeight);

  // 5. Line Height (Ubah px ke angka murni)
  let lineHeight = null;
  const rawLineHeight = computedStyle.lineHeight;
  if (rawLineHeight && rawLineHeight !== 'normal') {
    const parsed = parseFloat(rawLineHeight);
    if (!isNaN(parsed)) {
      // Jika CSS unitless, kalikan dengan font size
      lineHeight = rawLineHeight.endsWith('px') ? parsed : parsed * fontSize;
    }
  }

  // 6. Letter Spacing
  let letterSpacing = 0;
  const rawLetterSpacing = computedStyle.letterSpacing;
  if (rawLetterSpacing && rawLetterSpacing !== 'normal') {
    const parsed = parseFloat(rawLetterSpacing);
    if (!isNaN(parsed)) {
      letterSpacing = rawLetterSpacing.endsWith('em') ? parsed * fontSize : parsed;
    }
  }

  // 7. Text Align
  let textAlign = 'LEFT';
  const rawAlign = computedStyle.textAlign;
  if (rawAlign) {
    const alignMap = {
      left: 'LEFT',
      center: 'CENTER',
      right: 'RIGHT',
      justify: 'JUSTIFIED'
    };
    textAlign = alignMap[rawAlign.toLowerCase()] || 'LEFT';
  }

  // 8. Text Decoration
  let textDecoration = 'NONE';
  const rawDecoration = computedStyle.textDecorationLine || computedStyle.textDecoration;
  if (rawDecoration) {
    if (rawDecoration.includes('underline')) {
      textDecoration = 'UNDERLINE';
    } else if (rawDecoration.includes('line-through')) {
      textDecoration = 'STRIKETHROUGH';
    }
  }

  return {
    fontFamily,
    fontSize: isNaN(fontSize) ? 16 : fontSize,
    fontWeight,
    fontStyle,
    lineHeight: lineHeight ? Math.round(lineHeight) : null,
    letterSpacing: Math.round(letterSpacing),
    textAlign,
    textDecoration
  };
}

/**
 * Memetakan nilai font-weight numerik ke string figma style name.
 *
 * @param {number} weight - Nilai font weight numerik.
 * @returns {string} Figma font style name.
 */
function mapFontWeightToStyle(weight) {
  if (weight <= 100) return 'Thin';
  if (weight <= 200) return 'ExtraLight';
  if (weight <= 300) return 'Light';
  if (weight <= 400) return 'Regular';
  if (weight <= 500) return 'Medium';
  if (weight <= 600) return 'SemiBold';
  if (weight <= 700) return 'Bold';
  if (weight <= 800) return 'ExtraBold';
  return 'Black';
}

/**
 * Mendeteksi flexbox dan mengekstrak layout & padding parameters.
 *
 * @param {CSSStyleDeclaration} computedStyle - Hasil computed style elemen.
 * @returns {Object} Objek LayoutData.
 */
export function extractFlexbox(computedStyle) {
  const isFlex = computedStyle.display === 'flex' || computedStyle.display === 'inline-flex';

  const padding = {
    top: parseFloat(computedStyle.paddingTop) || 0,
    right: parseFloat(computedStyle.paddingRight) || 0,
    bottom: parseFloat(computedStyle.paddingBottom) || 0,
    left: parseFloat(computedStyle.paddingLeft) || 0
  };

  if (!isFlex) {
    return {
      mode: 'NONE',
      direction: 'ROW',
      gap: 0,
      padding,
      justifyContent: 'FLEX_START',
      alignItems: 'STRETCH',
      wrap: false
    };
  }

  // 1. Flex Direction
  const direction = computedStyle.flexDirection && computedStyle.flexDirection.includes('column') ? 'COLUMN' : 'ROW';

  // 2. Flex Gap
  const gap = parseFloat(computedStyle.gap) || 0;

  // 3. Justify Content
  const justifyMap = {
    'flex-start': 'FLEX_START',
    'start': 'FLEX_START',
    'center': 'CENTER',
    'flex-end': 'FLEX_END',
    'end': 'FLEX_END',
    'space-between': 'SPACE_BETWEEN',
    'space-around': 'SPACE_AROUND'
  };
  const justifyContent = justifyMap[computedStyle.justifyContent] || 'FLEX_START';

  // 4. Align Items
  const alignMap = {
    'stretch': 'STRETCH',
    'flex-start': 'FLEX_START',
    'start': 'FLEX_START',
    'center': 'CENTER',
    'flex-end': 'FLEX_END',
    'end': 'FLEX_END'
  };
  const alignItems = alignMap[computedStyle.alignItems] || 'STRETCH';

  // 5. Wrap
  const wrap = computedStyle.flexWrap === 'wrap' || computedStyle.flexWrap === 'wrap-reverse';

  return {
    mode: 'FLEX',
    direction,
    gap: isNaN(gap) ? 0 : gap,
    padding,
    justifyContent,
    alignItems,
    wrap
  };
}
