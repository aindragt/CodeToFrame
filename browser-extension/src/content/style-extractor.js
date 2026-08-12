/**
 * @file style-extractor.js
 * @description Modul untuk membaca computed style (getComputedStyle) dan geometri (getBoundingClientRect)
 * dari elemen DOM dan mengekstraknya ke dalam visual properties terstandarisasi.
 */

/**
 * Mengekstrak seluruh properti visual CSS dari elemen DOM.
 *
 * @param {HTMLElement} element - Elemen DOM target ekstraksi.
 * @returns {import('../types/schema.js').ExtractedStyles} Objek properti visual yang berhasil diekstrak.
 */
export function extractAllStyles(element) {
  // Skeleton placeholder
  return {};
}

/**
 * Mengekstrak detail background (solid color, gradient, atau image URL).
 *
 * @param {CSSStyleDeclaration} computedStyle - Hasil getComputedStyle elemen.
 * @returns {Object} Objek background info.
 */
export function extractBackground(computedStyle) {
  // Skeleton placeholder
  return {};
}
