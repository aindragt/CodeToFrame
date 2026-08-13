/**
 * @file clipboard-writer.js
 * @description Modul untuk menulis payload desain terstruktur ke clipboard OS dengan metode
 * dual-MIME (text/html dan text/plain) agar langsung dikenali oleh kanvas Figma secara native.
 */

/**
 * Menulis payload data ExtractionPayload ke clipboard OS secara asinkron (Dual-MIME Blob).
 *
 * @param {string} payloadHTML - String HTML yang akan ditulis ke MIME 'text/html'.
 * @param {string} payloadJSON - String JSON yang akan ditulis ke MIME 'text/plain'.
 * @returns {Promise<{success: boolean, method: string, error?: string}>} Status penulisan clipboard.
 */
export async function writeToClipboard(payloadHTML, payloadJSON) {
  if (!payloadHTML || !payloadJSON) {
    return { success: false, method: 'none', error: 'Payload tidak valid.' };
  }

  // Bungkus dalam tag HTML standar dengan metadata pendukung agar aman di-parsing oleh Figma
  const wrappedHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
</head>
<body>
${payloadHTML}
</body>
</html>`;

  try {
    // 1. Coba menggunakan ClipboardItem API dengan Blob ganda (MIME Injection)
    if (typeof ClipboardItem !== 'undefined') {
      const htmlBlob = new Blob([wrappedHtml], { type: 'text/html' });
      const textBlob = new Blob([payloadJSON], { type: 'text/plain' });

      const clipboardItem = new ClipboardItem({
        'text/html': htmlBlob,
        'text/plain': textBlob
      });

      await navigator.clipboard.write([clipboardItem]);
      return { success: true, method: 'native-dual-blob' };
    }
  } catch (error) {
    console.warn('[CodeToFrame] Dual-MIME Blob injection gagal, mencoba fallback writeText:', error.message);
  }

  // 2. Fallback menggunakan event listener sinkron (Defensive Cross-MIME Fallback)
  try {
    const handleCopy = (e) => {
      e.clipboardData.setData('text/html', wrappedHtml);
      e.clipboardData.setData('text/plain', payloadJSON);
      e.preventDefault(); // Mencegah copy default browser
    };

    document.addEventListener('copy', handleCopy);
    const success = document.execCommand('copy');
    document.removeEventListener('copy', handleCopy);

    if (success) {
      return { success: true, method: 'fallback-exec-copy-dual' };
    }
  } catch (execError) {
    console.warn('[CodeToFrame] Fallback copy event listener gagal:', execError.message);
  }

  // 3. Fallback terakhir ke writeText biasa (Hanya text/plain JSON)
  try {
    await navigator.clipboard.writeText(payloadJSON);
    return { success: true, method: 'fallback-text-only' };
  } catch (lastError) {
    console.error('[CodeToFrame] Semua metode clipboard gagal:', lastError.message);
    return { success: false, method: 'none', error: lastError.message };
  }
}
