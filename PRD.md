# 📋 PRD: CodeToFrame v2.0 — High-Fidelity Web-to-Figma Converter

> **Tanggal:** 12 Agustus 2026  
> **Status:** Draft — Menggantikan PRD v1.0  
> **Repositori:** [github.com/aindragt/CodeToFrame](https://github.com/aindragt/CodeToFrame)  
> **Versi Sebelumnya:** v1.0 (MVP — flat extraction, basic properties, manual copy-paste JSON)

---

## 1. 🎯 Ringkasan Eksekutif

**CodeToFrame v2.0** adalah ekstensi peramban (*browser extension*) tunggal yang mengonversi halaman web (HTML/CSS) menjadi desain Figma yang terstruktur, akurat, dan langsung bisa diedit.

### Perbedaan Utama dari v1.0

| Aspek | v1.0 (MVP) | v2.0 (High-Fidelity) |
|---|---|---|
| **Arsitektur** | 2 komponen: Extension + Plugin Figma | 1 komponen: Extension saja (native clipboard) |
| **Cara transfer data** | Manual copy-paste JSON ke Plugin | Otomatis via Native Clipboard → langsung Ctrl+V di Figma |
| **Struktur output** | Flat list (semua elemen sejajar) | Nested hierarchy (Frame bersarang mengikuti DOM) |
| **Properti CSS** | background-color, color, font-size saja | border, border-radius, box-shadow, opacity, gradient, dll. |
| **Elemen didukung** | Rectangle dan Text saja | + Image fills, SVG vectors |
| **Layout** | Koordinat absolut (X, Y) | Auto Layout (Flexbox → Figma Auto Layout) |
| **Tipografi** | Font-size dan color saja | + font-family, font-weight, line-height, letter-spacing, text-align |
| **Penamaan layer** | Generic ("Rectangle 100,200") | Smart naming (tag.class#id) |

---

## 2. 🧩 Arsitektur Sistem v2.0

### Model Satu Komponen

Pada v2.0, plugin Figma **tidak lagi diperlukan**. Ekstensi Chrome menulis *payload* dalam format MIME khusus ke clipboard OS, yang langsung dikenali oleh Figma saat pengguna melakukan Paste (Ctrl+V / Cmd+V).

```
┌───────────────────────────────────────────────────────────────────┐
│                         BROWSER CHROME                            │
│                                                                   │
│  ┌──────────┐    ┌──────────────┐    ┌────────────────────────┐  │
│  │ Halaman  │───►│ DOM Traversal │───►│ Figma Clipboard Writer │  │
│  │ Web (DOM)│    │ + CSS Extract │    │ (MIME JSON Payload)    │  │
│  └──────────┘    └──────────────┘    └──────────┬─────────────┘  │
│                                                  │                │
└──────────────────────────────────────────────────┼────────────────┘
                                                   │
                                         ┌─────────▼─────────┐
                                         │   OS Clipboard     │
                                         │   (MIME: Figma)    │
                                         └─────────┬─────────┘
                                                   │
                                          Ctrl+V / Cmd+V
                                                   │
                                         ┌─────────▼─────────┐
                                         │   Figma Canvas     │
                                         │   🎉 Nested Frames │
                                         └───────────────────┘
```

> **💡 Mengapa ini lebih baik?**
> - Pengguna tidak perlu menginstal plugin Figma terpisah.
> - Tidak ada langkah manual copy-paste JSON ke textarea.
> - Satu klik di extension → langsung paste di Figma = **2 langkah** (turun dari 5 langkah di v1.0).

---

## 3. 🚶 Alur Pengguna v2.0

```
  ① Buka website          ② Klik Ekstensi          ③ Pindah ke Figma
     di Chrome       ──►     CodeToFrame       ──►     tekan Ctrl+V
                          (1 klik = selesai!)
                                                        │
                                                        ▼
                                                  🎉 Desain muncul
                                                     di kanvas Figma
                                                  (nested, styled, akurat!)
```

| Langkah | Apa yang Terjadi | Di Mana |
|:---:|---|---|
| **①** | Pengguna membuka halaman web target | Chrome |
| **②** | Klik ikon ekstensi → extension menelusuri DOM, mengekstrak CSS, membangun tree bersarang, menulis ke clipboard sebagai MIME Figma | Chrome |
| **③** | Pengguna beralih ke Figma → Ctrl+V → Figma mengenali format clipboard → elemen muncul di kanvas sebagai Frame bersarang dengan styling lengkap | Figma |

---

## 4. 🔧 Tech Stack

| Komponen | Teknologi | Keterangan |
|---|---|---|
| Bahasa | **TypeScript** (strict mode) | Pengecekan tipe ketat di seluruh codebase |
| Build Tool | **Vite** | Bundling multi-entry (popup, content script) |
| Standar | **Chrome Manifest V3** | Format terbaru untuk ekstensi Chrome |
| Clipboard | **Clipboard API** (`navigator.clipboard.write`) | Menulis MIME khusus ke clipboard OS |

> **Plugin Figma tidak lagi diperlukan** — semua pekerjaan dilakukan di sisi ekstensi.

---

## 5. ✨ Fitur Inti v2.0

### 5.1 Copy-Paste Langsung (Native Clipboard Payload)

**Deskripsi:**  
Ekstensi menulis format MIME/JSON khusus ke clipboard OS yang langsung dikenali Figma sebagai node tree yang valid saat pengguna melakukan Paste.

**Mekanisme Teknis:**
- Gunakan `navigator.clipboard.write()` dengan `ClipboardItem` yang berisi tipe MIME `application/x-figma-clipboard` (atau format yang dikenali Figma).
- Payload JSON harus mengikuti struktur internal yang Figma harapkan saat menerima paste event.
- Fallback: jika MIME khusus gagal, tulis sebagai `text/plain` (JSON string) yang bisa di-paste manual ke plugin v1.0 sebagai backward compatibility.

**Edge Cases:**
| Skenario | Penanganan |
|---|---|
| Browser tidak mendukung `clipboard.write()` | Fallback ke `clipboard.writeText()` dengan JSON string |
| Clipboard permission ditolak user | Tampilkan pesan error yang jelas + saran untuk mengizinkan |
| Payload terlalu besar (halaman sangat kompleks) | Batasi kedalaman traversal (max depth) dan jumlah elemen (max nodes), tampilkan warning |
| Figma tidak mengenali format MIME | Tampilkan instruksi untuk paste manual via plugin v1.0 |

---

### 5.2 Struktur Bersarang (Nested Frames)

**Deskripsi:**  
Mempertahankan hirarki DOM HTML menjadi hirarki Frame bersarang di Figma secara akurat. Setiap elemen container di DOM menjadi FrameNode di Figma, dengan child elements menjadi children dalam Frame tersebut.

**Contoh Pemetaan:**
```
HTML DOM                              Figma Canvas
─────────                             ────────────
<div class="card">                    Frame "div.card"
  <div class="card-header">    ──►      Frame "div.card-header"
    <h2>Title</h2>                        Text "h2: Title"
  </div>                               Frame "div.card-body"
  <div class="card-body">                Text "p: Hello world"
    <p>Hello world</p>
  </div>
</div>
```

**Edge Cases:**
| Skenario | Penanganan |
|---|---|
| DOM sangat dalam (>20 level nesting) | Batasi kedalaman max 15 level, flatten sisa ke level terakhir |
| Elemen dengan `position: fixed/sticky` | Ekstrak ke level teratas (root frame), bukan mengikuti posisi DOM |
| `<body>` dan `<html>` sebagai container | Skip sebagai node, gunakan sebagai root implicit |
| `<table>` dengan struktur kompleks | Perlakukan sebagai nested rectangles (tr → row frame, td → cell frame) |
| Fragment atau Shadow DOM | Skip Shadow DOM di v2.0 — log warning di console |

---

### 5.3 Ekstraksi CSS Lanjutan

**Deskripsi:**  
Menangkap properti CSS visual yang lebih lengkap dari setiap elemen.

**Properti yang Diekstrak:**

| Properti CSS | Pemetaan ke Figma | Catatan |
|---|---|---|
| `background-color` | `fills` (SolidPaint) | Konversi RGBA 0-255 → 0-1 |
| `border` | `strokes` + `strokeWeight` | Termasuk border-color dan border-width |
| `border-radius` | `cornerRadius` atau `topLeftRadius` dkk. | Mendukung per-corner radius |
| `box-shadow` | `effects` (DropShadowEffect) | Parsing `offsetX`, `offsetY`, `blur`, `spread`, `color` |
| `opacity` | `opacity` (0-1) | Langsung pemetaan 1:1 |
| `linear-gradient` | `fills` (GradientPaint) | Parsing angle, color stops, positions |
| `overflow: hidden` | `clipsContent = true` | Frame clips children |

**Edge Cases:**
| Skenario | Penanganan |
|---|---|
| `border` berbeda tiap sisi (border-top ≠ border-bottom) | Ambil sisi terbesar sebagai `strokeWeight`, log warning |
| Multiple `box-shadow` (comma-separated) | Buat multiple DropShadowEffect entries |
| `inset` box-shadow | Map ke InnerShadowEffect di Figma |
| `radial-gradient` | Skip di v2.0, fallback ke warna dominan (color stop pertama) |
| `background-image: url(...)` | Lihat Fitur 5.4 (Image handling) |
| `border-radius` berupa persentase (`50%`) | Konversi ke pixel berdasarkan dimensi elemen |

---

### 5.4 Penanganan Aset Visual

**Deskripsi:**  
Mengonversi elemen gambar dan vektor dari halaman web ke format Figma yang sesuai.

#### 5.4.1 Tag `<img>`

- Ambil URL gambar dari atribut `src` (atau `currentSrc` untuk responsive images).
- Download gambar sebagai `Uint8Array` via `fetch()`.
- Buat `RectangleNode` di Figma dengan `fills` bertipe `IMAGE`.
- Set `imageHash` menggunakan `figma.createImage(bytes).hash`.

#### 5.4.2 Tag `<svg>` Inline

- Ambil konten SVG mentah (`outerHTML`).
- Kirim sebagai string SVG dalam payload.
- Di sisi paste: gunakan `figma.createNodeFromSvg(svgString)` untuk membuat Vector Nodes asli yang bisa diedit.

#### 5.4.3 CSS `background-image: url(...)`

- Deteksi dari `getComputedStyle`.
- Perlakukan sama seperti `<img>` — download dan jadikan image fill.

**Edge Cases:**
| Skenario | Penanganan |
|---|---|
| Gambar cross-origin (CORS blocked) | Skip gambar, buat placeholder rectangle dengan warna abu-abu + teks "[Image: CORS Blocked]" |
| SVG dengan `<use>` atau external references | Resolve inline terlebih dahulu jika memungkinkan, skip jika gagal |
| Data URI (`data:image/png;base64,...`) | Decode base64 langsung ke Uint8Array |
| Gambar sangat besar (>5MB) | Skip dan log warning — tampilkan placeholder |
| Lazy-loaded images (`loading="lazy"`) | Gunakan `currentSrc` — jika kosong, gunakan `src` attribute |
| `<picture>` dengan `<source>` | Ambil `currentSrc` dari elemen `<img>` di dalamnya |

---

### 5.5 Pemetaan Auto Layout (Flexbox → Figma)

**Deskripsi:**  
Mendeteksi elemen dengan `display: flex` dan memetakannya ke fitur Auto Layout Figma.

**Pemetaan Properti:**

| CSS Flexbox | Figma Auto Layout | Catatan |
|---|---|---|
| `display: flex` | `layoutMode = "HORIZONTAL"` atau `"VERTICAL"` | Berdasarkan `flex-direction` |
| `flex-direction: row` | `layoutMode = "HORIZONTAL"` | Default |
| `flex-direction: column` | `layoutMode = "VERTICAL"` | |
| `gap` | `itemSpacing` | Dalam pixel |
| `padding` | `paddingTop/Right/Bottom/Left` | Per sisi |
| `justify-content: center` | `primaryAxisAlignItems = "CENTER"` | |
| `justify-content: space-between` | `primaryAxisAlignItems = "SPACE_BETWEEN"` | |
| `align-items: center` | `counterAxisAlignItems = "CENTER"` | |
| `align-items: stretch` | `counterAxisAlignItems = "STRETCH"` | (Figma ≥ sejak 2023) |
| `flex-wrap: wrap` | `layoutWrap = "WRAP"` | |

**Edge Cases:**
| Skenario | Penanganan |
|---|---|
| `display: grid` | Fallback ke absolute positioning — CSS Grid belum didukung Figma Auto Layout |
| `display: inline-flex` | Perlakukan sama seperti `flex` |
| `flex-direction: row-reverse` / `column-reverse` | Set `layoutMode` sesuai axis, balik urutan children |
| Nested flex containers | Recursif — setiap flex container menjadi Frame dengan Auto Layout masing-masing |
| `flex-grow` / `flex-shrink` pada children | Map ke `layoutGrow = 1` di Figma (untuk `flex-grow: 1`), sisanya `layoutGrow = 0` |
| `gap` hanya `row-gap` atau `column-gap` | Figma `itemSpacing` hanya satu nilai — ambil yang sesuai axis utama |
| Elemen `position: absolute` di dalam flex container | Keluarkan dari Auto Layout, posisikan secara absolut relatif ke parent |

---

### 5.6 Tipografi Akurat

**Deskripsi:**  
Mengekstrak informasi tipografi yang lebih lengkap untuk setiap elemen teks.

**Properti yang Diekstrak:**

| Properti CSS | Pemetaan ke Figma | Catatan |
|---|---|---|
| `font-family` | `fontName.family` | Ambil font pertama dari stack |
| `font-size` | `fontSize` | Dalam pixel |
| `font-weight` | `fontName.style` | Map ke "Regular", "Bold", dll. |
| `line-height` | `lineHeight` | Dalam pixel atau persentase |
| `letter-spacing` | `letterSpacing` | Dalam pixel |
| `text-align` | `textAlignHorizontal` | "LEFT", "CENTER", "RIGHT", "JUSTIFIED" |
| `color` | `fills` (SolidPaint) | Warna teks |
| `text-decoration` | `textDecoration` | "UNDERLINE", "STRIKETHROUGH" |

**Pemetaan `font-weight` → Figma Style:**

| CSS `font-weight` | Figma `style` |
|---|---|
| 100 | "Thin" |
| 200 | "ExtraLight" |
| 300 | "Light" |
| 400 | "Regular" |
| 500 | "Medium" |
| 600 | "SemiBold" |
| 700 | "Bold" |
| 800 | "ExtraBold" |
| 900 | "Black" |

**Edge Cases:**
| Skenario | Penanganan |
|---|---|
| Font web tidak tersedia di Figma | Fallback ke "Inter" + style terdekat, log warning |
| `font-weight` berupa angka non-standar (misal 450) | Bulatkan ke nilai terdekat (400 atau 500) |
| `line-height: normal` | Hitung berdasarkan font-size × 1.2 (default browser) |
| `line-height` dalam unit `em` atau `%` | Konversi ke pixel berdasarkan `font-size` |
| `letter-spacing` dalam unit `em` | Konversi ke pixel: `em_value × font_size` |
| Mixed styling dalam satu elemen (mis. `<p>Hello <strong>World</strong></p>`) | Buat `TextNode` dengan text ranges — setiap range punya style sendiri |
| Teks RTL (right-to-left) | Set `textAlignHorizontal = "RIGHT"` jika `direction: rtl` |

---

### 5.7 Smart Layer Naming

**Deskripsi:**  
Setiap layer di Figma diberi nama deskriptif yang mencerminkan struktur HTML asli, memudahkan designer untuk menavigasi dan memahami hierarki.

**Format Penamaan:**

```
Format: <tag>.<class-utama>#<id>
Contoh:
  div.navbar-container       → div dengan class "navbar-container"
  h1#main-title              → h1 dengan id "main-title"
  button.btn.btn-primary     → button dengan 2 class
  p                          → paragraph tanpa class/id
  img.hero-image             → image dengan class
  section.features           → section dengan class
```

**Aturan Prioritas Penamaan:**
1. Jika elemen punya `id` → gunakan `tag#id` (contoh: `div#sidebar`).
2. Jika elemen punya `class` → gunakan `tag.class-pertama` (contoh: `div.card`).
3. Jika elemen punya keduanya → gunakan `tag.class-pertama#id`.
4. Jika tidak punya keduanya → gunakan `tag` saja (contoh: `div`, `p`).
5. Jika ada duplikat nama → tambahkan index: `div.card (1)`, `div.card (2)`.

**Edge Cases:**
| Skenario | Penanganan |
|---|---|
| Elemen tanpa class dan tanpa id | Gunakan tag name saja: `div`, `span`, `p` |
| Class sangat panjang (>50 karakter) | Truncate ke 40 karakter + "..." |
| Banyak class (>5 class) | Ambil 2 class pertama saja: `div.class1.class2` |
| Class berisi karakter special | Sanitize — ganti karakter non-alfanumerik dengan `-` |
| `data-testid` atau `aria-label` sebagai identitas | Pertimbangkan sebagai fallback jika tidak ada class/id |

---

### 5.8 Manajemen Visibilitas

**Deskripsi:**  
Elemen yang tidak terlihat secara visual di halaman web harus di-skip saat ekstraksi.

**Kriteria Skip:**

| Kondisi | Aksi | Alasan |
|---|---|---|
| `display: none` | Skip elemen + semua children | Elemen tidak terender sama sekali |
| `visibility: hidden` | Skip elemen, **tapi proses children** | Children bisa punya `visibility: visible` |
| `opacity: 0` | Skip elemen | Tidak terlihat, meskipun masih occupy space |
| `width: 0` atau `height: 0` | Skip elemen | Tidak punya dimensi visual |
| Di luar viewport (sepenuhnya) | **Tetap ekstrak** | Elemen bisa muncul saat scroll — tetap valid |
| `overflow: hidden` pada parent | Tetap ekstrak children | Clipping ditangani oleh `clipsContent` di Figma |
| `clip-path` | Skip clipping, ekstrak elemen normal | Clip-path terlalu kompleks untuk v2.0 |
| `<script>`, `<style>`, `<meta>`, `<link>` | Selalu skip | Elemen non-visual |
| `<noscript>` | Selalu skip | Konten fallback |

**Edge Cases:**
| Skenario | Penanganan |
|---|---|
| `visibility: hidden` pada parent, `visibility: visible` pada child | **Tetap ekstrak child** — CSS inheritance memungkinkan child menimpa parent |
| Elemen dengan `pointer-events: none` | **Tetap ekstrak** — elemen masih terlihat |
| Pseudo-elements (`::before`, `::after`) | Skip di v2.0 — terlalu kompleks untuk diekstrak |
| Elemen dalam `<iframe>` | Skip — batasan cross-origin dan kompleksitas |
| Elemen dalam `<dialog>` yang belum open | Skip — `display: none` secara default |

---

## 6. 📐 Format Data JSON v2.0 (Kontrak Data)

Struktur JSON yang baru mendukung nesting (children) dan properti CSS yang lebih lengkap.

```json
{
  "version": "2.0",
  "sourceUrl": "https://contoh.com",
  "viewport": {
    "width": 1440,
    "height": 900,
    "scrollX": 0,
    "scrollY": 0
  },
  "rootNode": {
    "type": "FRAME",
    "name": "body",
    "x": 0,
    "y": 0,
    "width": 1440,
    "height": 3200,
    "styles": {
      "backgroundColor": { "r": 255, "g": 255, "b": 255, "a": 1 },
      "borderRadius": { "topLeft": 0, "topRight": 0, "bottomRight": 0, "bottomLeft": 0 },
      "border": { "width": 0, "color": { "r": 0, "g": 0, "b": 0, "a": 0 } },
      "boxShadow": [],
      "opacity": 1,
      "overflow": "visible"
    },
    "layout": {
      "mode": "NONE",
      "direction": "ROW",
      "gap": 0,
      "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 },
      "justifyContent": "FLEX_START",
      "alignItems": "STRETCH"
    },
    "children": [
      {
        "type": "FRAME",
        "name": "div.hero-section",
        "x": 0,
        "y": 0,
        "width": 1440,
        "height": 600,
        "styles": { "..." : "..." },
        "layout": { "mode": "FLEX", "direction": "COLUMN", "..." : "..." },
        "children": [
          {
            "type": "TEXT",
            "name": "h1.hero-title",
            "x": 100,
            "y": 200,
            "width": 600,
            "height": 48,
            "content": "Welcome to CodeToFrame",
            "typography": {
              "fontFamily": "Inter",
              "fontSize": 48,
              "fontWeight": 700,
              "fontStyle": "Bold",
              "lineHeight": 56,
              "letterSpacing": -0.5,
              "textAlign": "LEFT",
              "textDecoration": "NONE"
            },
            "styles": {
              "color": { "r": 255, "g": 255, "b": 255, "a": 1 },
              "opacity": 1
            }
          },
          {
            "type": "IMAGE",
            "name": "img.hero-image",
            "x": 0,
            "y": 0,
            "width": 800,
            "height": 400,
            "imageUrl": "https://contoh.com/hero.jpg",
            "imageData": null
          }
        ]
      }
    ]
  }
}
```

### Tipe Node yang Didukung

| Tipe | Deskripsi | Figma Node |
|---|---|---|
| `FRAME` | Elemen container (div, section, header, dll.) | `FrameNode` |
| `TEXT` | Elemen teks (p, h1-h6, span, a, dll.) | `TextNode` |
| `IMAGE` | Elemen gambar (`<img>`, `background-image`) | `RectangleNode` + Image Fill |
| `VECTOR` | Elemen SVG inline | `VectorNode` (via `createNodeFromSvg`) |

---

## 7. 📁 Struktur Folder Proyek v2.0

```
CodeToFrame/
├── browser-extension/              ← Satu-satunya komponen (ekstensi Chrome)
│   ├── public/
│   │   ├── manifest.json           ← Konfigurasi Manifest V3
│   │   └── icons/                  ← Ikon ekstensi
│   ├── src/
│   │   ├── popup/                  ← UI popup ekstensi
│   │   │   ├── popup.html
│   │   │   ├── popup.ts
│   │   │   └── popup.css
│   │   ├── content/                ← Content Script (inti ekstraksi)
│   │   │   ├── dom-traverser.ts    ← Recursive DOM tree walker
│   │   │   ├── style-extractor.ts  ← CSS property reader
│   │   │   ├── figma-mapper.ts     ← DOM→Figma node converter
│   │   │   └── entry.ts           ← Entry point content script
│   │   ├── clipboard/              ← Clipboard handler
│   │   │   └── clipboard-writer.ts ← Menulis MIME payload ke clipboard
│   │   ├── utils/                  ← Utilitas bersama
│   │   │   ├── color-parser.ts     ← Parsing warna CSS (rgb, rgba, hex, hsl)
│   │   │   ├── gradient-parser.ts  ← Parsing CSS linear-gradient
│   │   │   └── shadow-parser.ts    ← Parsing CSS box-shadow
│   │   └── types/                  ← TypeScript type definitions
│   │       └── schema.ts           ← Interface kontrak data v2.0
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── figma-plugin/                   ← Dipertahankan sebagai fallback / v1.0 legacy
│   ├── (file-file v1.0 tetap ada)
│   └── ...
│
├── shared/                         ← Shared types & utilities
│   └── types.ts
│
├── PRD.md                          ← Dokumen ini
├── ARCHITECTURE.md                 ← Arsitektur teknis v2.0
├── AGENTS.md                       ← Instruksi AI Assistant
├── TODO.md                         ← Execution plan
└── README.md
```

---

## 8. ✅ Kriteria Selesai (Definition of Done) v2.0

- [ ] Ekstensi Chrome bisa di-install dan berjalan tanpa error
- [ ] Klik ekstensi → DOM diekstrak menjadi tree bersarang (nested)
- [ ] Semua properti CSS (background, border, radius, shadow, opacity, gradient) terekstrak
- [ ] Flexbox containers terdeteksi dan di-map ke Auto Layout Figma
- [ ] Tag `<img>` menjadi Rectangle dengan Image Fill
- [ ] Tag `<svg>` inline menjadi Vector Node yang bisa diedit
- [ ] Tipografi lengkap (family, weight, line-height, letter-spacing, text-align) terekstrak
- [ ] Layer naming menggunakan format `tag.class#id` yang deskriptif
- [ ] Elemen tersembunyi (display:none, visibility:hidden, opacity:0) di-skip
- [ ] Payload ditulis ke clipboard dalam format MIME yang dikenali Figma
- [ ] Ctrl+V di Figma → elemen muncul sebagai Frame bersarang yang terstruktur
- [ ] Fallback: JSON string bisa di-paste ke plugin v1.0 jika native clipboard gagal
- [ ] Halaman dengan >500 elemen tetap bisa diekstrak tanpa crash (dengan warning)

---

## 9. 🗺️ Urutan Pengerjaan v2.0

| Fase | Apa yang Dikerjakan | Estimasi | Prasyarat |
|:---:|---|---|---|
| **1** | Refaktor kontrak data: schema.ts v2.0 (nested structure) | 1 hari | — |
| **2** | Recursive DOM Traverser (membangun tree bersarang) | 2-3 hari | Fase 1 |
| **3** | Style Extractor Lanjutan (border, radius, shadow, opacity, gradient) | 2-3 hari | Fase 1 |
| **4** | Figma Mapper (konversi DOM tree → Figma node tree) | 2 hari | Fase 2, 3 |
| **5** | Auto Layout Detector (Flexbox → Figma Auto Layout) | 2-3 hari | Fase 4 |
| **6** | Image & SVG Handler | 2 hari | Fase 4 |
| **7** | Tipografi Akurat + Smart Layer Naming | 1-2 hari | Fase 4 |
| **8** | Native Clipboard Writer (MIME Figma) | 2-3 hari | Fase 4 |
| **9** | Popup UI Update + E2E Testing | 2 hari | Semua fase |

> **Total estimasi: 16-23 hari kerja**

---

## 10. 📚 Referensi

| Topik | Link |
|---|---|
| Chrome Manifest V3 | [developer.chrome.com/docs/extensions/develop/manifest](https://developer.chrome.com/docs/extensions/develop/manifest) |
| Clipboard API (write) | [developer.mozilla.org/en-US/docs/Web/API/Clipboard/write](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/write) |
| Figma Plugin API | [figma.com/plugin-docs/api/api-reference](https://www.figma.com/plugin-docs/api/api-reference/) |
| Figma Auto Layout | [figma.com/plugin-docs/api/auto-layout](https://www.figma.com/plugin-docs/api/properties/FrameNode-layoutMode/) |
| CSS `getComputedStyle` | [developer.mozilla.org/en-US/docs/Web/API/Window/getComputedStyle](https://developer.mozilla.org/en-US/docs/Web/API/Window/getComputedStyle) |
| `getBoundingClientRect` | [developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect](https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect) |

---

*Dokumen ini menggantikan PRD v1.0 dan menjadi spesifikasi resmi untuk CodeToFrame v2.0. 🚀*
