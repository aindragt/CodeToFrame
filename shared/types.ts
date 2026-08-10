/**
 * Format representasi warna RGB (masing-masing bernilai antara 0-255).
 * Figma API mengharapkan 0-1, konversi dilakukan saat render di plugin.
 */
export interface RGBColor {
  /** Nilai kanal merah (0 - 255) */
  r: number;
  /** Nilai kanal hijau (0 - 255) */
  g: number;
  /** Nilai kanal biru (0 - 255) */
  b: number;
}

/**
 * Interface dasar untuk semua jenis node/elemen yang diekstrak.
 * Berisi properti posisi dan dimensi standar.
 */
export interface BaseNode {
  /** Jenis tipe node/elemen */
  type: "RECTANGLE" | "TEXT";
  /** Posisi koordinat X absolut di halaman browser (pixel) */
  x: number;
  /** Posisi koordinat Y absolut di halaman browser (pixel) */
  y: number;
  /** Lebar elemen (pixel) */
  width: number;
  /** Tinggi elemen (pixel) */
  height: number;
  /** Warna latar belakang elemen (solid background) */
  backgroundColor: RGBColor;
}

/**
 * Interface untuk node bertipe "RECTANGLE" (div, section, button, dll).
 */
export interface RectangleNode extends BaseNode {
  type: "RECTANGLE";
}

/**
 * Interface untuk node bertipe "TEXT" (p, span, h1-h6, dll).
 */
export interface TextNode extends BaseNode {
  type: "TEXT";
  /** Warna teks (foreground color) */
  color: RGBColor;
  /** Ukuran font dalam pixel */
  fontSize: number;
  /** Isi teks konten dari elemen */
  content: string;
}

/**
 * Union type yang menggabungkan semua jenis tipe node Figma yang didukung.
 */
export type FigmaNode = RectangleNode | TextNode;

/**
 * Struktur payload data final yang diekspor dari browser extension
 * dan di-paste ke Figma plugin.
 */
export interface DesignPayload {
  /** URL asal halaman web yang diekstrak */
  sourceUrl: string;
  /** Lebar viewport browser saat pengambilan data */
  viewportWidth: number;
  /** Tinggi viewport browser saat pengambilan data */
  viewportHeight: number;
  /** Daftar elemen-elemen yang berhasil diekstrak */
  elements: FigmaNode[];
}
