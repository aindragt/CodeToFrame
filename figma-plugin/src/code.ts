import type { DesignPayload, RGBColor } from '../../shared/types';

/**
 * Mengonversi nilai RGB (0-255) ke format Figma (0.0-1.0).
 *
 * @param color - Objek warna RGB skala 0-255
 * @returns Objek warna RGB skala 0-1
 */
function toFigmaColor(color: RGBColor): RGB {
  return {
    r: Math.max(0, Math.min(255, color.r)) / 255,
    g: Math.max(0, Math.min(255, color.g)) / 255,
    b: Math.max(0, Math.min(255, color.b)) / 255,
  };
}

/**
 * Memastikan font siap digunakan sebelum memodifikasi characters pada TextNode.
 * Menggunakan fallback ke font "Inter" "Regular" jika font kustom bermasalah.
 *
 * @param fontName - Nama font yang ingin dimuat
 */
async function loadFontSafe(fontName: FontName = { family: "Inter", style: "Regular" }): Promise<void> {
  try {
    await figma.loadFontAsync(fontName);
  } catch (error) {
    console.warn(`[CodeToFrame] Gagal memuat font ${fontName.family} ${fontName.style}, menggunakan fallback Inter Regular.`, error);
    await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  }
}

/**
 * Menggambar elemen-elemen dari Payload ke dalam Figma FrameNode.
 *
 * @param payload - Data struktur desain dari ekstensi
 */
async function renderDesign(payload: DesignPayload): Promise<void> {
  // 1. Dapatkan posisi tengah dari viewport Figma saat ini
  const center = figma.viewport.center;

  // 2. Buat container utama berupa FrameNode
  const frame = figma.createFrame();
  frame.name = `Web Layout: ${payload.sourceUrl || 'CodeToFrame'}`;

  // Set ukuran Frame berdasarkan dimensi viewport browser asal
  frame.resize(payload.viewportWidth || 1440, payload.viewportHeight || 900);

  // Posisikan frame di tengah-tengah layar viewport Figma saat ini
  frame.x = center.x - frame.width / 2;
  frame.y = center.y - frame.height / 2;

  // 3. Iterasi setiap node dan gambarkan di dalam FrameNode (posisi relatif terhadap Frame)
  for (const element of payload.elements) {
    try {
      if (element.type === 'RECTANGLE') {
        const rectNode = figma.createRectangle();

        // Posisikan secara absolut relatif terhadap parent Frame
        rectNode.x = element.x;
        rectNode.y = element.y;
        rectNode.resize(Math.max(1, element.width), Math.max(1, element.height));

        // Terapkan fills (background color)
        rectNode.fills = [
          {
            type: 'SOLID',
            color: toFigmaColor(element.backgroundColor),
          }
        ];

        // Tambahkan ke dalam Frame
        frame.appendChild(rectNode);

      } else if (element.type === 'TEXT') {
        const textNode = figma.createText();

        // Posisikan teks relatif terhadap parent Frame
        textNode.x = element.x;
        textNode.y = element.y;
        textNode.resize(Math.max(1, element.width), Math.max(1, element.height));

        // ⚠️ Selalu muat font default/Inter sebelum memodifikasi teks
        await loadFontSafe();

        // Terapkan teks konten dan ukuran font
        textNode.characters = element.content || ' ';
        textNode.fontSize = element.fontSize > 0 ? element.fontSize : 12;

        // Terapkan warna teks (fills)
        textNode.fills = [
          {
            type: 'SOLID',
            color: toFigmaColor(element.color),
          }
        ];

        // Tambahkan ke dalam Frame
        frame.appendChild(textNode);
      }
    } catch (nodeError) {
      console.error('[CodeToFrame] Gagal merender elemen:', element, nodeError);
    }
  }

  // 4. Fokuskan viewport kamera Figma ke Frame baru
  figma.viewport.scrollAndZoomIntoView([frame]);
}

// Menampilkan UI plugin Figma (iframe UI)
figma.showUI(__html__, { width: 400, height: 450 });

// Mendengarkan pesan dari UI Thread (ui.html)
figma.ui.onmessage = async (msg: { type: string; payload?: any }) => {
  if (msg.type === 'render-design') {
    const payload = msg.payload as DesignPayload;

    if (!payload || !payload.elements) {
      figma.ui.postMessage({ type: 'status', success: false, message: 'Data payload tidak valid.' });
      return;
    }

    try {
      figma.ui.postMessage({ type: 'status', success: true, message: 'Mulai menggambar elemen...' });
      await renderDesign(payload);
      figma.ui.postMessage({ type: 'status', success: true, message: 'Desain berhasil digambar!' });
    } catch (err: any) {
      console.error('[CodeToFrame] Error selama penggambaran:', err);
      figma.ui.postMessage({ type: 'status', success: false, message: `Error: ${err.message || err}` });
    }
  }
};
