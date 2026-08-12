/**
 * @file dom-traverser.js
 * @description Modul untuk menelusuri DOM tree secara rekursif, menyaring elemen tak kasat mata,
 * dan mempertahankan urutan z-order visual elemen ke struktur data bersarang (nested).
 */

const MAX_DEPTH = 15;
const MAX_NODES = 2000;
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'META', 'LINK', 'NOSCRIPT', 'BR', 'HR', 'HEAD']);

/**
 * Memvalidasi apakah suatu elemen terlihat secara visual.
 *
 * @param {HTMLElement} element - Elemen DOM yang akan diperiksa.
 * @returns {boolean} True jika elemen terlihat di kanvas.
 */
export function isVisible(element) {
  // Defensive check: pastikan element valid
  if (!element || !(element instanceof HTMLElement)) {
    return false;
  }

  try {
    const computedStyle = window.getComputedStyle(element);
    if (!computedStyle) {
      return false;
    }

    // 1. Cek display: none
    if (computedStyle.display === 'none') {
      return false;
    }

    // 2. Cek visibility: hidden
    if (computedStyle.visibility === 'hidden') {
      return false;
    }

    // 3. Cek opacity: 0
    if (parseFloat(computedStyle.opacity) === 0) {
      return false;
    }

    // 4. Cek tag yang harus dilewati
    if (SKIP_TAGS.has(element.tagName.toUpperCase())) {
      return false;
    }

    // 5. Cek dimensi bounding box (0x0)
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      return false;
    }

    return true;
  } catch (error) {
    console.warn('[CodeToFrame] Error saat memeriksa visibilitas elemen:', element.tagName, error.message);
    return false;
  }
}

/**
 * Memvalidasi apakah suatu elemen terlihat secara visual (alias/wrapper dari isVisible).
 *
 * @param {HTMLElement} element - Elemen DOM yang akan diperiksa.
 * @param {CSSStyleDeclaration} [computedStyle] - Parameter opsional (tidak wajib digunakan karena isVisible meng-handle internal).
 * @returns {boolean} True jika elemen terlihat di kanvas.
 */
export function isElementVisible(element, computedStyle) {
  return isVisible(element);
}

/**
 * Menelusuri DOM secara rekursif untuk membangun representasi tree bersarang.
 *
 * @param {HTMLElement} element - Elemen awal penelusuran.
 * @param {DOMRect} parentRect - Bounding rect dari parent untuk menghitung posisi relatif.
 * @param {number} depth - Kedalaman rekursi saat ini (dimulai dari 0).
 * @param {{count: number}} counter - Objek pencatat jumlah elemen untuk membatasi pemrosesan.
 * @returns {Object|null} Node tree hasil representasi, atau null jika di-skip.
 */
export function parseDOMRecursive(element, parentRect, depth = 0, counter = { count: 0 }) {
  // Defensive check: pastikan element valid
  if (!element || !(element instanceof HTMLElement)) {
    return null;
  }

  // Cek batas kedalaman maksimum
  if (depth > MAX_DEPTH) {
    console.warn('[CodeToFrame] Traversal dibatalkan karena melebihi batas kedalaman maks:', element.tagName);
    return null;
  }

  // Cek batas jumlah node maksimum
  if (counter.count >= MAX_NODES) {
    return null;
  }

  // Cek visibilitas elemen
  if (!isVisible(element)) {
    return null;
  }

  try {
    const rect = element.getBoundingClientRect();
    const tagName = element.tagName.toLowerCase();
    const id = element.id || '';
    const className = element.className || '';

    // Hitung posisi relatif terhadap parent
    const relativeX = parentRect ? Math.round(rect.left - parentRect.left) : Math.round(rect.left + window.scrollX);
    const relativeY = parentRect ? Math.round(rect.top - parentRect.top) : Math.round(rect.top + window.scrollY);

    // Deteksi tipe node visual awal
    let nodeType = 'FRAME';
    let imageSrc = null;
    let svgContent = null;

    if (tagName === 'img') {
      nodeType = 'IMAGE';
      // Ambil source image dan pastikan menjadi absolute URL
      const srcAttr = element.getAttribute('src') || '';
      if (srcAttr) {
        try {
          imageSrc = new URL(srcAttr, window.location.href).href;
        } catch (_) {
          imageSrc = srcAttr;
        }
      }
    } else if (tagName === 'svg') {
      nodeType = 'SVG';
      svgContent = element.outerHTML || '';
    }

    // Buat objek representasi node
    const node = {
      type: nodeType,
      tagName,
      id,
      className,
      x: relativeX,
      y: relativeY,
      width: Math.max(1, Math.round(rect.width)),
      height: Math.max(1, Math.round(rect.height)),
      children: [],
      // Simpan element DOM asli untuk pemrosesan style di figma-mapper/style-extractor
      element
    };

    if (imageSrc) {
      node.imageSrc = imageSrc;
    }
    if (svgContent) {
      node.svgContent = svgContent;
    }

    counter.count++;

    // Jika tipe node adalah SVG, hentikan rekursi ke children (Figma hanya butuh outerHTML mentah)
    if (nodeType === 'SVG') {
      return node;
    }

    // Telusuri anak-anak elemen
    const children = element.children;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child instanceof HTMLElement) {
        try {
          const childNode = parseDOMRecursive(child, rect, depth + 1, counter);
          if (childNode) {
            node.children.push(childNode);
          }
        } catch (childError) {
          console.warn('[CodeToFrame] Gagal memproses child node:', child.tagName, childError.message);
        }
      }
    }

    return node;
  } catch (error) {
    console.error('[CodeToFrame] Error selama rekursi DOM pada elemen:', element.tagName, error.message);
    return null;
  }
}

/**
 * Wrapper/Alias untuk parseDOMRecursive untuk kompatibilitas dengan AGENTS.md.
 *
 * @param {HTMLElement} element - Elemen awal penelusuran.
 * @param {DOMRect} parentRect - Rect dari parent node untuk menghitung posisi relatif.
 * @param {number} depth - Kedalaman rekursi saat ini.
 * @param {{count: number}} counter - Objek counter untuk membatasi jumlah node.
 * @returns {Object|null} Node tree hasil representasi, atau null jika di-skip.
 */
export function traverseDOM(element, parentRect, depth, counter) {
  return parseDOMRecursive(element, parentRect, depth, counter);
}
