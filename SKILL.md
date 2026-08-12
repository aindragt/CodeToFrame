# 📚 SKILL.md — Technical Knowledge Base for CodeToFrame v2.0

> **Tujuan:** Basis pengetahuan teknis (Cheat Sheet) berisi potongan kode siap pakai dan pola desain yang dibutuhkan saat mengeksekusi `TODO.md`.  
> **Audiens:** Junior Developer dan AI Coding Agent.  
> **Bahasa Kode:** JavaScript Native (ES6+) — sesuai aturan `AGENTS.md` v2.0.  
> **Terakhir diperbarui:** 12 Agustus 2026

---

## Daftar Isi

1. [Konversi Warna CSS ke Figma](#1--konversi-warna-css-ke-figma)
2. [Ekstraksi Dimensi & Geometri](#2--ekstraksi-dimensi--geometri)
3. [Injeksi Native Clipboard API](#3--injeksi-native-clipboard-api)
4. [Skema Node Figma (JSON Payload)](#4--skema-node-figma-json-payload)
5. [Penanganan Properti CSS Kompleks](#5--penanganan-properti-css-kompleks)
6. [Pola Defensive Programming](#6--pola-defensive-programming)
7. [Referensi Cepat API](#7--referensi-cepat-api)

---

## 1. 🎨 Konversi Warna CSS ke Figma

### Konsep Kunci

| Sistem | Format | Skala | Contoh |
|---|---|---|---|
| **CSS (Browser)** | `rgb(R, G, B)` atau `rgba(R, G, B, A)` | R/G/B: 0–255, A: 0–1 | `rgba(59, 130, 246, 0.8)` |
| **CSS (Hex)** | `#RRGGBB` atau `#RGB` | Hex per channel | `#3B82F6` |
| **Figma API** | `{ r, g, b }` + terpisah `opacity` | R/G/B: **0–1** | `{ r: 0.231, g: 0.510, b: 0.965 }` |

> ⚠️ **Perbedaan kritis:** CSS menggunakan skala 0–255 untuk warna, Figma menggunakan skala 0–1. **Selalu bagi dengan 255** saat mengonversi.

### Fungsi Utilitas: `parseColor(cssColorString)`

Fungsi ini menerima string warna CSS mentah dan mengembalikan objek RGBA dengan skala 0–255 (konversi ke Figma dilakukan terpisah di tahap mapping).

```javascript
/**
 * Mem-parse string warna CSS menjadi objek RGBA (skala 0-255 untuk RGB, 0-1 untuk alpha).
 * Mendukung format: rgb(), rgba(), hex 3/6/8 digit, dan keyword 'transparent'.
 *
 * @param {string} raw - String warna CSS mentah dari getComputedStyle()
 * @returns {{r: number, g: number, b: number, a: number}|null} Objek RGBA atau null jika gagal
 *
 * @example
 * parseColor('rgb(59, 130, 246)')     // → { r: 59, g: 130, b: 246, a: 1 }
 * parseColor('rgba(0, 0, 0, 0.5)')    // → { r: 0, g: 0, b: 0, a: 0.5 }
 * parseColor('#3B82F6')               // → { r: 59, g: 130, b: 246, a: 1 }
 * parseColor('#F80')                  // → { r: 255, g: 136, b: 0, a: 1 }
 * parseColor('transparent')           // → { r: 0, g: 0, b: 0, a: 0 }
 * parseColor(null)                    // → null
 */
export function parseColor(raw) {
  // Guard clause: input tidak valid
  if (!raw || typeof raw !== 'string') return null;

  const trimmed = raw.trim().toLowerCase();

  // Kasus khusus: transparent
  if (trimmed === 'transparent' || trimmed === 'rgba(0, 0, 0, 0)') {
    return { r: 0, g: 0, b: 0, a: 0 };
  }

  // ─── Format 1: rgb(R, G, B) atau rgba(R, G, B, A) ───
  const rgbMatch = trimmed.match(
    /rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*([\d.]+))?\s*\)/
  );
  if (rgbMatch) {
    return {
      r: clamp(parseInt(rgbMatch[1], 10), 0, 255),
      g: clamp(parseInt(rgbMatch[2], 10), 0, 255),
      b: clamp(parseInt(rgbMatch[3], 10), 0, 255),
      a: rgbMatch[4] !== undefined ? clamp(parseFloat(rgbMatch[4]), 0, 1) : 1,
    };
  }

  // ─── Format 2: Hex (#RGB, #RRGGBB, #RRGGBBAA) ───
  const hexMatch = trimmed.match(/^#([0-9a-f]{3,8})$/);
  if (hexMatch) {
    const hex = hexMatch[1];

    // 3-digit: #RGB → #RRGGBB
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
        a: 1,
      };
    }

    // 6-digit: #RRGGBB
    if (hex.length === 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: 1,
      };
    }

    // 8-digit: #RRGGBBAA
    if (hex.length === 8) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: parseFloat((parseInt(hex.slice(6, 8), 16) / 255).toFixed(3)),
      };
    }
  }

  // ─── Tidak dikenali ───
  return null;
}

/**
 * Helper: clamp nilai ke dalam rentang [min, max].
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
```

### Konversi ke Skala Figma (0–1)

Saat membangun payload Figma, konversikan warna dari skala 0–255 ke 0–1:

```javascript
/**
 * Mengonversi warna RGBA (skala 0-255) ke format Figma (skala 0-1).
 * Digunakan saat membangun objek 'fills' atau 'strokes' untuk payload Figma.
 *
 * @param {{r: number, g: number, b: number, a: number}} color - Objek RGBA skala 0-255
 * @returns {{r: number, g: number, b: number}} Objek RGB skala 0-1 (alpha ditangani terpisah)
 *
 * @example
 * toFigmaRGB({ r: 59, g: 130, b: 246, a: 1 })
 * // → { r: 0.231, g: 0.510, b: 0.965 }
 */
export function toFigmaRGB(color) {
  if (!color) return { r: 0, g: 0, b: 0 };

  return {
    r: parseFloat((clamp(color.r, 0, 255) / 255).toFixed(4)),
    g: parseFloat((clamp(color.g, 0, 255) / 255).toFixed(4)),
    b: parseFloat((clamp(color.b, 0, 255) / 255).toFixed(4)),
  };
}
```

### Pola Penggunaan di Pipeline

```javascript
// ── Di style-extractor.js ──
const style = window.getComputedStyle(element);
const bgColor = parseColor(style.backgroundColor);
// bgColor = { r: 59, g: 130, b: 246, a: 1 } (skala 0-255)

// ── Di figma-mapper.js (saat membangun payload) ──
const figmaFills = [];
if (bgColor && bgColor.a > 0) {
  figmaFills.push({
    type: 'SOLID',
    color: toFigmaRGB(bgColor),
    opacity: bgColor.a,           // Alpha tetap skala 0-1
  });
}
```

### Tabel Referensi Cepat Format Warna

| Input CSS | `parseColor()` Output | `toFigmaRGB()` Output |
|---|---|---|
| `rgb(255, 0, 0)` | `{ r:255, g:0, b:0, a:1 }` | `{ r:1, g:0, b:0 }` |
| `rgba(0, 128, 255, 0.5)` | `{ r:0, g:128, b:255, a:0.5 }` | `{ r:0, g:0.502, b:1 }` |
| `#FF8800` | `{ r:255, g:136, b:0, a:1 }` | `{ r:1, g:0.533, b:0 }` |
| `#F80` | `{ r:255, g:136, b:0, a:1 }` | `{ r:1, g:0.533, b:0 }` |
| `transparent` | `{ r:0, g:0, b:0, a:0 }` | `{ r:0, g:0, b:0 }` |
| `null` | `null` | `{ r:0, g:0, b:0 }` (default) |

---

## 2. 📐 Ekstraksi Dimensi & Geometri

### Konsep Kunci: `getBoundingClientRect()`

Method ini mengembalikan objek `DOMRect` yang berisi posisi dan ukuran elemen **relatif terhadap viewport** (area yang terlihat di layar, bukan seluruh halaman).

```
┌──────────────────────────────────────────────────────┐
│  Browser Viewport (yang terlihat di layar)            │
│                                                       │
│    ┌──────────────────┐                               │
│    │  Elemen DOM       │                               │
│    │                   │                               │
│    │  rect.left (= x)  ──────►                        │
│    │  rect.top  (= y)  │                               │
│    │                   │                               │
│    │  rect.width ─────►│                               │
│    │  rect.height      │                               │
│    │  │                │                               │
│    │  ▼                │                               │
│    └──────────────────┘                               │
│                                                       │
└──────────────────────────────────────────────────────┘
```

### Pola Aman untuk Membaca Geometri

```javascript
/**
 * Mengekstrak posisi dan dimensi elemen DOM secara aman.
 * Mengembalikan koordinat ABSOLUT (terhadap dokumen, bukan viewport)
 * dengan memperhitungkan scroll offset.
 *
 * @param {HTMLElement} element - Elemen DOM target
 * @returns {{x: number, y: number, width: number, height: number}|null}
 *
 * @example
 * const geo = extractGeometry(document.querySelector('.card'));
 * // → { x: 120, y: 340, width: 300, height: 200 }
 */
export function extractGeometry(element) {
  if (!element) return null;

  const rect = element.getBoundingClientRect();

  // Guard: elemen tanpa dimensi (width=0 atau height=0) biasanya tidak terlihat
  if (rect.width === 0 && rect.height === 0) return null;

  return {
    // Posisi absolut di halaman (bukan viewport)
    // rect.left/top adalah relatif viewport → tambahkan scroll offset
    x: Math.round(rect.left + window.scrollX),
    y: Math.round(rect.top + window.scrollY),

    // Dimensi (selalu bulat dan minimal 1px)
    width: Math.max(1, Math.round(rect.width)),
    height: Math.max(1, Math.round(rect.height)),
  };
}
```

### ⚠️ Peringatan: Viewport vs Dokumen

```
                    ┌─── window.scrollY = 500px ───┐
                    │                               │
 ┌──────────────────┼───────────────────────────────┼──┐
 │  Dokumen (total) │   ← Area yang sudah di-scroll │  │
 │                  │                               │  │
 │ ════════════════════════════════════════════════════ │
 │                  │   ← Viewport mulai di sini    │  │
 │                  │                               │  │
 │    ┌─────────┐   │                               │  │
 │    │ Elemen  │   │                               │  │
 │    │         │   │ rect.top = 100px (dari viewport) │
 │    └─────────┘   │ absoluteY = 100 + 500 = 600px│  │
 │                  │                               │  │
 │ ════════════════════════════════════════════════════ │
 │                  │   ← Viewport berakhir di sini │  │
 │                  │                               │  │
 └──────────────────┴───────────────────────────────┴──┘
```

**Aturan penting:**
- `rect.top` dan `rect.left` = posisi relatif terhadap **viewport** (berubah saat scroll).
- Untuk posisi **absolut** di halaman: `absoluteY = rect.top + window.scrollY`.
- Di CodeToFrame v2.0 kita menggunakan **posisi absolut** untuk root, lalu **posisi relatif** untuk children.

### Menghitung Posisi Relatif (Child terhadap Parent)

Di Figma, posisi children di dalam Frame selalu relatif terhadap sudut kiri atas Frame parent. Ini **berbeda** dari `getBoundingClientRect()` yang selalu relatif terhadap viewport.

```javascript
/**
 * Menghitung posisi child relatif terhadap parent-nya.
 *
 * Kenapa ini perlu:
 *   Di Figma, jika Frame parent berada di (100, 200),
 *   dan child berada di (150, 250) secara absolut,
 *   maka posisi child DI DALAM Frame = (50, 50).
 *
 * @param {DOMRect} childRect - Bounding rect dari child
 * @param {DOMRect} parentRect - Bounding rect dari parent
 * @returns {{x: number, y: number}}
 */
export function getRelativePosition(childRect, parentRect) {
  return {
    x: Math.round(childRect.left - parentRect.left),
    y: Math.round(childRect.top - parentRect.top),
  };
}
```

### Contoh Lengkap: Nested Geometry

```javascript
// Parent div
const parentRect = parentDiv.getBoundingClientRect();
// parentRect = { left: 100, top: 200, width: 400, height: 300 }

// Child div (di dalam parent)
const childRect = childDiv.getBoundingClientRect();
// childRect = { left: 150, top: 250, width: 200, height: 100 }

// Posisi relatif child terhadap parent
const relPos = getRelativePosition(childRect, parentRect);
// relPos = { x: 50, y: 50 }

// Di Figma:
// Parent Frame: x=100, y=200, w=400, h=300
//   └─ Child Frame: x=50, y=50, w=200, h=100  ← relatif!
```

---

## 3. 📋 Injeksi Native Clipboard API

### Konsep Kunci

Figma mendukung paste dari clipboard yang mengandung konten HTML. Saat pengguna melakukan Ctrl+V di kanvas Figma, Figma memeriksa clipboard untuk data `text/html`. Jika ditemukan, Figma mengonversi HTML tersebut menjadi Frame dan Text nodes.

### Kerangka Fungsi: `writeToClipboard(payload)`

```javascript
/**
 * Menulis payload desain ke clipboard OS dalam format yang bisa
 * dikenali Figma saat pengguna melakukan Ctrl+V.
 *
 * Strategi dual-MIME:
 *   1. text/html  → HTML terstruktur dengan inline styles (untuk Figma native paste)
 *   2. text/plain → JSON string (untuk fallback / debugging / plugin v1.0)
 *
 * @param {Object} payload - Objek ExtractionPayload dari figma-mapper
 * @returns {Promise<{success: boolean, method: string, error?: string}>}
 *
 * @example
 * const result = await writeToClipboard(payload);
 * // → { success: true, method: 'native' }
 * // → { success: true, method: 'fallback-text' }
 * // → { success: false, error: 'Clipboard permission denied' }
 */
export async function writeToClipboard(payload) {
  const jsonString = JSON.stringify(payload, null, 2);
  const htmlString = buildHtmlFromTree(payload.rootNode);

  // ─── Metode 1: ClipboardItem dengan dual MIME ───
  try {
    const clipboardItem = new ClipboardItem({
      // Figma membaca ini saat paste → membuat Frame/Text nodes
      'text/html': new Blob([htmlString], { type: 'text/html' }),
      // Fallback — bisa di-paste ke text editor atau plugin v1.0
      'text/plain': new Blob([jsonString], { type: 'text/plain' }),
    });

    await navigator.clipboard.write([clipboardItem]);
    console.log('[CodeToFrame] Clipboard: native write berhasil.');
    return { success: true, method: 'native' };

  } catch (nativeError) {
    console.warn('[CodeToFrame] Native clipboard.write() gagal:', nativeError.message);
  }

  // ─── Metode 2: Fallback ke writeText (JSON saja) ───
  try {
    await navigator.clipboard.writeText(jsonString);
    console.log('[CodeToFrame] Clipboard: fallback writeText berhasil.');
    return { success: true, method: 'fallback-text' };

  } catch (textError) {
    console.error('[CodeToFrame] Semua metode clipboard gagal:', textError.message);
    return { success: false, method: 'none', error: textError.message };
  }
}
```

### Membangun HTML Payload untuk Figma

Figma meng-parse HTML yang di-paste dan membuat nodes berdasarkan struktur DOM + inline styles. Semakin akurat inline styles kita, semakin akurat hasilnya di Figma.

```javascript
/**
 * Mengonversi tree FigmaNode menjadi HTML string dengan inline styles.
 * HTML ini akan dibaca Figma saat paste untuk membuat visual nodes.
 *
 * @param {Object} node - FigmaNode dari tree
 * @returns {string} HTML string
 */
function buildHtmlFromTree(node) {
  if (!node) return '';

  // ─── TEXT node → <p> atau <span> ───
  if (node.type === 'TEXT') {
    const textStyle = buildInlineStyle({
      'font-size': node.typography ? `${node.typography.fontSize}px` : '16px',
      'font-family': node.typography ? node.typography.fontFamily : 'Inter, sans-serif',
      'font-weight': node.typography ? String(node.typography.fontWeight) : '400',
      'color': node.styles?.textColor
        ? `rgb(${node.styles.textColor.r}, ${node.styles.textColor.g}, ${node.styles.textColor.b})`
        : 'rgb(0,0,0)',
      'line-height': node.typography?.lineHeight ? `${node.typography.lineHeight}px` : 'normal',
      'letter-spacing': node.typography?.letterSpacing ? `${node.typography.letterSpacing}px` : 'normal',
      'text-align': (node.typography?.textAlign || 'LEFT').toLowerCase(),
    });
    // Escape HTML entities di konten teks
    const safeContent = escapeHtml(node.textContent || '');
    return `<p style="${textStyle}">${safeContent}</p>`;
  }

  // ─── IMAGE node → <img> ───
  if (node.type === 'IMAGE' && node.imageUrl) {
    const imgStyle = buildInlineStyle({
      'width': `${node.width}px`,
      'height': `${node.height}px`,
      'display': 'block',
    });
    return `<img src="${escapeHtml(node.imageUrl)}" style="${imgStyle}" />`;
  }

  // ─── FRAME / container → <div> dengan children ───
  const containerStyle = buildInlineStyle({
    'width': `${node.width}px`,
    'height': `${node.height}px`,
    'background-color': node.styles?.backgroundColor
      ? `rgba(${node.styles.backgroundColor.r}, ${node.styles.backgroundColor.g}, ${node.styles.backgroundColor.b}, ${node.styles.backgroundColor.a ?? 1})`
      : undefined,
    'border-radius': formatBorderRadius(node.styles?.borderRadius),
    'border': formatBorder(node.styles?.border),
    'opacity': node.styles?.opacity !== undefined && node.styles.opacity < 1
      ? String(node.styles.opacity) : undefined,
    'overflow': node.styles?.overflow === 'hidden' ? 'hidden' : undefined,
    // Flex layout
    'display': node.layout?.mode === 'FLEX' ? 'flex' : undefined,
    'flex-direction': node.layout?.mode === 'FLEX'
      ? (node.layout.direction === 'COLUMN' ? 'column' : 'row') : undefined,
    'gap': node.layout?.mode === 'FLEX' && node.layout.gap > 0
      ? `${node.layout.gap}px` : undefined,
    'padding': formatPadding(node.layout?.padding),
  });

  // Rekursif: bangun HTML untuk setiap child
  const childrenHtml = (node.children || [])
    .map(child => buildHtmlFromTree(child))
    .join('\n');

  return `<div style="${containerStyle}">\n${childrenHtml}\n</div>`;
}

/**
 * Membangun string inline style dari objek key-value.
 * Mengabaikan properti dengan value undefined/null/empty.
 */
function buildInlineStyle(properties) {
  return Object.entries(properties)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}: ${value}`)
    .join('; ');
}

/**
 * Escape karakter khusus HTML untuk mencegah XSS di konten teks.
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/** Helper: format border-radius ke CSS string */
function formatBorderRadius(radius) {
  if (!radius) return undefined;
  const { topLeft, topRight, bottomRight, bottomLeft } = radius;
  if (topLeft === 0 && topRight === 0 && bottomRight === 0 && bottomLeft === 0) return undefined;
  if (topLeft === topRight && topRight === bottomRight && bottomRight === bottomLeft) {
    return `${topLeft}px`;
  }
  return `${topLeft}px ${topRight}px ${bottomRight}px ${bottomLeft}px`;
}

/** Helper: format border ke CSS string */
function formatBorder(border) {
  if (!border || border.width === 0 || border.style === 'none') return undefined;
  const { r, g, b } = border.color || { r: 0, g: 0, b: 0 };
  return `${border.width}px ${border.style} rgb(${r}, ${g}, ${b})`;
}

/** Helper: format padding ke CSS string */
function formatPadding(padding) {
  if (!padding) return undefined;
  const { top, right, bottom, left } = padding;
  if (top === 0 && right === 0 && bottom === 0 && left === 0) return undefined;
  return `${top}px ${right}px ${bottom}px ${left}px`;
}
```

### Tipe MIME yang Digunakan

| Tipe MIME | Tujuan | Siapa yang Membaca |
|---|---|---|
| `text/html` | HTML terstruktur dengan inline styles | Figma (saat Ctrl+V di canvas) |
| `text/plain` | JSON string mentah | Plugin v1.0, text editor, debugging |

### Permission yang Diperlukan

```json
{
  "permissions": ["clipboardWrite"]
}
```

> ⚠️ **Catatan:** `navigator.clipboard.write()` memerlukan halaman web berada dalam konteks yang aman (HTTPS atau localhost). Di halaman HTTP biasa, gunakan fallback `writeText()`.

### Tabel Error Handling Clipboard

| Error | Penyebab | Solusi |
|---|---|---|
| `NotAllowedError` | User belum memberikan izin clipboard | Tampilkan pesan untuk klik "Allow" di prompt browser |
| `SecurityError` | Halaman non-HTTPS | Fallback ke `writeText()` |
| `TypeError: ClipboardItem is not defined` | Browser lama | Fallback ke `writeText()` |
| `DOMException: Document is not focused` | Popup kehilangan focus | Pastikan aksi clipboard dipicu dari event handler user (click) |

---

## 4. 📦 Skema Node Figma (JSON Payload)

### Struktur Payload Lengkap

Berikut adalah bentuk JSON yang dihasilkan oleh pipeline ekstraksi. Ini adalah "kontrak data" antara `figma-mapper.js` dan `clipboard-writer.js`.

```javascript
// Payload tingkat atas (root)
{
  "version": "2.0",
  "sourceUrl": "https://example.com/page",
  "viewport": {
    "width": 1440,
    "height": 900,
    "scrollX": 0,
    "scrollY": 0
  },
  "rootNode": { /* FigmaNode — lihat di bawah */ }
}
```

### Contoh: Node FRAME (Container)

Setiap `<div>`, `<section>`, `<header>`, dll. menjadi FRAME:

```javascript
{
  "type": "FRAME",
  "name": "div.hero-section",           // Smart naming dari tag/class/id
  "x": 0,
  "y": 0,
  "width": 1440,
  "height": 600,
  "styles": {
    "backgroundColor": { "r": 59, "g": 130, "b": 246, "a": 1 },
    "backgroundGradient": null,          // null jika bukan gradient
    "backgroundImageUrl": null,
    "border": { "width": 0, "color": { "r": 0, "g": 0, "b": 0, "a": 0 }, "style": "none" },
    "borderRadius": { "topLeft": 12, "topRight": 12, "bottomRight": 12, "bottomLeft": 12 },
    "boxShadow": [
      {
        "type": "DROP_SHADOW",
        "offsetX": 0,
        "offsetY": 4,
        "blur": 6,
        "spread": -1,
        "color": { "r": 0, "g": 0, "b": 0, "a": 0.1 }
      }
    ],
    "opacity": 1,
    "overflow": "hidden"
  },
  "layout": {                            // Hanya ada jika display: flex
    "mode": "FLEX",
    "direction": "COLUMN",
    "gap": 16,
    "padding": { "top": 24, "right": 32, "bottom": 24, "left": 32 },
    "justifyContent": "CENTER",
    "alignItems": "CENTER",
    "wrap": false
  },
  "children": [
    { /* child FigmaNode 1 */ },
    { /* child FigmaNode 2 */ }
  ]
}
```

### Contoh: Node TEXT

Setiap `<p>`, `<h1>`–`<h6>`, `<span>`, `<a>`, dll. menjadi TEXT:

```javascript
{
  "type": "TEXT",
  "name": "h1.hero-title",
  "x": 50,                              // Relatif terhadap parent Frame
  "y": 100,
  "width": 600,
  "height": 56,
  "textContent": "Welcome to CodeToFrame",
  "typography": {
    "fontFamily": "Inter",
    "fontSize": 48,
    "fontWeight": 700,
    "fontStyle": "Bold",                 // Nama style Figma
    "lineHeight": 56,                    // Dalam pixel
    "letterSpacing": -0.5,               // Dalam pixel
    "textAlign": "LEFT",                 // "LEFT" | "CENTER" | "RIGHT" | "JUSTIFIED"
    "textDecoration": "NONE"             // "NONE" | "UNDERLINE" | "STRIKETHROUGH"
  },
  "styles": {
    "textColor": { "r": 255, "g": 255, "b": 255, "a": 1 },
    "opacity": 1
  },
  "children": []                         // TEXT node biasanya tidak punya children
}
```

### Contoh: Node IMAGE

Setiap `<img>` menjadi IMAGE:

```javascript
{
  "type": "IMAGE",
  "name": "img.hero-banner",
  "x": 0,
  "y": 0,
  "width": 800,
  "height": 400,
  "imageUrl": "https://example.com/images/hero.jpg",
  "styles": {
    "borderRadius": { "topLeft": 8, "topRight": 8, "bottomRight": 8, "bottomLeft": 8 },
    "opacity": 1
  },
  "children": []
}
```

### Contoh: Node VECTOR (SVG)

Setiap `<svg>` inline menjadi VECTOR:

```javascript
{
  "type": "VECTOR",
  "name": "svg.icon-arrow",
  "x": 500,
  "y": 200,
  "width": 24,
  "height": 24,
  "svgContent": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\"><path d=\"M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z\"/></svg>",
  "styles": {
    "opacity": 1
  },
  "children": []
}
```

### Ringkasan Tipe Node

| Tipe | Tag HTML Sumber | Properti Khas | Children? |
|---|---|---|---|
| `FRAME` | `div`, `section`, `header`, `nav`, `form`, dll. | `styles`, `layout` | ✅ Ya (bersarang) |
| `TEXT` | `p`, `h1-h6`, `span`, `a`, `strong`, dll. | `textContent`, `typography` | ❌ Biasanya tidak |
| `IMAGE` | `<img>`, elemen dengan `background-image` | `imageUrl` | ❌ Tidak |
| `VECTOR` | `<svg>` inline | `svgContent` | ❌ Tidak |

---

## 5. 🔧 Penanganan Properti CSS Kompleks

### 5.1 Border-Radius

**Tantangan:** CSS `border-radius` bisa berupa satu nilai (`8px`) atau empat nilai terpisah per corner. Browser mengembalikan longhand properties.

```javascript
/**
 * Mengekstrak border-radius per corner dari computed style.
 *
 * @param {CSSStyleDeclaration} style - Hasil getComputedStyle()
 * @param {number} elWidth - Lebar elemen (untuk konversi persentase)
 * @param {number} elHeight - Tinggi elemen (untuk konversi persentase)
 * @returns {{topLeft: number, topRight: number, bottomRight: number, bottomLeft: number}}
 *
 * @example
 * // CSS: border-radius: 8px
 * extractBorderRadius(style, 200, 100)
 * // → { topLeft: 8, topRight: 8, bottomRight: 8, bottomLeft: 8 }
 *
 * // CSS: border-radius: 50% (lingkaran)
 * extractBorderRadius(style, 200, 100)
 * // → { topLeft: 50, topRight: 50, bottomRight: 50, bottomLeft: 50 }
 */
export function extractBorderRadius(style, elWidth, elHeight) {
  // Browser mengembalikan per-corner sebagai longhand property
  return {
    topLeft:     parseRadiusValue(style.borderTopLeftRadius, elWidth, elHeight),
    topRight:    parseRadiusValue(style.borderTopRightRadius, elWidth, elHeight),
    bottomRight: parseRadiusValue(style.borderBottomRightRadius, elWidth, elHeight),
    bottomLeft:  parseRadiusValue(style.borderBottomLeftRadius, elWidth, elHeight),
  };
}

/**
 * Parse satu nilai radius — bisa berupa "8px" atau "50%".
 * Jika persentase, konversi ke pixel berdasarkan dimensi terkecil.
 */
function parseRadiusValue(raw, width, height) {
  if (!raw || raw === '0px') return 0;

  // Kasus: persentase (misal "50%")
  if (raw.endsWith('%')) {
    const percent = parseFloat(raw) / 100;
    // Figma tidak mendukung radius persentase — konversi ke pixel
    // Gunakan dimensi terkecil sebagai referensi
    return Math.round(Math.min(width, height) * percent);
  }

  // Kasus: pixel (misal "8px")
  return Math.round(parseFloat(raw)) || 0;
}
```

### 5.2 Box-Shadow

**Tantangan:** CSS `box-shadow` bisa berisi multiple shadows yang dipisahkan koma, dan warna bisa di awal atau akhir string. Contoh: `rgba(0,0,0,0.1) 0px 4px 6px -1px, rgba(0,0,0,0.06) 0px 2px 4px -1px`.

```javascript
/**
 * Mem-parse CSS box-shadow menjadi array objek shadow.
 *
 * Format CSS: [inset?] <offsetX> <offsetY> [<blur>] [<spread>] <color>
 * Catatan: Browser bisa mengembalikan warna di AWAL atau AKHIR.
 *
 * @param {string} raw - String box-shadow dari getComputedStyle()
 * @returns {Array<{type: string, offsetX: number, offsetY: number, blur: number, spread: number, color: Object}>}
 *
 * @example
 * parseBoxShadow('rgba(0,0,0,0.1) 0px 4px 6px -1px')
 * // → [{ type: 'DROP_SHADOW', offsetX: 0, offsetY: 4, blur: 6, spread: -1, color: {r:0,g:0,b:0,a:0.1} }]
 *
 * parseBoxShadow('inset 0px 2px 4px rgba(0,0,0,0.2)')
 * // → [{ type: 'INNER_SHADOW', offsetX: 0, offsetY: 2, blur: 4, spread: 0, color: {r:0,g:0,b:0,a:0.2} }]
 */
export function parseBoxShadow(raw) {
  if (!raw || raw === 'none') return [];

  const shadows = [];

  // ─── Langkah 1: Split by koma, tapi abaikan koma di dalam rgba() ───
  // Regex: split di koma yang TIDAK berada di dalam tanda kurung
  const parts = raw.split(/,(?![^(]*\))/);

  for (const part of parts) {
    try {
      const trimmed = part.trim();

      // ─── Langkah 2: Deteksi inset ───
      const isInset = trimmed.includes('inset');
      const cleaned = trimmed.replace(/inset/g, '').trim();

      // ─── Langkah 3: Ekstrak warna (rgb/rgba di mana pun posisinya) ───
      const colorMatch = cleaned.match(/rgba?\([^)]+\)/);
      const color = colorMatch
        ? parseColor(colorMatch[0])
        : { r: 0, g: 0, b: 0, a: 0.25 };  // Default shadow gelap

      // ─── Langkah 4: Ekstrak angka (offsetX, offsetY, blur, spread) ───
      const withoutColor = cleaned.replace(/rgba?\([^)]+\)/, '').trim();
      const numbers = withoutColor.match(/-?[\d.]+/g);
      const values = numbers ? numbers.map(Number) : [0, 0, 0, 0];

      shadows.push({
        type: isInset ? 'INNER_SHADOW' : 'DROP_SHADOW',
        offsetX: values[0] || 0,
        offsetY: values[1] || 0,
        blur:    Math.max(0, values[2] || 0),  // Blur tidak boleh negatif
        spread:  values[3] || 0,
        color:   color,
      });
    } catch (err) {
      // Skip shadow yang gagal di-parse — jangan hentikan loop
      console.warn('[CodeToFrame] Gagal parse satu shadow, skip:', part, err.message);
      continue;
    }
  }

  return shadows;
}
```

### 5.3 Border (Width, Color, Style)

**Tantangan:** CSS border bisa berbeda di setiap sisi. Untuk simplisitas, ambil sisi terbesar.

```javascript
/**
 * Mengekstrak properti border dari computed style.
 * Jika border berbeda di setiap sisi, ambil sisi dengan width terbesar.
 *
 * @param {CSSStyleDeclaration} style
 * @returns {{width: number, color: Object, style: string}}
 *
 * @example
 * extractBorder(style)
 * // → { width: 2, color: { r: 229, g: 231, b: 235, a: 1 }, style: 'solid' }
 */
export function extractBorder(style) {
  const DEFAULT = { width: 0, color: { r: 0, g: 0, b: 0, a: 0 }, style: 'none' };

  if (!style) return DEFAULT;

  // Baca border per sisi
  const sides = [
    { width: parseFloat(style.borderTopWidth)    || 0, color: style.borderTopColor,    style: style.borderTopStyle },
    { width: parseFloat(style.borderRightWidth)  || 0, color: style.borderRightColor,  style: style.borderRightStyle },
    { width: parseFloat(style.borderBottomWidth) || 0, color: style.borderBottomColor, style: style.borderBottomStyle },
    { width: parseFloat(style.borderLeftWidth)   || 0, color: style.borderLeftColor,   style: style.borderLeftStyle },
  ];

  // Ambil sisi dengan width terbesar (dominant border)
  const dominant = sides.reduce((max, side) => side.width > max.width ? side : max, sides[0]);

  // Jika tidak ada border sama sekali
  if (dominant.width === 0 || dominant.style === 'none') return DEFAULT;

  return {
    width: Math.round(dominant.width),
    color: parseColor(dominant.color) || DEFAULT.color,
    style: dominant.style || 'solid',
  };
}
```

### 5.4 Linear-Gradient

```javascript
/**
 * Mem-parse CSS linear-gradient menjadi objek gradient data.
 *
 * @param {string} raw - String backgroundImage dari getComputedStyle()
 * @returns {{angleDeg: number, colorStops: Array<{color: Object, position: number}>}|null}
 *
 * @example
 * parseLinearGradient('linear-gradient(135deg, #667eea 0%, #764ba2 100%)')
 * // → { angleDeg: 135, colorStops: [{color: {r:102,...}, position: 0}, {color: {r:118,...}, position: 1}] }
 */
export function parseLinearGradient(raw) {
  if (!raw || typeof raw !== 'string') return null;

  const match = raw.match(/linear-gradient\((.+)\)/);
  if (!match) return null;

  const inner = match[1];
  // Split di koma, tapi abaikan koma di dalam rgb()/rgba()
  const parts = inner.split(/,(?![^(]*\))/);

  let angleDeg = 180;  // Default: atas ke bawah
  let startIndex = 0;

  // ─── Parse arah/angle ───
  const firstPart = parts[0].trim();

  if (firstPart.endsWith('deg')) {
    angleDeg = parseFloat(firstPart);
    startIndex = 1;
  } else if (firstPart.startsWith('to ')) {
    const dirMap = {
      'to top': 0,       'to right': 90,
      'to bottom': 180,  'to left': 270,
      'to top right': 45,     'to bottom right': 135,
      'to bottom left': 225,  'to top left': 315,
    };
    angleDeg = dirMap[firstPart] !== undefined ? dirMap[firstPart] : 180;
    startIndex = 1;
  }

  // ─── Parse color stops ───
  const colorStops = [];
  const totalStops = parts.length - startIndex;

  for (let i = startIndex; i < parts.length; i++) {
    const stopStr = parts[i].trim();

    // Ekstrak warna
    const colorMatch = stopStr.match(/rgba?\([^)]+\)|#[0-9a-fA-F]{3,8}/);
    if (!colorMatch) continue;

    const color = parseColor(colorMatch[0]);
    if (!color) continue;

    // Ekstrak posisi (misal "30%")
    const posMatch = stopStr.match(/([\d.]+)%/);
    const position = posMatch
      ? parseFloat(posMatch[1]) / 100       // Persen → 0-1
      : (i - startIndex) / (totalStops - 1); // Auto-distribute merata

    colorStops.push({ color, position: clamp(position, 0, 1) });
  }

  if (colorStops.length < 2) return null;  // Gradient butuh minimal 2 stops

  return { angleDeg, colorStops };
}
```

---

## 6. 🛡️ Pola Defensive Programming

### Pola 1: Guard Clause di Awal Fungsi

```javascript
// ✅ BENAR — return awal jika input tidak valid
function extractStyles(element) {
  if (!element) return getDefaultStyles();
  if (!(element instanceof HTMLElement)) return getDefaultStyles();

  const style = window.getComputedStyle(element);
  if (!style) return getDefaultStyles();

  // ... logika utama di sini
}
```

### Pola 2: Try-Catch per Elemen dalam Loop

```javascript
// ✅ BENAR — satu elemen gagal tidak menghentikan seluruh loop
for (const child of element.children) {
  try {
    const childNode = traverseDOM(child, parentRect, depth + 1, counter);
    if (childNode) {
      result.children.push(childNode);
    }
  } catch (error) {
    console.warn('[CodeToFrame] Skip elemen:', child.tagName, error.message);
    continue;  // Lanjut ke elemen berikutnya
  }
}
```

### Pola 3: Fallback Bertingkat

```javascript
// ✅ BENAR — coba cara terbaik dulu, fallback bertahap
function getFontFamily(computedStyle) {
  // Tingkat 1: Baca dari computed style
  const rawFamily = computedStyle.fontFamily;
  if (rawFamily) {
    const firstFont = rawFamily.split(',')[0].trim().replace(/['"]/g, '');
    if (firstFont) return firstFont;
  }

  // Tingkat 2: Baca dari atribut style inline
  const inlineFont = computedStyle.getPropertyValue('font-family');
  if (inlineFont) return inlineFont.split(',')[0].trim().replace(/['"]/g, '');

  // Tingkat 3: Default yang aman
  console.warn('[CodeToFrame] Tidak bisa membaca font-family, menggunakan default.');
  return 'Inter';
}
```

### Pola 4: Safe JSON Parse

```javascript
// ✅ BENAR — bungkus JSON.parse dalam try-catch
function safeJsonParse(jsonString) {
  if (!jsonString || typeof jsonString !== 'string') return null;

  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('[CodeToFrame] Gagal parse JSON:', error.message);
    return null;
  }
}
```

### Pola 5: Validasi Tipe Sebelum Aritmatika

```javascript
// ✅ BENAR — pastikan tipe benar sebelum operasi matematika
function calculateRelativePosition(childValue, parentValue) {
  const child = typeof childValue === 'number' ? childValue : 0;
  const parent = typeof parentValue === 'number' ? parentValue : 0;
  return Math.round(child - parent);
}
```

---

## 7. 📖 Referensi Cepat API

### DOM API yang Sering Digunakan

| Method / Property | Return Type | Kapan Digunakan |
|---|---|---|
| `element.getBoundingClientRect()` | `DOMRect` | Ambil posisi & ukuran elemen |
| `window.getComputedStyle(el)` | `CSSStyleDeclaration` | Baca semua CSS property yang di-resolve browser |
| `element.children` | `HTMLCollection` | Iterasi child elements (bukan text nodes) |
| `element.tagName` | `string` (uppercase) | Klasifikasi tipe elemen: `"DIV"`, `"P"`, `"IMG"` |
| `element.classList` | `DOMTokenList` | Ambil daftar class: `["card", "shadow-lg"]` |
| `element.id` | `string` | Ambil ID elemen |
| `element.innerText` | `string` | Ambil teks yang terlihat (skip hidden elements) |
| `element.outerHTML` | `string` | Ambil HTML mentah termasuk tag (untuk SVG extraction) |
| `element.currentSrc` | `string` | URL gambar yang sedang ditampilkan (untuk `<img>`) |
| `window.scrollX / scrollY` | `number` | Offset scroll saat ini |
| `window.innerWidth / innerHeight` | `number` | Ukuran viewport |

### Properti `getComputedStyle()` yang Diekstrak

| CSS Property | Computed Style Key | Catatan |
|---|---|---|
| Background color | `style.backgroundColor` | Selalu `rgb()` atau `rgba()` |
| Background image/gradient | `style.backgroundImage` | `"none"`, `"url(...)"`, atau `"linear-gradient(...)"` |
| Border width (per sisi) | `style.borderTopWidth`, dll. | Selalu berupa pixel string `"2px"` |
| Border color (per sisi) | `style.borderTopColor`, dll. | Selalu `rgb()` atau `rgba()` |
| Border style (per sisi) | `style.borderTopStyle`, dll. | `"solid"`, `"dashed"`, `"none"` |
| Border radius (per corner) | `style.borderTopLeftRadius`, dll. | `"8px"` atau `"50%"` |
| Box shadow | `style.boxShadow` | String kompleks, bisa multiple |
| Opacity | `style.opacity` | String `"0.5"` — perlu `parseFloat` |
| Overflow | `style.overflow` | `"visible"`, `"hidden"`, `"auto"`, `"scroll"` |
| Display | `style.display` | `"block"`, `"flex"`, `"none"`, dll. |
| Flex direction | `style.flexDirection` | `"row"`, `"column"`, dll. |
| Justify content | `style.justifyContent` | `"flex-start"`, `"center"`, dll. |
| Align items | `style.alignItems` | `"stretch"`, `"center"`, dll. |
| Gap | `style.gap` | `"16px"` atau `"16px 8px"` |
| Padding (per sisi) | `style.paddingTop`, dll. | Selalu pixel |
| Font family | `style.fontFamily` | `"'Inter', sans-serif"` — perlu extract first |
| Font size | `style.fontSize` | `"16px"` — perlu `parseFloat` |
| Font weight | `style.fontWeight` | `"400"`, `"700"` — resolved ke angka |
| Line height | `style.lineHeight` | `"24px"`, `"1.5"` (unitless), atau `"normal"` |
| Letter spacing | `style.letterSpacing` | `"0.5px"` atau `"normal"` |
| Text align | `style.textAlign` | `"left"`, `"center"`, dll. |
| Text decoration | `style.textDecorationLine` | `"underline"`, `"line-through"`, `"none"` |
| Color (teks) | `style.color` | Warna teks, selalu `rgb()`/`rgba()` |
| Visibility | `style.visibility` | `"visible"`, `"hidden"` |
| Position | `style.position` | `"static"`, `"relative"`, `"absolute"`, `"fixed"` |

### Chrome Extension API yang Digunakan

| API | Di Mana | Untuk Apa |
|---|---|---|
| `chrome.runtime.onMessage` | `entry.js` (content script) | Menerima pesan dari popup |
| `chrome.tabs.query()` | `popup.js` | Mendapatkan tab aktif |
| `chrome.tabs.sendMessage()` | `popup.js` | Mengirim pesan ke content script |
| `chrome.scripting.executeScript()` | `popup.js` (alternatif) | Menjalankan script di tab aktif |

---

*Dokumen ini adalah referensi teknis untuk implementasi CodeToFrame v2.0. Gunakan potongan kode di atas sebagai titik awal, adaptasikan sesuai konteks tugas di `TODO.md`. Jika ragu, tanyakan ke Lead. 🚀*
