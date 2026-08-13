/**
 * @file clipboard-writer.js
 * @description Modul untuk menulis payload desain JSON terstruktur ke clipboard OS
 * dalam format 'text/plain' agar dapat di-paste secara manual ke dalam figma-plugin.
 */

/**
 * Menulis payload data ExtractionPayload ke clipboard OS secara asinkron dalam format text/plain.
 *
 * @param {string} payloadHTML - Diabaikan (dipertahankan untuk kompatibilitas signature).
 * @param {string} payloadJSON - String JSON terformat yang akan disalin ke clipboard.
 * @returns {Promise<{success: boolean, method: string, error?: string}>} Status penulisan clipboard.
 */
export async function writeToClipboard(payloadHTML, payloadJSON) {
  if (!payloadJSON) {
    return { success: false, method: 'none', error: 'Payload JSON kosong atau tidak valid.' };
  }

  try {
    // 1. Coba menggunakan API clipboard modern writeText
    await navigator.clipboard.writeText(payloadJSON);
    return { success: true, method: 'native-text' };
  } catch (error) {
    console.warn('[CodeToFrame] navigator.clipboard.writeText gagal di popup context:', error.message);
  }

  // 2. Fallback menggunakan execCommand copy melalui textarea sementara
  try {
    const textarea = document.createElement('textarea');
    textarea.value = payloadJSON;
    
    // Sembunyikan elemen secara visual
    Object.assign(textarea.style, {
      position: 'fixed',
      top: '-9999px',
      left: '-9999px',
      opacity: '0'
    });
    
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    textarea.remove();

    if (success) {
      return { success: true, method: 'fallback-exec-copy' };
    }
    throw new Error('document.execCommand copy mengembalikan nilai false.');
  } catch (fallbackError) {
    console.error('[CodeToFrame] Semua metode clipboard gagal:', fallbackError.message);
    return { success: false, method: 'none', error: fallbackError.message };
  }
}
