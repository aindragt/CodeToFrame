# 📋 Mini-PRD: CodeToFrame v1.0

> **Tanggal:** 10 Agustus 2026  
> **Status:** Draft  
> **Repositori:** [github.com/aindragt/CodeToFrame](https://github.com/aindragt/CodeToFrame)

---

## 1. 🎯 Apa Itu CodeToFrame?

**CodeToFrame** adalah alat bantu yang mengubah halaman web (HTML/CSS) menjadi desain Figma yang bisa diedit.

Bayangkan begini: kamu buka sebuah website di Chrome, tekan satu tombol, lalu — *poof* — elemen-elemen di website itu muncul sebagai objek-objek di kanvas Figma. Warna, posisi, dan teksnya ikut terbawa.

### Kenapa Ini Berguna?

- Designer bisa dengan cepat "mengimpor" tampilan web yang sudah jadi ke Figma untuk dimodifikasi.
- Mempercepat proses *reverse engineering* desain dari web yang sudah *live*.
- Mengurangi pekerjaan manual menggambar ulang elemen satu per satu.

---

## 2. 🧩 Arsitektur Sistem (Gambaran Besar)

Proyek ini terdiri dari **dua bagian** yang bekerja sama, tapi **tidak terhubung langsung** satu sama lain. Keduanya berkomunikasi lewat **data JSON yang di-copy-paste secara manual** oleh pengguna.

```
┌─────────────────────┐      Copy/Paste JSON      ┌─────────────────────┐
│   Ekstensi Chrome    │  ──────────────────────►  │    Plugin Figma     │
│  (Pengekstrak Data)  │                           │  (Penggambar Data)  │
└─────────────────────┘                            └─────────────────────┘
```

| Bagian | Tugasnya | Analogi Sederhana |
|---|---|---|
| **Ekstensi Chrome** | Membaca halaman web dan menghasilkan data JSON | Seperti "kamera" yang memotret struktur web |
| **Plugin Figma** | Menerima data JSON dan menggambar ulang di kanvas | Seperti "printer" yang mencetak hasil fotonya |

> **💡 Catatan Penting:**  
> Kedua bagian ini adalah proyek terpisah. Ekstensi Chrome berjalan di browser, Plugin Figma berjalan di dalam aplikasi Figma. Mereka tidak saling "telepon" — pengguna yang menjadi perantaranya dengan cara copy-paste.

---

## 3. 🚶 Alur Pengguna (User Flow)

Berikut langkah-langkah yang dilakukan pengguna dari awal sampai akhir:

```
  ① Buka website          ② Jalankan Ekstensi        ③ Copy JSON
     di Chrome       ──►     Chrome CodeToFrame  ──►    dari ekstensi
                                                            │
                                                            ▼
  ⑤ Tekan tombol         ④ Buka Figma, jalankan      Paste JSON
    "Generate" ◄──────       Plugin CodeToFrame  ◄──  ke plugin
       │
       ▼
  🎉 Desain muncul
     di kanvas Figma!
```

### Penjelasan Tiap Langkah:

| Langkah | Apa yang Terjadi | Di Mana |
|:---:|---|---|
| **①** | Pengguna membuka halaman web yang ingin diubah jadi desain | Browser Chrome |
| **②** | Pengguna klik ikon Ekstensi CodeToFrame → ekstensi otomatis membaca elemen-elemen di halaman | Browser Chrome |
| **③** | Data hasil ekstraksi muncul dalam format JSON → pengguna klik tombol "Copy" | Browser Chrome |
| **④** | Pengguna pindah ke Figma, buka Plugin CodeToFrame, lalu paste JSON ke kolom input plugin | Figma |
| **⑤** | Pengguna klik tombol "Generate" → plugin membaca JSON dan menggambar elemen di kanvas | Figma |

---

## 4. 🔧 Tech Stack (Teknologi yang Dipakai)

### Ekstensi Chrome

| Komponen | Teknologi | Keterangan |
|---|---|---|
| Bahasa | **TypeScript** | Supaya kode lebih aman dengan pengecekan tipe data |
| Build Tool | **Vite** | Untuk membundel kode jadi file yang siap dipasang di Chrome |
| Standar | **Manifest V3** | Format terbaru untuk ekstensi Chrome (wajib pakai ini) |

### Plugin Figma

| Komponen | Teknologi | Keterangan |
|---|---|---|
| Logika Plugin | **TypeScript** | Berinteraksi dengan Figma Plugin API untuk menggambar objek |
| Tampilan (UI) | **HTML + CSS murni** | Antarmuka plugin yang sangat sederhana, tanpa framework |

> **💡 Kenapa tidak pakai React untuk UI Plugin Figma?**  
> Karena tampilan plugin kita sangat sederhana (hanya textarea dan tombol). Memakai React justru akan menambah kompleksitas yang tidak perlu. HTML/CSS biasa sudah lebih dari cukup.

---

## 5. 📦 Ruang Lingkup MVP (Versi 1.0)

MVP = *Minimum Viable Product*, artinya fitur paling minimal yang harus selesai agar produk ini bisa dipakai dan diuji.

### 5.1 Elemen yang Diekstrak

Di versi pertama, kita **hanya** menangani dua jenis elemen:

| Elemen | Akan Jadi Apa di Figma | Contoh di Web |
|---|---|---|
| **Kotak (Rectangle)** | Rectangle Node | `<div>`, `<section>`, `<button>`, dsb. yang punya area terlihat |
| **Teks (Text)** | Text Node | Konten teks di dalam elemen (`<p>`, `<h1>`, `<span>`, dsb.) |

### 5.2 Properti yang Disalin

Untuk setiap elemen, kita **hanya** menyalin properti berikut:

| Properti | Tipe Elemen | Keterangan |
|---|---|---|
| **Background Color** | Kotak | Warna latar belakang elemen |
| **Text Color** | Teks | Warna huruf / font color |
| **Font Size** | Teks | Ukuran huruf dalam pixel |
| **Text Content** | Teks | Isi teksnya (misalnya "Halo Dunia") |
| **X Position** | Semua | Posisi horizontal di layar (dalam pixel) |
| **Y Position** | Semua | Posisi vertikal di layar (dalam pixel) |
| **Width** | Semua | Lebar elemen (dalam pixel) |
| **Height** | Semua | Tinggi elemen (dalam pixel) |

### 5.3 Sistem Posisi

Semua elemen akan diposisikan menggunakan **koordinat absolut (X, Y)** — persis seperti posisi aslinya di browser.

```
Contoh:
Sebuah tombol di posisi (320, 150) di browser
→ akan digambar di posisi (320, 150) di kanvas Figma
```

> **💡 Artinya:** Kita tidak perlu pusing soal *layout* atau susunan elemen yang kompleks. Cukup "tempel" setiap elemen di posisi yang sama seperti di browser.

---

## 6. 🚫 Di Luar Ruang Lingkup (Jangan Dikerjakan Dulu!)

Ini adalah daftar hal-hal yang **sengaja tidak dimasukkan** ke versi 1.0. Bukan karena tidak penting, tapi karena akan membuat proyek terlalu rumit untuk tahap awal.

| Fitur | Alasan Ditunda |
|---|---|
| ❌ **Gambar (`<img>`)** | Perlu logika download, upload, dan konversi gambar — terlalu kompleks |
| ❌ **Vektor / Ikon (SVG)** | Parsing SVG path sangat rumit dan rawan error |
| ❌ **Auto Layout Figma** | Fitur Figma yang sangat powerful tapi sangat sulit diimplementasi dengan benar |
| ❌ **Border Radius** (sudut lengkung) | Menambah properti yang harus dipetakan — simpan untuk versi berikutnya |
| ❌ **Drop Shadow** (bayangan) | Sama seperti di atas — tambahan properti visual yang bisa ditunda |
| ❌ **Gradient** (warna gradasi) | Parsing CSS gradient cukup kompleks |
| ❌ **Font Family** (jenis huruf) | Membutuhkan font matching antara web dan Figma — bisa jadi masalah tersendiri |

> **⚠️ Penting:**  
> Kalau saat ngoding kamu menemukan elemen yang di luar ruang lingkup (misalnya `<img>`), **abaikan saja** — jangan sampai error, cukup di-skip.

---

## 7. 📐 Format Data JSON

Berikut adalah gambaran struktur JSON yang dihasilkan Ekstensi Chrome dan akan dibaca oleh Plugin Figma. Ini adalah "kontrak" antara kedua bagian sistem.

```json
{
  "sourceUrl": "https://contoh.com",
  "viewportWidth": 1440,
  "viewportHeight": 900,
  "elements": [
    {
      "type": "RECTANGLE",
      "x": 100,
      "y": 200,
      "width": 300,
      "height": 50,
      "backgroundColor": { "r": 59, "g": 130, "b": 246 }
    },
    {
      "type": "TEXT",
      "x": 110,
      "y": 210,
      "width": 280,
      "height": 30,
      "textContent": "Halo Dunia!",
      "fontSize": 16,
      "textColor": { "r": 255, "g": 255, "b": 255 }
    }
  ]
}
```

### Penjelasan Field:

| Field | Tipe | Keterangan |
|---|---|---|
| `sourceUrl` | `string` | URL halaman web yang diekstrak |
| `viewportWidth` | `number` | Lebar viewport browser saat ekstraksi |
| `viewportHeight` | `number` | Tinggi viewport browser saat ekstraksi |
| `elements` | `array` | Daftar semua elemen yang berhasil diekstrak |
| `elements[].type` | `"RECTANGLE"` \| `"TEXT"` | Jenis elemen |
| `elements[].x` | `number` | Posisi horizontal (pixel) |
| `elements[].y` | `number` | Posisi vertikal (pixel) |
| `elements[].width` | `number` | Lebar elemen (pixel) |
| `elements[].height` | `number` | Tinggi elemen (pixel) |
| `elements[].backgroundColor` | `{ r, g, b }` | Warna latar (hanya untuk RECTANGLE), nilai 0–255 |
| `elements[].textContent` | `string` | Isi teks (hanya untuk TEXT) |
| `elements[].fontSize` | `number` | Ukuran huruf dalam pixel (hanya untuk TEXT) |
| `elements[].textColor` | `{ r, g, b }` | Warna teks (hanya untuk TEXT), nilai 0–255 |

> **💡 Tips:**  
> Warna menggunakan format RGB dengan nilai 0–255 (bukan 0–1 seperti di Figma API). Konversi ke format Figma (0–1) dilakukan di sisi Plugin Figma saat menggambar, dengan cara membagi setiap nilai dengan 255. Contoh: `{ r: 255, g: 128, b: 0 }` → `{ r: 1, g: 0.502, b: 0 }`.

---

## 8. 📁 Struktur Folder Proyek

```
CodeToFrame/
├── browser-extension/         ← Proyek Ekstensi Chrome
│   ├── src/
│   │   ├── popup/             ← UI popup ekstensi (tombol extract & copy)
│   │   ├── content/           ← Content Script (mengekstrak elemen dari web)
│   │   ├── background/        ← Service Worker (koordinasi)
│   │   └── types/             ← TypeScript type definitions
│   ├── public/
│   │   └── manifest.json      ← Konfigurasi ekstensi (Manifest V3)
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── figma-plugin/              ← Proyek Plugin Figma
│   ├── src/
│   │   ├── ui/                ← Tampilan antarmuka plugin (textarea + tombol)
│   │   ├── plugin/            ← Logika utama plugin (menggambar di kanvas Figma)
│   │   └── types/             ← TypeScript type definitions
│   ├── manifest.json          ← Konfigurasi plugin Figma
│   ├── package.json
│   └── tsconfig.json
│
├── PRD.md                     ← Product Requirements Document
├── ARCHITECTURE.md            ← Dokumentasi arsitektur (lihat file terpisah)
└── README.md
```

---

## 9. ✅ Kriteria Selesai (Definition of Done)

Versi 1.0 dianggap selesai jika memenuhi semua poin berikut:

- [ ] **Ekstensi Chrome** bisa di-install di browser Chrome dalam mode developer
- [ ] **Ekstensi Chrome** bisa mengekstrak elemen dari halaman web sederhana dan menghasilkan JSON yang valid
- [ ] **Tombol Copy** di ekstensi berfungsi — JSON berhasil masuk ke clipboard
- [ ] **Plugin Figma** bisa dijalankan di Figma (mode development)
- [ ] **Plugin Figma** bisa menerima JSON yang di-paste dan menggambar Rectangle serta Text di kanvas
- [ ] **Posisi elemen** di Figma sesuai (atau sangat mendekati) posisi aslinya di browser
- [ ] **Warna, ukuran font, dan isi teks** terbawa dengan benar
- [ ] Elemen di luar ruang lingkup (gambar, SVG, dsb.) **di-skip tanpa error**

---

## 10. 🗺️ Urutan Pengerjaan yang Disarankan

Berikut urutan kerja yang disarankan agar pengembangan berjalan lancar:

| Fase | Apa yang Dikerjakan | Estimasi |
|:---:|---|---|
| **1** | Setup proyek Chrome Extension (Vite + TypeScript + Manifest V3) | 1 hari |
| **2** | Buat Content Script — logika untuk membaca elemen dari halaman web | 1–2 hari |
| **3** | Buat Popup UI — tampilan ekstensi dengan tombol Extract dan Copy | 1 hari |
| **4** | Setup proyek Figma Plugin (TypeScript + HTML UI) | 1 hari |
| **5** | Buat UI Plugin — textarea untuk paste JSON dan tombol Generate | 0.5 hari |
| **6** | Buat logika penggambar — parsing JSON dan menggambar di kanvas Figma | 2–3 hari |
| **7** | Testing & bug fixing end-to-end | 1–2 hari |

> **💡 Total estimasi kasar: 7–11 hari kerja**  
> Ini estimasi untuk developer yang baru pertama kali membuat Chrome Extension dan Figma Plugin. Kalau sudah pernah, bisa lebih cepat.

---

## 11. 📚 Referensi yang Berguna

Berikut link dokumentasi resmi yang akan sering kamu buka selama pengerjaan:

| Topik | Link |
|---|---|
| Chrome Extension — Panduan Mulai | [developer.chrome.com/docs/extensions/get-started](https://developer.chrome.com/docs/extensions/get-started) |
| Chrome Extension — Manifest V3 | [developer.chrome.com/docs/extensions/develop/manifest](https://developer.chrome.com/docs/extensions/develop/manifest) |
| Chrome Extension — Content Scripts | [developer.chrome.com/docs/extensions/develop/concepts/content-scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts) |
| Figma Plugin — Panduan Mulai | [figma.com/plugin-docs](https://www.figma.com/plugin-docs/) |
| Figma Plugin — API Reference | [figma.com/plugin-docs/api/api-reference](https://www.figma.com/plugin-docs/api/api-reference/) |
| Vite — Dokumentasi | [vite.dev/guide](https://vite.dev/guide/) |
| TypeScript — Handbook | [typescriptlang.org/docs/handbook](https://www.typescriptlang.org/docs/handbook/) |

---

*Dokumen ini adalah panduan kerja untuk CodeToFrame v1.0. Jika ada yang kurang jelas atau ada pertanyaan, jangan ragu untuk bertanya! 🚀*
