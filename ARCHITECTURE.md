# 🏗️ ARCHITECTURE.md — CodeToFrame

> Dokumen ini menjelaskan **arsitektur teknis** proyek CodeToFrame.  
> Ditulis agar mudah dipahami oleh siapa pun yang baru pertama kali membuka repositori ini.
>
> **Terakhir diperbarui:** 10 Agustus 2026

---

## Daftar Isi

1. [High-Level Architecture](#1--high-level-architecture)
2. [Directory Structure](#2--directory-structure)
3. [Directory Guide](#3--directory-guide)
4. [Naming Conventions](#4--naming-conventions)
5. [Data Flow](#5--data-flow)

---

## 1. 🗺️ High-Level Architecture

### Konsep Utama

CodeToFrame adalah sistem yang terdiri dari **dua aplikasi independen** yang bekerja sama:

```
┌──────────────────────────┐                        ┌──────────────────────────┐
│                          │     📋 Copy/Paste      │                          │
│   🌐 Browser Extension   │ ────── JSON ────────► │   🎨 Figma Plugin        │
│   (Pengekstrak Data)     │                        │   (Penggambar Data)      │
│                          │                        │                          │
│   Berjalan di: Chrome    │                        │   Berjalan di: Figma     │
│   Bahasa: TypeScript     │                        │   Bahasa: TypeScript     │
│   Build: Vite            │                        │   UI: HTML/CSS           │
│   Standar: Manifest V3   │                        │                          │
└──────────────────────────┘                        └──────────────────────────┘
```

### Kenapa Dipisah Jadi Dua Proyek?

Kamu mungkin bertanya: *"Kenapa tidak satu folder saja?"* — Jawabannya sederhana:

| Alasan | Penjelasan |
|---|---|
| **Lingkungan berbeda** | Ekstensi Chrome berjalan di browser (DOM, Web API), sedangkan Plugin Figma berjalan di sandbox Figma (Figma Plugin API). Keduanya punya API dan aturan yang berbeda total. |
| **Build process berbeda** | Ekstensi Chrome di-build dengan Vite menjadi file JS + manifest. Plugin Figma di-build/compile TypeScript-nya sendiri secara terpisah. |
| **Deploy terpisah** | Ekstensi dipasang di Chrome, plugin dipasang di Figma. Tidak ada kaitan deployment satu sama lain. |
| **Dependency berbeda** | Masing-masing punya `package.json` sendiri dengan kebutuhan library yang berbeda. Menggabungkannya justru bikin `node_modules` membengkak dan membingungkan. |

> **💡 Analogi:**  
> Bayangkan kamu membuat aplikasi yang terdiri dari **kamera digital** dan **printer foto**. Kamera dan printer itu dua perangkat terpisah, tapi keduanya bekerja dengan format file yang sama (JPEG). Di proyek kita, "format file"-nya adalah **JSON**.

### Prinsip Arsitektur

Berikut prinsip-prinsip sederhana yang kita pegang di proyek ini:

1. **Separation of Concerns** — Setiap bagian punya tanggung jawab yang jelas. Extension hanya mengekstrak, Plugin hanya menggambar. Tidak ada yang melakukan keduanya.
2. **Shared Contract, Loose Coupling** — Kedua bagian sepakat soal format JSON (ini "kontrak"-nya), tapi tidak saling bergantung secara teknis. Kamu bisa mengembangkan satu bagian tanpa menyentuh yang lain.
3. **Keep It Simple** — Ini MVP. Kita memilih solusi paling sederhana yang bisa jalan. Tidak pakai framework besar, tidak pakai arsitektur kompleks.

---

## 2. 📂 Directory Structure

Berikut adalah struktur folder lengkap proyek CodeToFrame:

```
CodeToFrame/
│
│   ── Dokumentasi & Konfigurasi Root ──────────────────
│
├── README.md                          # Pengantar proyek & cara install
├── PRD.md                             # Product Requirements Document
├── ARCHITECTURE.md                    # Dokumen ini
├── .gitignore                         # File/folder yang diabaikan Git
│
│   ── Browser Extension ──────────────────────────────
│
├── browser-extension/
│   │
│   ├── public/                        # File statis (tidak diproses Vite)
│   │   ├── manifest.json              #   → Konfigurasi ekstensi (Manifest V3)
│   │   └── icons/                     #   → Ikon ekstensi (16, 48, 128 px)
│   │       ├── icon-16.png
│   │       ├── icon-48.png
│   │       └── icon-128.png
│   │
│   ├── src/                           # Kode sumber utama
│   │   ├── popup/                     #   → Popup (UI kecil saat klik ikon ekstensi)
│   │   │   ├── popup.html             #       Tampilan popup
│   │   │   ├── popup.ts               #       Logika popup (tombol Extract & Copy)
│   │   │   └── popup.css              #       Styling popup
│   │   │
│   │   ├── content/                   #   → Content Script (berjalan di halaman web)
│   │   │   └── extractor.ts           #       Logika utama: membaca DOM → JSON
│   │   │
│   │   ├── background/               #   → Service Worker (opsional, jika dibutuhkan)
│   │   │   └── service-worker.ts      #       Koordinasi antar bagian ekstensi
│   │   │
│   │   └── types/                     #   → TypeScript type definitions
│   │       └── schema.ts              #       Interface untuk format JSON
│   │
│   ├── dist/                          # ⚠️ Hasil build (JANGAN di-edit manual)
│   ├── package.json                   # Dependency & scripts npm
│   ├── tsconfig.json                  # Konfigurasi TypeScript
│   └── vite.config.ts                 # Konfigurasi Vite (build tool)
│
│   ── Figma Plugin ───────────────────────────────────
│
├── figma-plugin/
│   │
│   ├── src/                           # Kode sumber utama
│   │   ├── ui/                        #   → Antarmuka Plugin (berjalan di iframe)
│   │   │   ├── ui.html                #       Tampilan: textarea + tombol Generate
│   │   │   └── ui.css                 #       Styling antarmuka plugin
│   │   │
│   │   ├── plugin/                    #   → Logika Plugin (berjalan di sandbox Figma)
│   │   │   ├── controller.ts          #       Entry point: menerima pesan dari UI
│   │   │   └── renderer.ts            #       Menggambar elemen (Rectangle, Text) di kanvas
│   │   │
│   │   └── types/                     #   → TypeScript type definitions
│   │       └── schema.ts              #       Interface untuk format JSON (sama dengan extension)
│   │
│   ├── dist/                          # ⚠️ Hasil build (JANGAN di-edit manual)
│   ├── manifest.json                  # Konfigurasi plugin Figma
│   ├── package.json                   # Dependency & scripts npm
│   └── tsconfig.json                  # Konfigurasi TypeScript
│
│   ── Shared (Opsional, Untuk Masa Depan) ────────────
│
└── shared/                            # (Belum dipakai di MVP)
    └── types/                         #   → Tempat type definitions bersama
        └── schema.ts                  #       Jika nanti ingin di-share antar proyek
```

### Catatan Tentang `dist/`

Folder `dist/` adalah **hasil output dari proses build**. Isinya di-generate otomatis oleh Vite (untuk extension) atau TypeScript compiler (untuk plugin).

> **⚠️ Aturan Penting:**
> - **JANGAN** mengedit file di dalam `dist/` secara manual.
> - **JANGAN** meng-commit `dist/` ke Git (pastikan sudah masuk `.gitignore`).
> - Untuk me-rebuild, jalankan `npm run build` di folder masing-masing proyek.

---

## 3. 📖 Directory Guide

Bagian ini menjelaskan **apa isi dan tanggung jawab** setiap folder utama. Anggap ini sebagai "peta" untuk tahu di mana harus menaruh kode baru.

---

### 3.1 `browser-extension/` — Ekstensi Chrome

Ini adalah proyek ekstensi Chrome yang bertugas **mengekstrak** elemen-elemen dari halaman web.

#### `browser-extension/public/`

| File/Folder | Fungsi |
|---|---|
| `manifest.json` | File konfigurasi utama ekstensi Chrome. Mendefinisikan nama, versi, permission, dan file apa saja yang dipakai. Formatnya mengikuti standar **Manifest V3**. |
| `icons/` | Ikon-ikon ekstensi dalam berbagai ukuran. Chrome butuh minimal ukuran 16px, 48px, dan 128px. |

> **💡 Tentang folder `public/`:**  
> Semua file di sini akan di-copy langsung ke folder `dist/` saat build, tanpa diproses oleh Vite. Cocok untuk file statis seperti `manifest.json` dan gambar.

#### `browser-extension/src/popup/`

**Apa itu Popup?** — Popup adalah jendela kecil yang muncul saat pengguna mengklik ikon ekstensi di toolbar Chrome.

| File | Fungsi |
|---|---|
| `popup.html` | Struktur HTML popup. Berisi tombol "Extract" dan area untuk menampilkan/meng-copy JSON. |
| `popup.ts` | Logika TypeScript popup. Menangani klik tombol, berkomunikasi dengan Content Script, dan fitur copy-to-clipboard. |
| `popup.css` | Styling sederhana untuk popup. |

**Alur kerja Popup:**
```
Pengguna klik ikon ekstensi
    → popup.html terbuka
    → Pengguna klik "Extract"
    → popup.ts mengirim pesan ke Content Script
    → Content Script menjalankan ekstraksi
    → Hasil JSON dikirim balik ke popup
    → popup.ts menampilkan JSON & aktifkan tombol "Copy"
```

#### `browser-extension/src/content/`

**Apa itu Content Script?** — Content Script adalah kode JavaScript/TypeScript yang **disuntikkan** langsung ke halaman web yang sedang dibuka pengguna. Artinya, kode ini punya akses penuh ke DOM halaman tersebut.

| File | Fungsi |
|---|---|
| `extractor.ts` | Bintang utama! File ini berisi logika untuk: |
|  | 1. Menelusuri (traverse) elemen-elemen DOM di halaman |
|  | 2. Membaca properti CSS setiap elemen (`getComputedStyle`) |
|  | 3. Mengambil posisi elemen (`getBoundingClientRect`) |
|  | 4. Memfilter elemen mana yang termasuk Rectangle vs Text |
|  | 5. Menyusun semua data menjadi objek JSON |

> **💡 Penting untuk dipahami:**  
> Content Script berjalan di **"dunia"** halaman web (bisa akses DOM), tapi **terisolasi** dari kode JavaScript asli halaman tersebut. Ia berkomunikasi dengan Popup lewat **message passing** (`chrome.runtime.sendMessage` / `chrome.runtime.onMessage`).

#### `browser-extension/src/background/`

**Apa itu Service Worker?** — Service Worker adalah script yang berjalan di background (latar belakang), terpisah dari halaman web maupun popup.

| File | Fungsi |
|---|---|
| `service-worker.ts` | Bertugas sebagai "koordinator" jika dibutuhkan. Di MVP, kemungkinan dipakai minimal — misalnya hanya untuk mendaftarkan Content Script atau menangani event tertentu. |

> **💡 Catatan:**  
> Di Manifest V3, background script **wajib** berupa Service Worker (bukan background page seperti di V2). Service Worker bisa "mati" dan "hidup" kembali sesuai kebutuhan — jadi jangan simpan data di variabel global.

#### `browser-extension/src/types/`

| File | Fungsi |
|---|---|
| `schema.ts` | Berisi **TypeScript interface** yang mendefinisikan bentuk data JSON. File ini adalah representasi kode dari "kontrak data" antara extension dan plugin. |

**Contoh isi `schema.ts`:**
```typescript
export interface CodeToFrameData {
  sourceUrl: string;
  viewportWidth: number;
  viewportHeight: number;
  elements: FrameElement[];
}

export type FrameElement = RectangleElement | TextElement;

export interface RectangleElement {
  type: "RECTANGLE";
  x: number;
  y: number;
  width: number;
  height: number;
  backgroundColor: RGBColor;
}

export interface TextElement {
  type: "TEXT";
  x: number;
  y: number;
  width: number;
  height: number;
  textContent: string;
  fontSize: number;
  textColor: RGBColor;
}

export interface RGBColor {
  r: number; // 0–255
  g: number; // 0–255
  b: number; // 0–255
}
```

---

### 3.2 `figma-plugin/` — Plugin Figma

Ini adalah proyek plugin Figma yang bertugas **menggambar ulang** data JSON menjadi objek-objek di kanvas Figma.

#### Konsep Penting: Dua "Dunia" di Plugin Figma

Sebelum masuk ke detail folder, kamu perlu tahu bahwa plugin Figma terdiri dari **dua bagian yang berjalan di lingkungan terpisah**:

```
┌──────────────────────────────────────────────────────┐
│                     Plugin Figma                      │
│                                                       │
│  ┌─────────────────┐       ┌──────────────────────┐  │
│  │   🖼️ UI Layer    │ ◄──► │   ⚙️ Sandbox Layer    │  │
│  │   (iframe)      │       │   (main thread)      │  │
│  │                 │       │                       │  │
│  │ • ui.html       │       │ • controller.ts      │  │
│  │ • ui.css        │       │ • renderer.ts        │  │
│  │                 │       │                       │  │
│  │ Bisa: DOM, CSS  │       │ Bisa: Figma API      │  │
│  │ Tidak bisa:     │       │ Tidak bisa:           │  │
│  │   Figma API     │       │   DOM, window, fetch  │  │
│  └─────────────────┘       └──────────────────────┘  │
│          │                          ▲                  │
│          └───── postMessage() ──────┘                  │
└──────────────────────────────────────────────────────┘
```

**Mereka berkomunikasi lewat `postMessage()`** — mirip seperti mengirim surat antar ruangan.

#### `figma-plugin/src/ui/`

Ini adalah **"wajah"** plugin — yang dilihat dan diinteraksi oleh pengguna.

| File | Fungsi |
|---|---|
| `ui.html` | Tampilan antarmuka plugin. Berisi: |
|  | • `<textarea>` — tempat pengguna paste JSON |
|  | • Tombol **"Generate"** — untuk memulai proses render |
|  | • Area status/pesan — untuk menampilkan feedback |
| `ui.css` | Styling sederhana untuk antarmuka di atas. |

**Bagaimana UI mengirim data ke Sandbox:**
```typescript
// Di dalam ui.html (script tag)
document.getElementById('btn-generate').addEventListener('click', () => {
  const jsonText = document.getElementById('json-input').value;
  const data = JSON.parse(jsonText);

  // Kirim data ke sandbox layer
  parent.postMessage({ pluginMessage: { type: 'generate', payload: data } }, '*');
});
```

#### `figma-plugin/src/plugin/`

Ini adalah **"otak"** plugin — yang punya akses ke Figma API dan bisa menggambar di kanvas.

| File | Fungsi |
|---|---|
| `controller.ts` | **Entry point** plugin. File ini: |
|  | 1. Membuka UI (`figma.showUI(...)`) |
|  | 2. Mendengarkan pesan dari UI (`figma.ui.onmessage`) |
|  | 3. Memanggil renderer saat menerima data |
| `renderer.ts` | **Jantung** plugin. File ini berisi fungsi-fungsi untuk: |
|  | 1. Membaca array `elements` dari JSON |
|  | 2. Membuat `figma.createRectangle()` untuk elemen bertipe RECTANGLE |
|  | 3. Membuat `figma.createText()` untuk elemen bertipe TEXT |
|  | 4. Mengatur posisi (x, y), ukuran (width, height), dan properti visual |

**Contoh sederhana `renderer.ts`:**
```typescript
// Konversi warna dari format 0–255 ke format Figma 0–1
function toFigmaColor(color: { r: number; g: number; b: number }): RGB {
  return {
    r: color.r / 255,
    g: color.g / 255,
    b: color.b / 255,
  };
}

function renderRectangle(element: RectangleElement): RectangleNode {
  const rect = figma.createRectangle();
  rect.x = element.x;
  rect.y = element.y;
  rect.resize(element.width, element.height);
  rect.fills = [{ type: 'SOLID', color: toFigmaColor(element.backgroundColor) }];
  return rect;
}
```

#### `figma-plugin/src/types/`

| File | Fungsi |
|---|---|
| `schema.ts` | Salinan dari `browser-extension/src/types/schema.ts`. Berisi interface TypeScript yang sama persis. |

> **💡 Kenapa di-copy, bukan di-share?**  
> Di MVP, kita pilih cara paling sederhana: copy file `schema.ts` ke kedua proyek. Ini menghindari kompleksitas setup monorepo atau npm package. Di masa depan, jika proyek berkembang, kita bisa memindahkan type definitions ke folder `shared/` dan mengonfigurasi keduanya agar mengacu ke satu sumber.

#### `figma-plugin/manifest.json`

File ini **berbeda** dari `manifest.json` milik ekstensi Chrome. Ini adalah konfigurasi khusus untuk Figma Plugin.

**Contoh isi:**
```json
{
  "name": "CodeToFrame",
  "id": "000000000000000000",
  "api": "1.0.0",
  "main": "dist/plugin/controller.js",
  "ui": "dist/ui/ui.html",
  "editorType": ["figma"]
}
```

| Field | Keterangan |
|---|---|
| `name` | Nama plugin yang muncul di Figma |
| `id` | ID unik plugin (didapat saat mendaftarkan plugin di Figma) |
| `main` | Path ke file JavaScript utama (hasil compile dari `controller.ts`) |
| `ui` | Path ke file HTML untuk antarmuka plugin |
| `editorType` | Di editor Figma mana plugin ini bisa dipakai |

---

### 3.3 `shared/` — Folder Bersama *(Opsional, Belum Dipakai di MVP)*

Folder ini disiapkan untuk masa depan. Saat ini belum digunakan.

**Rencana penggunaan:**
- Menyimpan **type definitions** (`schema.ts`) di satu tempat agar kedua proyek mengacu ke sumber yang sama.
- Menyimpan **utility functions** yang mungkin dibutuhkan kedua proyek.

---

### 3.4 Ringkasan: Panduan "Di Mana Harus Menaruh Kode?"

| Kamu mau... | Taruh di... |
|---|---|
| Mengubah cara elemen web diekstrak | `browser-extension/src/content/extractor.ts` |
| Mengubah tampilan popup ekstensi | `browser-extension/src/popup/popup.html` + `popup.css` |
| Menambah logika tombol di popup | `browser-extension/src/popup/popup.ts` |
| Mengubah permission ekstensi | `browser-extension/public/manifest.json` |
| Mengubah tampilan plugin Figma | `figma-plugin/src/ui/ui.html` + `ui.css` |
| Mengubah cara elemen digambar di Figma | `figma-plugin/src/plugin/renderer.ts` |
| Menambah tipe elemen baru ke format JSON | `*/src/types/schema.ts` (di **kedua** proyek) |
| Mengubah konfigurasi build extension | `browser-extension/vite.config.ts` |

---

## 4. 📝 Naming Conventions

Aturan penamaan yang kita pakai di proyek ini. Tujuannya agar kode konsisten dan mudah dibaca.

### 4.1 File & Folder

| Jenis | Format | Contoh | ❌ Hindari |
|---|---|---|---|
| Folder | `kebab-case` | `browser-extension/`, `content/` | `BrowserExtension/`, `Content/` |
| File TypeScript | `kebab-case.ts` | `service-worker.ts`, `extractor.ts` | `ServiceWorker.ts`, `Extractor.ts` |
| File HTML | `kebab-case.html` | `popup.html`, `ui.html` | `Popup.html` |
| File CSS | `kebab-case.css` | `popup.css`, `ui.css` | `Popup.css` |
| File konfigurasi | Ikuti konvensi tooling | `tsconfig.json`, `vite.config.ts` | — |

### 4.2 TypeScript — Variabel & Fungsi

| Jenis | Format | Contoh |
|---|---|---|
| Variabel biasa | `camelCase` | `sourceUrl`, `viewportWidth` |
| Konstanta | `UPPER_SNAKE_CASE` | `MAX_ELEMENTS`, `DEFAULT_FONT_SIZE` |
| Fungsi | `camelCase` | `extractElements()`, `renderRectangle()` |
| Parameter fungsi | `camelCase` | `elementNode`, `jsonData` |

### 4.3 TypeScript — Interface & Type

| Jenis | Format | Contoh |
|---|---|---|
| Interface | `PascalCase` | `CodeToFrameData`, `RectangleElement` |
| Type Alias | `PascalCase` | `FrameElement`, `RGBColor` |
| Enum | `PascalCase` | `ElementType` |
| Enum Value | `UPPER_SNAKE_CASE` | `ElementType.RECTANGLE`, `ElementType.TEXT` |

### 4.4 JSON Fields

| Format | Contoh | Alasan |
|---|---|---|
| `camelCase` | `sourceUrl`, `backgroundColor`, `textContent` | Konsisten dengan konvensi JavaScript/TypeScript |

### 4.5 Git Branches

| Jenis Branch | Format | Contoh |
|---|---|---|
| Fitur baru | `feature/deskripsi-singkat` | `feature/extract-text-elements` |
| Perbaikan bug | `fix/deskripsi-singkat` | `fix/popup-copy-button` |
| Dokumen | `docs/deskripsi-singkat` | `docs/update-architecture` |

---

## 5. 🔄 Data Flow

Bagian ini menjelaskan **perjalanan data** dari awal (halaman web) sampai akhir (kanvas Figma). Ikuti nomor urutannya.

### Diagram Alur Lengkap

```
                           BROWSER CHROME                                        FIGMA
  ┌─────────────────────────────────────────────────────────┐    ┌──────────────────────────────────────┐
  │                                                         │    │                                      │
  │  ┌───────────┐    ┌───────────┐    ┌────────────────┐   │    │  ┌─────────┐    ┌─────────────────┐  │
  │  │           │ ①  │           │ ②  │                │   │ ④  │  │         │ ⑤  │                 │  │
  │  │  Halaman  │───►│  Content  │───►│    Popup       │───┼────┼─►│  UI     │───►│  Sandbox        │  │
  │  │  Web      │    │  Script   │    │    Extension   │   │    │  │  Plugin │    │  Plugin         │  │
  │  │  (DOM)    │    │           │    │                │   │    │  │         │    │                 │  │
  │  └───────────┘    └───────────┘    └───┬────────────┘   │    │  └─────────┘    └────────┬────────┘  │
  │                                        │         ▲      │    │                          │           │
  │                                        │ ③       │      │    │                          │ ⑥         │
  │                                        ▼         │      │    │                          ▼           │
  │                                    ┌─────────┐   │      │    │                    ┌───────────┐     │
  │                                    │Clipboard│───┘      │    │                    │  Kanvas   │     │
  │                                    │  (JSON) │          │    │                    │  Figma    │     │
  │                                    └─────────┘          │    │                    │  🎉      │     │
  │                                                         │    │                    └───────────┘     │
  └─────────────────────────────────────────────────────────┘    └──────────────────────────────────────┘
```

### Penjelasan Setiap Langkah

---

#### ① Ekstraksi DOM → Data Mentah

**Siapa:** `extractor.ts` (Content Script)  
**Di mana:** Berjalan di dalam konteks halaman web  
**Apa yang terjadi:**

```
Halaman Web (DOM)
    │
    ├── Traversal: Menelusuri elemen-elemen DOM (div, p, h1, span, dll.)
    │
    ├── Filter: Mengecek apakah elemen terlihat (visible) dan termasuk tipe yang didukung
    │
    ├── Baca Properti:
    │   ├── getComputedStyle(el) → backgroundColor, color, fontSize
    │   └── el.getBoundingClientRect() → x, y, width, height
    │
    └── Output: Array of FrameElement objects
```

**Detail teknis:**
- Gunakan `document.querySelectorAll('*')` atau traversal yang lebih terarah untuk mengumpulkan elemen.
- Gunakan `window.getComputedStyle(element)` untuk membaca properti CSS yang sudah dihitung browser.
- Gunakan `element.getBoundingClientRect()` untuk mendapatkan posisi dan dimensi pasti dalam pixel.
- Elemen yang `display: none` atau `visibility: hidden` → **skip**.
- Elemen `<img>`, `<svg>`, dan elemen di luar ruang lingkup → **skip** (jangan error).

---

#### ② Content Script → Popup (Message Passing)

**Siapa:** `extractor.ts` → `popup.ts`  
**Mekanisme:** Chrome Extension Message Passing  
**Apa yang terjadi:**

```typescript
// Di extractor.ts (Content Script)
chrome.runtime.sendMessage({
  type: 'EXTRACTION_RESULT',
  payload: extractedData   // ← objek CodeToFrameData
});

// Di popup.ts
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'EXTRACTION_RESULT') {
    const jsonString = JSON.stringify(message.payload, null, 2);
    displayJSON(jsonString);
  }
});
```

> **💡 Catatan:** Cara komunikasi antara popup dan content script bisa bervariasi (misalnya lewat `chrome.tabs.sendMessage` atau `chrome.scripting.executeScript`). Yang penting konsepnya sama: kirim pesan, terima pesan.

---

#### ③ JSON → Clipboard

**Siapa:** `popup.ts`  
**Apa yang terjadi:**

Setelah JSON ditampilkan di popup, pengguna menekan tombol **"Copy"**:

```typescript
navigator.clipboard.writeText(jsonString);
```

Data JSON sekarang ada di clipboard sistem operasi.

---

#### ④ Clipboard → Plugin Figma (Manual Copy-Paste)

**Siapa:** Pengguna (manusia!)  
**Apa yang terjadi:**

Ini adalah satu-satunya langkah **manual** dalam alur kerja:

1. Pengguna beralih dari Chrome ke Figma.
2. Pengguna membuka plugin CodeToFrame.
3. Pengguna melakukan **Ctrl+V / Cmd+V** di textarea plugin.

> **💡 Kenapa tidak otomatis?**  
> Menghubungkan ekstensi Chrome langsung ke plugin Figma membutuhkan backend server (WebSocket/API), yang jauh di luar ruang lingkup MVP. Copy-paste adalah solusi paling sederhana dan paling *reliable*.

---

#### ⑤ UI Plugin → Sandbox Plugin (postMessage)

**Siapa:** `ui.html` → `controller.ts`  
**Mekanisme:** `postMessage()` (standar komunikasi iframe ↔ parent di Figma Plugin)  
**Apa yang terjadi:**

```
ui.html                               controller.ts
  │                                        │
  │  ┌──────────────────────────┐          │
  ├──│ 1. Parse JSON dari       │          │
  │  │    textarea              │          │
  │  └──────────────────────────┘          │
  │                                        │
  │  parent.postMessage({                  │
  │    pluginMessage: {          ─────────►│ figma.ui.onmessage = (msg) => {
  │      type: 'generate',                 │   if (msg.type === 'generate') {
  │      payload: parsedData               │     renderElements(msg.payload);
  │    }                                   │   }
  │  }, '*')                               │ }
  │                                        │
```

---

#### ⑥ Sandbox Plugin → Kanvas Figma (Figma API)

**Siapa:** `controller.ts` → `renderer.ts`  
**Mekanisme:** Figma Plugin API  
**Apa yang terjadi:**

```
controller.ts menerima data
    │
    ▼
renderer.ts memproses array elements
    │
    ├── Untuk setiap element:
    │   │
    │   ├── Jika type === "RECTANGLE":
    │   │   ├── figma.createRectangle()
    │   │   ├── Set x, y, width, height
    │   │   └── Set fills (backgroundColor ÷ 255)
    │   │
    │   └── Jika type === "TEXT":
    │       ├── figma.createText()
    │       ├── Set x, y, width, height
    │       ├── Set characters (textContent)
    │       ├── Set fontSize
    │       └── Set fills (textColor ÷ 255)
    │
    ▼
Semua elemen muncul di kanvas Figma! 🎉
```

**Hal penting saat menggambar Text di Figma:**
```typescript
// ⚠️ Sebelum mengisi teks, font HARUS di-load dulu!
async function renderText(element: TextElement): Promise<TextNode> {
  const text = figma.createText();

  // Wajib: load font sebelum set characters
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });

  text.characters = element.textContent;
  text.fontSize = element.fontSize;
  text.x = element.x;
  text.y = element.y;
  text.resize(element.width, element.height);
  text.fills = [{ type: 'SOLID', color: toFigmaColor(element.textColor) }];

  return text;
}
```

> **⚠️ Gotcha penting:**  
> Di Figma API, kamu **wajib** memanggil `figma.loadFontAsync()` sebelum mengubah properti teks seperti `characters`, `fontSize`, dll. Tanpa ini, plugin akan error. Untuk MVP, kita cukup gunakan font default **"Inter"** style **"Regular"** untuk semua teks.

---

### Ringkasan Data Flow (Versi Singkat)

| Langkah | Dari | Ke | Data | Mekanisme |
|:---:|---|---|---|---|
| ① | Halaman Web (DOM) | Content Script | Properti CSS + posisi elemen | DOM API |
| ② | Content Script | Popup | Objek `CodeToFrameData` | Chrome Message Passing |
| ③ | Popup | Clipboard | String JSON | `navigator.clipboard` |
| ④ | Clipboard | Plugin UI | String JSON | Manual copy-paste |
| ⑤ | Plugin UI | Plugin Sandbox | Objek `CodeToFrameData` | `postMessage()` |
| ⑥ | Plugin Sandbox | Kanvas Figma | Rectangle & Text nodes | Figma Plugin API |

---

*Semoga dokumen ini membantu kamu memahami "gambaran besar" proyek CodeToFrame. Jangan ragu untuk bertanya jika ada bagian yang membingungkan. Ingat: tidak ada pertanyaan yang bodoh — yang penting kamu terus belajar! 🚀*
