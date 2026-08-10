import type { DesignPayload } from '../../shared/types';

document.addEventListener('DOMContentLoaded', () => {
  const extractBtn = document.getElementById('extract-btn') as HTMLButtonElement | null;
  const statusMessage = document.getElementById('status-message') as HTMLSpanElement | null;

  if (!extractBtn || !statusMessage) {
    console.error('[CodeToFrame] Elemen UI tidak ditemukan.');
    return;
  }

  /**
   * Menampilkan pesan status dengan warna yang sesuai di antarmuka popup.
   *
   * @param message - Pesan teks yang ingin ditampilkan
   * @param type - Tipe status ('info' | 'success' | 'error')
   */
  function setStatus(message: string, type: 'info' | 'success' | 'error'): void {
    if (!statusMessage) return;
    statusMessage.textContent = message;
    statusMessage.className = ''; // Reset class list

    if (type === 'success') {
      statusMessage.classList.add('status-success');
    } else if (type === 'error') {
      statusMessage.classList.add('status-error');
    } else {
      statusMessage.classList.add('status-info');
    }
  }

  // Menangani event klik untuk melakukan ekstraksi DOM
  extractBtn.addEventListener('click', async () => {
    // 1. Ubah state tombol menjadi loading
    extractBtn.disabled = true;
    extractBtn.textContent = 'Extracting...';
    setStatus('Mengambil tab aktif...', 'info');

    try {
      // 2. Query tab yang sedang aktif di window saat ini
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const activeTab = tabs[0];

      if (!activeTab || !activeTab.id) {
        throw new Error('Tidak ada tab aktif yang ditemukan.');
      }

      const url = activeTab.url || '';

      // Proteksi awal: Cegah injeksi di halaman internal chrome:// atau system pages
      if (url.startsWith('chrome://') || url.startsWith('edge://') || url.startsWith('about:') || url.includes('chrome.google.com/webstore')) {
        throw new Error('Ekstrak tidak dapat dijalankan di halaman sistem browser atau Web Store.');
      }

      setStatus('Mengeksekusi skrip ekstraksi di halaman...', 'info');

      // 3. Inject dan jalankan fungsi ekstraksi di context tab aktif secara programatis
      chrome.scripting.executeScript(
        {
          target: { tabId: activeTab.id },
          // Kita memanggil fungsi extractPageDOM yang berada di content script (extractor.ts)
          func: () => {
            // Karena fungsi ini berjalan di context halaman web, kita panggil fungsi yang terekspos di window/global scope.
            // Di extractor.ts, kita akan menempelkannya atau memanggilnya secara langsung.
            // Untuk memastikan keandalan, kita panggil object extractor jika sudah ter-inject.
            if (typeof (window as any).extractPageDOM === 'function') {
              return (window as any).extractPageDOM();
            }
            throw new Error('extractor.ts belum siap atau tidak ter-inject di halaman ini.');
          }
        },
        async (results) => {
          // Menangani error runtime chrome.runtime.lastError secara aman
          if (chrome.runtime.lastError) {
            setStatus(`Gagal: ${chrome.runtime.lastError.message}`, 'error');
            resetButtonState();
            return;
          }

          if (!results || results.length === 0 || !results[0].result) {
            setStatus('Gagal mengekstrak data dari halaman.', 'error');
            resetButtonState();
            return;
          }

          const payload = results[0].result as DesignPayload;

          // Validasi payload dasar
          if (!payload.elements || !Array.isArray(payload.elements)) {
            setStatus('Format payload ekstraksi tidak valid.', 'error');
            resetButtonState();
            return;
          }

          // 4. Salin data JSON ke Clipboard
          const jsonString = JSON.stringify(payload, null, 2);
          try {
            await navigator.clipboard.writeText(jsonString);
            setStatus(`Berhasil! ${payload.elements.length} elemen tersalin ke clipboard.`, 'success');
          } catch (clipErr) {
            console.error('[CodeToFrame] Gagal menyalin ke clipboard:', clipErr);
            setStatus('Gagal menyalin otomatis. Periksa izin clipboard.', 'error');
          }

          resetButtonState();
        }
      );

    } catch (error: any) {
      console.error('[CodeToFrame] Error selama ekstraksi:', error);
      setStatus(error.message || 'Terjadi kesalahan sistem.', 'error');
      resetButtonState();
    }
  });

  /**
   * Mengembalikan teks dan status tombol kembali ke kondisi siap klik setelah jeda waktu.
   */
  function resetButtonState(): void {
    setTimeout(() => {
      if (extractBtn) {
        extractBtn.disabled = false;
        extractBtn.textContent = 'Extract & Copy DOM';
      }
    }, 2000);
  }
});
