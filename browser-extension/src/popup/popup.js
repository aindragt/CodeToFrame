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
   * Escape HTML helper.
   */
  function escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Format border-radius ke format CSS inline.
   */
  function formatBorderRadius(radius) {
    if (!radius) return undefined;
    const { topLeft, topRight, bottomRight, bottomLeft } = radius;
    if (topLeft === 0 && topRight === 0 && bottomRight === 0 && bottomLeft === 0) return undefined;
    if (topLeft === topRight && topRight === bottomRight && bottomRight === bottomLeft) {
      return `${topLeft}px`;
    }
    return `${topLeft}px ${topRight}px ${bottomRight}px ${bottomLeft}px`;
  }

  /**
   * Format border ke format CSS inline.
   */
  function formatBorder(border) {
    if (!border || border.width === 0 || border.style === 'none') return undefined;
    const { r, g, b, a } = border.color || { r: 0, g: 0, b: 0, a: 1 };
    const red = Math.round(r * 255);
    const green = Math.round(g * 255);
    const blue = Math.round(b * 255);
    return `${border.width}px ${border.style} rgba(${red}, ${green}, ${blue}, ${a ?? 1})`;
  }

  /**
   * Format padding ke format CSS inline.
   */
  function formatPadding(padding) {
    if (!padding) return undefined;
    const { top, right, bottom, left } = padding;
    if (top === 0 && right === 0 && bottom === 0 && left === 0) return undefined;
    return `${top}px ${right}px ${bottom}px ${left}px`;
  }

  /**
   * Membuat inline style string dari key-value properti CSS.
   */
  function buildInlineStyle(props) {
    return Object.entries(props)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => `${key}: ${value}`)
      .join('; ');
  }

  /**
   * Membangun string HTML terstruktur dengan inline CSS berdasarkan tree node Figma.
   */
  function buildHtmlPayload(node) {
    if (!node) return '';

    try {
      const styles = node.styles || {};

      // 1. Tipe TEXT
      if (node.type === 'TEXT') {
        const typo = node.typography || {};
        const textColor = styles.textColor || { r: 0, g: 0, b: 0, a: 1 };
        const r = Math.round((textColor.r || 0) * 255);
        const g = Math.round((textColor.g || 0) * 255);
        const b = Math.round((textColor.b || 0) * 255);
        const a = textColor.a !== undefined ? textColor.a : 1;

        const inlineStyle = buildInlineStyle({
          'font-family': typo.fontFamily ? `"${typo.fontFamily}"` : 'Inter, sans-serif',
          'font-size': typo.fontSize ? `${typo.fontSize}px` : '16px',
          'font-weight': typo.fontWeight ? String(typo.fontWeight) : '400',
          'line-height': typo.lineHeight ? `${typo.lineHeight}px` : 'normal',
          'letter-spacing': typo.letterSpacing ? `${typo.letterSpacing}px` : 'normal',
          'text-align': (typo.textAlign || 'LEFT').toLowerCase(),
          'color': `rgba(${r}, ${g}, ${b}, ${a})`,
          'text-decoration': typo.textDecoration === 'UNDERLINE' ? 'underline' : (typo.textDecoration === 'STRIKETHROUGH' ? 'line-through' : 'none'),
          'opacity': styles.opacity !== undefined ? String(styles.opacity) : '1',
          'position': 'absolute',
          'left': `${node.x}px`,
          'top': `${node.y}px`,
          'width': `${node.width}px`,
          'height': `${node.height}px`,
          'margin': '0'
        });

        return `<p style="${inlineStyle}">${escapeHtml(node.textContent || '')}</p>`;
      }

      // 2. Tipe IMAGE / RECTANGLE dengan image url
      if (node.imageUrl) {
        const inlineStyle = buildInlineStyle({
          'position': 'absolute',
          'left': `${node.x}px`,
          'top': `${node.y}px`,
          'width': `${node.width}px`,
          'height': `${node.height}px`,
          'object-fit': 'cover',
          'border-radius': formatBorderRadius(styles.borderRadius),
          'opacity': styles.opacity !== undefined ? String(styles.opacity) : '1'
        });
        return `<img src="${node.imageUrl}" style="${inlineStyle}" alt="${escapeHtml(node.name)}" />`;
      }

      // 3. Tipe VECTOR (SVG)
      if (node.type === 'VECTOR' && node.svgContent) {
        return node.svgContent;
      }

      // 4. Tipe FRAME / Container
      const bg = styles.backgroundColor || null;
      let backgroundCss = undefined;
      if (bg) {
        const r = Math.round((bg.r || 0) * 255);
        const g = Math.round((bg.g || 0) * 255);
        const b = Math.round((bg.b || 0) * 255);
        const a = bg.a !== undefined ? bg.a : 1;
        backgroundCss = `rgba(${r}, ${g}, ${b}, ${a})`;
      }

      const isFlex = node.layout && node.layout.layoutMode;
      const inlineStyle = buildInlineStyle({
        'position': isFlex ? 'relative' : 'absolute',
        'left': isFlex ? undefined : `${node.x}px`,
        'top': isFlex ? undefined : `${node.y}px`,
        'width': `${node.width}px`,
        'height': `${node.height}px`,
        'background-color': backgroundCss,
        'border-radius': formatBorderRadius(styles.borderRadius),
        'border': formatBorder(styles.border),
        'opacity': styles.opacity !== undefined ? String(styles.opacity) : '1',
        'overflow': styles.overflow === 'hidden' ? 'hidden' : 'visible',
        'box-shadow': styles.boxShadow && styles.boxShadow.length > 0 ? '0px 4px 6px rgba(0,0,0,0.1)' : undefined,
        'display': isFlex ? 'flex' : 'block',
        'flex-direction': isFlex ? (node.layout.layoutMode === 'VERTICAL' ? 'column' : 'row') : undefined,
        'gap': isFlex ? `${node.layout.itemSpacing}px` : undefined,
        'padding': isFlex ? `${node.layout.paddingTop}px ${node.layout.paddingRight}px ${node.layout.paddingBottom}px ${node.layout.paddingLeft}px` : undefined,
        'justify-content': isFlex ? (node.layout.primaryAxisAlignItems === 'CENTER' ? 'center' : (node.layout.primaryAxisAlignItems === 'MAX' ? 'flex-end' : 'flex-start')) : undefined,
        'align-items': isFlex ? (node.layout.counterAxisAlignItems === 'CENTER' ? 'center' : (node.layout.counterAxisAlignItems === 'MAX' ? 'flex-end' : 'stretch')) : undefined,
        'flex-wrap': isFlex && node.layout.layoutWrap === 'WRAP' ? 'wrap' : undefined
      });

      const childrenHtml = (node.children || [])
        .map(child => buildHtmlPayload(child))
        .join('\n');

      return `<div style="${inlineStyle}">\n${childrenHtml}\n</div>`;
    } catch (error) {
      console.error('[CodeToFrame] Error building HTML payload for node:', node.name, error.message);
      return '';
    }
  }

  /**
   * Menulis payload data ExtractionPayload ke clipboard OS secara asinkron (dari Popup Context).
   *
   * @param {Object} payload - Payload desain terstruktur.
   * @returns {Promise<{success: boolean, method: string, error?: string}>} Status penulisan clipboard.
   */
  async function writeToClipboardFromPopup(payload) {
    if (!payload || !payload.rootNode) {
      return { success: false, method: 'none', error: 'Payload tidak valid.' };
    }

    const jsonString = JSON.stringify(payload, null, 2);
    const htmlPayload = buildHtmlPayload(payload.rootNode);

    const wrappedHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
</head>
<body>
${htmlPayload}
</body>
</html>`;

    // 1. Coba ClipboardItem API (MIME Injection)
    try {
      if (typeof ClipboardItem !== 'undefined') {
        const clipboardItem = new ClipboardItem({
          'text/html': new Blob([wrappedHtml], { type: 'text/html' }),
          'text/plain': new Blob([jsonString], { type: 'text/plain' })
        });
        await navigator.clipboard.write([clipboardItem]);
        return { success: true, method: 'native' };
      }
    } catch (error) {
      console.warn('[CodeToFrame] navigator.clipboard.write gagal di popup context:', error.message);
    }

    // 2. Coba writeText API
    try {
      await navigator.clipboard.writeText(jsonString);
      return { success: true, method: 'fallback-text' };
    } catch (error) {
      console.warn('[CodeToFrame] navigator.clipboard.writeText gagal di popup context:', error.message);
    }

    // 3. Fallback ke document.execCommand('copy') via textarea sementara
    try {
      const textarea = document.createElement('textarea');
      textarea.value = jsonString;
      // Sembunyikan elemen dari pandangan visual
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
        return { success: true, method: 'fallback-exec' };
      }
      throw new Error('document.execCommand copy mengembalikan nilai false.');
    } catch (fallbackError) {
      console.error('[CodeToFrame] Semua metode clipboard gagal:', fallbackError.message);
      return { success: false, method: 'none', error: fallbackError.message };
    }
  }

  // Menangani event klik untuk melakukan ekstraksi DOM
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

        // Melakukan penulisan clipboard di popup context yang memegang fokus Active Document
        const clipboardRes = await writeToClipboardFromPopup(response.payload);

        if (clipboardRes.success) {
          setStatus(`Berhasil! ${response.nodeCount} elemen tersalin via ${clipboardRes.method}.`, 'success');
        } else {
          setStatus(`Gagal menyalin: ${clipboardRes.error}`, 'error');
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
