# 📋 TODO.md — Granular Execution Plan for CodeToFrame v2.0

> **Versi:** 2.0  
> **Terakhir diperbarui:** 12 Agustus 2026  
> **Cara Menggunakan:** Kerjakan tugas secara **berurutan** dari atas ke bawah. Setiap tugas memiliki Task ID unik. Tandai `[x]` saat selesai.

---

## Legenda Status

```
[ ] = Belum dikerjakan
[/] = Sedang dikerjakan
[x] = Selesai
[!] = Diblokir (butuh tugas lain selesai dulu)
```

---

## Fase 0: Restrukturisasi Proyek

> **Tujuan:** Mengubah struktur folder dari v1.0 (TypeScript, dual-project) menjadi v2.0 (JavaScript, single-project). Setelah fase ini, fondasi folder dan konfigurasi build sudah siap.

---

### `T0.1` — Buat Struktur Direktori Baru

- [ ] **Selesai**
- **File Target:** Folder-folder baru di `browser-extension/src/`
- **Instruksi:**
  1. Buat folder `browser-extension/src/content/` (jika belum ada).
  2. Buat folder `browser-extension/src/clipboard/`.
  3. Buat folder `browser-extension/src/utils/`.
  4. Buat folder `browser-extension/src/types/`.
  5. Pastikan folder `browser-extension/src/popup/` sudah ada.
  6. Buat folder `test/` di root proyek untuk file pengujian.
- **Acceptance Criteria:**
  - Semua 6 folder ada dan bisa diakses.
  - Tidak ada file lama yang terhapus — biarkan kode v1.0 tetap ada sampai migrasi selesai.

---

### `T0.2` — Konfigurasi Vite untuk Build JavaScript

- [ ] **Selesai**
- **File Target:** `browser-extension/vite.config.js`
- **Instruksi:**
  1. Buat file `vite.config.js` (mengganti `vite.config.ts` jika ada).
  2. Konfigurasi multi-entry build:
     - Entry 1: `src/popup/popup.html` → output `popup.html` + `popup.js`
     - Entry 2: `src/content/entry.js` → output `content.js` (single bundled file)
  3. Set `build.outDir` ke `dist/`.
  4. Set `build.emptyOutDir` ke `true`.
  5. Set `publicDir` ke `public/` agar `manifest.json` dan ikon ter-copy otomatis.
  6. Pastikan output content script berupa **satu file IIFE** (bukan ES module) karena Chrome content script tidak mendukung ES module.
- **Acceptance Criteria:**
  - `npm run build` berhasil tanpa error.
  - Folder `dist/` berisi: `manifest.json`, `popup.html`, `popup.js`, `content.js`.
  - `content.js` adalah single file tanpa `import` statement (sudah di-bundle oleh Vite).

---

### `T0.3` — Update Manifest V3

- [ ] **Selesai**
- **File Target:** `browser-extension/public/manifest.json`
- **Instruksi:**
  1. Update `content_scripts[0].js` dari `["extractor.js"]` menjadi `["content.js"]`.
  2. Pastikan permissions berisi: `"activeTab"`, `"scripting"`, `"clipboardWrite"`.
  3. Tambahkan field `"icons"` jika belum ada (16, 48, 128).
  4. Set `"action.default_popup"` ke `"popup.html"`.
- **Acceptance Criteria:**
  - JSON valid (tidak ada trailing comma, format rapi).
  - Extension bisa di-load di Chrome tanpa error permission.

---

## Fase 1: Setup Fondasi & Utilitas

> **Tujuan:** Membangun fungsi-fungsi utilitas dasar yang akan digunakan oleh semua modul di fase selanjutnya. Setiap fungsi harus pure (tanpa side effect) dan mudah diuji.

---

### `T1.1` — JSDoc Type Definitions

- [ ] **Selesai**
- **File Target:** `browser-extension/src/types/schema.js`
- **Instruksi:**
  1. Definisikan semua `@typedef` menggunakan JSDoc (bukan TypeScript interface).
  2. Tipe yang harus dibuat:

  ```javascript
  /**
   * @typedef {Object} RGBA
   * @property {number} r - Red (0-255)
   * @property {number} g - Green (0-255)
   * @property {number} b - Blue (0-255)
   * @property {number} a - Alpha (0-1)
   */

  /**
   * @typedef {Object} GradientStop
   * @property {RGBA} color
   * @property {number} position - Posisi stop (0-1)
   */

  /**
   * @typedef {Object} GradientData
   * @property {number} angleDeg - Sudut gradient dalam derajat
   * @property {GradientStop[]} colorStops
   */

  /**
   * @typedef {Object} ShadowEffect
   * @property {'DROP_SHADOW'|'INNER_SHADOW'} type
   * @property {number} offsetX
   * @property {number} offsetY
   * @property {number} blur
   * @property {number} spread
   * @property {RGBA} color
   */

  /**
   * @typedef {Object} BorderData
   * @property {number} width
   * @property {RGBA} color
   * @property {'solid'|'dashed'|'dotted'|'none'} style
   */

  /**
   * @typedef {Object} CornerRadii
   * @property {number} topLeft
   * @property {number} topRight
   * @property {number} bottomRight
   * @property {number} bottomLeft
   */

  /**
   * @typedef {Object} TypographyData
   * @property {string} fontFamily
   * @property {number} fontSize
   * @property {number} fontWeight
   * @property {string} fontStyle - "Regular", "Bold", dll.
   * @property {number|null} lineHeight - Dalam pixel, null jika "normal"
   * @property {number} letterSpacing - Dalam pixel
   * @property {'LEFT'|'CENTER'|'RIGHT'|'JUSTIFIED'} textAlign
   * @property {'NONE'|'UNDERLINE'|'STRIKETHROUGH'} textDecoration
   */

  /**
   * @typedef {Object} LayoutData
   * @property {'NONE'|'FLEX'} mode
   * @property {'ROW'|'COLUMN'} direction
   * @property {number} gap
   * @property {{top: number, right: number, bottom: number, left: number}} padding
   * @property {string} justifyContent
   * @property {string} alignItems
   * @property {boolean} wrap
   */

  /**
   * @typedef {Object} ExtractedStyles
   * @property {RGBA|null} backgroundColor
   * @property {GradientData|null} backgroundGradient
   * @property {string|null} backgroundImageUrl
   * @property {BorderData} border
   * @property {CornerRadii} borderRadius
   * @property {ShadowEffect[]} boxShadow
   * @property {number} opacity
   * @property {'visible'|'hidden'|'scroll'|'auto'} overflow
   * @property {TypographyData|null} typography
   * @property {LayoutData} layout
   * @property {RGBA|null} textColor
   */

  /**
   * @typedef {Object} FigmaNode
   * @property {'FRAME'|'TEXT'|'IMAGE'|'VECTOR'} type
   * @property {string} name
   * @property {number} x
   * @property {number} y
   * @property {number} width
   * @property {number} height
   * @property {ExtractedStyles} styles
   * @property {LayoutData} [layout]
   * @property {string} [textContent]
   * @property {TypographyData} [typography]
   * @property {string} [imageUrl]
   * @property {string} [svgContent]
   * @property {FigmaNode[]} children
   */

  /**
   * @typedef {Object} ExtractionPayload
   * @property {string} version
   * @property {string} sourceUrl
   * @property {{width: number, height: number, scrollX: number, scrollY: number}} viewport
   * @property {FigmaNode} rootNode
   */
  ```

- **Acceptance Criteria:**
  - File hanya berisi `@typedef` — tidak ada logika eksekusi.
  - Semua tipe yang dirujuk di `ARCHITECTURE.md` tercakup.
  - File bisa di-import di modul lain untuk type-hinting: `/** @type {import('../types/schema.js').RGBA} */`

---

### `T1.2` — Color Parser (RGB, RGBA, HEX)

- [ ] **Selesai**
- **File Target:** `browser-extension/src/utils/color-parser.js`
- **Instruksi:**
  1. Buat fungsi `parseColor(rawString)` yang mengembalikan objek `RGBA` atau `null`.
  2. Format yang **harus** didukung:
     - `rgb(255, 128, 0)` → `{ r: 255, g: 128, b: 0, a: 1 }`
     - `rgba(255, 128, 0, 0.5)` → `{ r: 255, g: 128, b: 0, a: 0.5 }`
     - `#FF8000` → `{ r: 255, g: 128, b: 0, a: 1 }`
     - `#F80` (3-digit shorthand) → `{ r: 255, g: 136, b: 0, a: 1 }`
     - `#FF800080` (8-digit with alpha) → `{ r: 255, g: 128, b: 0, a: 0.502 }`
     - `transparent` → `{ r: 0, g: 0, b: 0, a: 0 }`
  3. Input kosong, `null`, `undefined` → return `null`.
  4. Warna CSS named (seperti "red", "blue") → **TIDAK perlu didukung** di v2.0. Return `null`.
  5. Clamp semua nilai: r/g/b ke 0-255, alpha ke 0-1.
  6. Export sebagai named export: `export { parseColor }`.
- **Acceptance Criteria:**
  - Semua 6 format di atas menghasilkan output yang benar.
  - Input tidak valid mengembalikan `null` (bukan throw error).
  - Fungsi adalah **pure function** — tidak mengakses DOM atau global state.

---

### `T1.3` — Gradient Parser

- [ ] **Selesai**
- **File Target:** `browser-extension/src/utils/gradient-parser.js`
- **Instruksi:**
  1. Buat fungsi `parseLinearGradient(rawString)` yang mengembalikan objek `GradientData` atau `null`.
  2. Format yang harus didukung:
     - `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
     - `linear-gradient(to right, red, blue)` → arah `to right` = 90deg
     - `linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 100%)`
  3. Jika input bukan `linear-gradient(...)` → return `null`.
  4. `radial-gradient` → return `null` (tidak didukung di v2.0).
  5. Gunakan `parseColor()` dari `color-parser.js` untuk parsing setiap color stop.
  6. Mapping keyword arah ke derajat:
     - `to top` = 0, `to right` = 90, `to bottom` = 180, `to left` = 270
     - `to top right` = 45, `to bottom right` = 135, dll.
- **Acceptance Criteria:**
  - Gradient dengan 2+ color stops bisa di-parse.
  - Sudut dalam derajat (number).
  - Posisi setiap stop berupa angka 0-1 (bukan persentase).
  - Input bukan gradient → `null`.

---

### `T1.4` — Box Shadow Parser

- [ ] **Selesai**
- **File Target:** `browser-extension/src/utils/shadow-parser.js`
- **Instruksi:**
  1. Buat fungsi `parseBoxShadow(rawString)` yang mengembalikan array `ShadowEffect[]`.
  2. Harus mendukung:
     - Single shadow: `"0px 4px 6px rgba(0,0,0,0.1)"`
     - Multiple shadows (dipisah koma): `"0px 4px 6px rgba(0,0,0,0.1), 0px 2px 4px rgba(0,0,0,0.06)"`
     - Inset shadow: `"inset 0px 2px 4px rgba(0,0,0,0.1)"` → type = `'INNER_SHADOW'`
     - Shadow dengan spread: `"0px 4px 6px -1px rgba(0,0,0,0.1)"` → spread = -1
  3. **Kunci parsing:** Warna bisa di awal atau di akhir string shadow. Gunakan regex yang mendeteksi `rgb()`/`rgba()` terlebih dahulu, lalu parse sisa angka sebagai offset/blur/spread.
  4. Input `"none"`, kosong, atau `null` → return `[]` (array kosong).
- **Acceptance Criteria:**
  - Single shadow → array berisi 1 objek.
  - Multiple shadows → array berisi N objek sesuai jumlah shadow.
  - Inset terdeteksi sebagai `type: 'INNER_SHADOW'`.
  - Semua nilai numerik (offsetX, offsetY, blur, spread) bertipe number.

---

### `T1.5` — Font Weight Mapper

- [ ] **Selesai**
- **File Target:** `browser-extension/src/utils/font-mapper.js`
- **Instruksi:**
  1. Buat fungsi `mapFontWeight(weightValue)` yang mengonversi CSS font-weight (number atau string) ke Figma font style name (string).
  2. Tabel pemetaan:

  | Input CSS | Output Figma |
  |---|---|
  | `100` atau `"100"` | `"Thin"` |
  | `200` | `"ExtraLight"` |
  | `300` | `"Light"` |
  | `400` atau `"normal"` | `"Regular"` |
  | `500` | `"Medium"` |
  | `600` | `"SemiBold"` |
  | `700` atau `"bold"` | `"Bold"` |
  | `800` | `"ExtraBold"` |
  | `900` | `"Black"` |

  3. Nilai non-standar (misal 450) → bulatkan ke kelipatan 100 terdekat.
  4. Buat juga fungsi `mapTextAlign(cssTextAlign)`:
     - `"left"` → `"LEFT"`, `"center"` → `"CENTER"`, `"right"` → `"RIGHT"`, `"justify"` → `"JUSTIFIED"`.
     - Default: `"LEFT"`.
  5. Buat juga fungsi `mapTextDecoration(cssDecoration)`:
     - `"underline"` → `"UNDERLINE"`, `"line-through"` → `"STRIKETHROUGH"`.
     - Default: `"NONE"`.
- **Acceptance Criteria:**
  - `mapFontWeight(700)` → `"Bold"`.
  - `mapFontWeight("bold")` → `"Bold"`.
  - `mapFontWeight(450)` → `"Medium"` (dibulatkan ke 500).
  - `mapTextAlign("center")` → `"CENTER"`.
  - Input `null`/`undefined` → nilai default (tidak crash).

---

### `T1.6` — Smart Layer Namer

- [ ] **Selesai**
- **File Target:** `browser-extension/src/utils/layer-namer.js`
- **Instruksi:**
  1. Buat fungsi `generateLayerName(tagName, classList, id)` yang mengembalikan string nama layer.
  2. Aturan prioritas:
     - Ada id → `tag#id` (contoh: `div#sidebar`)
     - Ada class → `tag.class-pertama` (contoh: `div.card`)
     - Ada keduanya → `tag.class-pertama#id` (contoh: `div.card#main`)
     - Tidak ada keduanya → `tag` saja (contoh: `div`)
  3. **Sanitasi nama:**
     - Ubah ke lowercase.
     - Truncate total nama ke maksimal 60 karakter.
     - Jika class > 3, ambil 2 class pertama saja.
  4. Buat juga fungsi `deduplicateNames(nameList)` yang menambahkan index jika ada duplikat:
     - Input: `["div.card", "div.card", "p"]` → Output: `["div.card (1)", "div.card (2)", "p"]`.
- **Acceptance Criteria:**
  - `generateLayerName("DIV", ["card", "shadow-lg"], "main-card")` → `"div.card#main-card"`.
  - `generateLayerName("P", [], "")` → `"p"`.
  - Nama > 60 karakter → di-truncate.
  - `deduplicateNames` menangani array dengan duplikat.

---

## Fase 2: Algoritma Traversal DOM

> **Tujuan:** Membangun fungsi rekursif yang menelusuri DOM tree dari `document.body` ke bawah dan menghasilkan tree bersarang. Ini adalah jantung dari sistem v2.0.

---

### `T2.1` — Visibility Checker

- [ ] **Selesai**
- **File Target:** `browser-extension/src/content/dom-traverser.js` (bagian atas file)
- **Instruksi:**
  1. Buat fungsi `isElementVisible(element, computedStyle)` yang mengembalikan `boolean`.
  2. Return `false` jika salah satu kondisi ini terpenuhi:
     - `computedStyle.display === 'none'`
     - `computedStyle.visibility === 'hidden'` (tapi **hanya** untuk elemen ini, children bisa visible)
     - `parseFloat(computedStyle.opacity) === 0`
     - `element.getBoundingClientRect().width === 0 DAN height === 0`
     - Tag termasuk dalam `SKIP_TAGS` (`SCRIPT`, `STYLE`, `META`, `LINK`, `NOSCRIPT`, `BR`, `HR`, `HEAD`)
  3. Return `true` untuk semua kasus lain (termasuk elemen di luar viewport — tetap valid karena bisa di-scroll).
  4. Buat juga `isContainerWithHiddenChildren(element, computedStyle)` yang mendeteksi kasus khusus `visibility: hidden` pada parent. Return `true` jika children masih harus diproses.
- **Acceptance Criteria:**
  - `display: none` → `false`.
  - `visibility: hidden` → `false` untuk elemen sendiri, tapi children tetap diproses.
  - `opacity: 0` → `false`.
  - `<script>` → `false`.
  - `<div>` biasa → `true`.
  - `<div>` di luar viewport tapi berukuran > 0 → `true`.

---

### `T2.2` — Recursive DOM Traverser

- [ ] **Selesai**
- **File Target:** `browser-extension/src/content/dom-traverser.js`
- **Instruksi:**
  1. Buat fungsi utama `traverseDOM(rootElement, parentRect, currentDepth, nodeCounter)`.
  2. Algoritma:
     ```
     function traverseDOM(element, parentRect, depth, counter):
       IF counter.count >= MAX_NODES → return null
       IF depth > MAX_DEPTH → return null
       
       computedStyle = getComputedStyle(element)
       IF NOT isElementVisible(element, computedStyle) → return null
       
       rect = element.getBoundingClientRect()
       nodeType = classifyElement(element.tagName)
       
       node = {
         tagName: element.tagName,
         element: element,    // Referensi DOM (untuk style extraction nanti)
         rect: rect,
         relativeX: rect.left - parentRect.left,
         relativeY: rect.top - parentRect.top,
         width: rect.width,
         height: rect.height,
         nodeType: nodeType,  // 'FRAME', 'TEXT', 'IMAGE', 'VECTOR'
         children: []
       }
       
       counter.count++
       
       FOR EACH childElement IN element.children:
         childNode = traverseDOM(childElement, rect, depth + 1, counter)
         IF childNode !== null:
           node.children.push(childNode)
       
       return node
     ```
  3. Buat fungsi `classifyElement(tagName)`:
     - Container tags → `'FRAME'`: `DIV, SECTION, HEADER, FOOTER, NAV, MAIN, ARTICLE, ASIDE, FORM, UL, OL, LI, TABLE, TR, TD, TH, THEAD, TBODY, TFOOT, FIGURE, FIGCAPTION, DETAILS, SUMMARY, DIALOG, FIELDSET, LABEL, BUTTON`
     - Text tags → `'TEXT'`: `P, H1, H2, H3, H4, H5, H6, SPAN, A, STRONG, EM, B, I, U, S, SMALL, BLOCKQUOTE, CODE, PRE, Q, CITE, ABBR, TIME, MARK`
     - Image tags → `'IMAGE'`: `IMG, PICTURE`
     - Vector tags → `'VECTOR'`: `SVG`
     - Unknown → `'FRAME'` (generic container)
  4. Counter harus berupa objek `{ count: 0 }` yang di-pass by reference agar terakumulasi di seluruh rekursi.
  5. Export: `export { traverseDOM }`.
- **Acceptance Criteria:**
  - DOM tree 3-level menghasilkan output tree 3-level (nested children).
  - `MAX_DEPTH` = 15 dihormati (node di level 16 di-skip).
  - `MAX_NODES` = 2000 dihormati (traversal berhenti setelah 2000).
  - Elemen `display: none` dan children-nya tidak muncul di output.
  - `relativeX` dan `relativeY` dihitung relatif terhadap parent, bukan viewport.
  - Urutan children di output mengikuti urutan DOM (z-order preserved).

---

### `T2.3` — Entry Point Content Script

- [ ] **Selesai**
- **File Target:** `browser-extension/src/content/entry.js`
- **Instruksi:**
  1. Buat listener untuk pesan dari popup:
     ```javascript
     chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
       if (message.type === 'EXTRACT_PAGE') {
         try {
           const result = runExtractionPipeline();
           sendResponse({ success: true, data: result });
         } catch (error) {
           sendResponse({ success: false, error: error.message });
         }
         return true; // Wajib untuk async sendResponse
       }
     });
     ```
  2. Fungsi `runExtractionPipeline()` memanggil modul-modul secara berurutan:
     - `traverseDOM()` → `extractStylesForTree()` → `mapToFigmaTree()` → return payload.
  3. **Untuk sekarang**, cukup implementasi traversal saja (modul lain belum ada). Fungsi style dan mapper bisa di-stub dengan return langsung.
- **Acceptance Criteria:**
  - Content script menerima pesan `{ type: 'EXTRACT_PAGE' }` dari popup.
  - Mengembalikan response `{ success: true, data: ... }` atau `{ success: false, error: ... }`.
  - Tidak crash jika halaman web kosong (`document.body` tanpa children).

---

## Fase 3: Ekstraksi Geometri & CSS

> **Tujuan:** Membaca semua properti visual dari setiap elemen DOM dan mengubahnya menjadi format yang siap di-map ke Figma.

---

### `T3.1` — Background Extractor

- [ ] **Selesai**
- **File Target:** `browser-extension/src/content/style-extractor.js`
- **Instruksi:**
  1. Buat fungsi `extractBackground(computedStyle)` yang mengembalikan:
     ```javascript
     {
       solidColor: RGBA | null,        // Dari backgroundColor
       gradient: GradientData | null,   // Dari backgroundImage jika linear-gradient
       imageUrl: string | null          // Dari backgroundImage jika url(...)
     }
     ```
  2. Cek `computedStyle.backgroundColor`:
     - Jika bukan `transparent` atau `rgba(0, 0, 0, 0)` → parse dengan `parseColor()`.
  3. Cek `computedStyle.backgroundImage`:
     - Jika mengandung `linear-gradient(` → parse dengan `parseLinearGradient()`.
     - Jika mengandung `url(` → ekstrak URL string.
     - Jika `"none"` → abaikan.
- **Acceptance Criteria:**
  - Elemen dengan `background-color: blue` → `solidColor` berisi RGBA biru.
  - Elemen dengan `background: linear-gradient(...)` → `gradient` berisi data gradient.
  - Elemen dengan `background-image: url(img.jpg)` → `imageUrl` berisi `"img.jpg"`.
  - Elemen tanpa background → semua `null`.

---

### `T3.2` — Border & Border-Radius Extractor

- [ ] **Selesai**
- **File Target:** `browser-extension/src/content/style-extractor.js` (tambahkan ke file yang sama)
- **Instruksi:**
  1. Buat fungsi `extractBorder(computedStyle)` yang mengembalikan `BorderData`:
     ```javascript
     {
       width: number,     // Ambil dari borderTopWidth (atau terbesar dari 4 sisi)
       color: RGBA,
       style: string      // 'solid', 'dashed', 'dotted', 'none'
     }
     ```
  2. Buat fungsi `extractBorderRadius(computedStyle)` yang mengembalikan `CornerRadii`:
     ```javascript
     {
       topLeft: parseFloat(computedStyle.borderTopLeftRadius) || 0,
       topRight: parseFloat(computedStyle.borderTopRightRadius) || 0,
       bottomRight: parseFloat(computedStyle.borderBottomRightRadius) || 0,
       bottomLeft: parseFloat(computedStyle.borderBottomLeftRadius) || 0
     }
     ```
  3. Handle kasus `border-radius: 50%` → konversi ke pixel: `Math.min(width, height) / 2`.
  4. Jika border-style adalah `none` → return border width 0.
- **Acceptance Criteria:**
  - `border: 2px solid red` → `{ width: 2, color: {r:255,...}, style: 'solid' }`.
  - `border-radius: 8px` → semua corner = 8.
  - `border-radius: 8px 0 8px 0` → `{ topLeft: 8, topRight: 0, bottomRight: 8, bottomLeft: 0 }`.
  - `border: none` → `{ width: 0, ... }`.

---

### `T3.3` — Shadow & Opacity Extractor

- [ ] **Selesai**
- **File Target:** `browser-extension/src/content/style-extractor.js` (tambahkan ke file yang sama)
- **Instruksi:**
  1. Buat fungsi `extractBoxShadow(computedStyle)`:
     - Delegate ke `parseBoxShadow()` dari `shadow-parser.js`.
     - Return array `ShadowEffect[]`.
  2. Buat fungsi `extractOpacity(computedStyle)`:
     - Return `parseFloat(computedStyle.opacity)` clamped ke 0-1.
     - Default: 1 jika parsing gagal.
  3. Buat fungsi `extractOverflow(computedStyle)`:
     - Return `computedStyle.overflow` — salah satu dari `'visible'`, `'hidden'`, `'scroll'`, `'auto'`.
     - Default: `'visible'`.
- **Acceptance Criteria:**
  - `box-shadow: 0 4px 6px rgba(0,0,0,0.1)` → array berisi 1 shadow dengan blur=6.
  - `opacity: 0.5` → 0.5.
  - `overflow: hidden` → `'hidden'`.
  - Semua fungsi return nilai default yang aman jika input tidak valid.

---

### `T3.4` — Typography Extractor

- [ ] **Selesai**
- **File Target:** `browser-extension/src/content/style-extractor.js` (tambahkan ke file yang sama)
- **Instruksi:**
  1. Buat fungsi `extractTypography(element, computedStyle)` yang mengembalikan `TypographyData | null`.
  2. Return `null` jika elemen bukan text node (tidak punya text content yang bermakna).
  3. Jika elemen mengandung teks:
     ```javascript
     {
       fontFamily: extractFirstFont(computedStyle.fontFamily),
       fontSize: parseFloat(computedStyle.fontSize) || 16,
       fontWeight: parseInt(computedStyle.fontWeight) || 400,
       fontStyle: mapFontWeight(computedStyle.fontWeight),
       lineHeight: parseLineHeight(computedStyle.lineHeight, fontSize),
       letterSpacing: parseLetterSpacing(computedStyle.letterSpacing, fontSize),
       textAlign: mapTextAlign(computedStyle.textAlign),
       textDecoration: mapTextDecoration(computedStyle.textDecorationLine)
     }
     ```
  4. `extractFirstFont(fontFamily)`: Ambil font pertama dari stack, hapus quotes.
     - `"'Inter', sans-serif"` → `"Inter"`
     - `"Arial, Helvetica"` → `"Arial"`
  5. `parseLineHeight(raw, fontSize)`:
     - `"24px"` → 24
     - `"1.5"` (unitless) → `fontSize * 1.5`
     - `"normal"` → `null` (Figma akan gunakan default)
  6. `parseLetterSpacing(raw, fontSize)`:
     - `"0.5px"` → 0.5
     - `"0.1em"` → `0.1 * fontSize`
     - `"normal"` → 0
- **Acceptance Criteria:**
  - Font family `"'Inter', sans-serif"` → `"Inter"`.
  - Line-height `"1.5"` pada font-size 16 → 24.
  - Letter-spacing `"0.1em"` pada font-size 20 → 2.
  - Elemen tanpa teks → `null`.

---

### `T3.5` — Flexbox / Auto Layout Detector

- [ ] **Selesai**
- **File Target:** `browser-extension/src/content/style-extractor.js` (tambahkan ke file yang sama)
- **Instruksi:**
  1. Buat fungsi `extractLayout(computedStyle)` yang mengembalikan `LayoutData`.
  2. Jika `computedStyle.display` **bukan** `'flex'` dan **bukan** `'inline-flex'`:
     - Return `{ mode: 'NONE', direction: 'ROW', gap: 0, padding: {top:0,...}, justifyContent: 'FLEX_START', alignItems: 'STRETCH', wrap: false }`.
  3. Jika display adalah `flex` atau `inline-flex`:
     ```javascript
     {
       mode: 'FLEX',
       direction: mapFlexDirection(computedStyle.flexDirection),
       gap: parseFloat(computedStyle.gap) || 0,
       padding: {
         top: parseFloat(computedStyle.paddingTop) || 0,
         right: parseFloat(computedStyle.paddingRight) || 0,
         bottom: parseFloat(computedStyle.paddingBottom) || 0,
         left: parseFloat(computedStyle.paddingLeft) || 0
       },
       justifyContent: mapJustifyContent(computedStyle.justifyContent),
       alignItems: mapAlignItems(computedStyle.alignItems),
       wrap: computedStyle.flexWrap === 'wrap' || computedStyle.flexWrap === 'wrap-reverse'
     }
     ```
  4. `mapFlexDirection`: `'row'` → `'ROW'`, `'column'` → `'COLUMN'`, `'row-reverse'` → `'ROW'` (reverse ditangani di child ordering), `'column-reverse'` → `'COLUMN'`.
  5. `mapJustifyContent`: `'flex-start'`→`'FLEX_START'`, `'center'`→`'CENTER'`, `'flex-end'`→`'FLEX_END'`, `'space-between'`→`'SPACE_BETWEEN'`, `'space-around'`→`'SPACE_AROUND'`.
  6. `mapAlignItems`: `'stretch'`→`'STRETCH'`, `'flex-start'`/`'start'`→`'FLEX_START'`, `'center'`→`'CENTER'`, `'flex-end'`/`'end'`→`'FLEX_END'`, `'baseline'`→`'FLEX_START'` (fallback, Figma tidak punya baseline).
- **Acceptance Criteria:**
  - `display: block` → `{ mode: 'NONE', ... }`.
  - `display: flex; flex-direction: column; gap: 16px` → `{ mode: 'FLEX', direction: 'COLUMN', gap: 16, ... }`.
  - `justify-content: space-between` → `justifyContent: 'SPACE_BETWEEN'`.
  - Padding per sisi diekstrak terpisah.

---

### `T3.6` — Master Style Extractor Function

- [ ] **Selesai**
- **File Target:** `browser-extension/src/content/style-extractor.js` (fungsi pengikat)
- **Instruksi:**
  1. Buat fungsi utama `extractAllStyles(element)` yang memanggil semua sub-extractor:
     ```javascript
     export function extractAllStyles(element) {
       const style = window.getComputedStyle(element);
       if (!style) return getDefaultStyles();

       return {
         ...extractBackground(style),
         border: extractBorder(style),
         borderRadius: extractBorderRadius(style),
         boxShadow: extractBoxShadow(style),
         opacity: extractOpacity(style),
         overflow: extractOverflow(style),
         typography: extractTypography(element, style),
         layout: extractLayout(style),
         textColor: parseColor(style.color)
       };
     }
     ```
  2. Buat juga fungsi `getDefaultStyles()` yang mengembalikan objek dengan semua nilai default/aman.
  3. Semua error di dalam sub-extractor harus di-catch dan menghasilkan nilai default — **bukan** propagate ke atas.
- **Acceptance Criteria:**
  - `extractAllStyles(divElement)` mengembalikan objek lengkap dengan semua properti.
  - Jika satu sub-extractor gagal, properti lain tetap terisi.
  - Fungsi tidak pernah throw error ke caller.

---

## Fase 4: Penanganan Aset Visual

> **Tujuan:** Mengonversi tag `<img>` dan `<svg>` menjadi format yang bisa dipetakan ke Figma (image fill dan vector node).

---

### `T4.1` — Image URL Extractor

- [ ] **Selesai**
- **File Target:** `browser-extension/src/content/asset-handler.js`
- **Instruksi:**
  1. Buat fungsi `extractImageUrl(imgElement)` yang mengembalikan URL gambar absolute atau `null`.
  2. Logika prioritas:
     - Cek `imgElement.currentSrc` dulu (untuk responsive `<picture>`).
     - Fallback ke `imgElement.src`.
     - Fallback ke `imgElement.getAttribute('src')`.
  3. Jika URL relatif → konversi ke absolut menggunakan `new URL(src, window.location.href).href`.
  4. Jika URL adalah `data:image/...` (base64) → return apa adanya.
  5. Jika URL kosong atau undefined → return `null`.
  6. Export: `export { extractImageUrl }`.
- **Acceptance Criteria:**
  - `<img src="/img/hero.jpg">` pada halaman `https://example.com` → `"https://example.com/img/hero.jpg"`.
  - `<img src="data:image/png;base64,abc123...">` → `"data:image/png;base64,abc123..."`.
  - `<img>` tanpa src → `null`.

---

### `T4.2` — SVG Content Extractor

- [ ] **Selesai**
- **File Target:** `browser-extension/src/content/asset-handler.js` (tambahkan ke file yang sama)
- **Instruksi:**
  1. Buat fungsi `extractSvgContent(svgElement)` yang mengembalikan string SVG mentah atau `null`.
  2. Gunakan `svgElement.outerHTML` untuk mendapatkan konten SVG lengkap.
  3. **Batas ukuran:** Jika `outerHTML.length > 50000` karakter (SVG sangat besar) → return `null` dan log warning.
  4. Validasi: cek bahwa string dimulai dengan `<svg` (case-insensitive).
  5. **TIDAK** perlu mem-resolve `<use xlink:href="...">` atau external references di v2.0.
- **Acceptance Criteria:**
  - `<svg width="24" height="24"><path d="M10 20..."/></svg>` → string SVG lengkap.
  - SVG > 50KB → `null` + console warning.
  - Elemen bukan SVG → `null`.

---

### `T4.3` — Background Image URL Extractor

- [ ] **Selesai**
- **File Target:** `browser-extension/src/content/asset-handler.js` (tambahkan ke file yang sama)
- **Instruksi:**
  1. Buat fungsi `extractBackgroundImageUrl(computedStyle)` yang mengembalikan URL string atau `null`.
  2. Baca `computedStyle.backgroundImage`.
  3. Jika mengandung `url("...")` atau `url('...')` atau `url(...)`:
     - Ekstrak URL dari dalam tanda kurung.
     - Hapus quotes jika ada.
     - Konversi ke URL absolut.
  4. Jika `"none"` atau bukan `url(...)` → return `null`.
  5. Jika mengandung `linear-gradient` → return `null` (ditangani oleh gradient parser).
- **Acceptance Criteria:**
  - `background-image: url("hero.jpg")` → `"https://example.com/hero.jpg"`.
  - `background-image: none` → `null`.
  - `background-image: linear-gradient(...)` → `null`.

---

## Fase 5: Figma Payload & Clipboard API

> **Tujuan:** Mengonversi tree DOM yang sudah diperkaya dengan style menjadi format Figma, lalu menulisnya ke clipboard OS.

---

### `T5.1` — Figma Node Mapper

- [ ] **Selesai**
- **File Target:** `browser-extension/src/content/figma-mapper.js`
- **Instruksi:**
  1. Buat fungsi `mapToFigmaTree(domTree)` yang mengonversi output dari `traverseDOM()` (yang sudah diperkaya oleh `extractAllStyles()`) menjadi tree `FigmaNode`.
  2. Untuk setiap node di domTree:
     ```javascript
     const figmaNode = {
       type: domNode.nodeType,        // 'FRAME', 'TEXT', 'IMAGE', 'VECTOR'
       name: generateLayerName(domNode.tagName, domNode.classList, domNode.id),
       x: domNode.relativeX,
       y: domNode.relativeY,
       width: Math.max(1, domNode.width),
       height: Math.max(1, domNode.height),
       styles: domNode.extractedStyles,
       children: []
     };
     ```
  3. **Khusus TEXT node:**
     - Tambahkan `textContent: element.innerText.trim()`.
     - Tambahkan `typography: extractedStyles.typography`.
  4. **Khusus IMAGE node:**
     - Tambahkan `imageUrl: extractImageUrl(element)`.
  5. **Khusus VECTOR node:**
     - Tambahkan `svgContent: extractSvgContent(element)`.
  6. **Khusus FRAME dengan display:flex:**
     - Tambahkan `layout: extractedStyles.layout`.
  7. Proses children secara rekursif.
- **Acceptance Criteria:**
  - Output tree memiliki struktur `FigmaNode` yang valid.
  - Setiap node memiliki `name` yang deskriptif (dari smart namer).
  - `width` dan `height` minimal 1 (tidak pernah 0).
  - TEXT node memiliki `textContent` dan `typography`.
  - IMAGE node memiliki `imageUrl`.

---

### `T5.2` — Payload Assembler

- [ ] **Selesai**
- **File Target:** `browser-extension/src/content/figma-mapper.js` (tambahkan ke file yang sama)
- **Instruksi:**
  1. Buat fungsi `assemblePayload(figmaTree)` yang membungkus tree menjadi `ExtractionPayload`:
     ```javascript
     export function assemblePayload(figmaTree) {
       return {
         version: '2.0',
         sourceUrl: window.location.href,
         viewport: {
           width: window.innerWidth,
           height: window.innerHeight,
           scrollX: window.scrollX,
           scrollY: window.scrollY
         },
         rootNode: figmaTree
       };
     }
     ```
  2. Validasi: pastikan `figmaTree` bukan `null`.
- **Acceptance Criteria:**
  - Payload memiliki field `version`, `sourceUrl`, `viewport`, dan `rootNode`.
  - `viewport` mencerminkan dimensi aktual browser saat ekstraksi.

---

### `T5.3` — HTML Clipboard Payload Builder

- [ ] **Selesai**
- **File Target:** `browser-extension/src/clipboard/clipboard-writer.js`
- **Instruksi:**
  1. Buat fungsi `buildHtmlPayload(figmaTree)` yang mengonversi tree ke HTML string dengan inline styles.
  2. Tujuan: Figma bisa mem-parse HTML yang di-paste dan membuat Frame + Text nodes.
  3. Setiap `FRAME` node → `<div style="...">children</div>`.
  4. Setiap `TEXT` node → `<p style="...">textContent</p>`.
  5. Setiap `IMAGE` node → `<img src="..." style="...">`.
  6. Inline style harus mencakup: `width`, `height`, `background-color`, `border`, `border-radius`, `font-size`, `color`, `font-family`, `font-weight`, dll.
  7. Bungkus seluruh output dalam `<meta charset="utf-8">` + `<div>...</div>`.
- **Acceptance Criteria:**
  - Output adalah HTML string yang valid.
  - Nested tree → nested `<div>` yang valid.
  - Inline styles merepresentasikan styling yang diekstrak.

---

### `T5.4` — Clipboard Writer

- [ ] **Selesai**
- **File Target:** `browser-extension/src/clipboard/clipboard-writer.js` (tambahkan ke file yang sama)
- **Instruksi:**
  1. Buat fungsi `writeToClipboard(payload)` yang menulis ke clipboard OS:
     ```javascript
     export async function writeToClipboard(payload) {
       const jsonString = JSON.stringify(payload, null, 2);
       const htmlString = buildHtmlPayload(payload.rootNode);
       
       try {
         const clipboardItem = new ClipboardItem({
           'text/html': new Blob([htmlString], { type: 'text/html' }),
           'text/plain': new Blob([jsonString], { type: 'text/plain' }),
         });
         await navigator.clipboard.write([clipboardItem]);
         return { success: true, method: 'native' };
       } catch (error) {
         console.warn('[CodeToFrame] Native clipboard gagal, fallback ke writeText:', error);
         try {
           await navigator.clipboard.writeText(jsonString);
           return { success: true, method: 'fallback-text' };
         } catch (fallbackError) {
           console.error('[CodeToFrame] Semua metode clipboard gagal:', fallbackError);
           return { success: false, error: fallbackError.message };
         }
       }
     }
     ```
  2. **Dual MIME:** Tulis `text/html` (untuk Figma native paste) DAN `text/plain` (untuk fallback/debugging).
  3. **Fallback bertingkat:** Native `write()` → `writeText()` → return error.
  4. Return objek status yang menunjukkan metode mana yang berhasil.
- **Acceptance Criteria:**
  - Clipboard berisi data setelah fungsi dipanggil.
  - Jika native `write()` gagal → fallback ke `writeText()` tanpa crash.
  - Return object menunjukkan `success: true/false` dan `method` yang digunakan.

---

## Fase 6: Smart Naming, Popup Update, & Final Testing

> **Tujuan:** Integrasi akhir — memastikan seluruh pipeline bekerja dari popup UI sampai clipboard, dengan penamaan layer yang deskriptif.

---

### `T6.1` — Update Popup UI

- [ ] **Selesai**
- **File Target:** `browser-extension/src/popup/popup.html` + `popup.js` + `popup.css`
- **Instruksi:**
  1. **popup.html:** Tombol utama "Extract & Copy to Clipboard" + area status.
  2. **popup.js:**
     ```javascript
     document.getElementById('extract-btn').addEventListener('click', async () => {
       const statusEl = document.getElementById('status');
       statusEl.textContent = 'Mengekstrak...';
       
       try {
         const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
         const response = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_PAGE' });
         
         if (response.success) {
           statusEl.textContent = `✅ Berhasil! ${response.nodeCount} elemen diekstrak. Paste di Figma (Ctrl+V).`;
         } else {
           statusEl.textContent = `❌ Gagal: ${response.error}`;
         }
       } catch (err) {
         statusEl.textContent = `❌ Error: ${err.message}`;
       }
     });
     ```
  3. **popup.css:** Styling sederhana, profesional, minimal. Lebar popup 320px.
- **Acceptance Criteria:**
  - Klik tombol → status berubah ke "Mengekstrak..." → lalu berubah ke hasil.
  - Error ditampilkan di status (bukan alert dialog).
  - Popup terlihat rapi di Chrome.

---

### `T6.2` — Integrasi Pipeline End-to-End

- [ ] **Selesai**
- **File Target:** `browser-extension/src/content/entry.js` (update final)
- **Instruksi:**
  1. Update `runExtractionPipeline()` untuk memanggil semua modul secara berurutan:
     ```javascript
     function runExtractionPipeline() {
       // 1. Traverse DOM → bangun tree bersarang
       const counter = { count: 0 };
       const bodyRect = document.body.getBoundingClientRect();
       const domTree = traverseDOM(document.body, bodyRect, 0, counter);
       
       // 2. Untuk setiap node di tree, ekstrak styles
       enrichTreeWithStyles(domTree);
       
       // 3. Map ke format Figma
       const figmaTree = mapToFigmaTree(domTree);
       
       // 4. Deduplicate layer names
       deduplicateLayerNames(figmaTree);
       
       // 5. Assemble payload
       const payload = assemblePayload(figmaTree);
       
       // 6. Tulis ke clipboard
       const clipboardResult = writeToClipboard(payload);
       
       return {
         nodeCount: counter.count,
         clipboardMethod: clipboardResult.method,
         payload: payload
       };
     }
     ```
  2. Fungsi `enrichTreeWithStyles(node)` → traversal rekursif yang memanggil `extractAllStyles()` untuk setiap node.
  3. Fungsi `deduplicateLayerNames(tree)` → kumpulkan semua nama, panggil `deduplicateNames()`, update nama node.
- **Acceptance Criteria:**
  - Pipeline berjalan dari awal sampai akhir tanpa error.
  - Clipboard terisi setelah pipeline selesai.
  - Response ke popup mencakup `nodeCount`.

---

### `T6.3` — Buat Test Page

- [ ] **Selesai**
- **File Target:** `test/test-page.html`
- **Instruksi:**
  Buat halaman HTML statis yang menguji **semua** fitur:
  ```html
  <!-- Struktur yang harus ada: -->
  - div bersarang 3 level (untuk test nested frames)
  - div dengan display:flex, gap, padding (untuk test auto layout)
  - h1 dengan font-weight:700, letter-spacing (untuk test tipografi)
  - p dengan line-height, text-align:center (untuk test tipografi)
  - img tag (untuk test image extraction)
  - svg inline sederhana (untuk test vector extraction)
  - div dengan display:none (harus di-skip)
  - div dengan opacity:0 (harus di-skip)
  - div dengan box-shadow (untuk test shadow extraction)
  - div dengan border-radius (untuk test radius)
  - div dengan border: 2px solid (untuk test border)
  - div dengan linear-gradient background (untuk test gradient)
  - elemen dengan class dan id (untuk test smart naming)
  ```
- **Acceptance Criteria:**
  - File valid HTML yang bisa dibuka di Chrome.
  - Setiap fitur v2.0 minimal ada 1 elemen pengujian.
  - Elemen di-label dengan komentar HTML agar mudah ditelusuri.

---

### `T6.4` — Sanity Test End-to-End

- [ ] **Selesai**
- **File Target:** Tidak ada file baru — ini adalah prosedur pengujian manual.
- **Instruksi:**
  1. Build extension: `cd browser-extension && npm run build`.
  2. Load unpacked di Chrome: `chrome://extensions` → Load unpacked → pilih `dist/`.
  3. Buka `test/test-page.html` di Chrome.
  4. Klik ekstensi CodeToFrame → klik "Extract & Copy".
  5. Buka Figma → buat file baru → Ctrl+V (paste).
  6. **Verifikasi:**

  | # | Yang Diperiksa | Kriteria PASS |
  |:---:|---|---|
  | 1 | Nested frames | `<div>` bersarang menjadi Frame bersarang di Figma |
  | 2 | Smart naming | Layer bernama `div.container`, `h1#title`, dll. |
  | 3 | Background color | Warna latar belakang sesuai |
  | 4 | Border & radius | Border terlihat, sudut melengkung sesuai |
  | 5 | Box shadow | Shadow terlihat di Figma |
  | 6 | Auto Layout | Flex container menjadi Frame dengan Auto Layout |
  | 7 | Typography | Font size, weight, line-height sesuai |
  | 8 | Image | `<img>` menjadi Rectangle dengan image fill |
  | 9 | SVG | SVG inline menjadi Vector node |
  | 10 | Hidden elements | `display:none` dan `opacity:0` **TIDAK** muncul |
  | 11 | Tidak ada crash | Console Chrome dan Figma bersih dari error merah |

- **Acceptance Criteria:**
  - Minimal 9 dari 11 poin di atas PASS.
  - Tidak ada error merah di console Chrome maupun Figma.
  - Popup menampilkan jumlah elemen yang diekstrak.

---

## Ringkasan Jumlah Tugas per Fase

| Fase | Jumlah Task | Estimasi Waktu |
|---|---|---|
| Fase 0: Restrukturisasi | 3 task | 1 hari |
| Fase 1: Utilitas | 6 task | 2-3 hari |
| Fase 2: DOM Traversal | 3 task | 2-3 hari |
| Fase 3: CSS Extraction | 6 task | 3-4 hari |
| Fase 4: Aset Visual | 3 task | 1-2 hari |
| Fase 5: Figma Payload | 4 task | 2-3 hari |
| Fase 6: Integrasi & Test | 4 task | 2-3 hari |
| **Total** | **29 task** | **13-19 hari kerja** |

---

*Kerjakan tugas secara berurutan. Jangan loncat fase. Setiap tugas dirancang agar bisa diselesaikan dalam 1-4 jam oleh satu developer. Jika sebuah tugas memakan waktu > 1 hari, kemungkinan ada hal yang perlu dipecah lebih lanjut — tanyakan ke Lead.*
