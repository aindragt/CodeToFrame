import type { RGBColor } from '../../shared/types';

/**
 * Mengonversi nilai RGB (0-255) ke format Figma (0.0-1.0).
 *
 * @param color - Objek warna RGB skala 0-255
 * @returns Objek warna RGB skala 0-1
 */
function toFigmaColor(color: RGBColor): RGB {
  return {
    r: Math.max(0, Math.min(255, color.r)) / 255,
    g: Math.max(0, Math.min(255, color.g)) / 255,
    b: Math.max(0, Math.min(255, color.b)) / 255,
  };
}

/**
 * Memastikan font siap digunakan sebelum memodifikasi characters pada TextNode.
 * Menggunakan fallback ke font "Inter" "Regular" jika font kustom bermasalah.
 *
 * @param fontName - Nama font yang ingin dimuat
 */
async function loadFontSafe(fontName: FontName = { family: "Inter", style: "Regular" }): Promise<void> {
  try {
    await figma.loadFontAsync(fontName);
  } catch (error) {
    console.warn(`[CodeToFrame] Gagal memuat font ${fontName.family} ${fontName.style}, menggunakan fallback Inter Regular.`, error);
    await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  }
}

/**
 * Memetakan nilai CSS/Flexbox primary alignment ke Figma Enum.
 *
 * @param value - Nilai alignment mentah dari JSON.
 * @returns Enum Figma untuk primaryAxisAlignItems.
 */
function mapPrimaryAlign(value: string): 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN' {
  if (!value) return 'MIN';
  const norm = value.toUpperCase().replace(/-/g, '_').trim();
  switch (norm) {
    case 'START':
    case 'FLEX_START':
      return 'MIN';
    case 'END':
    case 'FLEX_END':
      return 'MAX';
    case 'CENTER':
      return 'CENTER';
    case 'SPACE_BETWEEN':
    case 'SPACE_AROUND':
    case 'SPACE_EVENLY':
      return 'SPACE_BETWEEN';
    default:
      return 'MIN';
  }
}

/**
 * Memetakan nilai CSS/Flexbox counter alignment ke Figma Enum.
 *
 * @param value - Nilai alignment mentah dari JSON.
 * @returns Enum Figma untuk counterAxisAlignItems.
 */
function mapCounterAlign(value: string): 'MIN' | 'CENTER' | 'MAX' | 'BASELINE' {
  if (!value) return 'MIN';
  const norm = value.toUpperCase().replace(/-/g, '_').trim();
  switch (norm) {
    case 'START':
    case 'FLEX_START':
      return 'MIN';
    case 'END':
    case 'FLEX_END':
      return 'MAX';
    case 'CENTER':
      return 'CENTER';
    case 'BASELINE':
      return 'BASELINE';
    case 'STRETCH':
      // Krusial: Figma menolak STRETCH untuk counterAxisAlignItems. Fallback aman ke MIN.
      return 'MIN';
    default:
      return 'MIN';
  }
}

/**
 * Memetakan nilai properti layout dan padding pada FrameNode secara defensif.
 *
 * @param node - Objek FrameNode target.
 * @param layout - Konfigurasi layout yang di-ekstrak.
 */
function applyLayoutToFrame(node: FrameNode, layout: any): void {
  if (!layout || layout.layoutMode === 'NONE') return;

  try {
    node.layoutMode = layout.layoutMode; // 'HORIZONTAL' | 'VERTICAL'
    node.itemSpacing = layout.itemSpacing || 0;
    node.paddingTop = layout.paddingTop || 0;
    node.paddingRight = layout.paddingRight || 0;
    node.paddingBottom = layout.paddingBottom || 0;
    node.paddingLeft = layout.paddingLeft || 0;
    
    if (layout.primaryAxisAlignItems) {
      node.primaryAxisAlignItems = mapPrimaryAlign(layout.primaryAxisAlignItems);
    }
    
    if (layout.counterAxisAlignItems) {
      node.counterAxisAlignItems = mapCounterAlign(layout.counterAxisAlignItems);
    }
    
    if (layout.layoutWrap) {
      node.layoutWrap = layout.layoutWrap; // 'WRAP' | 'NO_WRAP'
    }
  } catch (error: any) {
    console.warn('[CodeToFrame] Gagal menerapkan properti layout secara parsial:', error.message);
  }
}

/**
 * Memetakan visual style (fills, strokes, effects, cornerRadius) ke Figma Node.
 *
 * @param node - Node target (FrameNode atau RectangleNode).
 * @param styles - Objek style yang di-ekstrak.
 */
function applyStylesToNode(node: FrameNode | RectangleNode, styles: any): void {
  if (!styles) return;

  // 1. Solid Fills
  if (styles.backgroundColor && styles.backgroundColor.a > 0) {
    node.fills = [
      {
        type: 'SOLID',
        color: toFigmaColor(styles.backgroundColor),
        opacity: styles.backgroundColor.a,
      }
    ];
  } else {
    node.fills = [];
  }

  // 2. Dominant Border / Strokes
  if (styles.border && styles.border.width > 0 && styles.border.style !== 'none') {
    node.strokes = [
      {
        type: 'SOLID',
        color: toFigmaColor(styles.border.color),
      }
    ];
    node.strokeWeight = styles.border.width;
  }

  // 3. Border Radius / Corner Radius
  if (styles.borderRadius) {
    const { topLeft, topRight, bottomRight, bottomLeft } = styles.borderRadius;
    if (topLeft === topRight && topRight === bottomRight && bottomRight === bottomLeft) {
      node.cornerRadius = topLeft;
    } else {
      node.topLeftRadius = topLeft;
      node.topRightRadius = topRight;
      node.bottomRightRadius = bottomRight;
      node.bottomLeftRadius = bottomLeft;
    }
  }

  // 4. Opacity
  if (styles.opacity !== undefined) {
    node.opacity = styles.opacity;
  }
}

/**
 * Fungsi rekursif untuk membangun Figma Node dari objek JSON bersarang.
 *
 * @param jsonNode - Objek figma node JSON.
 * @returns Figma Node yang berhasil dibangun.
 */
async function buildFigmaNode(jsonNode: any): Promise<SceneNode> {
  const styles = jsonNode.styles || {};

  // 1. Tipe TEXT
  if (jsonNode.type === 'TEXT') {
    const textNode = figma.createText();
    textNode.name = jsonNode.name || 'TEXT';
    
    // Tentukan geometri
    textNode.resize(Math.max(1, jsonNode.width), Math.max(1, jsonNode.height));

    const typo = jsonNode.typography || {};
    const fontFamily = typo.fontFamily || 'Inter';
    const fontStyle = typo.fontStyle || 'Regular';

    // Memuat font secara asinkron sebelum menulis teks
    await loadFontSafe({ family: fontFamily, style: fontStyle });
    
    textNode.characters = jsonNode.textContent || '';
    textNode.fontSize = typo.fontSize || 16;
    
    // Terapkan textAlign
    if (typo.textAlign) {
      textNode.textAlignHorizontal = typo.textAlign;
    }
    
    // Terapkan warna teks (fills)
    const textColor = styles.textColor || { r: 0, g: 0, b: 0, a: 1 };
    textNode.fills = [
      {
        type: 'SOLID',
        color: toFigmaColor(textColor),
        opacity: textColor.a,
      }
    ];

    if (styles.opacity !== undefined) {
      textNode.opacity = styles.opacity;
    }

    return textNode;
  }

  // 2. Tipe VECTOR (SVG)
  if (jsonNode.type === 'VECTOR' && jsonNode.svgContent) {
    try {
      const vectorNode = figma.createNodeFromSvg(jsonNode.svgContent);
      vectorNode.name = jsonNode.name || 'VECTOR';
      vectorNode.x = 0; // Posisi relatif di-set oleh parent
      vectorNode.y = 0;
      return vectorNode;
    } catch (err) {
      console.warn('[CodeToFrame] Gagal membuat node dari SVG, fallback ke Rectangle:', err);
    }
  }

  // 3. Tipe IMAGE (RECTANGLE dengan fill gambar)
  if (jsonNode.type === 'IMAGE' && jsonNode.imageUrl) {
    const rectNode = figma.createRectangle();
    rectNode.name = jsonNode.name || 'IMAGE';
    rectNode.resize(Math.max(1, jsonNode.width), Math.max(1, jsonNode.height));

    applyStylesToNode(rectNode, styles);

    try {
      // Figma API memuat gambar asinkron dari URL (lewat UI helper atau fetch jika didukung,
      // tapi figma sandbox tidak mendukung direct fetch. Companion plugin Figma Desktop
      // akan merender image fill via placeholder berwarna abu-abu jika URL gambar eksternal diproses secara sandbox.
      // Kami set color fill abu-abu sebagai fallback image)
      rectNode.fills = [
        {
          type: 'SOLID',
          color: { r: 0.8, g: 0.8, b: 0.8 },
        }
      ];
    } catch (e) {
      console.warn('[CodeToFrame] Gagal menetapkan image fill:', e);
    }

    return rectNode;
  }

  // 4. Tipe FRAME / Container
  const frameNode = figma.createFrame();
  frameNode.name = jsonNode.name || 'FRAME';
  frameNode.resize(Math.max(1, jsonNode.width), Math.max(1, jsonNode.height));
  
  // Terapkan CSS styles & layout
  applyStylesToNode(frameNode, styles);
  if (jsonNode.layout) {
    applyLayoutToFrame(frameNode, jsonNode.layout);
  }

  // Rekursif memproses seluruh anak elemen
  if (jsonNode.children && jsonNode.children.length > 0) {
    for (const childNode of jsonNode.children) {
      const mappedChild = await buildFigmaNode(childNode);
      if (mappedChild) {
        frameNode.appendChild(mappedChild);
        
        // Atur posisi relatif di dalam parent FRAME (bila layoutMode bukan AUTO LAYOUT/FLEX)
        if (!jsonNode.layout || jsonNode.layout.layoutMode === 'NONE') {
          mappedChild.x = childNode.x;
          mappedChild.y = childNode.y;
        }
      }
    }
  }

  return frameNode;
}

/**
 * Menggambar seluruh payload hasil ekstraksi ke kanvas Figma.
 *
 * @param payload - Payload data ExtractionPayload
 */
async function renderDesign(payload: any): Promise<void> {
  const rootNodeJson = payload.rootNode;
  if (!rootNodeJson) {
    throw new Error('Payload rootNode kosong.');
  }

  // Buat node utama Figma
  const rootNode = await buildFigmaNode(rootNodeJson);

  if (rootNode) {
    const center = figma.viewport.center;
    
    // Posisikan Root Node utama di tengah layar viewport Figma saat ini
    rootNode.x = center.x - rootNode.width / 2;
    rootNode.y = center.y - rootNode.height / 2;

    figma.currentPage.appendChild(rootNode);
    
    // Fokuskan viewport kamera Figma ke Root Frame baru
    figma.viewport.scrollAndZoomIntoView([rootNode]);
  }
}

// Menampilkan UI plugin Figma (iframe UI)
figma.showUI(__html__, { width: 440, height: 480 });

// Mendengarkan pesan dari UI Thread (ui.html)
figma.ui.onmessage = async (msg: { type: string; payload?: any }) => {
  if (msg.type === 'render-design') {
    const payload = msg.payload;

    if (!payload || !payload.rootNode) {
      figma.ui.postMessage({ type: 'status', success: false, message: 'Data JSON tidak memiliki rootNode.' });
      return;
    }

    try {
      figma.ui.postMessage({ type: 'status', success: true, message: 'Sedang membangun Figma nodes...' });
      await renderDesign(payload);
      figma.ui.postMessage({ type: 'status', success: true, message: 'Desain berhasil digambar!' });
    } catch (err: any) {
      console.error('[CodeToFrame] Error rendering design:', err);
      figma.ui.postMessage({ type: 'status', success: false, message: `Error: ${err.message || err}` });
    }
  } else if (msg.type === 'cancel') {
    figma.closePlugin();
  }
};
