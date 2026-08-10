# 📋 TODO.md — Master Execution Plan: CodeToFrame MVP (v1.0)

> **Dibuat:** 10 Agustus 2026  
> **Status:** Aktif — Panduan eksekusi teknis utama  
> **Estimasi Total:** 7–11 hari kerja  
> **Repositori:** [github.com/aindragt/CodeToFrame](https://github.com/aindragt/CodeToFrame)

---

## Cara Membaca Dokumen Ini

Setiap tugas ditulis dalam format berikut:

```
- [ ] **[Nama Tugas Utama]**
  - Sub-tasks: langkah-langkah konkret yang harus dikerjakan
  - Definition of Done (DoD): kapan tugas ini dianggap 100% selesai
  - Edge Cases to Handle: potensi bug yang harus diantisipasi
```

**Simbol status:**
- `[ ]` → Belum dikerjakan
- `[/]` → Sedang dikerjakan (in progress)
- `[x]` → Selesai

**Aturan penting:**
- Kerjakan fase **secara berurutan** (Phase 0 → 1 → 2 → dst.). Fase selanjutnya bergantung pada fase sebelumnya.
- Dalam satu fase, tugas-tugas boleh dikerjakan **paralel** kecuali ada catatan ketergantungan eksplisit.
- Setiap kali menyelesaikan satu tugas, **commit** perubahannya ke Git dengan pesan yang deskriptif.

---

## Daftar Fase

| Fase | Nama | Fokus |
|:---:|---|---|
| 0 | [Repository Setup & Environment](#phase-0--repository-setup--environment) | Fondasi proyek, folder, konfigurasi build tools |
| 1 | [Shared Data Contracts](#phase-1--shared-data-contracts-json-schema) | Interface TypeScript untuk kontrak data JSON |
| 2 | [Chrome Extension Core](#phase-2--chrome-extension-core-dom-extraction-engine) | Mesin ekstraksi DOM dari halaman web |
| 3 | [Chrome Extension UI & Data Export](#phase-3--chrome-extension-ui--data-export) | Popup ekstensi, tombol extract, copy to clipboard |
| 4 | [Figma Plugin Core](#phase-4--figma-plugin-core-rendering-engine) | Mesin render elemen di kanvas Figma |
| 5 | [Figma Plugin UI & Message Handler](#phase-5--figma-plugin-ui--message-handler) | Antarmuka plugin, textarea, tombol generate |
| 6 | [End-to-End Integration Testing & QA](#phase-6--end-to-end-integration-testing--quality-assurance) | Pengujian menyeluruh, bug fixing, polish |

---

## Phase 0 — Repository Setup & Environment

> **Tujuan:** Menyiapkan seluruh fondasi proyek sehingga tim bisa langsung mulai ngoding tanpa hambatan konfigurasi.  
> **Estimasi:** 1 hari kerja

---

### 0.1 Struktur Folder Root

- [ ] **Buat struktur folder utama repositori**
  - *Sub-tasks:*
    - Buat folder `browser-extension/` di root repositori.
    - Buat folder `figma-plugin/` di root repositori.
    - Buat folder `shared/types/` di root repositori (untuk persiapan masa depan — boleh kosong dulu, atau berisi placeholder `schema.ts`).
    - Pastikan file dokumentasi berikut sudah ada di root: `README.md`, `PRD.md`, `ARCHITECTURE.md`, `AGENTS.md`, `SKILL.md`, `TODO.md`.
  - *Definition of Done (DoD):*
    - Perintah `ls` di root menampilkan folder `browser-extension/`, `figma-plugin/`, dan `shared/`.
    - Semua file dokumentasi ada dan bisa dibuka.
  - *Edge Cases to Handle:*
    - Pastikan nama folder menggunakan `kebab-case` (bukan `BrowserExtension` atau `browser_extension`).

---

### 0.2 Git Ignore

- [ ] **Buat file `.gitignore` di root repositori**
  - *Sub-tasks:*
    - Tambahkan entry untuk folder `node_modules/` (di semua level).
    - Tambahkan entry untuk folder `dist/` (di semua level).
    - Tambahkan entry untuk file log (`*.log`, `npm-debug.log*`).
    - Tambahkan entry untuk file OS (`Thumbs.db`, `.DS_Store`).
    - Tambahkan entry untuk file editor/IDE (`.vscode/`, `.idea/`).
    - Tambahkan entry untuk file environment (`.env`, `.env.local`).
  - *Definition of Done (DoD):*
    - `git status` tidak menampilkan `node_modules/` atau `dist/` setelah install dan build.
  - *Edge Cases to Handle:*
    - Jika `dist/` atau `node_modules/` sudah pernah ter-commit sebelumnya, jalankan `git rm -r --cached dist/` lalu commit ulang.

---

### 0.3 Browser Extension — Inisialisasi Proyek

- [ ] **Inisialisasi proyek npm di `browser-extension/`**
  - *Sub-tasks:*
    - Jalankan `npm init -y` di dalam folder `browser-extension/`.
    - Edit `package.json`: set `"name"` ke `"codetoframe-browser-extension"`, `"version"` ke `"1.0.0"`, `"private"` ke `true`.
    - Tambahkan field `"scripts"`:
      ```json
      {
        "dev": "vite build --watch",
        "build": "tsc --noEmit && vite build",
        "typecheck": "tsc --noEmit"
      }
      ```
  - *Definition of Done (DoD):*
    - File `browser-extension/package.json` ada dan valid (bisa di-parse JSON).
    - `npm run typecheck` terdaftar sebagai script.

---

- [ ] **Install dependencies untuk Browser Extension**
  - *Sub-tasks:*
    - Install dev dependencies:
      ```bash
      cd browser-extension
      npm install --save-dev typescript vite @types/chrome
      ```
    - Verifikasi: `node_modules/` muncul di `browser-extension/` dan `package-lock.json` ter-generate.
  - *Definition of Done (DoD):*
    - `npx tsc --version` menampilkan versi TypeScript yang valid.
    - `npx vite --version` menampilkan versi Vite yang valid.
    - `@types/chrome` tersedia untuk autocompletion API Chrome di editor.
  - *Edge Cases to Handle:*
    - Jika `npm install` gagal karena versi Node.js terlalu lama, pastikan Node.js versi **18 atau lebih baru** terinstall.

---

- [ ] **Buat `tsconfig.json` untuk Browser Extension**
  - *Sub-tasks:*
    - Buat file `browser-extension/tsconfig.json` dengan konfigurasi berikut:
      ```json
      {
        "compilerOptions": {
          "target": "ES2020",
          "module": "ESNext",
          "moduleResolution": "bundler",
          "strict": true,
          "noUnusedLocals": true,
          "noUnusedParameters": true,
          "noFallthroughCasesInSwitch": true,
          "isolatedModules": true,
          "esModuleInterop": true,
          "skipLibCheck": true,
          "forceConsistentCasingInFileNames": true,
          "outDir": "./dist",
          "rootDir": "./src",
          "types": ["chrome"]
        },
        "include": ["src/**/*.ts"],
        "exclude": ["node_modules", "dist"]
      }
      ```
    - Pastikan `"strict": true` — ini wajib, tidak boleh diubah ke `false`.
    - Pastikan `"types": ["chrome"]` — agar TypeScript mengenali API `chrome.*`.
  - *Definition of Done (DoD):*
    - Perintah `npx tsc --noEmit` berjalan tanpa error (dengan asumsi belum ada file `.ts` yang error).
  - *Edge Cases to Handle:*
    - Jika menggunakan path alias (misalnya `@/`), tambahkan `paths` di `compilerOptions`. Untuk MVP, hindari path alias agar tetap sederhana.

---

- [ ] **Buat `vite.config.ts` untuk Browser Extension**
  - *Sub-tasks:*
    - Buat file `browser-extension/vite.config.ts` dengan konfigurasi multi-entry point:
      ```typescript
      import { defineConfig } from 'vite';
      import { resolve } from 'path';

      export default defineConfig({
        build: {
          outDir: 'dist',
          emptyDirBeforeWrite: true,
          rollupOptions: {
            input: {
              popup: resolve(__dirname, 'src/popup/popup.html'),
              content: resolve(__dirname, 'src/content/extractor.ts'),
              'service-worker': resolve(__dirname, 'src/background/service-worker.ts'),
            },
            output: {
              entryFileNames: '[name].js',
              chunkFileNames: '[name].js',
              assetFileNames: '[name].[ext]',
            },
          },
        },
        publicDir: 'public',
      });
      ```
    - **Catatan penting:** Konfigurasi entry point di atas perlu disesuaikan saat file-file sumber sudah benar-benar dibuat. Ini adalah *starting point* yang akan diiterasi.
  - *Definition of Done (DoD):*
    - Perintah `npx vite build` berjalan tanpa error (bisa gagal jika file entry belum ada — ini normal di fase ini, akan diverifikasi ulang di Phase 2).
  - *Edge Cases to Handle:*
    - Content Script harus di-build sebagai IIFE (bukan ES module) agar bisa diinjeksi ke halaman web. Mungkin perlu konfigurasi tambahan di `rollupOptions.output.format`.

---

### 0.4 Figma Plugin — Inisialisasi Proyek

- [ ] **Inisialisasi proyek npm di `figma-plugin/`**
  - *Sub-tasks:*
    - Jalankan `npm init -y` di dalam folder `figma-plugin/`.
    - Edit `package.json`: set `"name"` ke `"codetoframe-figma-plugin"`, `"version"` ke `"1.0.0"`, `"private"` ke `true`.
    - Tambahkan field `"scripts"`:
      ```json
      {
        "dev": "tsc --watch",
        "build": "tsc",
        "typecheck": "tsc --noEmit"
      }
      ```
    - **Catatan:** Figma plugin tidak perlu Vite — cukup compile TypeScript langsung ke JavaScript. UI-nya (HTML/CSS) tidak perlu di-build.
  - *Definition of Done (DoD):*
    - File `figma-plugin/package.json` ada dan valid.

---

- [ ] **Install dependencies untuk Figma Plugin**
  - *Sub-tasks:*
    - Install dev dependencies:
      ```bash
      cd figma-plugin
      npm install --save-dev typescript @figma/plugin-typings
      ```
    - `@figma/plugin-typings` menyediakan type definitions untuk Figma Plugin API (`figma.*`, `SceneNode`, dll.).
  - *Definition of Done (DoD):*
    - `npx tsc --version` menampilkan versi TypeScript yang valid.
    - IntelliSense di editor bisa mengenali `figma.createRectangle()` dan API Figma lainnya.
  - *Edge Cases to Handle:*
    - **JANGAN** install `@figma/plugin-typings` sebagai `dependencies` biasa (harus `devDependencies`). Figma plugin sandbox tidak bisa mengakses `node_modules` saat runtime.

---

- [ ] **Buat `tsconfig.json` untuk Figma Plugin**
  - *Sub-tasks:*
    - Buat file `figma-plugin/tsconfig.json`:
      ```json
      {
        "compilerOptions": {
          "target": "ES2020",
          "module": "None",
          "strict": true,
          "noUnusedLocals": true,
          "noUnusedParameters": true,
          "noFallthroughCasesInSwitch": true,
          "skipLibCheck": true,
          "forceConsistentCasingInFileNames": true,
          "outDir": "./dist",
          "rootDir": "./src",
          "typeRoots": ["./node_modules/@figma"]
        },
        "include": ["src/**/*.ts"],
        "exclude": ["node_modules", "dist"]
      }
      ```
    - **Catatan tentang `"module": "None"`:** Plugin Figma berjalan di sandbox yang **tidak mendukung ES modules**. Semua kode harus di-compile menjadi satu file tanpa `import`/`export` runtime (atau gunakan bundler jika dibutuhkan). Alternatif: gunakan `"module": "CommonJS"` lalu bundle dengan esbuild/rollup.
  - *Definition of Done (DoD):*
    - `npx tsc --noEmit` berjalan tanpa error.
  - *Edge Cases to Handle:*
    - Jika ada error `Cannot find name 'figma'`, pastikan `typeRoots` atau `types` mengarah ke `@figma/plugin-typings` dengan benar. Coba tambahkan reference directive di file `.ts`: `/// <reference types="@figma/plugin-typings" />`

---

- [ ] **Buat `manifest.json` untuk Figma Plugin**
  - *Sub-tasks:*
    - Buat file `figma-plugin/manifest.json`:
      ```json
      {
        "name": "CodeToFrame",
        "id": "000000000000000000",
        "api": "1.0.0",
        "main": "dist/plugin/controller.js",
        "ui": "src/ui/ui.html",
        "editorType": ["figma"]
      }
      ```
    - **Catatan:** Field `"id"` akan diisi dengan ID asli saat plugin didaftarkan di Figma. Untuk development, gunakan placeholder.
    - Field `"main"` mengarah ke file JavaScript hasil compile dari `controller.ts`.
    - Field `"ui"` mengarah langsung ke file HTML (tidak perlu di-compile).
  - *Definition of Done (DoD):*
    - File `manifest.json` valid dan bisa di-parse JSON tanpa error.
    - Path `"main"` dan `"ui"` sesuai dengan lokasi file yang akan dibuat.
  - *Edge Cases to Handle:*
    - Figma Desktop akan membaca `manifest.json` dari root folder plugin — pastikan file ini **TIDAK** di dalam `src/` atau `dist/`.

---

### 0.5 Browser Extension — Manifest V3

- [ ] **Buat `manifest.json` untuk Chrome Extension (Manifest V3)**
  - *Sub-tasks:*
    - Buat file `browser-extension/public/manifest.json`:
      ```json
      {
        "manifest_version": 3,
        "name": "CodeToFrame",
        "version": "1.0.0",
        "description": "Extract web page elements into editable Figma designs.",
        "permissions": ["activeTab", "scripting"],
        "action": {
          "default_popup": "popup.html",
          "default_icon": {
            "16": "icons/icon-16.png",
            "48": "icons/icon-48.png",
            "128": "icons/icon-128.png"
          }
        },
        "icons": {
          "16": "icons/icon-16.png",
          "48": "icons/icon-48.png",
          "128": "icons/icon-128.png"
        },
        "background": {
          "service_worker": "service-worker.js",
          "type": "module"
        }
      }
      ```
    - **Permission yang dipakai:**
      - `activeTab` → Mengizinkan ekstensi mengakses tab yang sedang aktif saat pengguna klik ikon ekstensi.
      - `scripting` → Mengizinkan ekstensi meng-inject content script ke halaman web secara programatis.
    - **JANGAN** pakai permission yang tidak perlu (misalnya `tabs`, `<all_urls>`, `storage`) untuk menjaga prinsip *least privilege*.
  - *Definition of Done (DoD):*
    - File `manifest.json` valid (bisa di-parse JSON).
    - `manifest_version` bernilai `3` (bukan `2`).
    - Tidak ada permission berlebihan.
  - *Edge Cases to Handle:*
    - Jika content script perlu dijalankan **otomatis** di setiap halaman (tanpa klik pengguna), tambahkan field `"content_scripts"` di manifest. Untuk MVP, kita gunakan injection programatis via `chrome.scripting.executeScript` — lebih aman dan lebih terkontrol.

---

### 0.6 Placeholder Icons

- [ ] **Buat placeholder icons untuk ekstensi**
  - *Sub-tasks:*
    - Buat folder `browser-extension/public/icons/`.
    - Buat 3 file placeholder icon berformat PNG:
      - `icon-16.png` (16×16 px)
      - `icon-48.png` (48×48 px)
      - `icon-128.png` (128×128 px)
    - Untuk MVP, gunakan gambar sederhana (kotak berwarna dengan huruf "C" atau logo placeholder). Bisa dibuat pakai tool online seperti [favicon.io](https://favicon.io/) atau generator placeholder.
  - *Definition of Done (DoD):*
    - Ketiga file icon ada di `browser-extension/public/icons/`.
    - Ukurannya sesuai (16px, 48px, 128px).
    - Chrome tidak menampilkan error "Missing icon" saat ekstensi di-load.
  - *Edge Cases to Handle:*
    - Chrome kadang tidak menampilkan icon jika file corrupt atau bukan PNG yang valid. Pastikan file benar-benar berformat PNG (bukan JPEG yang di-rename).

---

### 0.7 Linter & Formatter (Opsional tapi Disarankan)

- [ ] **Setup ESLint untuk kedua proyek**
  - *Sub-tasks:*
    - Install ESLint di masing-masing sub-proyek:
      ```bash
      cd browser-extension && npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
      cd figma-plugin && npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
      ```
    - Buat file konfigurasi `eslint.config.js` (flat config ESLint v9+) atau `.eslintrc.json` di masing-masing folder.
    - Atur rule minimal:
      - `no-unused-vars: "error"`
      - `@typescript-eslint/no-explicit-any: "error"` (sesuai aturan di AGENTS.md: dilarang pakai `any`)
      - `no-console: "off"` (kita butuh console.log dengan prefix `[CodeToFrame]`)
    - Tambahkan script `"lint": "eslint src/"` ke `package.json` masing-masing proyek.
  - *Definition of Done (DoD):*
    - `npm run lint` berjalan di kedua proyek tanpa error konfigurasi.
  - *Edge Cases to Handle:*
    - ESLint v9 menggunakan flat config (`eslint.config.js`), sedangkan versi sebelumnya pakai `.eslintrc.*`. Pastikan versi yang diinstall konsisten dengan format konfigurasi.

---

- [ ] **Setup Prettier untuk kedua proyek**
  - *Sub-tasks:*
    - Install Prettier:
      ```bash
      cd browser-extension && npm install --save-dev prettier
      cd figma-plugin && npm install --save-dev prettier
      ```
    - Buat file `.prettierrc` di **root repositori** (satu untuk kedua proyek):
      ```json
      {
        "semi": true,
        "singleQuote": true,
        "trailingComma": "all",
        "printWidth": 100,
        "tabWidth": 2
      }
      ```
    - Tambahkan script `"format": "prettier --write src/"` ke `package.json` masing-masing proyek.
  - *Definition of Done (DoD):*
    - `npm run format` memformat semua file `.ts`, `.html`, `.css` di folder `src/`.
    - Tidak ada konflik antara aturan ESLint dan Prettier (jika ada, install `eslint-config-prettier`).

---

### ✅ Checkpoint Phase 0

Sebelum lanjut ke Phase 1, pastikan semua kondisi berikut terpenuhi:

| # | Cek | Status |
|:---:|---|:---:|
| 1 | Folder `browser-extension/`, `figma-plugin/`, `shared/` ada di root | [ ] |
| 2 | `.gitignore` sudah mengecualikan `node_modules/` dan `dist/` | [ ] |
| 3 | `npm install` berhasil di kedua sub-proyek | [ ] |
| 4 | `npx tsc --version` berhasil di kedua sub-proyek | [ ] |
| 5 | `browser-extension/public/manifest.json` valid (Manifest V3) | [ ] |
| 6 | `figma-plugin/manifest.json` valid | [ ] |
| 7 | `tsconfig.json` ada dan `strict: true` di kedua sub-proyek | [ ] |
| 8 | `vite.config.ts` ada di `browser-extension/` | [ ] |
| 9 | Placeholder icons ada di `browser-extension/public/icons/` | [ ] |
| 10 | Commit semua setup ke Git | [ ] |

---

## Phase 1 — Shared Data Contracts (JSON Schema)

> **Tujuan:** Mendefinisikan "kontrak data" antara Browser Extension dan Figma Plugin. Ini adalah fondasi yang menentukan bentuk JSON yang akan diproduksi dan dikonsumsi.  
> **Estimasi:** 0.5 hari kerja  
> **Prasyarat:** Phase 0 selesai.

---

### 1.1 Definisi Interface Utama

- [ ] **Buat file `schema.ts` di kedua proyek**
  - *Sub-tasks:*
    - Buat file `browser-extension/src/types/schema.ts`.
    - Buat file `figma-plugin/src/types/schema.ts`.
    - Kedua file **HARUS identik** — copy-paste satu ke yang lain.
    - Definisikan interface berikut:

      **`RGBColor`** — Representasi warna:
      ```typescript
      /** Representasi warna RGB dengan nilai 0–255 per channel. */
      export interface RGBColor {
        /** Nilai merah (Red), rentang 0–255. */
        r: number;
        /** Nilai hijau (Green), rentang 0–255. */
        g: number;
        /** Nilai biru (Blue), rentang 0–255. */
        b: number;
      }
      ```

      **`RectangleElement`** — Elemen kotak:
      ```typescript
      /** Elemen visual berupa kotak/area (div, section, button, dsb.). */
      export interface RectangleElement {
        type: "RECTANGLE";
        /** Posisi horizontal dari kiri viewport (pixel). */
        x: number;
        /** Posisi vertikal dari atas viewport (pixel). */
        y: number;
        /** Lebar elemen (pixel). */
        width: number;
        /** Tinggi elemen (pixel). */
        height: number;
        /** Warna latar belakang elemen. */
        backgroundColor: RGBColor;
      }
      ```

      **`TextElement`** — Elemen teks:
      ```typescript
      /** Elemen berupa teks (p, h1, span, dsb.). */
      export interface TextElement {
        type: "TEXT";
        x: number;
        y: number;
        width: number;
        height: number;
        /** Isi teks yang ditampilkan. */
        textContent: string;
        /** Ukuran huruf dalam pixel. */
        fontSize: number;
        /** Warna teks. */
        textColor: RGBColor;
      }
      ```

      **`FrameElement`** — Union type:
      ```typescript
      /** Gabungan semua tipe elemen yang didukung. */
      export type FrameElement = RectangleElement | TextElement;
      ```

      **`CodeToFrameData`** — Struktur data utama:
      ```typescript
      /** Struktur data utama yang menjadi kontrak antara Extension dan Plugin. */
      export interface CodeToFrameData {
        /** URL halaman web sumber. */
        sourceUrl: string;
        /** Lebar viewport browser saat ekstraksi (pixel). */
        viewportWidth: number;
        /** Tinggi viewport browser saat ekstraksi (pixel). */
        viewportHeight: number;
        /** Daftar elemen yang berhasil diekstrak. */
        elements: FrameElement[];
      }
      ```

  - *Definition of Done (DoD):*
    - File `schema.ts` ada di `browser-extension/src/types/` dan `figma-plugin/src/types/`.
    - Kedua file isinya identik (100% sama).
    - `npx tsc --noEmit` tidak menampilkan error di kedua proyek.
    - Semua interface dan field memiliki JSDoc comment.
  - *Edge Cases to Handle:*
    - Pastikan `type` pada `RectangleElement` dan `TextElement` adalah **string literal** (`"RECTANGLE"`, `"TEXT"`), bukan `string` biasa. Ini penting agar TypeScript bisa melakukan *discriminated union* saat melakukan `switch/case` berdasarkan `type`.

---

### 1.2 Type Guard / Validation Functions

- [ ] **Buat fungsi validasi untuk memastikan JSON yang di-paste pengguna sesuai kontrak**
  - *Sub-tasks:*
    - Buat fungsi `isValidRGBColor(value: unknown): value is RGBColor` di `schema.ts` (atau file terpisah `validators.ts`):
      ```typescript
      export function isValidRGBColor(value: unknown): value is RGBColor {
        if (typeof value !== 'object' || value === null) return false;
        const obj = value as Record<string, unknown>;
        return (
          typeof obj.r === 'number' && obj.r >= 0 && obj.r <= 255 &&
          typeof obj.g === 'number' && obj.g >= 0 && obj.g <= 255 &&
          typeof obj.b === 'number' && obj.b >= 0 && obj.b <= 255
        );
      }
      ```
    - Buat fungsi `isValidFrameElement(value: unknown): value is FrameElement`:
      - Cek `type` apakah `"RECTANGLE"` atau `"TEXT"`.
      - Cek semua field wajib ada dan bertipe benar.
      - Cek semua field numerik bernilai positif (x, y, width, height >= 0).
    - Buat fungsi `isValidCodeToFrameData(value: unknown): value is CodeToFrameData`:
      - Cek `sourceUrl` adalah string.
      - Cek `viewportWidth` dan `viewportHeight` adalah number positif.
      - Cek `elements` adalah array, dan setiap elemennya valid (gunakan `isValidFrameElement`).
    - Buat fungsi ini **hanya** di `figma-plugin/src/types/` (karena validasi dilakukan saat menerima JSON di plugin, bukan saat mengekstrak di extension).
  - *Definition of Done (DoD):*
    - Fungsi validasi bisa mendeteksi JSON yang tidak sesuai kontrak dan mengembalikan `false`.
    - Fungsi validasi bisa meloloskan JSON yang sesuai kontrak dan mengembalikan `true` dengan type narrowing yang benar.
    - `npx tsc --noEmit` tidak menampilkan error.
  - *Edge Cases to Handle:*
    - JSON yang `elements`-nya array kosong (`[]`) → **valid** (halaman tidak punya elemen yang bisa diekstrak).
    - JSON yang `elements`-nya bukan array (misalnya `null`, `"string"`, `123`) → **invalid**.
    - Elemen dengan `width: 0` atau `height: 0` → **valid** secara struktur, tapi bisa di-skip saat render.
    - Field `textContent` berisi string kosong (`""`) → **valid** (mungkin elemen teks yang content-nya whitespace).
    - Nilai `fontSize` = 0 atau negatif → **invalid**, tangani dengan pesan error yang jelas.

---

### ✅ Checkpoint Phase 1

| # | Cek | Status |
|:---:|---|:---:|
| 1 | `schema.ts` ada di kedua proyek dan isinya identik | [ ] |
| 2 | Semua interface punya JSDoc comment | [ ] |
| 3 | Type guards/validators ada di figma-plugin | [ ] |
| 4 | `npx tsc --noEmit` lolos di kedua proyek | [ ] |
| 5 | Commit ke Git dengan pesan: `feat: add shared data contracts (JSON schema)` | [ ] |

---

## Phase 2 — Chrome Extension Core (DOM Extraction Engine)

> **Tujuan:** Membangun mesin utama yang bisa membaca elemen-elemen DOM dari halaman web dan mengubahnya menjadi format JSON sesuai kontrak data.  
> **Estimasi:** 2–3 hari kerja  
> **Prasyarat:** Phase 1 selesai (interface di `schema.ts` sudah final).

---

### 2.1 Buat Kerangka File Content Script

- [ ] **Buat file `extractor.ts` di `browser-extension/src/content/`**
  - *Sub-tasks:*
    - Buat folder `browser-extension/src/content/` jika belum ada.
    - Buat file `browser-extension/src/content/extractor.ts`.
    - Import interface dari `../types/schema.ts`.
    - Buat fungsi utama `extractElements(): CodeToFrameData` sebagai kerangka kosong (return data dummy dulu).
    - Tambahkan log `console.log("[CodeToFrame] Content script loaded.");` di awal file untuk memastikan script ter-inject.
  - *Definition of Done (DoD):*
    - File ada dan bisa di-compile tanpa error.
    - Fungsi `extractElements()` mengembalikan objek `CodeToFrameData` yang valid (walau masih dummy).
  - *Edge Cases to Handle:*
    - Content script di-load **setiap kali** halaman dibuka atau tab di-refresh. Pastikan tidak ada efek samping dari load berulang (no global state mutation).

---

### 2.2 Logika Penelusuran DOM (DOM Traversal)

- [ ] **Implementasi traversal untuk mengumpulkan semua elemen DOM yang terlihat**
  - *Sub-tasks:*
    - Gunakan `document.body.querySelectorAll('*')` untuk mendapatkan semua elemen di halaman.
    - Untuk setiap elemen, panggil `window.getComputedStyle(element)` untuk membaca properti CSS-nya.
    - **Filter elemen yang TIDAK terlihat:**
      - Skip jika `computedStyle.display === 'none'`.
      - Skip jika `computedStyle.visibility === 'hidden'`.
      - Skip jika `computedStyle.opacity === '0'`.
      - Skip jika `element.offsetWidth === 0 && element.offsetHeight === 0` (elemen tanpa dimensi).
    - **Filter elemen di luar viewport:**
      - Gunakan `element.getBoundingClientRect()`.
      - Skip jika `rect.width <= 0 || rect.height <= 0`.
      - Skip jika elemen sepenuhnya di luar viewport (opsional — bisa dimasukkan di masa depan).
    - Kumpulkan elemen-elemen yang lolos filter ke dalam array.
  - *Definition of Done (DoD):*
    - Fungsi traversal mengembalikan array elemen DOM yang terlihat.
    - Elemen tersembunyi (`display: none`, dll.) tidak masuk ke array.
    - Console log menampilkan jumlah elemen yang ditemukan: `[CodeToFrame] Found X visible elements.`
  - *Edge Cases to Handle:*
    - **`<html>` dan `<body>`:** Elemen ini punya dimensi tapi biasanya tidak perlu diekstrak sebagai "kotak visual". Pertimbangkan untuk skip tag-tag ini.
    - **`<script>`, `<style>`, `<meta>`, `<link>`, `<head>`:** Skip semua elemen non-visual ini.
    - **Elemen di dalam `<iframe>`:** JANGAN masuk ke iframe — ini di luar ruang lingkup MVP dan bisa menimbulkan error cross-origin.
    - **Halaman dengan ribuan elemen:** Pertimbangkan batasan (misalnya max 500 elemen) untuk menghindari JSON yang terlalu besar. Tampilkan warning jika melebihi batas.

---

### 2.3 Klasifikasi Elemen: Rectangle vs Text

- [ ] **Implementasi logika untuk mengklasifikasikan setiap elemen DOM menjadi RECTANGLE atau TEXT**
  - *Sub-tasks:*
    - Buat fungsi `classifyElement(element: Element, computedStyle: CSSStyleDeclaration): "RECTANGLE" | "TEXT" | null`.
    - **Logika klasifikasi TEXT:**
      - Elemen dianggap TEXT jika memiliki **direct text content** (teks yang langsung ada di node tersebut, bukan di child node).
      - Cara mengecek: iterasi `element.childNodes`, cari node bertipe `Node.TEXT_NODE` yang `textContent.trim()` tidak kosong.
      - Jika elemen punya text content **DAN** juga punya child elements, ekstrak text-nya saja (bukan child elements — kita menghindari duplikasi).
    - **Logika klasifikasi RECTANGLE:**
      - Elemen dianggap RECTANGLE jika punya `backgroundColor` yang terlihat (bukan `transparent` dan bukan `rgba(0,0,0,0)`).
      - ATAU jika elemen punya dimensi yang terlihat (width > 0, height > 0) dan `background-color` yang bukan transparent.
    - **Elemen yang bisa jadi KEDUANYA:**
      - Beberapa elemen (misalnya `<button>`) bisa punya background color DAN text content.
      - Strategi MVP: buat **dua** entry — satu RECTANGLE (untuk background) dan satu TEXT (untuk teks di dalamnya).
    - **Elemen yang TIDAK masuk keduanya → skip:**
      - Elemen tanpa background visible DAN tanpa text content langsung → skip.
      - Tag `<img>`, `<svg>`, `<canvas>`, `<video>`, `<audio>` → skip (out of scope).
  - *Definition of Done (DoD):*
    - Fungsi `classifyElement` mengembalikan `"RECTANGLE"`, `"TEXT"`, atau `null` sesuai logika di atas.
    - Elemen yang punya background + text menghasilkan dua entry di output.
    - Tag-tag out-of-scope di-skip tanpa error.
  - *Edge Cases to Handle:*
    - **Background `transparent`:** Secara default, banyak elemen punya `background-color: rgba(0, 0, 0, 0)` (transparent). Ini harus di-skip sebagai RECTANGLE.
    - **Inherited background:** `getComputedStyle` mengembalikan warna background yang sudah di-resolve — jadi warna yang terlihat "putih" karena parent bisa saja `rgba(0,0,0,0)` di elemen itu sendiri. Hanya ambil jika warna eksplisit non-transparent.
    - **Text node yang hanya whitespace:** `"   \n  "` → skip, jangan dianggap TEXT.
    - **Pseudo-elements (`::before`, `::after`):** Out of scope MVP — abaikan.

---

### 2.4 Pembacaan Bounding Box & Computed Styles

- [ ] **Implementasi pembacaan posisi, dimensi, dan properti visual setiap elemen**
  - *Sub-tasks:*
    - Buat fungsi `extractRectangleData(element: Element): RectangleElement | null`:
      ```typescript
      function extractRectangleData(element: Element): RectangleElement | null {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        const bgColor = parseColor(style.backgroundColor);

        // Skip jika background transparent
        if (!bgColor) return null;

        return {
          type: "RECTANGLE",
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          backgroundColor: bgColor,
        };
      }
      ```
    - Buat fungsi `extractTextData(element: Element): TextElement | null`:
      ```typescript
      function extractTextData(element: Element): TextElement | null {
        const directText = getDirectTextContent(element);
        if (!directText || directText.trim() === '') return null;

        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        const textColor = parseColor(style.color);

        return {
          type: "TEXT",
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          textContent: directText.trim(),
          fontSize: parseFloat(style.fontSize) || 16,
          textColor: textColor || { r: 0, g: 0, b: 0 }, // default hitam
        };
      }
      ```
    - **Gunakan `Math.round()`** untuk semua nilai posisi dan dimensi — Figma bekerja dengan integer pixel, dan nilai desimal bisa menyebabkan rendering yang tidak rapi.
  - *Definition of Done (DoD):*
    - `extractRectangleData` mengembalikan `RectangleElement` yang valid atau `null`.
    - `extractTextData` mengembalikan `TextElement` yang valid atau `null`.
    - Semua nilai posisi dan dimensi sudah di-round ke integer.
  - *Edge Cases to Handle:*
    - **`getBoundingClientRect()` mengembalikan posisi relatif terhadap viewport**, bukan halaman. Jika halaman di-scroll, posisi Y akan bergeser. Untuk MVP, kita terima ini apa adanya (posisi = posisi yang terlihat saat ekstraksi). Jika butuh posisi absolut dari atas halaman, tambahkan `window.scrollY` ke `rect.y`.
    - **Elemen fixed/sticky:** Posisi mereka tidak berubah saat scroll. `getBoundingClientRect()` sudah menangani ini secara otomatis.

---

### 2.5 Parsing Warna CSS

- [ ] **Implementasi fungsi parsing warna CSS ke format `RGBColor`**
  - *Sub-tasks:*
    - Buat fungsi `parseColor(cssColor: string): RGBColor | null`:
      ```typescript
      /**
       * Parse CSS color string ke format RGBColor.
       * getComputedStyle selalu mengembalikan format rgb() atau rgba().
       * Mengembalikan null jika warna transparent.
       */
      function parseColor(cssColor: string): RGBColor | null {
        // getComputedStyle mengembalikan "rgb(R, G, B)" atau "rgba(R, G, B, A)"
        const rgbMatch = cssColor.match(
          /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/
        );

        if (!rgbMatch) return null;

        const r = parseInt(rgbMatch[1], 10);
        const g = parseInt(rgbMatch[2], 10);
        const b = parseInt(rgbMatch[3], 10);
        const a = rgbMatch[4] !== undefined ? parseFloat(rgbMatch[4]) : 1;

        // Jika alpha = 0, warna sepenuhnya transparan → skip
        if (a === 0) return null;

        return { r, g, b };
      }
      ```
    - **Catatan penting:** `window.getComputedStyle()` selalu mengembalikan warna dalam format `rgb()` atau `rgba()`, terlepas dari bagaimana warna itu ditulis di CSS (hex, hsl, named color, dll.). Jadi kita hanya perlu menangani dua format ini.
  - *Definition of Done (DoD):*
    - `parseColor("rgb(59, 130, 246)")` → `{ r: 59, g: 130, b: 246 }`.
    - `parseColor("rgba(0, 0, 0, 0)")` → `null` (transparent).
    - `parseColor("rgba(255, 0, 0, 0.5)")` → `{ r: 255, g: 0, b: 0 }` (alpha diabaikan di MVP, warna tetap diambil).
    - `parseColor("transparent")` → `null`.
  - *Edge Cases to Handle:*
    - **`"transparent"` sebagai string literal:** Beberapa browser mengembalikan `"transparent"` alih-alih `"rgba(0, 0, 0, 0)"` — regex di atas tidak akan match, sehingga mengembalikan `null`. Ini sudah benar.
    - **Spasi antar nilai:** Beberapa browser menambahkan atau menghilangkan spasi. Regex harus toleran terhadap variasi spasi (gunakan `\s*`).

---

### 2.6 Fungsi Helper: Get Direct Text Content

- [ ] **Implementasi fungsi untuk mengambil teks langsung dari elemen (bukan dari child elements)**
  - *Sub-tasks:*
    - Buat fungsi `getDirectTextContent(element: Element): string`:
      ```typescript
      /**
       * Mengambil teks yang langsung dimiliki elemen, BUKAN teks dari child elements.
       * Contoh: <div>Hello <span>World</span></div>
       * getDirectTextContent(div) → "Hello " (tanpa "World" yang ada di span)
       */
      function getDirectTextContent(element: Element): string {
        let text = '';
        for (const node of element.childNodes) {
          if (node.nodeType === Node.TEXT_NODE) {
            text += node.textContent || '';
          }
        }
        return text.trim();
      }
      ```
    - **Kenapa bukan `element.textContent` biasa?** Karena `textContent` mengembalikan SEMUA teks termasuk teks di dalam child elements. Ini akan menyebabkan duplikasi — teks yang sama muncul di parent DAN di child.
  - *Definition of Done (DoD):*
    - Fungsi mengembalikan hanya teks langsung (direct text nodes).
    - Teks dari child elements tidak termasuk.
    - Whitespace di awal/akhir sudah di-trim.
  - *Edge Cases to Handle:*
    - **Elemen tanpa text node:** Mengembalikan `""` (string kosong).
    - **Multiple text nodes:** Contoh `<p>Hello <em>World</em> Foo</p>` → `getDirectTextContent(p)` = `"Hello  Foo"`.
    - **Elemen dengan entity HTML:** `&amp;` sudah di-decode oleh browser menjadi `&` di `textContent`.

---

### 2.7 Fungsi Utama: Merangkai Semuanya

- [ ] **Implementasi fungsi utama `extractElements()` yang menggabungkan semua logika**
  - *Sub-tasks:*
    - Di `extractor.ts`, implementasikan fungsi utama:
      ```typescript
      /**
       * Fungsi utama: mengekstrak semua elemen yang terlihat dari halaman web
       * dan mengubahnya menjadi format CodeToFrameData.
       */
      function extractElements(): CodeToFrameData {
        console.log("[CodeToFrame] Starting extraction...");
        const elements: FrameElement[] = [];
        const allDomElements = document.body.querySelectorAll('*');

        // Daftar tag yang harus di-skip
        const SKIP_TAGS = new Set([
          'SCRIPT', 'STYLE', 'META', 'LINK', 'HEAD', 'NOSCRIPT',
          'IMG', 'SVG', 'CANVAS', 'VIDEO', 'AUDIO', 'IFRAME',
          'BR', 'HR',
        ]);

        for (const el of allDomElements) {
          // Skip tag yang tidak didukung
          if (SKIP_TAGS.has(el.tagName)) continue;

          // Skip elemen yang tidak terlihat
          if (!isElementVisible(el)) continue;

          // Coba ekstrak sebagai RECTANGLE
          const rectData = extractRectangleData(el);
          if (rectData) elements.push(rectData);

          // Coba ekstrak sebagai TEXT
          const textData = extractTextData(el);
          if (textData) elements.push(textData);
        }

        console.log(`[CodeToFrame] Extraction complete: ${elements.length} elements found.`);

        return {
          sourceUrl: window.location.href,
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          elements,
        };
      }
      ```
    - Buat fungsi helper `isElementVisible(element: Element): boolean` yang mengecek `display`, `visibility`, `opacity`, dan dimensi.
  - *Definition of Done (DoD):*
    - `extractElements()` mengembalikan objek `CodeToFrameData` yang valid.
    - Elemen tersembunyi dan tag out-of-scope di-skip.
    - Console log menampilkan jumlah elemen yang berhasil diekstrak.
    - `npx tsc --noEmit` tidak menampilkan error.
  - *Edge Cases to Handle:*
    - **Halaman kosong (blank page):** `elements` akan berisi array kosong `[]` — ini valid.
    - **Halaman sangat besar (ribuan elemen):** Pertimbangkan menambahkan konstanta `MAX_ELEMENTS = 500` dan menghentikan loop jika sudah tercapai. Tampilkan warning di console.

---

### 2.8 Message Listener untuk Komunikasi dengan Popup

- [ ] **Tambahkan message listener di content script agar bisa menerima perintah dari popup**
  - *Sub-tasks:*
    - Di `extractor.ts`, tambahkan listener:
      ```typescript
      chrome.runtime.onMessage.addListener(
        (message, _sender, sendResponse) => {
          if (message.type === 'EXTRACT_DOM') {
            console.log("[CodeToFrame] Received extraction request from popup.");
            const data = extractElements();
            sendResponse({ success: true, data });
          }
          // Return true jika sendResponse akan dipanggil secara asinkron
          // Untuk MVP, extraction synchronous jadi tidak perlu return true
        }
      );
      ```
    - **Catatan:** `sendResponse` adalah callback untuk mengirim jawaban kembali ke popup. Ini adalah pola **request-response** di Chrome Extension messaging.
  - *Definition of Done (DoD):*
    - Content script merespon pesan bertipe `EXTRACT_DOM` dengan mengembalikan `CodeToFrameData`.
    - Pesan selain `EXTRACT_DOM` diabaikan tanpa error.
  - *Edge Cases to Handle:*
    - Jika extraction gagal (misalnya halaman belum fully loaded), catch error dan kirim `{ success: false, error: "..." }`.
    - Jika `sendResponse` tidak dipanggil, Chrome akan menampilkan warning di console — pastikan selalu ada response.

---

### ✅ Checkpoint Phase 2

| # | Cek | Status |
|:---:|---|:---:|
| 1 | `extractor.ts` ada dan bisa di-compile | [ ] |
| 2 | Fungsi `extractElements()` mengembalikan `CodeToFrameData` yang valid | [ ] |
| 3 | Elemen tidak terlihat (`display: none`, dll.) di-skip | [ ] |
| 4 | Tag out-of-scope (`img`, `svg`, dll.) di-skip tanpa error | [ ] |
| 5 | Warna CSS di-parse dengan benar (rgb/rgba) | [ ] |
| 6 | Direct text content diambil tanpa duplikasi dari child | [ ] |
| 7 | Message listener untuk `EXTRACT_DOM` berfungsi | [ ] |
| 8 | `npx tsc --noEmit` lolos | [ ] |
| 9 | Commit ke Git | [ ] |

---

## Phase 3 — Chrome Extension UI & Data Export

> **Tujuan:** Membangun antarmuka popup ekstensi yang memungkinkan pengguna memicu ekstraksi dan menyalin hasilnya ke clipboard.  
> **Estimasi:** 1 hari kerja  
> **Prasyarat:** Phase 2 selesai (content script sudah bisa mengekstrak data).

---

### 3.1 Popup HTML

- [ ] **Buat file `popup.html` di `browser-extension/src/popup/`**
  - *Sub-tasks:*
    - Buat folder `browser-extension/src/popup/` jika belum ada.
    - Buat file `popup.html` dengan struktur berikut:
      - Judul/header: "CodeToFrame".
      - Tombol **"Extract DOM"** — memicu proses ekstraksi.
      - Area status (elemen `<p>` atau `<div>`) — menampilkan pesan seperti "Ready", "Extracting...", "Done! X elements found.", "Error: ...".
      - Tombol **"Copy JSON"** — menyalin hasil JSON ke clipboard. Tombol ini disabled secara default, aktif setelah ekstraksi berhasil.
      - (Opsional) Area preview — `<textarea readonly>` untuk menampilkan JSON hasil ekstraksi.
    - Sertakan link ke `popup.css` dan `popup.ts` (sebagai module script).
    - Pastikan setiap elemen interaktif memiliki `id` yang unik dan deskriptif (untuk testing dan aksesibilitas).
  - *Definition of Done (DoD):*
    - File `popup.html` ada dan menampilkan UI yang fungsional.
    - Ada tombol "Extract DOM" dan "Copy JSON".
    - Ada area status yang bisa menampilkan pesan.
  - *Edge Cases to Handle:*
    - Lebar popup Chrome terbatas (~400px). Pastikan layout tidak overflow.

---

### 3.2 Popup CSS

- [ ] **Buat file `popup.css` untuk styling popup**
  - *Sub-tasks:*
    - Buat file `browser-extension/src/popup/popup.css`.
    - Set lebar popup: `body { width: 360px; }` (standar untuk popup Chrome Extension).
    - Beri padding yang cukup agar konten tidak menempel ke tepi.
    - Style tombol "Extract DOM" agar menonjol (primary button style).
    - Style tombol "Copy JSON" dengan warna berbeda (secondary button style).
    - Style area status: font size lebih kecil, warna berbeda untuk success vs error.
    - Style textarea preview (jika ada): font monospace, readonly, background abu-abu muda.
    - Tambahkan state visual:
      - Tombol disabled: opacity berkurang, cursor `not-allowed`.
      - Tombol loading: teks berubah atau ada indikator spinner sederhana.
  - *Definition of Done (DoD):*
    - Popup terlihat rapi dan profesional di Chrome.
    - Semua state visual (disabled, loading, success, error) tertangani.

---

### 3.3 Popup Logic (TypeScript)

- [ ] **Buat file `popup.ts` untuk logika popup**
  - *Sub-tasks:*
    - Buat file `browser-extension/src/popup/popup.ts`.
    - **Logika tombol "Extract DOM":**
      1. Saat diklik, ubah status menjadi "Extracting...".
      2. Disable tombol "Extract DOM" selama proses berjalan.
      3. Gunakan `chrome.scripting.executeScript()` untuk menjalankan content script di tab aktif:
         ```typescript
         const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
         if (!tab?.id) {
           showStatus('Error: No active tab found.', 'error');
           return;
         }

         // Inject content script dan langsung jalankan extraction
         const results = await chrome.scripting.executeScript({
           target: { tabId: tab.id },
           files: ['content.js'],
         });
         ```
         **Atau** kirim pesan ke content script yang sudah ter-inject:
         ```typescript
         const response = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_DOM' });
         ```
      4. Terima response berisi `CodeToFrameData`.
      5. Tampilkan JSON di textarea (jika ada) dengan `JSON.stringify(data, null, 2)`.
      6. Ubah status menjadi "Done! X elements found.".
      7. Enable tombol "Copy JSON".
    - **Logika tombol "Copy JSON":**
      1. Ambil string JSON dari variabel/textarea.
      2. Salin ke clipboard:
         ```typescript
         await navigator.clipboard.writeText(jsonString);
         ```
      3. Ubah teks tombol sementara menjadi "Copied!" selama 2 detik, lalu kembali ke "Copy JSON".
    - **Fungsi helper `showStatus(message: string, type: 'info' | 'success' | 'error')`:**
      - Mengubah teks dan warna area status sesuai tipe pesan.
  - *Definition of Done (DoD):*
    - Klik "Extract DOM" → content script berjalan → JSON ditampilkan di popup.
    - Klik "Copy JSON" → JSON tersalin ke clipboard.
    - Status pesan berubah sesuai tahapan proses.
    - Error ditangani dan ditampilkan ke pengguna.
  - *Edge Cases to Handle:*
    - **Tab bukan halaman web** (misalnya `chrome://extensions`, `chrome://newtab`): Chrome melarang inject script ke halaman internal. Tampilkan error: "Cannot extract from Chrome internal pages."
    - **Halaman `file://`:** Secara default, ekstensi tidak punya akses ke URL `file://`. Tampilkan pesan yang jelas.
    - **Permission denied:** Jika `chrome.scripting.executeScript` gagal karena permission, tangkap error dan tampilkan pesan.
    - **Popup ditutup sebelum response diterima:** Ini bisa terjadi jika pengguna klik di luar popup. Response akan hilang — ini adalah limitasi Chrome Extension popup. Tidak perlu ditangani di MVP.

---

### 3.4 Service Worker (Background Script)

- [ ] **Buat file `service-worker.ts` di `browser-extension/src/background/`**
  - *Sub-tasks:*
    - Buat folder `browser-extension/src/background/` jika belum ada.
    - Buat file `service-worker.ts` dengan konten minimal:
      ```typescript
      // Service Worker untuk CodeToFrame Chrome Extension
      // Di MVP, service worker digunakan minimal — hanya sebagai placeholder
      // agar manifest.json tidak error.
      console.log("[CodeToFrame] Service worker registered.");

      // Listener untuk instalasi ekstensi
      chrome.runtime.onInstalled.addListener((details) => {
        console.log("[CodeToFrame] Extension installed:", details.reason);
      });
      ```
    - **Catatan:** Di MVP, sebagian besar logika ada di popup.ts dan extractor.ts. Service worker mungkin tidak banyak dipakai — tapi file ini harus ada karena sudah didaftarkan di `manifest.json`.
  - *Definition of Done (DoD):*
    - File ada dan bisa di-compile.
    - Chrome tidak menampilkan error "Service Worker registration failed".
  - *Edge Cases to Handle:*
    - Service Worker di Manifest V3 bisa "mati" kapan saja (lifecycle pendek). **JANGAN** simpan data di variabel global — data akan hilang saat Service Worker di-restart.

---

### 3.5 Build & Load Extension di Chrome

- [ ] **Verifikasi build dan load ekstensi ke Chrome**
  - *Sub-tasks:*
    - Jalankan `npm run build` di `browser-extension/`.
    - Periksa folder `dist/` — pastikan berisi:
      - `manifest.json` (dari `public/`)
      - `icons/` (dari `public/`)
      - `popup.html` dan `popup.js`
      - `content.js` (dari `extractor.ts`)
      - `service-worker.js`
    - Buka Chrome → `chrome://extensions/` → Enable Developer Mode.
    - Klik "Load unpacked" → pilih folder `browser-extension/dist/`.
    - Pastikan ekstensi muncul di toolbar Chrome tanpa error.
    - Klik ikon ekstensi → popup muncul.
    - Buka halaman web sederhana → klik "Extract DOM" → JSON muncul di popup.
    - Klik "Copy JSON" → paste di text editor → JSON valid.
  - *Definition of Done (DoD):*
    - Ekstensi bisa di-load di Chrome tanpa error.
    - Alur Extract → Copy berfungsi end-to-end.
  - *Edge Cases to Handle:*
    - Jika `manifest.json` di `dist/` tidak ter-copy, periksa konfigurasi `publicDir` di `vite.config.ts`.
    - Jika content script tidak berjalan, periksa apakah path di manifest sesuai dengan nama file output.

---

### ✅ Checkpoint Phase 3

| # | Cek | Status |
|:---:|---|:---:|
| 1 | `popup.html`, `popup.ts`, `popup.css` ada dan fungsional | [ ] |
| 2 | Tombol "Extract DOM" memicu content script | [ ] |
| 3 | JSON hasil ekstraksi ditampilkan di popup | [ ] |
| 4 | Tombol "Copy JSON" menyalin ke clipboard | [ ] |
| 5 | Status pesan (info/success/error) berfungsi | [ ] |
| 6 | `service-worker.ts` ada dan ter-register | [ ] |
| 7 | Build berhasil dan ekstensi bisa di-load di Chrome | [ ] |
| 8 | Alur extract-copy berfungsi end-to-end di Chrome | [ ] |
| 9 | Commit ke Git | [ ] |

---

## Phase 4 — Figma Plugin Core (Rendering Engine)

> **Tujuan:** Membangun mesin yang bisa membaca data JSON dan menggambar ulang elemen-elemennya di kanvas Figma.  
> **Estimasi:** 2–3 hari kerja  
> **Prasyarat:** Phase 1 selesai (interface di `schema.ts` sudah final).

---

### 4.1 Controller — Entry Point Plugin

- [ ] **Buat file `controller.ts` di `figma-plugin/src/plugin/`**
  - *Sub-tasks:*
    - Buat folder `figma-plugin/src/plugin/` jika belum ada.
    - Buat file `controller.ts` sebagai entry point plugin:
      ```typescript
      // Entry point plugin Figma — file ini dijalankan di sandbox Figma.
      // Tidak ada akses ke DOM, window, atau fetch.

      // Tampilkan UI plugin
      figma.showUI(__html__, { width: 450, height: 500 });

      // Dengarkan pesan dari UI
      figma.ui.onmessage = async (message: { type: string; payload?: unknown }) => {
        if (message.type === 'generate') {
          console.log("[CodeToFrame] Received generate request.");
          // Panggil renderer (akan diimplementasi di langkah selanjutnya)
          // await renderElements(message.payload as CodeToFrameData);
          figma.ui.postMessage({ type: 'status', message: 'Generation complete!' });
        }

        if (message.type === 'cancel') {
          figma.closePlugin();
        }
      };
      ```
    - Import fungsi render dari `renderer.ts` (setelah `renderer.ts` dibuat).
  - *Definition of Done (DoD):*
    - File ada dan bisa di-compile.
    - Plugin menampilkan UI saat dijalankan di Figma.
    - Pesan dari UI diterima oleh controller.
  - *Edge Cases to Handle:*
    - `__html__` adalah placeholder yang disediakan oleh Figma build system — pastikan build pipeline mendukung ini (inline HTML ke bundle JS). Jika tidak, gunakan `figma.showUI(htmlString)` dengan HTML sebagai string.

---

### 4.2 Utility: Konversi Warna

- [ ] **Buat fungsi konversi warna dari format 0–255 ke format Figma 0–1**
  - *Sub-tasks:*
    - Di `renderer.ts` (atau file utility terpisah), buat fungsi:
      ```typescript
      /**
       * Mengonversi warna RGB dari rentang 0–255 (format JSON kita)
       * ke rentang 0–1 (format yang dibutuhkan Figma API).
       *
       * @param color - Objek RGBColor dengan nilai 0–255
       * @returns Objek RGB dengan nilai 0–1, siap dipakai Figma API
       */
      function toFigmaColor(color: RGBColor): RGB {
        return {
          r: color.r / 255,
          g: color.g / 255,
          b: color.b / 255,
        };
      }
      ```
  - *Definition of Done (DoD):*
    - `toFigmaColor({ r: 255, g: 128, b: 0 })` → `{ r: 1, g: ~0.502, b: 0 }`.
    - `toFigmaColor({ r: 0, g: 0, b: 0 })` → `{ r: 0, g: 0, b: 0 }`.
    - `toFigmaColor({ r: 255, g: 255, b: 255 })` → `{ r: 1, g: 1, b: 1 }`.
  - *Edge Cases to Handle:*
    - Nilai di luar rentang 0–255 (misalnya -10 atau 300): Clamp ke 0–255 sebelum membagi.

---

### 4.3 Render Rectangle

- [ ] **Implementasi fungsi `renderRectangle()` di `renderer.ts`**
  - *Sub-tasks:*
    - Buat file `figma-plugin/src/plugin/renderer.ts`.
    - Implementasi fungsi:
      ```typescript
      /**
       * Membuat Rectangle node di kanvas Figma berdasarkan data dari JSON.
       */
      function renderRectangle(element: RectangleElement): RectangleNode {
        const rect = figma.createRectangle();

        // Atur posisi
        rect.x = element.x;
        rect.y = element.y;

        // Atur dimensi (gunakan resize, bukan langsung set width/height)
        rect.resize(element.width, element.height);

        // Atur warna latar belakang
        rect.fills = [{
          type: 'SOLID',
          color: toFigmaColor(element.backgroundColor),
        }];

        // Beri nama yang deskriptif untuk mudah dikenali di panel Layers
        rect.name = `Rectangle ${element.x},${element.y}`;

        return rect;
      }
      ```
    - **Catatan penting tentang `resize()`:** Di Figma API, `node.width = x` akan error untuk beberapa tipe node. Selalu gunakan `node.resize(width, height)` yang lebih aman.
  - *Definition of Done (DoD):*
    - Fungsi membuat `RectangleNode` di kanvas Figma dengan posisi, dimensi, dan warna yang benar.
    - Node muncul di panel Layers dengan nama yang deskriptif.
  - *Edge Cases to Handle:*
    - **Dimensi 0:** `figma.createRectangle()` dengan `resize(0, 0)` bisa bermasalah. Skip elemen dengan `width <= 0` atau `height <= 0`.
    - **Posisi negatif:** Elemen yang sebagian di luar viewport bisa punya `x` atau `y` negatif. Ini valid di Figma — biarkan saja.

---

### 4.4 Render Text

- [ ] **Implementasi fungsi `renderText()` di `renderer.ts`**
  - *Sub-tasks:*
    - Implementasi fungsi **async** (karena `loadFontAsync` harus di-await):
      ```typescript
      /** Font default yang digunakan untuk semua teks di MVP. */
      const DEFAULT_FONT: FontName = { family: "Inter", style: "Regular" };

      /**
       * Membuat Text node di kanvas Figma berdasarkan data dari JSON.
       * ⚠️ HARUS async karena perlu loadFontAsync sebelum mengubah teks.
       */
      async function renderText(element: TextElement): Promise<TextNode> {
        const text = figma.createText();

        // ⚠️ WAJIB: Load font SEBELUM mengubah properti teks apapun
        await figma.loadFontAsync(DEFAULT_FONT);

        // Atur konten teks
        text.characters = element.textContent;

        // Atur ukuran font
        text.fontSize = element.fontSize;

        // Atur posisi
        text.x = element.x;
        text.y = element.y;

        // Atur dimensi
        text.resize(element.width, element.height);

        // Atur warna teks
        text.fills = [{
          type: 'SOLID',
          color: toFigmaColor(element.textColor),
        }];

        // Beri nama deskriptif (potong teks jika terlalu panjang)
        const previewText = element.textContent.substring(0, 30);
        text.name = `Text: "${previewText}"`;

        return text;
      }
      ```
    - **KRITIS — Urutan operasi:** `figma.loadFontAsync()` **HARUS** dipanggil sebelum mengubah `characters`, `fontSize`, atau properti teks lainnya. Tanpa ini, Figma akan throw error. Tidak ada pengecualian.
  - *Definition of Done (DoD):*
    - Fungsi membuat `TextNode` di kanvas Figma dengan isi teks, ukuran font, posisi, dan warna yang benar.
    - Tidak ada error "Cannot set characters on text node without loading font first".
    - Node muncul di panel Layers dengan preview teks.
  - *Edge Cases to Handle:*
    - **Font "Inter" tidak tersedia:** Figma biasanya sudah menyertakan font Inter secara default. Tapi jika tidak tersedia, `loadFontAsync` akan error. Bungkus dalam try-catch:
      ```typescript
      try {
        await figma.loadFontAsync(DEFAULT_FONT);
      } catch (err) {
        console.error("[CodeToFrame] Failed to load font Inter. Trying Roboto...", err);
        await figma.loadFontAsync({ family: "Roboto", style: "Regular" });
      }
      ```
    - **Teks kosong (`""`):** `text.characters = ""` valid di Figma, tapi menghasilkan node kosong. Pertimbangkan untuk skip elemen dengan `textContent.trim() === ""`.
    - **Teks sangat panjang:** Teks dengan ribuan karakter bisa memperlambat Figma. Untuk MVP, terima apa adanya (bisa ditambahkan limit di masa depan).
    - **Karakter khusus / Unicode:** `text.characters` mendukung Unicode secara native. Tidak perlu handling khusus.

---

### 4.5 Fungsi Utama: Render All Elements

- [ ] **Implementasi fungsi utama `renderElements()` yang memproses seluruh array elemen**
  - *Sub-tasks:*
    - Di `renderer.ts`, buat fungsi:
      ```typescript
      /**
       * Memproses seluruh array elemen dari CodeToFrameData
       * dan menggambar masing-masing di kanvas Figma.
       */
      async function renderElements(data: CodeToFrameData): Promise<void> {
        console.log(`[CodeToFrame] Starting render of ${data.elements.length} elements...`);

        let renderedCount = 0;
        let skippedCount = 0;

        for (const element of data.elements) {
          try {
            switch (element.type) {
              case "RECTANGLE":
                renderRectangle(element);
                renderedCount++;
                break;
              case "TEXT":
                await renderText(element);
                renderedCount++;
                break;
              default:
                console.warn("[CodeToFrame] Unknown element type, skipping:", (element as { type: string }).type);
                skippedCount++;
            }
          } catch (err) {
            console.error("[CodeToFrame] Failed to render element:", element, err);
            skippedCount++;
          }
        }

        console.log(`[CodeToFrame] Render complete: ${renderedCount} rendered, ${skippedCount} skipped.`);

        // Zoom ke area yang baru saja di-render agar pengguna langsung melihat hasilnya
        figma.viewport.scrollAndZoomIntoView(figma.currentPage.children);

        // Beritahu UI bahwa render selesai
        figma.ui.postMessage({
          type: 'render-complete',
          renderedCount,
          skippedCount,
        });
      }
      ```
    - **Catatan:** Setiap elemen di-render di dalam `try-catch` individual agar **satu elemen yang gagal tidak menghentikan seluruh proses**. Elemen yang gagal di-skip dan di-log.
  - *Definition of Done (DoD):*
    - Fungsi memproses semua elemen dari data JSON.
    - Rectangle dan Text muncul di kanvas Figma dengan properti yang benar.
    - Elemen yang gagal di-skip tanpa menghentikan proses.
    - Viewport otomatis scroll ke area yang di-render.
    - Console log menampilkan jumlah elemen yang berhasil dan yang di-skip.
  - *Edge Cases to Handle:*
    - **Data kosong (`elements: []`):** Fungsi selesai tanpa error, tampilkan pesan "No elements to render."
    - **Tipe elemen tidak dikenal (future-proofing):** Switch case punya `default` yang skip elemen dengan warning.
    - **Plugin ditutup saat rendering berlangsung:** Ini bisa menyebabkan error "Plugin was closed" — tidak perlu ditangani di MVP (Figma menangani ini sendiri).

---

### 4.6 Integrasi Controller ↔ Renderer

- [ ] **Hubungkan controller.ts dengan renderer.ts**
  - *Sub-tasks:*
    - Di `controller.ts`, import dan panggil fungsi `renderElements`:
      ```typescript
      figma.ui.onmessage = async (message: { type: string; payload?: unknown }) => {
        if (message.type === 'generate') {
          try {
            // Validasi data JSON
            const data = message.payload;
            if (!isValidCodeToFrameData(data)) {
              figma.ui.postMessage({ type: 'error', message: 'Invalid JSON format.' });
              return;
            }

            figma.ui.postMessage({ type: 'status', message: `Rendering ${data.elements.length} elements...` });

            await renderElements(data);

            figma.ui.postMessage({ type: 'status', message: 'Generation complete!' });
          } catch (err) {
            console.error("[CodeToFrame] Render failed:", err);
            figma.ui.postMessage({ type: 'error', message: 'Rendering failed. Check console for details.' });
          }
        }
      };
      ```
    - **Catatan tentang bundling:** Karena Figma sandbox tidak mendukung ES modules secara native, file `controller.ts` dan `renderer.ts` mungkin perlu di-bundle menjadi **satu file JS**. Opsi:
      1. Gunakan `tsc` dengan `outFile` dan namespaces (rumit).
      2. Gunakan bundler sederhana (esbuild) untuk bundle semua file ke satu output.
      3. Tulis semua kode di satu file (paling sederhana untuk MVP).
    - Pilih pendekatan yang paling sederhana untuk MVP dan dokumentasikan keputusannya.
  - *Definition of Done (DoD):*
    - Controller menerima pesan `generate` → memanggil renderer → elemen muncul di kanvas.
    - JSON yang invalid ditolak dengan pesan error ke UI.
    - Error saat rendering ditangkap dan dilaporkan ke UI.
  - *Edge Cases to Handle:*
    - **Double-click "Generate":** Jika pengguna menekan Generate dua kali, elemen bisa terduplikat. Pertimbangkan untuk disable tombol selama rendering (ditangani di UI, Phase 5).

---

### ✅ Checkpoint Phase 4

| # | Cek | Status |
|:---:|---|:---:|
| 1 | `controller.ts` dan `renderer.ts` ada dan bisa di-compile | [ ] |
| 2 | `toFigmaColor()` mengonversi warna dengan benar | [ ] |
| 3 | `renderRectangle()` membuat node dengan posisi, dimensi, dan warna benar | [ ] |
| 4 | `renderText()` membuat node teks dengan font di-load terlebih dahulu | [ ] |
| 5 | `renderElements()` memproses semua elemen dan menghitung rendered/skipped | [ ] |
| 6 | Controller terintegrasi dengan renderer (pesan → render → feedback) | [ ] |
| 7 | Validasi JSON dilakukan sebelum rendering | [ ] |
| 8 | Error individual tidak menghentikan seluruh proses rendering | [ ] |
| 9 | `npx tsc --noEmit` lolos | [ ] |
| 10 | Commit ke Git | [ ] |

---

## Phase 5 — Figma Plugin UI & Message Handler

> **Tujuan:** Membangun antarmuka pengguna plugin Figma — tempat pengguna paste JSON dan memulai proses rendering.  
> **Estimasi:** 1 hari kerja  
> **Prasyarat:** Phase 4 selesai (renderer sudah berfungsi).

---

### 5.1 Plugin UI — HTML

- [ ] **Buat file `ui.html` di `figma-plugin/src/ui/`**
  - *Sub-tasks:*
    - Buat folder `figma-plugin/src/ui/` jika belum ada.
    - Buat file `ui.html` dengan struktur berikut:
      ```html
      <!-- CATATAN: File ini berjalan di iframe Figma. Punya akses DOM tapi TIDAK bisa akses Figma API. -->
      <!DOCTYPE html>
      <html>
      <head>
        <link rel="stylesheet" href="ui.css">
      </head>
      <body>
        <h2>CodeToFrame</h2>
        <p>Paste JSON data dari browser extension, lalu klik "Generate Design".</p>

        <textarea id="json-input" placeholder="Paste JSON here..."></textarea>

        <div id="status-area"></div>

        <div class="button-group">
          <button id="btn-generate" type="button">Generate Design</button>
          <button id="btn-cancel" type="button">Cancel</button>
        </div>

        <script>
          // Inline script karena Figma plugin UI tidak mendukung external JS files
          // Seluruh logika UI ditulis di sini

          const jsonInput = document.getElementById('json-input');
          const btnGenerate = document.getElementById('btn-generate');
          const btnCancel = document.getElementById('btn-cancel');
          const statusArea = document.getElementById('status-area');

          // Tombol Generate
          btnGenerate.addEventListener('click', () => {
            const raw = jsonInput.value.trim();
            if (!raw) {
              showStatus('Please paste JSON data first.', 'error');
              return;
            }

            let parsed;
            try {
              parsed = JSON.parse(raw);
            } catch (err) {
              showStatus('Invalid JSON format. Please check your data.', 'error');
              return;
            }

            // Disable tombol selama proses rendering
            btnGenerate.disabled = true;
            btnGenerate.textContent = 'Generating...';
            showStatus('Sending data to plugin...', 'info');

            // Kirim data ke sandbox plugin
            parent.postMessage({
              pluginMessage: { type: 'generate', payload: parsed }
            }, '*');
          });

          // Tombol Cancel
          btnCancel.addEventListener('click', () => {
            parent.postMessage({ pluginMessage: { type: 'cancel' } }, '*');
          });

          // Terima pesan dari sandbox plugin (feedback)
          window.onmessage = (event) => {
            const msg = event.data.pluginMessage;
            if (!msg) return;

            if (msg.type === 'status') {
              showStatus(msg.message, 'info');
            }
            if (msg.type === 'render-complete') {
              showStatus(
                `Done! ${msg.renderedCount} elements rendered, ${msg.skippedCount} skipped.`,
                'success'
              );
              btnGenerate.disabled = false;
              btnGenerate.textContent = 'Generate Design';
            }
            if (msg.type === 'error') {
              showStatus(msg.message, 'error');
              btnGenerate.disabled = false;
              btnGenerate.textContent = 'Generate Design';
            }
          };

          function showStatus(message, type) {
            statusArea.textContent = message;
            statusArea.className = 'status-' + type;
          }
        </script>
      </body>
      </html>
      ```
    - **Catatan:** Script ditulis inline di dalam `<script>` tag karena Figma plugin UI **tidak mendukung** file JavaScript eksternal secara langsung. Semua logika UI harus ada di dalam `ui.html`.
  - *Definition of Done (DoD):*
    - File `ui.html` ada dan menampilkan UI yang fungsional di dalam Figma.
    - Textarea bisa menerima paste JSON.
    - Tombol "Generate Design" mengirim data ke sandbox plugin via `postMessage`.
    - Tombol "Cancel" menutup plugin.
    - Area status menampilkan feedback dari plugin.
  - *Edge Cases to Handle:*
    - **JSON yang sangat besar:** Textarea bisa lambat dengan JSON > 1MB. Untuk MVP, terima apa adanya.
    - **Double-click Generate:** Tombol di-disable selama proses rendering untuk mencegah duplikasi.
    - **Paste event:** Pertimbangkan menambahkan listener `paste` event untuk otomatis mendeteksi paste dan memberi feedback.

---

### 5.2 Plugin UI — CSS

- [ ] **Buat file `ui.css` untuk styling antarmuka plugin**
  - *Sub-tasks:*
    - Buat file `figma-plugin/src/ui/ui.css`.
    - Style yang diperlukan:
      - `body`: font-family Figma standard (`Inter`, `sans-serif`), padding, max-width.
      - `textarea#json-input`: full-width, min-height 200px, font-family monospace, resize vertikal.
      - `.button-group`: flexbox layout untuk tombol-tombol.
      - `#btn-generate`: primary style (warna biru Figma `#0D99FF` atau serupa).
      - `#btn-cancel`: secondary/tertiary style (abu-abu, outline).
      - `#btn-generate:disabled`: opacity berkurang, cursor `not-allowed`.
      - `#status-area`: area untuk pesan status.
      - `.status-info`: warna biru/abu.
      - `.status-success`: warna hijau.
      - `.status-error`: warna merah.
  - *Definition of Done (DoD):*
    - UI terlihat rapi dan konsisten dengan estetika Figma.
    - Semua state visual (normal, disabled, success, error) tertangani.

---

### 5.3 Komunikasi Dua Arah UI ↔ Sandbox

- [ ] **Pastikan komunikasi dua arah antara UI dan sandbox berfungsi**
  - *Sub-tasks:*
    - **UI → Sandbox:**
      - `parent.postMessage({ pluginMessage: { type: 'generate', payload: data } }, '*')` — mengirim JSON ke controller.
      - `parent.postMessage({ pluginMessage: { type: 'cancel' } }, '*')` — menutup plugin.
    - **Sandbox → UI:**
      - `figma.ui.postMessage({ type: 'status', message: '...' })` — mengirim update status.
      - `figma.ui.postMessage({ type: 'render-complete', renderedCount, skippedCount })` — memberitahu render selesai.
      - `figma.ui.postMessage({ type: 'error', message: '...' })` — memberitahu ada error.
    - Test: Buka plugin di Figma, paste JSON valid, klik Generate → elemen muncul di kanvas DAN status berubah ke "Done!".
    - Test: Paste JSON invalid → status menampilkan pesan error.
  - *Definition of Done (DoD):*
    - Pesan dari UI diterima di sandbox (controller.ts).
    - Pesan dari sandbox diterima di UI (window.onmessage).
    - Status UI berubah sesuai tahapan proses.
  - *Edge Cases to Handle:*
    - **`postMessage` gagal silently:** Tidak ada error jika pesan tidak diterima — pastikan listener sudah terpasang sebelum pesan dikirim.

---

### 5.4 Build & Load Plugin di Figma

- [ ] **Verifikasi build dan load plugin ke Figma**
  - *Sub-tasks:*
    - Jalankan `npm run build` di `figma-plugin/`.
    - Periksa folder `dist/` — pastikan berisi `plugin/controller.js`.
    - Pastikan `manifest.json` mengarah ke path yang benar.
    - Buka Figma Desktop → Plugins → Development → Import plugin from manifest → pilih `figma-plugin/manifest.json`.
    - Buka file Figma → jalankan plugin → UI muncul.
    - Paste JSON sederhana (bisa buat contoh manual) → klik Generate → elemen muncul di kanvas.
  - *Definition of Done (DoD):*
    - Plugin bisa di-load di Figma tanpa error.
    - UI muncul dengan textarea dan tombol.
    - Generate berfungsi — elemen muncul di kanvas.
  - *Edge Cases to Handle:*
    - Jika `ui.html` tidak ditemukan, periksa path `"ui"` di `manifest.json`.
    - Jika `controller.js` error saat load, periksa console Figma (open via menu > Plugins > Development > Open Console).

---

### ✅ Checkpoint Phase 5

| # | Cek | Status |
|:---:|---|:---:|
| 1 | `ui.html` dan `ui.css` ada dan menampilkan UI yang rapi | [ ] |
| 2 | Textarea bisa menerima paste JSON | [ ] |
| 3 | Tombol "Generate" mengirim data dan disabled selama proses | [ ] |
| 4 | Tombol "Cancel" menutup plugin | [ ] |
| 5 | Status pesan berubah: info → success/error | [ ] |
| 6 | Komunikasi dua arah UI ↔ Sandbox berfungsi | [ ] |
| 7 | JSON invalid ditolak dengan pesan error yang jelas | [ ] |
| 8 | Plugin bisa di-load dan dijalankan di Figma | [ ] |
| 9 | Commit ke Git | [ ] |

---

## Phase 6 — End-to-End Integration Testing & Quality Assurance

> **Tujuan:** Memastikan **seluruh alur** dari Browser Extension ke Figma Plugin bekerja dengan sempurna. Menangkap bug, memperbaiki edge case, dan memoles kualitas kode.  
> **Estimasi:** 1–2 hari kerja  
> **Prasyarat:** Phase 3 dan Phase 5 selesai (extension dan plugin sudah berfungsi mandiri).

---

### 6.1 Buat Halaman Test HTML

- [ ] **Buat halaman web HTML sederhana untuk testing**
  - *Sub-tasks:*
    - Buat file `test-page.html` di root repositori (atau di folder `test/`).
    - Halaman harus mengandung:
      - **3–5 Rectangle elements:** `<div>` dengan background-color bervariasi (merah, biru, hijau, dsb.), ukuran berbeda, posisi berbeda.
      - **3–5 Text elements:** `<h1>`, `<p>`, `<span>` dengan teks bervariasi, font-size berbeda, warna teks berbeda.
      - **1 elemen yang punya background + text:** `<button>` dengan background-color dan teks di dalamnya.
      - **1 elemen tersembunyi:** `<div style="display: none">Hidden</div>` — harus di-skip.
      - **1 elemen transparan:** `<div style="background: transparent">Transparent BG</div>` — background harus di-skip.
      - **1 elemen out-of-scope:** `<img src="...">` — harus di-skip.
    - Semua elemen menggunakan **posisi absolut** atau setidaknya posisi yang bisa diprediksi via `getBoundingClientRect`.
  - *Definition of Done (DoD):*
    - File `test-page.html` bisa dibuka di browser.
    - Halaman menampilkan berbagai elemen visual yang mencakup semua skenario MVP.

---

### 6.2 End-to-End Smoke Test

- [ ] **Lakukan pengujian end-to-end dari extension ke plugin**
  - *Sub-tasks:*
    1. Buka `test-page.html` di Chrome.
    2. Klik ikon ekstensi CodeToFrame → popup muncul.
    3. Klik "Extract DOM" → JSON muncul di popup.
    4. **Verifikasi JSON:**
       - `sourceUrl` mengarah ke path `test-page.html`.
       - `viewportWidth` dan `viewportHeight` sesuai.
       - `elements` berisi elemen Rectangle dan Text yang diharapkan.
       - Elemen tersembunyi (`display: none`) TIDAK ada di JSON.
       - Elemen out-of-scope (`<img>`) TIDAK ada di JSON.
       - Background transparan TIDAK menghasilkan Rectangle.
    5. Klik "Copy JSON" → JSON tersalin ke clipboard.
    6. Buka Figma → jalankan plugin CodeToFrame.
    7. Paste JSON ke textarea → klik "Generate Design".
    8. **Verifikasi di kanvas Figma:**
       - Rectangle muncul di posisi yang benar (bandingkan visual dengan browser).
       - Text muncul dengan isi teks yang benar.
       - Warna Rectangle dan Text sesuai.
       - Ukuran font teks sesuai.
       - Status menampilkan "Done! X elements rendered, Y skipped."
  - *Definition of Done (DoD):*
    - Seluruh alur dari extension ke plugin berjalan tanpa error.
    - Elemen di Figma secara visual **menyerupai** layout asli di browser (tidak harus pixel-perfect, tapi harus recognizable).
  - *Edge Cases to Handle:*
    - Jika posisi elemen "meleset" jauh, cek apakah `scrollX`/`scrollY` perlu diperhitungkan di `getBoundingClientRect`.

---

### 6.3 Test pada Website Nyata

- [ ] **Lakukan pengujian pada 2–3 halaman web nyata (bukan test page)**
  - *Sub-tasks:*
    - **Website 1:** Halaman landing page sederhana (misalnya: halaman statis dengan header, hero section, beberapa card). Contoh: halaman marketing yang simpel.
    - **Website 2:** Halaman blog/artikel (misalnya: banyak teks dengan heading berbeda).
    - **Website 3 (opsional):** Halaman dashboard sederhana (banyak kotak/card dengan background berwarna).
    - Untuk setiap website:
      1. Extract DOM → copy JSON.
      2. Paste ke Figma plugin → Generate.
      3. Bandingkan hasil visual secara kasar.
      4. Catat temuan: elemen yang kurang, warna yang salah, posisi yang meleset, dsb.
    - Buat daftar bug/issue yang ditemukan.
  - *Definition of Done (DoD):*
    - Minimal 2 website nyata berhasil diekstrak dan di-render di Figma tanpa crash.
    - Hasil visual "cukup mirip" dengan aslinya (harapan realistis untuk MVP: 60–80% kemiripan visual).
    - Daftar bug/issue terdokumentasi.
  - *Edge Cases to Handle:*
    - Website dengan CSS framework (Bootstrap, Tailwind) → harus tetap bekerja karena kita baca `getComputedStyle` (sudah resolved).
    - Website dengan banyak overlay/modal → elemen overlay bisa menimpa elemen di bawahnya. Ini normal di MVP.

---

### 6.4 Code Quality Review

- [ ] **Review kualitas kode secara menyeluruh**
  - *Sub-tasks:*
    - Jalankan `npx tsc --noEmit` di kedua proyek — pastikan **zero errors**.
    - Jalankan `npm run lint` (jika sudah setup) — perbaiki semua warning dan error.
    - Review checklist kualitas kode:
      - [ ] Tidak ada tipe `any` di seluruh codebase.
      - [ ] Semua promise di-`await` (tidak ada floating promise).
      - [ ] Semua fungsi yang diekspor punya JSDoc comment.
      - [ ] Console log menggunakan prefix `[CodeToFrame]`.
      - [ ] Tidak ada `console.log` debugging yang tertinggal (hanya log yang intentional).
      - [ ] Tidak ada kode yang di-comment-out tanpa penjelasan.
      - [ ] Semua variabel menggunakan `const` (kecuali memang perlu `let`).
      - [ ] Error handling menggunakan try-catch di titik-titik kritis.
      - [ ] Tidak ada hardcoded magic number tanpa konstanta yang menjelaskan.
    - Perbaiki semua temuan.
  - *Definition of Done (DoD):*
    - Zero TypeScript errors.
    - Zero ESLint errors (jika setup).
    - Semua item checklist kualitas kode terpenuhi.

---

### 6.5 Performa Dasar

- [ ] **Verifikasi performa dasar — tidak ada bottleneck yang jelas**
  - *Sub-tasks:*
    - **Extension — waktu ekstraksi:**
      - Tambahkan timing di `extractElements()`:
        ```typescript
        const startTime = performance.now();
        // ... extraction logic ...
        const endTime = performance.now();
        console.log(`[CodeToFrame] Extraction took ${(endTime - startTime).toFixed(0)}ms`);
        ```
      - Target: Ekstraksi halaman sederhana (< 100 elemen) selesai dalam **< 500ms**.
      - Jika melebihi 1 detik untuk halaman sederhana, cari bottleneck (biasanya di loop `getComputedStyle`).
    - **Plugin — waktu render:**
      - Tambahkan timing di `renderElements()`:
        ```typescript
        const startTime = Date.now(); // Figma sandbox tidak punya performance.now()
        // ... render logic ...
        console.log(`[CodeToFrame] Rendering took ${Date.now() - startTime}ms`);
        ```
      - Target: Render 50 elemen selesai dalam **< 2 detik**.
    - **Ukuran JSON:**
      - Pastikan JSON untuk halaman sederhana tidak lebih dari **500KB**. Jika terlalu besar, cek apakah ada elemen yang tidak perlu diekstrak.
  - *Definition of Done (DoD):*
    - Ekstraksi halaman sederhana < 500ms.
    - Render 50 elemen < 2 detik.
    - Tidak ada memory leak yang jelas (tab Chrome tidak menggunakan memori berlebihan setelah extraction).

---

### 6.6 Dokumentasi Final

- [ ] **Update semua dokumentasi sesuai implementasi final**
  - *Sub-tasks:*
    - Update `README.md` dengan:
      - Deskripsi proyek.
      - Screenshot atau GIF demo (jika memungkinkan).
      - Petunjuk instalasi (cara load extension dan plugin).
      - Petunjuk penggunaan dasar (langkah 1–5).
    - Review `PRD.md` — pastikan fitur yang tercantum sesuai dengan yang diimplementasi.
    - Review `ARCHITECTURE.md` — pastikan diagram dan penjelasan masih akurat.
    - Review `AGENTS.md` — pastikan aturan dan directory structure masih sesuai.
    - Pastikan `TODO.md` ini memiliki semua checkbox ter-centang.
  - *Definition of Done (DoD):*
    - Semua dokumentasi konsisten dengan kode.
    - `README.md` cukup jelas bagi orang baru yang pertama kali melihat repo.

---

### ✅ Checkpoint Phase 6 (Final!)

| # | Cek | Status |
|:---:|---|:---:|
| 1 | End-to-end test pada test page berhasil | [ ] |
| 2 | Test pada 2+ website nyata berhasil tanpa crash | [ ] |
| 3 | Zero TypeScript errors di kedua proyek | [ ] |
| 4 | Tidak ada tipe `any` di codebase | [ ] |
| 5 | Performa extraction < 500ms, render < 2s (halaman sederhana) | [ ] |
| 6 | Dokumentasi ter-update | [ ] |
| 7 | Commit final ke Git | [ ] |
| 8 | 🎉 **MVP v1.0 SELESAI!** | [ ] |

---

## Ringkasan: Peta Perjalanan Lengkap

```
Phase 0: Setup          ██░░░░░░░░░░░░░░░░░░  (fondasi)
Phase 1: Contracts      ████░░░░░░░░░░░░░░░░  (kontrak data)
Phase 2: Ext. Core      ████████░░░░░░░░░░░░  (mesin ekstraksi)
Phase 3: Ext. UI        ██████████░░░░░░░░░░  (antarmuka extension)
Phase 4: Plugin Core    ██████████████░░░░░░  (mesin render)
Phase 5: Plugin UI      ████████████████░░░░  (antarmuka plugin)
Phase 6: Testing & QA   ████████████████████  (polish & ship!)
```

> **Pesan penutup:** Dokumen ini sengaja dibuat sangat detail agar tidak ada ambiguitas. Jika kamu ragu di satu langkah, baca ulang sub-tasks-nya. Jika masih ragu, **tanya** — jangan berasumsi. Semangat membangun CodeToFrame! 🚀

---

*End of Master Execution Plan.*
