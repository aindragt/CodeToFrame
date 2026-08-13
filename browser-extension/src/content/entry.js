/**
 * @file entry.js
 * @description Modul entry point untuk Content Script. Merangkai pipeline ekstraksi DOM,
 * style visual, pemetaan node Figma, dan mengembalikan data payload Figma ke popup.
 */

import { parseDOMRecursive } from './dom-traverser.js';
import { mapToFigmaTree, assemblePayload } from './figma-mapper.js';

/**
 * Menampilkan notifikasi visual toast di DOM halaman web.
 *
 * @param {string} message - Pesan yang akan ditampilkan.
 * @param {'success'|'error'} [type='success'] - Jenis notifikasi.
 */
function showToast(message, type = 'success') {
  try {
    // Hapus toast lama jika ada
    const oldToast = document.getElementById('codetoframe-toast');
    if (oldToast) {
      oldToast.remove();
    }

    const toast = document.createElement('div');
    toast.id = 'codetoframe-toast';
    
    // Styling dasar dengan vanilla CSS premium
    Object.assign(toast.style, {
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      padding: '12px 24px',
      borderRadius: '8px',
      backgroundColor: type === 'success' ? '#10B981' : '#EF4444',
      color: '#FFFFFF',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '14px',
      fontWeight: '500',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      zIndex: '2147483647',
      transition: 'opacity 0.3s ease, transform 0.3s ease',
      opacity: '0',
      transform: 'translateY(20px)',
      pointerEvents: 'none'
    });

    toast.textContent = message;
    document.body.appendChild(toast);

    // Memicu reflow untuk efek transisi masuk
    toast.offsetHeight;

    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';

    // Hilangkan toast setelah 3 detik
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(20px)';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  } catch (error) {
    console.warn('[CodeToFrame] Gagal memunculkan toast feedback:', error.message);
  }
}

/**
 * Menjalankan seluruh pipeline ekstraksi data DOM & CSS CodeToFrame v2.0.
 *
 * @param {HTMLElement} [targetElement=document.body] - Elemen DOM target yang akan diekstraksi.
 * @returns {Promise<{success: boolean, nodeCount?: number, payload?: Object, error?: string}>} Hasil ekstraksi data.
 */
export async function runCodeToFramePipeline(targetElement = document.body) {
  console.log('[CodeToFrame] Memulai pipeline ekstraksi data...');

  try {
    if (!targetElement) {
      throw new Error('Target element tidak ditemukan.');
    }

    // 1. DOM Traversal & Bounding Rect
    const counter = { count: 0 };
    const rect = targetElement.getBoundingClientRect();
    const domTree = parseDOMRecursive(targetElement, rect, 0, counter);

    if (!domTree) {
      throw new Error('Gagal membangun DOM Tree atau target element tidak terlihat.');
    }

    // 2. Pemetaan & Konversi ke Figma Node API format
    const figmaTree = mapToFigmaTree(domTree);
    if (!figmaTree) {
      throw new Error('Gagal memetakan DOM ke Figma Node Tree.');
    }

    // 3. Bungkus menjadi payload final
    const payload = assemblePayload(figmaTree);

    const successMsg = `Ekstraksi selesai! Memproses penyalinan ${counter.count} elemen...`;
    console.log(`[CodeToFrame] ${successMsg}`);
    showToast(successMsg, 'success');

    return {
      success: true,
      nodeCount: counter.count,
      payload: payload
    };

  } catch (error) {
    const errorMsg = error.message || 'Error tidak diketahui selama ekstraksi.';
    console.error('[CodeToFrame] Pipeline ekstraksi gagal:', errorMsg);
    showToast(`Gagal: ${errorMsg}`, 'error');
    
    return {
      success: false,
      error: errorMsg
    };
  }
}

// Mengekspos fungsi pipeline ke objek window global agar bisa dipanggil langsung dari console / executeScript
window.runCodeToFramePipeline = runCodeToFramePipeline;

// Mendengarkan pesan trigger dari Extension Popup (popup.js)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'START_EXTRACTION') {
    runCodeToFramePipeline()
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // Menandakan asinkronisasi respons
  }
});
