# AGENTS.md — Operating Guidelines for CodeToFrame v2.0

> **Versi:** 2.0  
> **Terakhir diperbarui:** 12 Agustus 2026  
> **Tujuan:** Panduan wajib untuk setiap eksekutor (manusia maupun AI agent) yang menulis kode di repositori ini.

---

## 1. Role & Mindset

### Siapa Anda dalam Proyek Ini

Anda adalah **implementor teknis yang disiplin**. Tugas Anda bukan merancang arsitektur — arsitektur sudah ditetapkan di `ARCHITECTURE.md`. Tugas Anda adalah **mengeksekusi satu tugas mikro pada satu waktu** dari daftar di `TODO.md`, menghasilkan kode yang bersih, lulus uji, dan tidak merusak modul lain.

### Prinsip Kerja

| # | Prinsip | Penjelasan |
|:---:|---|---|
| 1 | **Satu Tugas, Satu Waktu** | Jangan mengerjakan dua Task ID sekaligus. Selesaikan satu, commit, baru lanjut. |
| 2 | **Jangan Berasumsi** | Jika instruksi tidak jelas, tanyakan. Jangan membuat keputusan arsitektural sendiri. |
| 3 | **Modular Ketat** | Setiap file memiliki satu tanggung jawab. Jangan menggabungkan logika traversal, styling, dan clipboard dalam satu file. |
| 4 | **Defensif** | Selalu validasi input. Setiap fungsi yang menerima data dari DOM harus mengasumsikan data bisa `null`, `undefined`, atau bertipe salah. |
| 5 | **Gagal dengan Anggun** | Jika satu elemen gagal diekstrak, skip dan lanjutkan. **Jangan pernah** membiarkan satu error menghentikan seluruh pipeline. |
| 6 | **Dokumentasi = Kode** | Setiap fungsi yang diekspor wajib punya JSDoc. Komentar inline menjelaskan *mengapa*, bukan *apa*. |

---

## 2. Core Technical Rules

### 2.1 Bahasa & Runtime

| Aturan | Detail |
|---|---|
| **Bahasa** | JavaScript Native (ES6+). **Tidak ada TypeScript** di v2.0 content script — untuk memaksimalkan kompatibilitas injeksi dan menghilangkan tahap kompilasi di content script pipeline. |
| **Module System** | ES Modules (`import`/`export`). Vite akan mem-bundle menjadi satu file untuk injeksi. |
| **Target Browser** | Chrome 116+ (Manifest V3). Tidak perlu mendukung Firefox atau Safari di v2.0. |
| **Library Pihak Ketiga** | **DILARANG** di content script dan popup. Semua logika ditulis dari nol (*from scratch*). Alasan: content script diinjeksi ke halaman pengguna — dependency eksternal memperbesar ukuran bundle dan risiko konflik. |
| **Node.js APIs** | **TIDAK TERSEDIA**. Content script berjalan di browser, bukan Node.js. Jangan gunakan `fs`, `path`, `Buffer`, dll. |

### 2.2 Defensive Programming (Wajib)

Setiap fungsi yang berinteraksi dengan DOM atau CSS **wajib** menggunakan pola berikut:

```javascript
// ✅ BENAR: Cek null/undefined sebelum akses properti
function getBackgroundColor(element) {
  if (!element) return null;
  
  const style = window.getComputedStyle(element);
  if (!style) return null;
  
  const bg = style.backgroundColor;
  if (!bg || bg === 'transparent' || bg === 'rgba(0, 0, 0, 0)') return null;
  
  return parseColor(bg);
}

// ❌ SALAH: Langsung akses tanpa pengecekan
function getBackgroundColor(element) {
  return parseColor(window.getComputedStyle(element).backgroundColor);
}
```

**Aturan Defensif:**
1. **Selalu cek `null`/`undefined`** sebelum membaca properti objek DOM.
2. **Selalu bungkus `JSON.parse()`** dalam `try-catch`.
3. **Selalu validasi tipe** sebelum operasi aritmatika (`typeof val === 'number'`).
4. **Selalu gunakan `try-catch`** di setiap iterasi elemen (agar satu elemen gagal tidak menghentikan loop).
5. **Jangan pernah** menggunakan `element.innerHTML` untuk membaca data — gunakan `getComputedStyle()` dan `getBoundingClientRect()`.

### 2.3 Standar Dokumentasi Kode (JSDoc)

Setiap fungsi yang diekspor atau menjadi bagian dari API modul **wajib** memiliki JSDoc:

```javascript
/**
 * Menelusuri DOM tree secara rekursif dan membangun representasi
 * tree bersarang yang siap dikonversi ke format Figma.
 *
 * Elemen yang tidak terlihat (display:none, visibility:hidden, opacity:0)
 * akan di-skip. Kedalaman dibatasi oleh MAX_DEPTH untuk mencegah
 * stack overflow pada halaman dengan nesting sangat dalam.
 *
 * @param {HTMLElement} rootElement - Elemen DOM akar untuk memulai traversal
 * @param {DOMRect} parentRect - Bounding rect dari parent (untuk kalkulasi posisi relatif)
 * @param {number} currentDepth - Kedalaman rekursi saat ini (dimulai dari 0)
 * @returns {Object|null} Tree node yang merepresentasikan elemen, atau null jika di-skip
 *
 * @example
 * const tree = traverseDOM(document.body, document.body.getBoundingClientRect(), 0);
 */
export function traverseDOM(rootElement, parentRect, currentDepth) {
  // ...implementasi
}
```

**Aturan JSDoc:**
- Baris pertama: **apa** yang dilakukan fungsi (satu kalimat).
- Paragraf tambahan: **konteks** atau batasan penting.
- `@param`: Setiap parameter, termasuk tipe dan deskripsi.
- `@returns`: Apa yang dikembalikan, termasuk kasus `null`.
- `@example`: Contoh pemanggilan sederhana (opsional tapi sangat dianjurkan).

### 2.4 Console Logging

Semua log harus menggunakan prefix `[CodeToFrame]` agar mudah difilter di DevTools:

```javascript
console.log('[CodeToFrame] Traversal selesai:', nodeCount, 'elemen ditemukan.');
console.warn('[CodeToFrame] Melewati elemen karena gagal membaca style:', tagName);
console.error('[CodeToFrame] Gagal menulis ke clipboard:', error.message);
```

| Level | Kapan Digunakan |
|---|---|
| `console.log` | Informasi progres normal (jumlah elemen, waktu eksekusi) |
| `console.warn` | Elemen di-skip atau fallback digunakan |
| `console.error` | Kegagalan yang memengaruhi hasil akhir |

### 2.5 Konstanta & Batas

Semua nilai batas (*threshold*) harus didefinisikan sebagai konstanta di bagian atas file, **bukan** sebagai *magic number* di tengah kode:

```javascript
// ✅ BENAR
const MAX_DEPTH = 15;
const MAX_NODES = 2000;
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'META', 'LINK', 'NOSCRIPT', 'BR', 'HR']);

// ❌ SALAH
if (depth > 15) return null;  // Apa itu 15? Kenapa 15?
```

### 2.6 Penamaan

| Jenis | Konvensi | Contoh |
|---|---|---|
| File & folder | `kebab-case` | `dom-traverser.js`, `style-extractor.js` |
| Variabel & fungsi | `camelCase` | `backgroundColor`, `extractStyles()` |
| Konstanta | `UPPER_SNAKE_CASE` | `MAX_DEPTH`, `SKIP_TAGS` |
| Class (jika ada) | `PascalCase` | `StyleExtractor` |

---

## 3. Project Structure

### Struktur Direktori yang Diharapkan

```
browser-extension/
├── public/
│   ├── manifest.json                ← Chrome Extension Manifest V3
│   └── icons/
│       ├── icon-16.png
│       ├── icon-48.png
│       └── icon-128.png
│
├── src/
│   ├── content/                     ← Content Script (diinjeksi ke halaman web)
│   │   ├── entry.js                 ← Entry point: listener pesan, memulai pipeline
│   │   ├── dom-traverser.js         ← Modul 1: Recursive DOM tree walker
│   │   ├── style-extractor.js       ← Modul 2: CSS property reader
│   │   ├── figma-mapper.js          ← Modul 3: DOM→Figma node converter
│   │   └── asset-handler.js         ← Modul 4: Image download & SVG extraction
│   │
│   ├── clipboard/
│   │   └── clipboard-writer.js      ← Modul 5: Menulis payload ke OS clipboard
│   │
│   ├── utils/                       ← Fungsi utilitas murni (pure functions)
│   │   ├── color-parser.js          ← parseColor(), parseHex(), parseRgba()
│   │   ├── gradient-parser.js       ← parseLinearGradient()
│   │   ├── shadow-parser.js         ← parseBoxShadow()
│   │   ├── font-mapper.js           ← mapFontWeight(), mapTextAlign()
│   │   └── layer-namer.js           ← generateLayerName(tag, classList, id)
│   │
│   ├── popup/                       ← Popup UI ekstensi
│   │   ├── popup.html
│   │   ├── popup.js
│   │   └── popup.css
│   │
│   └── types/                       ← JSDoc Type Definitions (bukan TypeScript)
│       └── schema.js                ← @typedef untuk semua struktur data
│
├── package.json
└── vite.config.js
```

### Batas Tanggung Jawab Modul (Tidak Boleh Dilanggar)

| Modul | BOLEH mengakses | TIDAK BOLEH mengakses |
|---|---|---|
| `dom-traverser.js` | DOM API (`querySelector`, `children`, `getBoundingClientRect`) | `navigator.clipboard`, `chrome.*` |
| `style-extractor.js` | `window.getComputedStyle()` | DOM traversal, `clipboard`, `chrome.*` |
| `figma-mapper.js` | Output dari `dom-traverser` dan `style-extractor` | DOM API langsung, `clipboard`, `chrome.*` |
| `clipboard-writer.js` | `navigator.clipboard`, output dari `figma-mapper` | DOM API, `chrome.*` |
| `entry.js` | `chrome.runtime.onMessage`, semua modul di atas | Logika bisnis langsung (harus delegasi ke modul) |
| `popup.js` | `chrome.tabs`, `chrome.scripting`, DOM popup sendiri | DOM halaman web, content script modules |

---

## 4. Collaboration & Git Workflow

### 4.1 Branch Strategy

| Jenis | Format | Contoh |
|---|---|---|
| Fitur baru | `feat/<task-id>-<deskripsi>` | `feat/T2.1-recursive-traversal` |
| Bug fix | `fix/<deskripsi>` | `fix/color-parser-hex-shorthand` |
| Refaktor | `refactor/<deskripsi>` | `refactor/extract-visibility-check` |

### 4.2 Commit Message Format

```
<type>(<scope>): <deskripsi singkat>

Contoh:
feat(traverser): implementasi recursive DOM traversal dengan depth limit
fix(color-parser): handle hex shorthand 3-digit (#FFF)
docs(agents): update aturan defensive programming
test(shadow-parser): tambah test case untuk multiple shadows
```

### 4.3 File yang Dilindungi (Jangan Ubah Tanpa Izin)

File-file berikut **TIDAK BOLEH** dimodifikasi tanpa persetujuan eksplisit dari Lead:

| File | Alasan |
|---|---|
| `PRD.md` | Spesifikasi produk — perubahan memengaruhi seluruh tim |
| `ARCHITECTURE.md` | Keputusan arsitektural — perubahan harus di-review |
| `AGENTS.md` | Aturan kerja — perubahan memengaruhi cara semua orang bekerja |
| `manifest.json` | Konfigurasi ekstensi — perubahan permission bisa memengaruhi keamanan |

### 4.4 Pengujian Lokal Sebelum Commit

Sebelum melakukan commit, eksekutor **wajib** menjalankan:

```bash
# 1. Pastikan build berhasil tanpa error
cd browser-extension
npm run build

# 2. Load unpacked extension di Chrome
#    chrome://extensions → Developer Mode → Load Unpacked → pilih dist/

# 3. Buka halaman web sederhana (test-page.html)
#    Klik ekstensi → verifikasi output di console (F12)

# 4. Cek tidak ada error merah di console
```

### 4.5 Test Page Standar

Gunakan file `test/test-page.html` (akan dibuat di Fase 6) sebagai halaman referensi untuk menguji semua fitur. Halaman ini berisi:
- Div bersarang (3 level minimum)
- Elemen flex container
- Teks dengan berbagai style
- Gambar (`<img>`)
- SVG inline
- Elemen tersembunyi (`display: none`)
- Box shadow dan border radius

---

## 5. Error Handling Standard

### Pola Try-Catch per Elemen

```javascript
for (const child of element.children) {
  try {
    const childNode = processElement(child);
    if (childNode) {
      result.children.push(childNode);
    }
  } catch (error) {
    // Log error tapi JANGAN hentikan loop
    console.warn('[CodeToFrame] Skip elemen karena error:', child.tagName, error.message);
    continue;
  }
}
```

### Pola Fallback Bertingkat

```javascript
// Tingkat 1: Coba cara ideal
let color = parseRgba(raw);

// Tingkat 2: Fallback ke cara alternatif
if (!color) {
  color = parseHex(raw);
}

// Tingkat 3: Fallback ke nilai default yang aman
if (!color) {
  color = { r: 0, g: 0, b: 0, a: 1 }; // Hitam sebagai default
  console.warn('[CodeToFrame] Gagal parse warna, menggunakan default hitam:', raw);
}
```

---

## 6. Performance Guidelines

| Aturan | Detail |
|---|---|
| **Batch DOM reads** | Baca semua `getComputedStyle()` dan `getBoundingClientRect()` sebelum melakukan mutasi DOM apa pun. |
| **Hindari forced reflow** | Jangan membaca layout property setelah menulis ke DOM. |
| **Limit traversal** | Hentikan traversal di `MAX_DEPTH` (15) atau `MAX_NODES` (2000). |
| **Async image fetch** | Download gambar secara paralel (`Promise.all`), bukan sequential. |
| **Ukuran payload** | Jika JSON > 5MB, tampilkan warning dan tawarkan opsi untuk mengurangi kedalaman. |

---

## 7. Referensi Cepat

| Topik | Resource |
|---|---|
| `getComputedStyle` | [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/API/Window/getComputedStyle) |
| `getBoundingClientRect` | [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect) |
| Clipboard API `write()` | [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/write) |
| Chrome Manifest V3 | [Chrome Developers](https://developer.chrome.com/docs/extensions/develop/manifest) |
| Figma Plugin API | [Figma Plugin Docs](https://www.figma.com/plugin-docs/api/api-reference/) |

---

*Dokumen ini adalah kontrak kerja. Setiap kode yang melanggar aturan di atas akan di-reject saat code review. Tidak ada pengecualian.*
