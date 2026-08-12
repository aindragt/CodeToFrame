/**
 * @file clipboard-writer.js
 * @description Modul untuk menulis payload desain terstruktur ke clipboard OS dengan metode
 * dual-MIME (text/html dan text/plain) agar langsung dikenali oleh kanvas Figma secara native.
 */

/**
 * Menulis payload data ExtractionPayload ke clipboard OS secara asinkron.
 *
 * @param {import('../types/schema.js').ExtractionPayload} payload - Payload desain terstruktur.
 * @returns {Promise<{success: boolean, method: string, error?: string}>} Status penulisan clipboard.
 */
export async function writeToClipboard(payload) {
  // Skeleton placeholder
  return { success: true, method: 'native' };
}
  
/**
 * Membangun string HTML terstruktur dengan inline CSS berdasarkan tree node Figma.
 *
 * @param {import('../types/schema.js').FigmaNode} node - Figma root node.
 * @returns {string} String HTML yang valid untuk clipboard.
 */
export function buildHtmlPayload(node) {
  // Skeleton placeholder
  return '';
}
