import type { FigmaNode, DesignPayload, RGBColor } from '../../shared/types';

/**
 * Mengubah string warna CSS (seperti "rgb(255, 0, 0)" atau "rgba(0, 0, 0, 0)")
 * menjadi objek RGBColor dengan rentang nilai 0-255.
 *
 * @param colorStr - String representasi warna CSS
 * @returns Objek RGBColor, default hitam jika gagal parsing atau transparan
 */
function parseCSSColor(colorStr: string): RGBColor {
  const defaultColor: RGBColor = { r: 0, g: 0, b: 0 };

  // Menggunakan regex untuk mengekstrak angka dari format rgb(...) atau rgba(...)
  const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!match) {
    return defaultColor;
  }

  const r = parseInt(match[1], 10);
  const g = parseInt(match[2], 10);
  const b = parseInt(match[3], 10);
  const a = match[4] !== undefined ? parseFloat(match[4]) : 1;

  // Jika warnanya transparan (alpha = 0), kembalikan warna putih dengan anggapan tidak visible/default
  if (a === 0) {
    return { r: 255, g: 255, b: 255 };
  }

  return { r, g, b };
}

/**
 * Mengekstrak ukuran font dari string style CSS (misalnya "16px") menjadi number.
 *
 * @param fontSizeStr - String ukuran font CSS
 * @returns Ukuran font dalam format angka (number)
 */
function parseFontSize(fontSizeStr: string): number {
  const parsed = parseFloat(fontSizeStr);
  return isNaN(parsed) ? 16 : parsed;
}

/**
 * Memvalidasi apakah suatu elemen DOM terlihat di layar.
 * Elemen dengan display: none, visibility: hidden, atau tanpa dimensi (lebar/tinggi = 0) diabaikan.
 *
 * @param element - Elemen HTML yang akan dicek
 * @param style - Hasil computed style elemen tersebut
 * @returns Boolean apakah elemen terlihat
 */
function isElementVisible(element: HTMLElement, style: CSSStyleDeclaration): boolean {
  if (style.display === 'none') return false;
  if (style.visibility === 'hidden') return false;

  const rect = element.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;

  return true;
}

/**
 * Fungsi utama untuk menelusuri DOM secara rekursif dan mengumpulkan node yang valid.
 *
 * @param element - Titik awal elemen DOM
 * @param collectedNodes - Array penampung hasil ekstraksi
 */
function traverseDOM(element: HTMLElement, collectedNodes: FigmaNode[]): void {
  const style = window.getComputedStyle(element);

  // Jika elemen tidak terlihat, lewati elemen ini dan seluruh anaknya
  if (!isElementVisible(element, style)) {
    return;
  }

  const tagName = element.tagName.toUpperCase();
  const rect = element.getBoundingClientRect();

  // 1. Klasifikasi Teks
  const textTags = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'SPAN', 'A'];
  // 2. Klasifikasi Rectangle
  const rectTags = ['DIV', 'SECTION', 'HEADER', 'FOOTER', 'BUTTON'];

  if (textTags.includes(tagName)) {
    const textContent = element.innerText || element.textContent || '';

    // Hanya masukkan jika ada teks yang nyata (bukan spasi kosong)
    if (textContent.trim().length > 0) {
      collectedNodes.push({
        type: 'TEXT',
        x: Math.round(rect.left),
        y: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        backgroundColor: parseCSSColor(style.backgroundColor),
        color: parseCSSColor(style.color),
        fontSize: parseFontSize(style.fontSize),
        content: textContent.trim()
      });
    }
  } else if (rectTags.includes(tagName)) {
    collectedNodes.push({
      type: 'RECTANGLE',
      x: Math.round(rect.left),
      y: Math.round(rect.top),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      backgroundColor: parseCSSColor(style.backgroundColor)
    });
  }

  // Telusuri semua anak elemen (child nodes)
  for (let i = 0; i < element.children.length; i++) {
    const child = element.children[i] as HTMLElement;
    traverseDOM(child, collectedNodes);
  }
}

/**
 * Pemicu utama ekstraksi DOM halaman web saat ini.
 *
 * @returns Payload data hasil ekstraksi halaman
 */
export function extractPageDOM(): DesignPayload {
  const elements: FigmaNode[] = [];

  if (document.body) {
    traverseDOM(document.body as HTMLElement, elements);
  }

  return {
    sourceUrl: window.location.href,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    elements
  };
}
