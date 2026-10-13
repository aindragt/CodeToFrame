# CodeToFrame — Product Requirements Document (PRD)

| | |
|---|---|
| Pemilik | Indra Pramudya |
| Status | Draft |
| Dokumen terkait | `docs/ARCHITECTURE.md` (belum ada), `docs/SCHEMA.md` (belum ada) |

Label yang dipakai di dokumen ini:
- **[ASUMSI]**: belum diputuskan pemilik, dipakai sementara agar persyaratan bisa diuji. Wajib dikonfirmasi atau diganti.
- **[TERBUKA]**: dirujuk ke bagian 11 (Pertanyaan terbuka).

---

## 1. Overview dan masalah yang diselesaikan

CodeToFrame mengekstrak tampilan halaman web yang sedang terbuka di tab pengguna (struktur DOM, gaya CSS hasil komputasi, tipografi, layout) lalu merendernya menjadi Frame (dan, bila terverifikasi, Auto Layout) di kanvas Figma.

Arsitektur dua lapis:
1. **Chrome Extension (Manifest V3)**: mengekstrak halaman yang sudah dirender menjadi data terstruktur (JSON).
2. **Figma Companion Plugin**: menerima data tersebut dan membuat node di kanvas Figma.

**Masalah:** membuat ulang halaman web yang sudah ada ke Figma secara manual memakan waktu dan tidak presisi. Versi lama CodeToFrame mencoba menyelesaikannya, tetapi kodenya sulit dilanjutkan dan alurnya terlalu manual. Pelajaran dari versi lama yang menjadi dasar rewrite ini:

| Masalah versi lama | Arah solusi |
|---|---|
| Penulisan clipboard dari content script gagal ("Document is not focused") | Ekstraksi dipisah dari penulisan clipboard |
| Paste native (Ctrl+V) ke kanvas Figma gagal | Memakai Figma plugin |
| Plugin crash karena nilai CSS flexbox tidak cocok dengan enum Auto Layout (mis. `"STRETCH"`) | Pemetaan nilai yang defensif dan terpusat |
| Alur salin JSON → tempel di textarea plugin → "Generate Design" terlalu manual | Transfer langsung dengan langkah manual minimal |

## 2. Tujuan dan non-goals

**Tujuan**
- G1. Hasil di Figma sangat mirip dengan halaman aslinya (posisi, ukuran, warna, tipografi).
- G2. Struktur frame rapi: hierarki mengikuti nesting DOM, tanpa node yang tidak perlu.
- G3. Minimal setara fungsi html.to.design dari sisi kemiripan output dan kerapian struktur frame.
- G4. Transfer dari browser ke Figma dengan sesedikit mungkin langkah manual.
- G5. Kode dan dokumen cukup jelas untuk dilanjutkan secara bertahap (termasuk oleh AI agent).

**Non-goals**
- Publikasi ke Chrome Web Store atau Figma Community.
- Mengklaim lebih baik dari html.to.design (belum diputuskan; tidak ada klaim diferensiasi).
- Konversi balik Figma → kode.
- Menangkap konten yang ditunda (bagian 5.4).
- Dukungan browser selain Chrome **[ASUMSI]**.

## 3. Target pengguna dan skenario utama

**Pengguna:** pemilik proyek, teman, dan orang lain yang memasang manual dari repo publik (load unpacked di Chrome, plugin development di Figma). Diasumsikan pengguna nyaman mengikuti instruksi instalasi teknis di README **[ASUMSI]**.

**Skenario utama**
- S1. **Tangkap halaman publik.** Pengguna membuka halaman, menekan tombol capture di extension, lalu hasilnya muncul di Figma.
- S2. **Tangkap halaman di balik login / SPA.** Pengguna login dan menavigasi aplikasi web (React/Vue) seperti biasa, lalu menangkap tampilan saat itu.
- S3. **Tangkap versi mobile.** Pengguna mengaktifkan DevTools device mode dengan lebar tertentu, lalu menangkap.
- S4. **Transfer cadangan.** Jika transfer langsung tidak tersedia, pengguna mengunduh `.json` atau menyalinnya, lalu meng-upload/drag-drop/menempel di plugin.
- S5. **Tinjau hasil.** Pengguna membaca laporan import (font yang diganti, gambar yang gagal) untuk tahu bagian mana yang perlu dirapikan manual.

## 4. Prinsip desain

1. **Akurasi dulu, baru kerapian.** Posisi dan ukuran diambil dari browser (`getBoundingClientRect`, `getComputedStyle`). Auto Layout hanya dipakai jika terbukti tidak mengubah posisi anak; jika ragu, pakai posisi absolut.
2. **Sesedikit mungkin langkah manual.** Alur utama tanpa salin-tempel; cadangan manual selalu tersedia.
3. **Sederhana.** Satu repo, batas tanggung jawab yang jelas antara extension, plugin, dan kode bersama. Data tidak lengkap ditangani dengan degradasi bertahap, bukan crash.
4. **Data diproses lokal.** Seluruh pemrosesan terjadi di mesin pengguna; tidak ada server eksternal milik CodeToFrame.

## 5. Ruang lingkup per versi

Fase dibagi berdasarkan kualitas, bukan tanggal. Fase berikutnya dimulai setelah kriteria selesai fase sebelumnya (bagian 9.2) terpenuhi.

### 5.1 v1 — Inti
- Frame mengikuti hierarki DOM dengan posisi absolut.
- Teks: font family, ukuran, bobot, warna, alignment, line-height.
- Warna latar, border, border-radius, opacity, overflow clip.
- `<img>` sebagai Image Fill (termasuk gambar lintas domain via extension).
- box-shadow.
- Transfer langsung + cadangan (download, copy, upload/drag-drop, tempel).
- Penanganan font bertingkat dan laporan import.

### 5.2 v2 — Kemiripan
- Gradient.
- `background-image`.
- SVG inline sebagai vector.
- Pseudo-element `::before` / `::after`.
- Auto Layout dengan verifikasi posisi.

### 5.3 v3 — Lanjutan
- `position: fixed` / `sticky`.
- `transform`.
- Preset viewport.
- Pengayaan penanganan font dan gambar (detail **[TERBUKA]**).

### 5.4 Ditunda / di luar cakupan awal
- iframe lintas domain.
- Shadow DOM tertutup (closed).
- `<canvas>` / WebGL.
- `<video>`.

## 6. Kompatibilitas dan keterbatasan

Sasaran jangka panjang adalah semua halaman web dengan prinsip **best effort**. Karena ekstraksi membaca halaman yang sudah dirender di tab pengguna:

| Jenis halaman | Status | Catatan |
|---|---|---|
| Halaman statis/publik | Didukung (v1) | |
| SPA (React, Vue, dll.) | Didukung pada dasarnya | Yang ditangkap adalah state saat capture |
| Halaman di balik login | Didukung pada dasarnya | Memakai sesi pengguna di tab; tidak ada login ulang |
| Konten lazy-load / infinite scroll | Sebagian | Ekstraksi menunggu muat dan memicu lazy loading; infinite scroll tak berujung tidak bisa ditangkap utuh |
| Elemen fixed/sticky | Belum akurat sebelum v3 | Bisa muncul di posisi yang salah atau berulang |
| Transform CSS | Belum akurat sebelum v3 | |
| Gradient, background-image, SVG, pseudo-element | Belum didukung sebelum v2 | |
| iframe lintas domain, closed shadow DOM, canvas/WebGL, video | Tidak didukung | Diganti placeholder **[ASUMSI]** |
| Animasi, hover/focus state | Tidak ditangkap | Hanya kondisi visual saat capture |
| Halaman yang melarang content script (mis. `chrome://`, Chrome Web Store) | Tidak bisa | Batasan platform Chrome |
| Font yang tidak terpasang di Figma | Diganti | Lihat FR-PLG-05 |
| Gambar yang gagal diambil atau melebihi batas ukuran | Placeholder | Dicatat di laporan import |

## 7. Persyaratan fungsional

### 7.1 Chrome Extension

| ID | Persyaratan | Versi |
|---|---|---|
| FR-EXT-01 | Pengguna dapat memulai capture tab aktif dengan satu aksi dari UI extension. | v1 |
| FR-EXT-02 | Capture memakai lebar viewport jendela saat ini dan tinggi halaman penuh (termasuk bagian di luar layar). | v1 |
| FR-EXT-03 | Sebelum ekstraksi, extension menunggu konten selesai dimuat dan memicu lazy loading (mis. dengan scroll ke seluruh halaman). Batas waktu tunggu **[TERBUKA]**. | v1 |
| FR-EXT-04 | Setiap elemen yang terlihat diekstrak dengan posisi dan ukuran dari `getBoundingClientRect` dan gaya dari `getComputedStyle`; hierarki mengikuti nesting DOM. | v1 |
| FR-EXT-05 | Elemen yang tidak terlihat (`display: none`, `visibility: hidden`, ukuran 0 tanpa anak terlihat) tidak diekspor **[ASUMSI]**. | v1 |
| FR-EXT-06 | Properti v1 (bagian 5.1) diekstrak untuk setiap node yang relevan. | v1 |
| FR-EXT-07 | Untuk teks, nama font asli (nilai `font-family` dan font yang benar-benar dipakai bila dapat diketahui) dicatat. | v1 |
| FR-EXT-08 | Gambar `<img>`, termasuk lintas domain, diambil oleh service worker extension (host permissions) dan disertakan sebagai data. | v1 |
| FR-EXT-09 | Gambar yang gagal diambil atau melebihi batas ukuran ditandai sebagai gagal beserta alasannya, tanpa menghentikan capture. Nilai batas ukuran **[TERBUKA]**. | v1 |
| FR-EXT-10 | Hasil capture dikirim langsung ke plugin Figma tanpa salin-tempel manual. Mekanisme diputuskan di ARCHITECTURE. | v1 |
| FR-EXT-11 | Tersedia aksi "Download .json" yang menyimpan hasil capture sebagai file. | v1 |
| FR-EXT-12 | Tersedia aksi "Copy" yang menyalin hasil capture ke clipboard, dijalankan dari konteks yang tidak bergantung pada fokus dokumen halaman. | v1 |
| FR-EXT-13 | UI extension menampilkan status capture (sedang berjalan, berhasil, gagal) dan pesan galat yang menyebut penyebabnya. | v1 |
| FR-EXT-14 | Data yang diekspor mencantumkan metadata capture: URL, judul, lebar viewport, tinggi halaman, waktu capture, versi format data. | v1 |
| FR-EXT-15 | Ekstraksi gradient, background-image, SVG inline, dan pseudo-element `::before`/`::after`. | v2 |
| FR-EXT-16 | Ekstraksi informasi layout flex/grid yang dibutuhkan untuk usulan Auto Layout. | v2 |
| FR-EXT-17 | Ekstraksi `position: fixed`/`sticky` dan `transform` tanpa duplikasi atau pergeseran akibat scroll saat capture. | v3 |
| FR-EXT-18 | Pengguna dapat memilih preset viewport sebelum capture (daftar preset **[TERBUKA]**). | v3 |

### 7.2 Figma Plugin

| ID | Persyaratan | Versi |
|---|---|---|
| FR-PLG-01 | Plugin menerima hasil capture dari extension secara langsung (pasangan FR-EXT-10). | v1 |
| FR-PLG-02 | Plugin menerima data lewat upload file, drag-drop file `.json`, dan tempel teks. | v1 |
| FR-PLG-03 | Data divalidasi sebelum dirender. Data yang tidak valid atau versi format yang tidak didukung ditolak dengan pesan yang jelas, tanpa membuat node setengah jadi. | v1 |
| FR-PLG-04 | Plugin membuat satu frame akar seukuran halaman yang ditangkap, dengan frame anak mengikuti hierarki data dan posisi absolut. | v1 |
| FR-PLG-05 | Font ditangani berurutan: (1) font yang sama tersedia di Figma, (2) padanan terdekat, (3) fallback Inter. Aturan "padanan terdekat" **[TERBUKA]**. | v1 |
| FR-PLG-06 | Nama font asli tetap tersimpan pada node teks terkait (cara penyimpanan diputuskan di ARCHITECTURE). | v1 |
| FR-PLG-07 | Properti v1 (bagian 5.1) dirender ke properti Figma yang setara. | v1 |
| FR-PLG-08 | Semua nilai CSS dipetakan ke nilai Figma melalui satu modul pemetaan terpusat. Nilai yang tidak dikenali memakai default aman dan dicatat sebagai peringatan, bukan error. | v1 |
| FR-PLG-09 | Gambar yang gagal dirender sebagai placeholder dengan ukuran dan posisi asli. | v1 |
| FR-PLG-10 | Setelah import, plugin menampilkan laporan: jumlah node dibuat, daftar font yang diganti (asli → pengganti), gambar yang gagal, dan peringatan pemetaan. | v1 |
| FR-PLG-11 | Nama layer bermakna dan dapat dilacak ke elemen asal (aturan penamaan **[TERBUKA]**). | v1 |
| FR-PLG-12 | Render gradient, background-image, SVG inline sebagai vector, dan pseudo-element. | v2 |
| FR-PLG-13 | Auto Layout diterapkan pada sebuah frame hanya jika posisi dan ukuran semua anak hasil Auto Layout sama dengan posisi asli dalam toleransi **[TERBUKA]**; jika tidak, frame tetap memakai posisi absolut. | v2 |
| FR-PLG-14 | Render fixed/sticky dan transform. | v3 |

## 8. Persyaratan non-fungsional

| ID | Persyaratan |
|---|---|
| NFR-01 Performa | Pada halaman besar, capture dan import selesai tanpa membekukan tab atau Figma dan menampilkan progres. Ambang angka (jumlah node dan waktu maksimum) **[TERBUKA]**. |
| NFR-02 Ketahanan | Node atau properti yang hilang/tidak valid tidak menghentikan proses; node tersebut dilewati atau memakai default dan dicatat di laporan. Satu error di satu node tidak boleh menggagalkan seluruh import. |
| NFR-03 Privasi | Data halaman (DOM, teks, gambar) hanya diproses dan dikirim di mesin pengguna (browser, plugin Figma, dan bila ada, komponen lokal). Tidak ada telemetri atau pengiriman ke server pihak ketiga oleh CodeToFrame. |
| NFR-04 Kompatibilitas Chrome | Extension memakai Manifest V3 dan berjalan di Chrome versi stabil terbaru saat pengujian **[ASUMSI]**. |
| NFR-05 Kompatibilitas Figma | Plugin berjalan di Figma desktop app dan Figma di browser, versi terbaru saat pengujian **[ASUMSI]**. |
| NFR-06 Instalasi | README berisi langkah instalasi manual (load unpacked, import plugin development) yang dapat diikuti dari repo yang baru di-clone. |
| NFR-07 Kompatibilitas format data | Data membawa nomor versi format; plugin menolak versi yang tidak didukung dengan pesan jelas (FR-PLG-03). |

## 9. Kriteria sukses

### 9.1 Metode uji
- Disiapkan **halaman uji (fixture)** HTML lokal per fitur dengan nilai yang diketahui pasti.
- "Persis" berarti posisi dan ukuran sama dalam toleransi **±1 px [ASUMSI]**, warna sama dalam nilai RGB dan alpha, dan properti teks sama nilainya.
- Untuk halaman nyata, dipakai **daftar halaman acuan** yang dibandingkan dengan screenshot asli. Daftar halaman dan metode pembandingan **[TERBUKA]**.

### 9.2 Kriteria selesai per fase

**v1 selesai jika:**
- K1-01. Tombol 120×40 px, latar `#2563EB`, border-radius 8 px, teks "Klik" (Inter 16 px, bobot 600, putih, rata tengah) muncul di Figma dengan ukuran, posisi, warna, radius, dan properti teks yang sama.
- K1-02. Kotak dengan border 2 px solid, opacity 0.5, dan box-shadow `0 4px 12px rgba(0,0,0,0.25)` dirender dengan nilai yang sama.
- K1-03. Kontainer `overflow: hidden` memotong anaknya di Figma (clip content aktif).
- K1-04. `<img>` dari domain lain muncul sebagai Image Fill dengan ukuran sama; gambar yang sengaja dibuat gagal muncul sebagai placeholder dan tercatat di laporan.
- K1-05. Teks dengan font yang tidak ada di Figma dirender dengan pengganti, dan laporan menampilkan nama font asli serta penggantinya.
- K1-06. Hierarki layer di Figma sama dengan nesting elemen terlihat di fixture.
- K1-07. Alur langsung: dari menekan capture sampai frame muncul di Figma, pengguna tidak melakukan salin-tempel. Jumlah maksimum langkah **[TERBUKA]**.
- K1-08. Keempat jalur cadangan (download, copy, upload/drag-drop, tempel) menghasilkan frame yang identik dengan jalur langsung.
- K1-09. Fixture berisi nilai CSS yang tidak dikenali (termasuk nilai flex seperti `stretch`) di-import tanpa crash, dan peringatan tercatat.
- K1-10. JSON rusak atau tidak lengkap ditolak/diproses sebagian sesuai FR-PLG-03 dan NFR-02, tanpa crash plugin.
- K1-11. Halaman SPA dan halaman di balik login dari daftar acuan dapat ditangkap.

**v2 selesai jika:**
- K2-01. Linear gradient dua warna dengan sudut tertentu dirender dengan sudut dan color stop yang sama.
- K2-02. Ikon SVG inline menjadi node vector yang dapat diedit, bukan gambar raster.
- K2-03. Badge yang dibuat lewat `::before` muncul di posisi dan ukuran yang sama.
- K2-04. Kontainer flex baris dengan 3 anak berjarak `gap` 16 px menjadi Auto Layout horizontal dengan spacing 16, dan posisi anak tetap sama.
- K2-05. Kontainer flex yang hasil Auto Layout-nya tidak cocok (mis. memakai margin negatif) tetap memakai posisi absolut.

**v3 selesai jika:**
- K3-01. Header `position: fixed` muncul sekali di posisi atas halaman, tidak berulang dan tidak tergeser.
- K3-02. Elemen dengan `transform: rotate(…)` dirender dengan rotasi yang sama.
- K3-03. Memilih preset viewport menghasilkan frame akar dengan lebar preset tersebut.

## 10. Risiko teknis dan asumsi

**Risiko**
- R1. **Transfer langsung extension → plugin.** Sandbox plugin Figma dan batasan MV3 membatasi komunikasi; mekanisme (mis. relay localhost) bisa menambah langkah instalasi. Mitigasi: jalur cadangan wajib sejak v1.
- R2. **Halaman besar.** Jumlah node dan data gambar yang besar dapat membuat capture/import lambat atau melebihi batas memori.
- R3. **Perbedaan model render.** Beberapa perilaku CSS (line-height, letter-spacing, text wrapping, subpixel) tidak punya padanan persis di Figma; teks bisa membungkus berbeda.
- R4. **Font.** Font web yang tidak tersedia di Figma pasti mengubah metrik teks walaupun ada padanan.
- R5. **Lazy loading.** Tidak semua pola lazy load terpicu oleh scroll; sebagian konten bisa hilang.
- R6. **Verifikasi Auto Layout.** Perhitungan bisa terlalu ketat (jarang dipakai) atau terlalu longgar (menggeser layout).
- R7. **Perubahan API.** Perubahan API Chrome atau Figma dapat merusak fungsi yang ada.

**Asumsi** (selain yang ditandai [ASUMSI] di atas)
- A1. Pengguna memakai Chrome desktop dan akun Figma yang dapat menjalankan plugin development.
- A2. Pengguna bertanggung jawab atas halaman yang ditangkap; tidak ada bagian hukum/etika di PRD ini.
- A3. Teknologi (TypeScript, Vite atau esbuild, satu repo dengan folder `extension`, `plugin`, `shared`) adalah kecenderungan, difinalkan di ARCHITECTURE.

## 11. Pertanyaan terbuka

1. **Mekanisme transfer langsung** dan berapa langkah manual maksimum yang dapat diterima (K1-07)? Apakah komponen lokal tambahan (mis. relay) boleh diinstal pengguna? → ARCHITECTURE.
2. **Batas ukuran gambar** (per gambar dan total) dan format placeholder (FR-EXT-09).
3. **Ambang performa**: jumlah node "halaman besar" dan waktu maksimum capture/import (NFR-01).
4. **Toleransi akurasi**: apakah ±1 px sudah tepat, dan toleransi untuk verifikasi Auto Layout (FR-PLG-13)?
5. **Aturan "padanan font terdekat"** (FR-PLG-05): berdasarkan nama, kategori (serif/sans/mono), atau daftar pemetaan manual?
6. **Daftar halaman acuan** untuk uji halaman nyata dan metode pembandingan dengan screenshot (9.1).
7. **Aturan penamaan layer** (FR-PLG-11): nama tag, class, id, atau isi teks?
8. **Batas waktu tunggu** sebelum ekstraksi dan perilaku untuk infinite scroll (FR-EXT-03).
9. **Placeholder untuk konten yang tidak didukung** (iframe, canvas, video): kotak abu-abu bertanda, screenshot area, atau dilewati?
10. **Preset viewport v3**: daftar lebarnya, dan apakah capture dengan preset mengubah ukuran jendela pengguna.
11. **Isi "pengayaan penanganan font dan gambar" di v3.**
12. **Figma di browser**: apakah wajib didukung, atau cukup Figma desktop (NFR-05)?
