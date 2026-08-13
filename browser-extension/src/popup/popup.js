document.addEventListener('DOMContentLoaded', () => {
  const extractBtn = document.getElementById('extract-btn');
  const statusMessage = document.getElementById('status-message');

  if (!extractBtn || !statusMessage) {
    console.error('[CodeToFrame] Elemen UI tidak ditemukan.');
    return;
  }

  /**
   * Menampilkan pesan status dengan warna yang sesuai di antarmuka popup.
   *
   * @param {string} message - Pesan teks yang ingin ditampilkan.
   * @param {'info' | 'success' | 'error'} type - Tipe status
   */
  function setStatus(message, type) {
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
        throw new Error('Ekstrak tidak dapat dijalankan di halaman sistem browser.');
      }

      setStatus('Mengeksekusi skrip ekstraksi di halaman...', 'info');

      // 3. Inject dan jalankan fungsi ekstraksi di context tab aktif secara programatis
      chrome.scripting.executeScript(
        {
          target: { tabId: activeTab.id },
          func: () => {
            // Panggil fungsi pipeline yang terekspos di global window object (di entry.js)
            if (typeof window.runCodeToFramePipeline === 'function') {
              return window.runCodeToFramePipeline();
            }
            throw new Error('entry.js belum siap atau tidak ter-inject di halaman ini.');
          }
        },
        async (results) => {
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

          const res = results[0].result;

          if (res.success) {
            setStatus(`Berhasil! ${res.nodeCount} elemen tersalin ke clipboard.`, 'success');
          } else {
            setStatus(`Gagal: ${res.error || 'Terjadi kesalahan sistem.'}`, 'error');
          }

          resetButtonState();
        }
      );

    } catch (error) {
      console.error('[CodeToFrame] Error selama ekstraksi:', error);
      setStatus(error.message || 'Terjadi kesalahan sistem.', 'error');
      resetButtonState();
    }
  });

  /**
   * Mengembalikan teks dan status tombol kembali ke kondisi siap klik setelah jeda waktu.
   */
  function resetButtonState() {
    setTimeout(() => {
      if (extractBtn) {
        extractBtn.disabled = false;
        extractBtn.textContent = 'Extract & Copy DOM';
      }
    }, 2000);
  }
});
