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

  /**
   * Menangani event klik untuk melakukan ekstraksi DOM
   */
  extractBtn.addEventListener('click', async () => {
    extractBtn.disabled = true;
    extractBtn.textContent = 'Extracting...';
    setStatus('Mengambil tab aktif...', 'info');

    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const activeTab = tabs[0];

      if (!activeTab || !activeTab.id) {
        throw new Error('Tidak ada tab aktif yang ditemukan.');
      }

      const url = activeTab.url || '';

      if (url.startsWith('chrome://') || url.startsWith('edge://') || url.startsWith('about:') || url.includes('chrome.google.com/webstore')) {
        throw new Error('Ekstrak tidak dapat dijalankan di halaman sistem browser.');
      }

      setStatus('Mengeksekusi skrip ekstraksi di halaman...', 'info');

      // Memicu ekstraksi di content script dan mengambil hasilnya (asinkron)
      chrome.tabs.sendMessage(activeTab.id, { type: 'START_EXTRACTION' }, async (response) => {
        if (chrome.runtime.lastError) {
          setStatus(`Gagal: ${chrome.runtime.lastError.message}`, 'error');
          resetButtonState();
          return;
        }

        if (!response) {
          setStatus('Gagal menerima respons dari content script.', 'error');
          resetButtonState();
          return;
        }

        if (!response.success) {
          setStatus(`Gagal: ${response.error || 'Terjadi kesalahan sistem.'}`, 'error');
          resetButtonState();
          return;
        }

        setStatus('Menulis data ke clipboard OS...', 'info');

        // Lakukan serialisasi dan clipboard injection langsung dari Popup context
        try {
          // Dinamis import modul serializer & clipboard-writer
          const { serializeToInlineHTML } = await import('../content/html-serializer.js');
          const { writeToClipboard } = await import('../clipboard/clipboard-writer.js');

          const payloadHTML = serializeToInlineHTML(response.payload.rootNode);
          const payloadJSON = JSON.stringify(response.payload, null, 2);

          const clipboardRes = await writeToClipboard(payloadHTML, payloadJSON);

          if (clipboardRes.success) {
            setStatus(`Berhasil! ${response.nodeCount} elemen tersalin via ${clipboardRes.method}.`, 'success');
          } else {
            setStatus(`Gagal menyalin: ${clipboardRes.error}`, 'error');
          }
        } catch (err) {
          console.error('[CodeToFrame] Error clipboard processing:', err);
          setStatus(`Gagal: ${err.message}`, 'error');
        }

        resetButtonState();
      });

    } catch (error) {
      console.error('[CodeToFrame] Error selama ekstraksi:', error);
      setStatus(error.message || 'Terjadi kesalahan sistem.', 'error');
      resetButtonState();
    }
  });

  function resetButtonState() {
    setTimeout(() => {
      if (extractBtn) {
        extractBtn.disabled = false;
        extractBtn.textContent = 'Extract & Copy DOM';
      }
    }, 2000);
  }
});
