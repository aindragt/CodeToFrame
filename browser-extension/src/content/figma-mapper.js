/**
 * @file figma-mapper.js
 * @description Modul untuk memetakan representasi internal DOMNodeTree ke model representasi
 * data node Figma (FigmaNodeTree) beserta visual properties, auto layout, dan asset visual.
 */

import { extractAllStyles } from './style-extractor.js';
import { parseRGBAToFigma } from '../utils/utils.js';

/**
 * Membuat nama layer Figma berdasarkan tag name, class list, dan ID elemen.
 * Format: tag.class1.class2#id (dibatasi 2 class pertama)
 *
 * @param {string} tagName - Nama tag elemen DOM (e.g., 'div', 'h1').
 * @param {string} className - Daftar class CSS.
 * @param {string} id - ID elemen.
 * @returns {string} Nama layer terformat.
 */
function generateLayerName(tagName, className, id) {
  const cleanTagName = (tagName || 'div').toLowerCase();
  let name = cleanTagName;

  if (className) {
    // Bersihkan spasi berlebih dan ambil 2 class pertama
    const classes = className.trim().split(/\s+/).filter(Boolean).slice(0, 2);
    if (classes.length > 0) {
      name += '.' + classes.join('.');
    }
  }

  if (id) {
    name += '#' + id.trim();
  }

  // Batasi panjang nama layer (max 60 karakter)
  return name.length > 60 ? name.substring(0, 57) + '...' : name;
}

/**
 * Mengonversi intermediate DOM node tree menjadi format data node Figma (FigmaNode).
 *
 * @param {Object} domNode - Intermediate DOM node tree element.
 * @returns {Object} Objek terformat FigmaNode.
 */
export function mapToFigmaTree(domNode) {
  if (!domNode) return null;

  try {
    // 1. Ekstrak gaya dari element DOM asli
    const extractedStyles = domNode.element ? extractAllStyles(domNode.element) : {};

    // 2. Tentukan Node Type Figma
    let type = domNode.type || 'FRAME';
    
    // Jika tipe aslinya IMAGE, kita petakan ke RECTANGLE dengan image fill di Figma
    if (type === 'IMAGE') {
      type = 'RECTANGLE';
    }

    // 3. Tentukan nama layer
    const name = generateLayerName(domNode.tagName, domNode.className, domNode.id);

    // 4. Strukturkan payload Figma Node dasar
    const figmaNode = {
      type,
      name,
      x: domNode.x,
      y: domNode.y,
      width: domNode.width,
      height: domNode.height,
      styles: extractedStyles,
      children: []
    };

    // 5. Tambahkan properti spesifik berdasarkan tipe node
    if (domNode.type === 'IMAGE' && domNode.imageSrc) {
      figmaNode.imageUrl = domNode.imageSrc;
    }

    if (domNode.type === 'SVG' && domNode.svgContent) {
      figmaNode.type = 'VECTOR';
      figmaNode.svgContent = domNode.svgContent;
    }

    if (domNode.type === 'TEXT') {
      figmaNode.type = 'TEXT';
      // Mengambil teks dari element DOM asli (inner text)
      figmaNode.textContent = domNode.element ? (domNode.element.innerText || domNode.element.textContent || '').trim() : '';
      figmaNode.typography = extractedStyles.typography;
    }

    // 6. Map Auto Layout (Flexbox) jika tipenya FRAME/container dan display-nya flex
    if (type === 'FRAME' && extractedStyles.layout && extractedStyles.layout.mode === 'FLEX') {
      const cssLayout = extractedStyles.layout;
      
      // Deteksi layoutMode Figma
      const layoutMode = cssLayout.direction === 'COLUMN' ? 'VERTICAL' : 'HORIZONTAL';
      
      // Deteksi primary & counter alignment
      let primaryAxisAlignItems = 'MIN';
      let counterAxisAlignItems = 'MIN';

      // Justify Content -> Primary Axis
      const justify = cssLayout.justifyContent;
      if (justify === 'CENTER') primaryAxisAlignItems = 'CENTER';
      else if (justify === 'FLEX_END') primaryAxisAlignItems = 'MAX';
      else if (justify === 'SPACE_BETWEEN') primaryAxisAlignItems = 'SPACE_BETWEEN';

      // Align Items -> Counter Axis
      const align = cssLayout.alignItems;
      if (align === 'CENTER') counterAxisAlignItems = 'CENTER';
      else if (align === 'FLEX_END') counterAxisAlignItems = 'MAX';
      else if (align === 'STRETCH') counterAxisAlignItems = 'STRETCH';

      figmaNode.layout = {
        layoutMode,
        itemSpacing: cssLayout.gap || 0,
        paddingTop: cssLayout.padding?.top || 0,
        paddingRight: cssLayout.padding?.right || 0,
        paddingBottom: cssLayout.padding?.bottom || 0,
        paddingLeft: cssLayout.padding?.left || 0,
        primaryAxisAlignItems,
        counterAxisAlignItems,
        layoutWrap: cssLayout.wrap ? 'WRAP' : 'NO_WRAP'
      };
    }

    // 7. Rekursi memproses child nodes (SVG tidak diproses child-nya karena berupa data string utuh)
    if (domNode.children && domNode.children.length > 0 && figmaNode.type !== 'VECTOR') {
      for (const child of domNode.children) {
        const mappedChild = mapToFigmaTree(child);
        if (mappedChild) {
          figmaNode.children.push(mappedChild);
        }
      }
    }

    return figmaNode;
  } catch (error) {
    console.error('[CodeToFrame] Error mapping node to Figma:', domNode.tagName, error.message);
    return null;
  }
}

/**
 * Membungkus figma node tree menjadi payload ekspor final.
 *
 * @param {Object} figmaTree - Root Figma node tree.
 * @returns {Object} Payload pengiriman final.
 */
export function assemblePayload(figmaTree) {
  if (!figmaTree) {
    return {
      version: '2.0',
      sourceUrl: window.location.href,
      viewport: {
        width: window.innerWidth || 1440,
        height: window.innerHeight || 900,
        scrollX: window.scrollX || 0,
        scrollY: window.scrollY || 0
      },
      rootNode: {
        type: 'FRAME',
        name: 'Empty Root',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        styles: {},
        children: []
      }
    };
  }

  return {
    version: '2.0',
    sourceUrl: window.location.href,
    viewport: {
      width: window.innerWidth || 1440,
      height: window.innerHeight || 900,
      scrollX: window.scrollX || 0,
      scrollY: window.scrollY || 0
    },
    rootNode: figmaTree
  };
}
