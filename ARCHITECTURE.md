# 🏗️ ARCHITECTURE.md — CodeToFrame v2.0

> Dokumen arsitektur teknis untuk CodeToFrame v2.0.  
> Menjelaskan pendekatan modular, alur data, dan keputusan desain yang mendasari sistem.
>
> **Terakhir diperbarui:** 12 Agustus 2026

---

## Daftar Isi

1. [High-Level Architecture](#1--high-level-architecture)
2. [Recursive DOM Traversal](#2--recursive-dom-traversal)
3. [Computed Styles & Geometry](#3--computed-styles--geometry)
4. [Clipboard API Injection](#4--clipboard-api-injection)
5. [Module Architecture](#5--module-architecture)
6. [Data Flow](#6--data-flow)
7. [Naming Conventions](#7--naming-conventions)

---

## 1. 🗺️ High-Level Architecture

### Perubahan Arsitektur: v1.0 → v2.0

**v1.0** menggunakan model dua komponen (Extension + Plugin Figma) yang terhubung lewat manual copy-paste JSON:

```
v1.0: Extension ──JSON──► Clipboard ──Manual Paste──► Plugin Figma ──► Canvas
```

**v2.0** menyederhanakan menjadi satu komponen (Extension saja) yang menulis payload langsung ke clipboard OS dalam format yang Figma kenali secara native:

```
v2.0: Extension ──MIME Payload──► OS Clipboard ──Ctrl+V──► Figma Canvas (langsung!)
```

### Diagram Arsitektur v2.0

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         CHROME EXTENSION (Manifest V3)                     │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                         CONTENT SCRIPT                               │  │
│  │                                                                      │  │
│  │  ┌──────────────┐    ┌──────────────────┐    ┌───────────────────┐  │  │
│  │  │ DOM Traverser │───►│ Style Extractor  │───►│  Figma Mapper    │  │  │
│  │  │              │    │                  │    │                   │  │  │
│  │  │ • Recursive  │    │ • getComputed    │    │ • DOM→Figma Tree │  │  │
│  │  │   tree walk  │    │   Style()        │    │ • Auto Layout    │  │  │
│  │  │ • Visibility │    │ • getBounding    │    │   detection      │  │  │
│  │  │   filtering  │    │   ClientRect()   │    │ • Smart naming   │  │  │
│  │  │ • Z-order    │    │ • Color parsing  │    │ • Type mapping   │  │  │
│  │  │   preserve   │    │ • Shadow parsing │    │                   │  │  │
│  │  └──────────────┘    └──────────────────┘    └────────┬──────────┘  │  │
│  │                                                        │             │  │
│  └────────────────────────────────────────────────────────┼─────────────┘  │
│                                                           │                │
│  ┌──────────────┐                                         │                │
│  │   Popup UI   │◄──status updates───────────────────────►│                │
│  │  popup.html  │                                         │                │
│  │  popup.ts    │                                         ▼                │
│  └──────────────┘                              ┌────────────────────┐      │
│                                                │ Clipboard Writer   │      │
│                                                │                    │      │
│                                                │ • MIME encoding    │      │
│                                                │ • Fallback to text │      │
│                                                └─────────┬──────────┘      │
│                                                          │                 │
└──────────────────────────────────────────────────────────┼─────────────────┘
                                                           │
                                                ┌──────────▼──────────┐
                                                │   OS Clipboard      │
                                                │   MIME: figma/json  │
                                                └──────────┬──────────┘
                                                           │
                                                    Ctrl+V / Cmd+V
                                                           │
                                                ┌──────────▼──────────┐
                                                │   FIGMA CANVAS      │
                                                │   Nested Frames     │
                                                │   + Styling         │
                                                │   + Auto Layout     │
                                                │   🎉                │
                                                └─────────────────────┘
```

### Prinsip Arsitektur v2.0

| Prinsip | Penjelasan |
|---|---|
| **Modular Pipeline** | Setiap tahap (traverse → extract → map → write) adalah modul independen yang bisa diuji dan diganti sendiri. |
| **Tree-First** | Seluruh pipeline bekerja dengan struktur tree (bukan flat array) untuk mempertahankan hirarki DOM. |
| **Fail-Soft** | Jika satu elemen atau properti gagal diekstrak, skip dan lanjutkan — jangan crash seluruh proses. |
| **Progressive Fidelity** | Sistem mengekstrak sebanyak mungkin properti, tapi degradasi secara graceful jika ada yang tidak didukung. |

---

## 2. 🌳 Recursive DOM Traversal

### Konsep Inti

Inti dari sistem v2.0 adalah **penelusuran rekursif (recursive traversal)** dari root DOM (`document.body`) ke seluruh leaf node sambil membangun tree output yang mempertahankan hirarki visual.

### Algoritma

```
FUNGSI traverse(domNode, parentFigmaNode):
    1. PERIKSA visibilitas domNode
       - Jika display:none → SKIP node DAN seluruh children-nya
       - Jika visibility:hidden → SKIP node sendiri, TAPI tetap proses children
       - Jika width=0 DAN height=0 → SKIP
       - Jika tag non-visual (script, style, meta, link) → SKIP

    2. KLASIFIKASI node menjadi tipe Figma:
       - Container tags (div, section, header, nav, ...) → FRAME
       - Text tags (p, h1-h6, span, a, ...) → TEXT
       - <img> → IMAGE
       - <svg> inline → VECTOR
       - Lainnya → FRAME (generic container)

    3. BANGUN figmaNode dari domNode:
       - Baca geometry (getBoundingClientRect)
       - Baca computed styles (getComputedStyle)
       - Buat nama layer (smart naming dari tag/class/id)
       - Deteksi auto layout (display:flex → layoutMode)

    4. UNTUK SETIAP childElement dari domNode:
       - traverse(childElement, figmaNode)    ← REKURSI
       - Posisikan child relatif terhadap parent

    5. TAMBAHKAN figmaNode ke parentFigmaNode.children

    KEMBALIKAN figmaNode
```

### Penanganan Z-Order (Urutan Tumpukan)

Browser merender elemen DOM dalam urutan kemunculannya di HTML (kecuali ada `z-index` eksplisit). Untuk mempertahankan urutan tumpukan visual di Figma:

1. **Proses children sesuai urutan DOM** — child pertama di DOM = child pertama di Figma (di belakang/bawah tumpukan).
2. **Elemen dengan `position: absolute/fixed` dan `z-index` tinggi** — pindahkan ke akhir array children agar tergambar di atas.
3. **Stacking context** — jika elemen membuat stacking context baru (via `z-index`, `opacity < 1`, `transform`, dll.), buat Frame baru sebagai container.

```
Urutan DOM:                     Urutan di Figma (bottom-to-top):
<div class="a">   ─── ①        Layer "div.a"       ← paling bawah
<div class="b">   ─── ②        Layer "div.b"       ← di atas a
<div class="c">   ─── ③        Layer "div.c"       ← paling atas
```

### Batasan Kedalaman

Untuk mencegah stack overflow dan payload yang terlalu besar:

```typescript
const MAX_DEPTH = 15;        // Kedalaman maksimal nesting
const MAX_NODES = 2000;      // Jumlah maksimal node yang diekstrak
```

Jika batas tercapai:
- **MAX_DEPTH**: Flatten sisa children ke level terakhir yang diizinkan.
- **MAX_NODES**: Hentikan traversal, log warning, dan laporkan ke pengguna via popup.

---

## 3. 📐 Computed Styles & Geometry

### Geometry: `getBoundingClientRect()`

Setiap elemen DOM memiliki posisi dan dimensi yang bisa dibaca melalui `getBoundingClientRect()`:

```typescript
const rect = element.getBoundingClientRect();
// rect.x, rect.y    → posisi relatif terhadap viewport (top-left corner)
// rect.width         → lebar elemen (termasuk padding + border)
// rect.height        → tinggi elemen (termasuk padding + border)
```

**Koordinat Absolut vs Relatif:**

Dalam v2.0 (nested structure), koordinat child harus **relatif terhadap parent**, bukan terhadap viewport:

```typescript
/**
 * Menghitung posisi child relatif terhadap parent-nya.
 * Ini penting karena di Figma, posisi children di dalam Frame
 * selalu relatif terhadap sudut kiri atas Frame tersebut.
 *
 * @param childRect - Bounding rect dari child element
 * @param parentRect - Bounding rect dari parent element
 * @returns Koordinat { x, y } relatif terhadap parent
 */
function getRelativePosition(
  childRect: DOMRect,
  parentRect: DOMRect
): { x: number; y: number } {
  return {
    x: Math.round(childRect.left - parentRect.left),
    y: Math.round(childRect.top - parentRect.top),
  };
}
```

**Penanganan Scroll:**
- `getBoundingClientRect()` mengembalikan posisi relatif terhadap **viewport yang terlihat**, bukan posisi absolut di halaman.
- Untuk elemen di bawah fold (perlu scroll), posisi Y akan negatif jika sudah di-scroll melewati viewport.
- **Solusi:** Tambahkan `window.scrollX` dan `window.scrollY` untuk mendapatkan posisi absolut di halaman.

```typescript
const absoluteX = rect.left + window.scrollX;
const absoluteY = rect.top + window.scrollY;
```

### Computed Styles: `getComputedStyle()`

`window.getComputedStyle(element)` mengembalikan semua properti CSS yang sudah dihitung (resolved) oleh browser — termasuk inherited styles, cascade, dan unit conversion.

**Properti yang Diekstrak:**

```typescript
const style = window.getComputedStyle(element);

// === BACKGROUND ===
style.backgroundColor      // "rgb(59, 130, 246)" atau "rgba(0,0,0,0)"
style.backgroundImage       // "linear-gradient(...)" atau "url(...)" atau "none"

// === BORDER ===
style.borderTopWidth        // "1px" — per sisi
style.borderTopColor        // "rgb(229, 231, 235)"
style.borderTopStyle        // "solid", "dashed", "none"
style.borderRadius          // Shorthand: "8px" atau "8px 4px 12px 0px"

// Untuk per-corner radius:
style.borderTopLeftRadius       // "8px"
style.borderTopRightRadius      // "4px"
style.borderBottomRightRadius   // "12px"
style.borderBottomLeftRadius    // "0px"

// === BOX SHADOW ===
style.boxShadow             // "rgba(0,0,0,0.1) 0px 4px 6px -1px, rgba(0,0,0,0.06) 0px 2px 4px -1px"
                             // Bisa multiple shadows, dipisahkan koma

// === OPACITY ===
style.opacity               // "0.5" (string — harus di-parseFloat)

// === TYPOGRAPHY ===
style.fontFamily            // "'Inter', sans-serif" — termasuk fallback stack
style.fontSize              // "16px"
style.fontWeight            // "400" atau "bold" (resolved ke angka)
style.lineHeight            // "24px" atau "normal"
style.letterSpacing         // "0.5px" atau "normal"
style.textAlign             // "left", "center", "right", "justify"
style.color                 // "rgb(30, 30, 30)"
style.textDecorationLine    // "underline", "line-through", "none"

// === LAYOUT ===
style.display               // "flex", "block", "inline", "none", dll.
style.flexDirection          // "row", "column", "row-reverse", "column-reverse"
style.justifyContent         // "flex-start", "center", "space-between", dll.
style.alignItems             // "stretch", "center", "flex-start", dll.
style.gap                   // "16px" atau "16px 8px" (row-gap column-gap)
style.paddingTop             // Per sisi: "16px"
style.paddingRight           // "24px"
style.paddingBottom          // "16px"
style.paddingLeft            // "24px"
style.overflow               // "hidden", "visible", "auto", "scroll"
style.position               // "relative", "absolute", "fixed", "sticky"
```

**Catatan Penting Tentang `getComputedStyle`:**
1. Semua nilai yang dikembalikan berupa **string** — harus di-parse ke angka/objek.
2. Warna selalu dikembalikan dalam format `rgb()` atau `rgba()` — bahkan jika di CSS ditulis sebagai hex atau hsl.
3. `shorthand` properties (seperti `border`, `padding`) mungkin tidak tersedia — gunakan longhand per sisi.
4. `inherit`, `initial`, `unset` sudah di-resolve oleh browser.

### Parsing Warna CSS yang Robust

Browser mengembalikan warna dalam format terbatas, tapi extension mungkin juga perlu menangani nilai dari atribut atau inline style:

```typescript
/**
 * Parser warna CSS yang komprehensif.
 * Mendukung: rgb(), rgba(), hex (3, 4, 6, 8 digit), hsl(), hsla(), named colors.
 *
 * @param raw - String warna CSS mentah
 * @returns Objek RGBA dengan nilai 0-255 (r, g, b) dan 0-1 (a)
 */
function parseColor(raw: string): { r: number; g: number; b: number; a: number } {
  const DEFAULT = { r: 0, g: 0, b: 0, a: 1 };

  if (!raw || raw === 'transparent') return { ...DEFAULT, a: 0 };

  // 1. Format rgb(R, G, B) atau rgba(R, G, B, A)
  const rgbMatch = raw.match(
    /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/
  );
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1], 10),
      g: parseInt(rgbMatch[2], 10),
      b: parseInt(rgbMatch[3], 10),
      a: rgbMatch[4] !== undefined ? parseFloat(rgbMatch[4]) : 1,
    };
  }

  // 2. Format HEX: #RGB, #RGBA, #RRGGBB, #RRGGBBAA
  const hexMatch = raw.match(/^#([0-9a-fA-F]{3,8})$/);
  if (hexMatch) {
    const hex = hexMatch[1];
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
        a: 1,
      };
    }
    if (hex.length === 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: 1,
      };
    }
    if (hex.length === 8) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: parseInt(hex.slice(6, 8), 16) / 255,
      };
    }
  }

  // 3. Fallback
  return DEFAULT;
}
```

### Parsing Box-Shadow

`box-shadow` CSS bisa sangat kompleks — multiple shadows, inset, dan spread:

```typescript
/**
 * Parsing string box-shadow CSS menjadi array objek shadow.
 *
 * Format CSS: [inset?] offsetX offsetY [blur] [spread] color
 * Contoh: "rgba(0,0,0,0.1) 0px 4px 6px -1px, rgba(0,0,0,0.06) 0px 2px 4px -1px"
 *
 * @param raw - String box-shadow dari getComputedStyle
 * @returns Array objek shadow
 */
function parseBoxShadow(raw: string): ShadowEffect[] {
  if (!raw || raw === 'none') return [];

  const shadows: ShadowEffect[] = [];

  // Split by koma, tapi hati-hati: rgba() juga mengandung koma
  // Gunakan regex yang aware terhadap parentheses
  const shadowParts = raw.split(/,(?![^(]*\))/);

  for (const part of shadowParts) {
    const trimmed = part.trim();
    const isInset = trimmed.includes('inset');
    const cleaned = trimmed.replace('inset', '').trim();

    // Ekstrak warna (biasanya di awal atau akhir)
    const colorMatch = cleaned.match(/rgba?\([^)]+\)/);
    const color = colorMatch ? parseColor(colorMatch[0]) : { r: 0, g: 0, b: 0, a: 0.25 };

    // Ekstrak nilai numerik (offsetX, offsetY, blur, spread)
    const withoutColor = cleaned.replace(/rgba?\([^)]+\)/, '').trim();
    const values = withoutColor.match(/-?[\d.]+/g)?.map(Number) || [0, 0, 0, 0];

    shadows.push({
      type: isInset ? 'INNER_SHADOW' : 'DROP_SHADOW',
      offsetX: values[0] || 0,
      offsetY: values[1] || 0,
      blur: values[2] || 0,
      spread: values[3] || 0,
      color,
    });
  }

  return shadows;
}
```

### Parsing Linear-Gradient

```typescript
/**
 * Parsing CSS linear-gradient menjadi objek gradient untuk Figma.
 *
 * Format CSS: linear-gradient(direction, color-stop1, color-stop2, ...)
 * Contoh: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
 *
 * @param raw - String background-image dari getComputedStyle
 * @returns Objek gradient atau null jika bukan gradient
 */
function parseLinearGradient(raw: string): GradientData | null {
  const match = raw.match(/linear-gradient\((.+)\)/);
  if (!match) return null;

  const content = match[1];

  // Pisahkan angle dari color stops
  // Angle bisa: "135deg", "to right", "to bottom left"
  const parts = content.split(/,(?![^(]*\))/);
  let angleDeg = 180; // Default: top to bottom
  let colorStopStart = 0;

  const firstPart = parts[0].trim();
  if (firstPart.endsWith('deg')) {
    angleDeg = parseFloat(firstPart);
    colorStopStart = 1;
  } else if (firstPart.startsWith('to ')) {
    // Map keyword directions ke derajat
    const dirMap: Record<string, number> = {
      'to top': 0, 'to right': 90, 'to bottom': 180, 'to left': 270,
      'to top right': 45, 'to bottom right': 135,
      'to bottom left': 225, 'to top left': 315,
    };
    angleDeg = dirMap[firstPart] ?? 180;
    colorStopStart = 1;
  }

  // Parse color stops
  const colorStops: GradientStop[] = [];
  for (let i = colorStopStart; i < parts.length; i++) {
    const stopPart = parts[i].trim();
    const colorMatch = stopPart.match(/rgba?\([^)]+\)|#[0-9a-fA-F]{3,8}/);
    const positionMatch = stopPart.match(/([\d.]+)%/);

    if (colorMatch) {
      colorStops.push({
        color: parseColor(colorMatch[0]),
        position: positionMatch ? parseFloat(positionMatch[1]) / 100 : i / (parts.length - 1),
      });
    }
  }

  return { angleDeg, colorStops };
}
```

---

## 4. 📋 Clipboard API Injection

### Konsep: MIME Figma di Clipboard

Saat pengguna melakukan Paste (Ctrl+V) di Figma, Figma memeriksa clipboard OS untuk format data tertentu. Jika ditemukan payload dengan format yang dikenali, Figma langsung membuat node tree tanpa memerlukan plugin.

### Mekanisme Teknis

```typescript
/**
 * Menulis payload design tree ke clipboard OS dalam format yang dikenali Figma.
 *
 * Figma menggunakan MIME type khusus untuk clipboard. Payload berisi
 * representasi JSON dari node tree yang akan di-paste.
 *
 * @param payload - Tree node Figma yang sudah di-konversi dari DOM
 */
async function writeToClipboard(payload: FigmaClipboardPayload): Promise<void> {
  const jsonString = JSON.stringify(payload);

  try {
    // Metode 1: Tulis sebagai MIME khusus Figma
    // Figma mengenali format web (HTML) yang berisi metadata Figma
    const htmlPayload = buildFigmaHtmlPayload(payload);

    const clipboardItem = new ClipboardItem({
      'text/html': new Blob([htmlPayload], { type: 'text/html' }),
      'text/plain': new Blob([jsonString], { type: 'text/plain' }),
    });

    await navigator.clipboard.write([clipboardItem]);
    console.log('[CodeToFrame] Payload berhasil ditulis ke clipboard.');

  } catch (error) {
    console.warn('[CodeToFrame] Gagal menulis MIME khusus, fallback ke text/plain:', error);

    // Metode 2: Fallback — tulis sebagai teks JSON biasa
    // Masih bisa digunakan dengan plugin v1.0 (manual paste ke textarea)
    await navigator.clipboard.writeText(jsonString);
  }
}
```

### Strategi Encoding Payload

Ada dua pendekatan yang sedang dieksplorasi:

#### Pendekatan A: HTML dengan Metadata Figma Embedded

Figma mendukung paste dari HTML. Saat menerima paste HTML, Figma mengonversinya menjadi Frame + Text nodes. Kita bisa memperkaya HTML ini dengan metadata styling yang lebih akurat:

```typescript
function buildFigmaHtmlPayload(tree: FigmaNodeTree): string {
  // Bangun HTML string dengan inline styles yang akurat
  // Figma akan membaca HTML dan membuat nodes berdasarkan struktur + styling
  return renderTreeToHtml(tree);
}
```

**Keuntungan:** Tidak perlu reverse-engineer format internal Figma.
**Kelemahan:** Fidelitas terbatas pada kemampuan Figma meng-parse HTML.

#### Pendekatan B: Format Clipboard Internal Figma

Jika kita bisa mengetahui format clipboard internal Figma (melalui analisis paste event di plugin development), kita bisa menulis payload yang langsung dikenali:

```typescript
// Format ini perlu di-reverse-engineer dari Figma clipboard
const figmaPayload = {
  type: 'FIGMA_CLIPBOARD',
  version: '2',
  nodes: convertTreeToFigmaFormat(tree),
};
```

**Keuntungan:** Fidelitas maksimal — semua properti Figma bisa di-set.
**Kelemahan:** Format internal bisa berubah tanpa pemberitahuan.

#### Pendekatan C: Hybrid (Direkomendasikan)

Tulis kedua format ke clipboard:
1. `text/html` → HTML terstruktur dengan inline styles (untuk paste langsung).
2. `text/plain` → JSON string (untuk paste ke plugin v1.0 sebagai fallback).

```typescript
const clipboardItem = new ClipboardItem({
  'text/html': new Blob([htmlPayload], { type: 'text/html' }),
  'text/plain': new Blob([jsonPayload], { type: 'text/plain' }),
});
```

### Persyaratan Permission

```json
// manifest.json
{
  "permissions": [
    "activeTab",
    "scripting",
    "clipboardWrite"
  ]
}
```

### Error Handling Clipboard

| Skenario Error | Penanganan |
|---|---|
| `NotAllowedError` (permission denied) | Tampilkan instruksi untuk mengizinkan clipboard access |
| `SecurityError` (non-HTTPS page) | Fallback ke `document.execCommand('copy')` (deprecated tapi masih works) |
| `DataCloneError` (payload terlalu besar) | Chunk payload atau reduce node count, tampilkan warning |
| Browser lama tanpa `ClipboardItem` | Fallback ke `writeText()` + JSON string |

---

## 5. 🧱 Module Architecture

### Prinsip Modularisasi

Kode dibagi berdasarkan **tanggung jawab tunggal** (*Single Responsibility Principle*). Setiap modul bisa diuji secara independen dan diganti tanpa memengaruhi modul lain.

### Peta Modul

```
browser-extension/src/
│
├── content/                     ← CONTENT SCRIPT MODULES
│   │
│   ├── entry.ts                 ← Entry point: mendengarkan pesan dari popup,
│   │                               memulai pipeline extraction
│   │
│   ├── dom-traverser.ts         ← MODULE 1: Recursive DOM Traversal
│   │   │
│   │   │  Tanggung jawab:
│   │   │  • Menelusuri DOM tree secara rekursif dari document.body
│   │   │  • Memfilter elemen berdasarkan visibilitas
│   │   │  • Membangun tree bersarang (parent-child relationships)
│   │   │  • Menjaga z-order (urutan tumpukan visual)
│   │   │  • Menerapkan batas kedalaman (MAX_DEPTH) dan node count (MAX_NODES)
│   │   │
│   │   │  Input:  HTMLElement (root node)
│   │   │  Output: DOMNodeTree (intermediate tree representation)
│   │   │
│   │   └──────────────────────
│   │
│   ├── style-extractor.ts       ← MODULE 2: CSS Property Extraction
│   │   │
│   │   │  Tanggung jawab:
│   │   │  • Membaca getComputedStyle() untuk setiap elemen
│   │   │  • Mengekstrak background (solid color, gradient, image URL)
│   │   │  • Mengekstrak border (width, color, style, radius)
│   │   │  • Mengekstrak box-shadow (multiple shadows, inset)
│   │   │  • Mengekstrak opacity
│   │   │  • Mengekstrak typography (font-family, size, weight, line-height, dll.)
│   │   │  • Mendeteksi flexbox layout properties
│   │   │
│   │   │  Input:  HTMLElement
│   │   │  Output: ExtractedStyles (typed object dengan semua properti)
│   │   │
│   │   └──────────────────────
│   │
│   ├── figma-mapper.ts          ← MODULE 3: DOM → Figma Node Conversion
│   │   │
│   │   │  Tanggung jawab:
│   │   │  • Mengonversi DOMNodeTree → FigmaNodeTree
│   │   │  • Memetakan tipe elemen (div→FRAME, p→TEXT, img→IMAGE, svg→VECTOR)
│   │   │  • Memetakan CSS properties → Figma properties
│   │   │  • Menghitung posisi relatif (child relative to parent)
│   │   │  • Menerapkan smart layer naming (tag.class#id)
│   │   │  • Mendeteksi dan menetapkan Auto Layout (flex→layoutMode)
│   │   │
│   │   │  Input:  DOMNodeTree + ExtractedStyles
│   │   │  Output: FigmaNodeTree (siap untuk clipboard)
│   │   │
│   │   └──────────────────────
│   │
│   └── (index.ts)               ← Re-export semua modul content script
│
├── clipboard/                   ← CLIPBOARD MODULE
│   │
│   └── clipboard-writer.ts      ← MODULE 4: Clipboard Payload Writer
│       │
│       │  Tanggung jawab:
│       │  • Menerima FigmaNodeTree dari figma-mapper
│       │  • Mengonversi tree → HTML string (dengan inline styles)
│       │  • Mengonversi tree → JSON string (fallback)
│       │  • Menulis ke clipboard via navigator.clipboard.write()
│       │  • Menangani error dan fallback
│       │
│       │  Input:  FigmaNodeTree
│       │  Output: void (side effect: data masuk ke clipboard)
│       │
│       └──────────────────────
│
├── utils/                       ← UTILITY MODULES (pure functions)
│   ├── color-parser.ts          ← parseColor(str) → RGBA
│   ├── gradient-parser.ts       ← parseLinearGradient(str) → GradientData
│   ├── shadow-parser.ts         ← parseBoxShadow(str) → ShadowEffect[]
│   └── font-mapper.ts           ← mapFontWeight(weight) → FigmaFontStyle
│
├── popup/                       ← POPUP UI
│   ├── popup.html               ← Tampilan popup (tombol + status)
│   ├── popup.ts                 ← Logika popup (mengirim pesan ke content script)
│   └── popup.css                ← Styling popup
│
└── types/                       ← TYPE DEFINITIONS
    └── schema.ts                ← Semua TypeScript interfaces (v2.0 schema)
```

### Alur Data Antar Modul

```
popup.ts
    │
    │ chrome.tabs.sendMessage({ type: 'EXTRACT' })
    ▼
entry.ts (content script)
    │
    │ 1. Menerima pesan
    │ 2. Memanggil pipeline
    ▼
dom-traverser.ts ──► style-extractor.ts ──► figma-mapper.ts ──► clipboard-writer.ts
    │                    │                     │                      │
    │ Bangun DOM tree    │ Ekstrak CSS         │ Konversi ke          │ Tulis ke
    │ bersarang          │ properties          │ Figma format         │ clipboard
    │                    │                     │                      │
    ▼                    ▼                     ▼                      ▼
DOMNodeTree         ExtractedStyles      FigmaNodeTree           OS Clipboard
```

### Kontrak Antar Modul (Interface)

```typescript
// ═══ Module 1 Output: DOMNodeTree ═══
interface DOMNodeInfo {
  element: HTMLElement;
  tagName: string;
  rect: DOMRect;
  computedStyle: CSSStyleDeclaration;
  children: DOMNodeInfo[];
}

// ═══ Module 2 Output: ExtractedStyles ═══
interface ExtractedStyles {
  backgroundColor: RGBA;
  backgroundGradient: GradientData | null;
  backgroundImageUrl: string | null;
  border: BorderData;
  borderRadius: CornerRadii;
  boxShadow: ShadowEffect[];
  opacity: number;
  overflow: 'visible' | 'hidden' | 'scroll' | 'auto';
  typography: TypographyData | null;  // null jika bukan elemen teks
  layout: LayoutData;
}

// ═══ Module 3 Output: FigmaNodeTree ═══
interface FigmaNode {
  type: 'FRAME' | 'TEXT' | 'IMAGE' | 'VECTOR';
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  styles: FigmaStyles;
  layout?: FigmaLayoutProps;
  textContent?: string;
  typography?: FigmaTypography;
  imageUrl?: string;
  svgContent?: string;
  children: FigmaNode[];
}
```

---

## 6. 🔄 Data Flow

### Diagram Alur Lengkap v2.0

```
                     BROWSER CHROME
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  ┌──────────┐     ┌──────────────────────────────────────────────────┐  │
│  │  Popup   │────►│              CONTENT SCRIPT PIPELINE             │  │
│  │  UI      │     │                                                  │  │
│  └──────────┘     │  ①               ②                ③             │  │
│       ▲           │  DOM          Style             Figma            │  │
│       │           │  Traverser ──► Extractor ──────► Mapper          │  │
│       │           │  (recursive)   (getComputed     (DOM→Figma      │  │
│       │           │                 Style)           node tree)      │  │
│       │           │                                    │             │  │
│       │           └────────────────────────────────────┼─────────────┘  │
│       │                                                │                │
│       │  ⑤ Status update                               │ ④              │
│       │  (success/error count)                         ▼                │
│       │                                     ┌──────────────────┐        │
│       └─────────────────────────────────────│ Clipboard Writer │        │
│                                             │ (MIME encoding)  │        │
│                                             └────────┬─────────┘        │
│                                                      │                  │
└──────────────────────────────────────────────────────┼──────────────────┘
                                                       │
                                            ┌──────────▼──────────┐
                                            │   OS Clipboard      │
                                            │ ┌─────────────────┐ │
                                            │ │ text/html       │ │
                                            │ │ (styled HTML)   │ │
                                            │ ├─────────────────┤ │
                                            │ │ text/plain      │ │
                                            │ │ (JSON fallback) │ │
                                            │ └─────────────────┘ │
                                            └──────────┬──────────┘
                                                       │
                                                Ctrl+V / Cmd+V
                                                       │
                                            ┌──────────▼──────────┐
                                            │   FIGMA CANVAS      │
                                            │                     │
                                            │  ┌──────────────┐  │
                                            │  │ Root Frame    │  │
                                            │  │  ├─ Header    │  │
                                            │  │  │  ├─ Logo   │  │
                                            │  │  │  └─ Nav    │  │
                                            │  │  ├─ Hero      │  │
                                            │  │  │  ├─ Title  │  │
                                            │  │  │  └─ Image  │  │
                                            │  │  └─ Footer    │  │
                                            │  └──────────────┘  │
                                            │       🎉            │
                                            └─────────────────────┘
```

### Ringkasan Data Flow (Tabel)

| Langkah | Dari | Ke | Data | Mekanisme |
|:---:|---|---|---|---|
| ① | Halaman Web (DOM) | DOM Traverser | HTMLElement tree | Recursive traversal |
| ② | DOM Traverser | Style Extractor | DOMNodeInfo tree | Function call |
| ③ | Style Extractor | Figma Mapper | ExtractedStyles per node | Function call |
| ④ | Figma Mapper | Clipboard Writer | FigmaNodeTree | Function call |
| ⑤ | Clipboard Writer | OS Clipboard | HTML + JSON (dual MIME) | Clipboard API |
| ⑥ | OS Clipboard | Figma Canvas | Nested Frames + styling | User paste (Ctrl+V) |

---

## 7. 📝 Naming Conventions

Tetap sama dengan v1.0, dengan tambahan:

### File & Folder

| Jenis | Format | Contoh |
|---|---|---|
| Folder | `kebab-case` | `content/`, `clipboard/`, `utils/` |
| File TypeScript | `kebab-case.ts` | `dom-traverser.ts`, `style-extractor.ts` |
| File HTML | `kebab-case.html` | `popup.html` |

### TypeScript Naming

| Jenis | Format | Contoh |
|---|---|---|
| Interface | `PascalCase` | `FigmaNode`, `ExtractedStyles`, `DOMNodeInfo` |
| Type Alias | `PascalCase` | `FigmaNodeTree`, `RGBA` |
| Fungsi | `camelCase` | `traverseDOM()`, `extractStyles()`, `mapToFigma()` |
| Konstanta | `UPPER_SNAKE_CASE` | `MAX_DEPTH`, `MAX_NODES`, `SKIP_TAGS` |

### Layer Naming di Figma

Format: `<tag>.<class-utama>#<id>`

```
div.container              ← div dengan class "container"
h1#main-title              ← h1 dengan id "main-title"
button.btn.btn-primary     ← button dengan 2 class
img.hero-image             ← image dengan class
p                          ← paragraph tanpa class/id
```

---

*Arsitektur v2.0 dirancang untuk menghasilkan konversi web-to-Figma yang akurat, terstruktur, dan mudah diperluas. Setiap modul berdiri sendiri, bisa diuji mandiri, dan memiliki kontrak input/output yang jelas. 🚀*
