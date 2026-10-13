# CodeToFrame — Product Requirements Document (PRD)

| | |
|---|---|
| Pemilik | Indra Pramudya |
| Status | Draft |
| Versi | 0.5 (revisi 2026-10-13) |
| Dokumen terkait | `docs/ARCHITECTURE.md` (v0.1.2), `docs/SCHEMA.md` (v0.1.1) |

Label yang dipakai di dokumen ini:
- **[ASUMSI]**: belum diputuskan pemilik, dipakai sementara agar persyaratan bisa diuji. Wajib dikonfirmasi atau diganti.
- **[TERBUKA]**: dirujuk ke bagian 11.2 (Pertanyaan terbuka tersisa). Saat ini tidak ada yang tersisa.
- **[DITENTUKAN DI ARCHITECTURE]**: arah sudah diputuskan, nilai atau angka pastinya ditetapkan di `docs/ARCHITECTURE.md`.

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
- G2. Struktur frame rapi: hierarki mengikuti nesting DOM, tanpa node yang tidak perlu. Di v1, "tanpa node yang tidak perlu" tidak berarti meratakan wrapper, karena hierarki frame harus sama dengan nesting elemen yang menggambar kotak atau berperan sebagai wadah (K1-06). Elemen inline polos (`display: inline` tanpa background, border, atau shadow, dengan opacity 1) diserap menjadi run teks, bukan layer terpisah. Perataan wrapper adalah kandidat opsi di versi berikutnya (5.4).
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
- `<img>` sebagai Image Fill (termasuk gambar lintas domain via extension). `<img>` berformat SVG dirasterisasi bila memungkinkan **[ASUMSI]** (bergantung pada spike SP-06 di ARCHITECTURE), dan menjadi vector di v2.
- box-shadow.
- Transfer langsung + cadangan (download, copy, upload/drag-drop, tempel).
- Penanganan font bertingkat, laporan ekstraksi dan laporan import, serta indikator progres.
- Kotak abu-abu bertanda untuk gambar gagal dan konten yang tidak didukung.

### 5.2 v2 — Kemiripan
- Gradient.
- `background-image`.
- SVG inline sebagai vector.
- Pseudo-element `::before` / `::after`.
- Auto Layout dengan verifikasi posisi.
- Penelusuran open shadow DOM **[ASUMSI: v2]**.

### 5.3 v3 — Lanjutan
- `position: fixed` / `sticky`.
- `transform`.
- Preset viewport: Desktop 1440, Tablet 768, Mobile 375.
- Pengayaan penanganan font dan gambar: ditunda, isinya diputuskan setelah v2 selesai.

### 5.4 Ditunda / di luar cakupan awal
- iframe lintas domain.
- Shadow DOM tertutup (closed).
- `<canvas>` / WebGL.
- `<video>`.
- Partial capture (hanya elemen yang dipilih pengguna): kandidat fitur setelah v2. v1 dan v2 menangkap seluruh halaman; format data disiapkan agar fitur ini bisa ditambahkan kemudian (NFR-08).
- Perataan wrapper (G2): kandidat opsi di versi berikutnya; v1 mempertahankan hierarki sesuai nesting elemen terlihat (K1-06).
- iframe same-origin: di v1 diperlakukan sama dengan iframe lintas domain, yaitu menjadi placeholder.

## 6. Kompatibilitas dan keterbatasan

Sasaran jangka panjang adalah semua halaman web dengan prinsip **best effort**. Karena ekstraksi membaca halaman yang sudah dirender di tab pengguna:

| Jenis halaman | Status | Catatan |
|---|---|---|
| Halaman statis/publik | Didukung (v1) | |
| SPA (React, Vue, dll.) | Didukung pada dasarnya | Yang ditangkap adalah state saat capture |
| Halaman di balik login | Didukung pada dasarnya | Memakai sesi pengguna di tab; tidak ada login ulang |
| Konten lazy-load / infinite scroll | Sebagian | Ekstraksi menunggu muat beberapa detik dan memicu lazy loading dengan batas jumlah scroll (FR-EXT-03); infinite scroll dipotong pada batas itu dan dicatat di laporan |
| Halaman sangat panjang (jumlah node besar) | Sebagian | Dapat menyebabkan masalah performa; mungkin perlu pembatasan kedalaman atau jumlah node. Ambang mengikuti hasil pengukuran (NFR-01) |
| Elemen fixed/sticky | Belum akurat sebelum v3 | Bisa muncul di posisi yang salah atau berulang |
| Transform CSS | Belum akurat sebelum v3 | |
| Gradient, background-image, SVG inline, pseudo-element | Belum didukung sebelum v2 | |
| Open shadow DOM | Parsial **[ASUMSI: v2]** | Elemen di dalam open shadow root dapat diakses, tetapi penelusuran shadow tree perlu diimplementasikan (FR-EXT-20) |
| Closed shadow DOM | Tidak didukung | Isi shadow root tidak dapat dibaca |
| iframe lintas domain, canvas/WebGL, video | Tidak didukung | Diganti kotak abu-abu bertanda jenis kontennya (FR-PLG-16) |
| iframe same-origin | Tidak didukung di v1 | Diperlakukan sama dengan iframe lintas domain: menjadi placeholder |
| `<img>` berformat SVG | Dirasterisasi di v1 bila memungkinkan **[ASUMSI]** | Bergantung pada spike SP-06 (ARCHITECTURE); menjadi vector di v2 |
| Animasi, hover/focus state | Tidak ditangkap | Hanya kondisi visual saat capture |
| Halaman yang melarang content script (mis. `chrome://`, Chrome Web Store) | Tidak bisa | Batasan platform Chrome |
| Font yang tidak terpasang di Figma | Diganti | Lihat FR-PLG-05 |
| Gambar yang gagal diambil, diblokir server, atau melebihi batas ukuran | Kotak abu-abu bertanda | Dicatat di laporan import (R8) |

## 7. Persyaratan fungsional

### 7.1 Chrome Extension

| ID | Persyaratan | Versi |
|---|---|---|
| FR-EXT-01 | Pengguna dapat memulai capture tab aktif dengan satu aksi dari UI extension. | v1 |
| FR-EXT-02 | Capture memakai lebar viewport jendela saat ini dan tinggi halaman penuh (termasuk bagian di luar layar). | v1 |
| FR-EXT-03 | Sebelum ekstraksi, extension menunggu konten selesai dimuat dan memicu lazy loading (mis. dengan scroll ke seluruh halaman). Waktu tunggu beberapa detik dengan batas jumlah scroll; angka pasti **[DITENTUKAN DI ARCHITECTURE]**. Bila batas tercapai (mis. infinite scroll), konten dipotong pada batas itu dan pemotongan dicatat di laporan (FR-EXT-19). | v1 |
| FR-EXT-04 | Setiap elemen yang terlihat diekstrak dengan posisi dan ukuran dari `getBoundingClientRect` dan gaya dari `getComputedStyle`; hierarki mengikuti nesting DOM. | v1 |
| FR-EXT-05 | Elemen yang tidak terlihat (`display: none`, `visibility: hidden`, ukuran 0 tanpa anak terlihat) tidak diekspor **[ASUMSI]**. Pengecualian: elemen `visibility: hidden` yang punya keturunan terlihat tetap dicatat (kotaknya tidak digambar) untuk menjaga hierarki. Elemen di dalam area halaman penuh tetap ditangkap, termasuk yang berada di bawah layar. Elemen dilewati jika (a) berada sepenuhnya di luar area halaman (koordinat negatif atau melewati dimensi dokumen, mis. menu off-canvas atau teks tersembunyi yang diposisikan jauh di luar layar), atau (b) sepenuhnya terpotong oleh `overflow: hidden` induknya **[ASUMSI]** (A6). Jumlah elemen yang dilewati dicatat di laporan (FR-EXT-19). | v1 |
| FR-EXT-06 | Properti v1 (bagian 5.1) diekstrak untuk setiap node yang relevan. | v1 |
| FR-EXT-07 | Untuk teks, nama font asli (nilai `font-family` dan perkiraan font yang dipakai, yaitu keluarga pertama di `font-family` yang tersedia menurut `document.fonts`) dicatat. Font yang benar-benar dirender tidak dapat diketahui karena browser tidak mengeksposnya tanpa `chrome.debugger`. | v1 |
| FR-EXT-08 | Gambar `<img>`, termasuk lintas domain, diambil oleh service worker extension (host permissions) dan disertakan sebagai data. | v1 |
| FR-EXT-09 | Gambar yang gagal diambil atau melebihi batas ukuran ditandai sebagai gagal beserta alasannya, tanpa menghentikan capture. Batas ukuran per gambar dan total per capture **[DITENTUKAN DI ARCHITECTURE]**. | v1 |
| FR-EXT-10 | Hasil capture dikirim langsung ke plugin Figma tanpa salin-tempel manual. Komponen lokal tambahan (mis. relay localhost) diperbolehkan; mekanisme diputuskan di ARCHITECTURE. Prasyarat: plugin sedang terbuka di Figma (FR-EXT-21, A7). Opsi agar komponen lokal menyimpan capture terakhir sementara di memori, sehingga plugin dapat mengambilnya saat dibuka dan urutan langkah pengguna tidak kaku, **[DITENTUKAN DI ARCHITECTURE]**. | v1 |
| FR-EXT-11 | Tersedia aksi "Download .json" yang menyimpan hasil capture sebagai file. | v1 |
| FR-EXT-12 | Tersedia aksi "Copy" yang menyalin hasil capture ke clipboard, dijalankan dari konteks yang tidak bergantung pada fokus dokumen halaman. Copy praktis hanya untuk capture kecil, karena gambar tertanam base64 dapat membuat teks mencapai puluhan MB; untuk capture besar dianjurkan Download lalu upload file. | v1 |
| FR-EXT-13 | UI extension menampilkan indikator progres selama capture (tahap yang sedang berjalan), status akhir (berhasil, gagal), dan pesan galat yang menyebut penyebabnya. | v1 |
| FR-EXT-14 | Data yang diekspor mencantumkan metadata capture: URL, judul, lebar viewport, tinggi halaman, waktu capture, versi format data. URL halaman dicatat tanpa query string dan hash. | v1 |
| FR-EXT-15 | Ekstraksi gradient, background-image, SVG inline, dan pseudo-element `::before`/`::after`. | v2 |
| FR-EXT-16 | Ekstraksi informasi layout flex/grid yang dibutuhkan untuk usulan Auto Layout. | v2 |
| FR-EXT-17 | Ekstraksi `position: fixed`/`sticky` dan `transform` tanpa duplikasi atau pergeseran akibat scroll saat capture. | v3 |
| FR-EXT-18 | Pengguna dapat memilih preset viewport sebelum capture: Desktop 1440, Tablet 768, Mobile 375. Preset diemulasikan lewat extension tanpa mengubah ukuran jendela pengguna. | v3 |
| FR-EXT-19 | Setelah ekstraksi, extension menampilkan laporan ringkas: jumlah elemen, jumlah gambar (berhasil/gagal), font yang dipakai, jumlah elemen yang dilewati karena berada di luar area halaman atau terpotong penuh (FR-EXT-05), serta peringatan dan error (termasuk pemotongan karena batas scroll). | v1 |
| FR-EXT-20 | Elemen di dalam open shadow root ditelusuri dan diekstrak seperti elemen DOM biasa. | **[ASUMSI: v2]** |
| FR-EXT-21 | Sebelum atau saat capture, extension memeriksa status koneksi transfer langsung (komponen lokal aktif, plugin terhubung). Jika belum siap, extension menampilkan pesan yang jelas (mis. meminta pengguna membuka plugin di Figma) dan menawarkan jalur cadangan (FR-EXT-11, FR-EXT-12). | v1 |

### 7.2 Figma Plugin

| ID | Persyaratan | Versi |
|---|---|---|
| FR-PLG-01 | Plugin menerima hasil capture dari extension secara langsung (pasangan FR-EXT-10). Plugin yang sedang terbuka di Figma adalah prasyarat transfer langsung; bila plugin belum terbuka, pengguna diberi tahu lewat extension (FR-EXT-21). | v1 |
| FR-PLG-02 | Plugin menerima data lewat upload file, drag-drop file `.json`, dan tempel teks. Tempel teks praktis hanya untuk capture kecil (lihat FR-EXT-12); untuk capture besar dianjurkan upload file. K1-08 tetap berlaku pada fixture. | v1 |
| FR-PLG-03 | Data divalidasi sebelum dirender. Data yang tidak valid atau versi format yang tidak didukung ditolak dengan pesan yang jelas, tanpa membuat node setengah jadi. Ketentuan "tanpa node setengah jadi" berlaku untuk penolakan validasi. Error tak terduga di tengah render menyisakan frame akar bertanda "… (tidak lengkap)" disertai laporan error, sesuai degradasi bertahap (NFR-02). | v1 |
| FR-PLG-04 | Plugin membuat satu frame akar seukuran halaman yang ditangkap, dengan frame anak mengikuti hierarki data dan posisi absolut. | v1 |
| FR-PLG-05 | Font ditangani berurutan: (1) font yang sama tersedia di Figma, (2) padanan terdekat, (3) fallback Inter. Padanan terdekat dicari berdasarkan nama terlebih dahulu, lalu kategori (serif/sans/mono), dengan daftar pemetaan manual kecil untuk kasus umum. | v1 |
| FR-PLG-06 | Nama font asli tetap tersimpan pada node teks terkait (cara penyimpanan diputuskan di ARCHITECTURE). | v1 |
| FR-PLG-07 | Properti v1 (bagian 5.1) dirender ke properti Figma yang setara. | v1 |
| FR-PLG-08 | Semua nilai CSS dipetakan ke nilai Figma melalui satu modul pemetaan terpusat. Nilai yang tidak dikenali memakai default aman dan dicatat sebagai peringatan, bukan error. | v1 |
| FR-PLG-09 | Gambar yang gagal atau melebihi batas ukuran dirender sebagai kotak abu-abu bertanda dengan ukuran dan posisi asli. | v1 |
| FR-PLG-10 | Setelah import, plugin menampilkan laporan: jumlah node dibuat, daftar font yang diganti (asli → pengganti), gambar yang gagal, dan peringatan pemetaan. | v1 |
| FR-PLG-11 | Nama layer bermakna dan dapat dilacak ke elemen asal: tag + class utama, atau tag + isi teks singkat untuk node teks. Contoh: `div.header`, `h1 "Selamat datang"`. | v1 |
| FR-PLG-12 | Render gradient, background-image, SVG inline sebagai vector, dan pseudo-element. | v2 |
| FR-PLG-13 | Auto Layout diterapkan pada sebuah frame hanya jika posisi dan ukuran semua anak hasil Auto Layout sama dengan posisi asli dalam toleransi (default ±1 px, dapat dikonfigurasi; lihat 9.1); jika tidak, frame tetap memakai posisi absolut. | v2 |
| FR-PLG-14 | Render fixed/sticky dan transform. | v3 |
| FR-PLG-15 | Plugin menampilkan indikator progres selama import. | v1 |
| FR-PLG-16 | Konten yang tidak didukung (iframe lintas domain dan iframe same-origin, canvas/WebGL, video; di data, kedua jenis iframe memakai satu nilai placeholder `iframe`) dirender sebagai kotak abu-abu bertanda jenis kontennya, dengan ukuran dan posisi asli. | v1 |

## 8. Persyaratan non-fungsional

| ID | Persyaratan |
|---|---|
| NFR-01 Performa | Pada halaman besar, capture dan import selesai tanpa membekukan tab atau Figma dan menampilkan progres (FR-EXT-13, FR-PLG-15). Ambang angka (jumlah node "halaman besar", waktu maksimum) tidak dikunci sekarang; ditetapkan setelah pengukuran pada implementasi awal. Metrik yang diukur: waktu ekstraksi, waktu rendering, jumlah node, ukuran JSON. Hasil pengukuran juga menentukan perlu tidaknya pembatasan kedalaman atau jumlah node. |
| NFR-02 Ketahanan | Node atau properti yang hilang/tidak valid tidak menghentikan proses; node tersebut dilewati atau memakai default dan dicatat di laporan. Satu error di satu node tidak boleh menggagalkan seluruh import. |
| NFR-03 Privasi | Data halaman (DOM, teks, gambar) hanya diproses dan dikirim di mesin pengguna (browser, plugin Figma, dan bila ada, komponen lokal). Tidak ada telemetri atau pengiriman ke server pihak ketiga oleh CodeToFrame. URL halaman dan URL gambar yang ditulis ke data capture dicatat tanpa query string dan hash; pengambilan gambar tetap memakai URL penuh. |
| NFR-04 Kompatibilitas Chrome | Extension memakai Manifest V3 dan berjalan di Chrome versi stabil terbaru saat pengujian **[ASUMSI]**. |
| NFR-05 Kompatibilitas Figma | Plugin berjalan di Figma Desktop, versi terbaru saat pengujian **[ASUMSI]**. Figma di browser tidak wajib untuk saat ini. |
| NFR-06 Instalasi | README berisi langkah penyiapan awal manual (prasyarat Node.js LTS untuk build dan menjalankan komponen lokal; load unpacked, import plugin development, menjalankan komponen lokal bila diperlukan oleh mekanisme transfer yang dipilih, dan pairing token sekali) yang dapat diikuti dari repo yang baru di-clone. |
| NFR-07 Kompatibilitas format data | Data membawa nomor versi format; plugin menolak versi yang tidak didukung dengan pesan jelas (FR-PLG-03). |
| NFR-08 Maintainability | Format data (SCHEMA) memungkinkan root hasil capture berupa elemen mana pun, bukan hanya `body`, agar partial capture (5.4) dapat ditambahkan kemudian tanpa mengubah format **[ASUMSI]**. |

## 9. Kriteria sukses

### 9.1 Metode uji
- Disiapkan **halaman uji (fixture)** HTML lokal per fitur dengan nilai yang diketahui pasti.
- "Persis" berarti posisi dan ukuran sama dalam toleransi **±1 px**, warna sama dalam nilai RGB dan alpha, dan properti teks sama nilainya. Toleransi ±1 px adalah nilai awal yang konservatif, berlaku juga untuk verifikasi Auto Layout (FR-PLG-13), dan dapat dikonfigurasi; nilai final ditentukan dari hasil pengujian.
- Untuk halaman nyata, dipakai **daftar halaman acuan** berisi 5 sampai 8 halaman dari yang sederhana sampai kompleks, termasuk satu halaman React dan satu halaman tampilan mobile. Agar K1-11 dapat diuji, daftar juga perlu memuat satu halaman di balik login. Hasil dibandingkan dengan overlay screenshot halaman asli.
- **Tugas belum diisi (Indra):** pilih halaman konkret untuk daftar acuan:
  1. _(belum diisi)_
  2. _(belum diisi)_
  3. _(belum diisi)_
  4. _(belum diisi)_
  5. _(belum diisi)_

### 9.2 Kriteria selesai per fase

**v1 selesai jika:**
- K1-01. Tombol 120×40 px, latar `#2563EB`, border-radius 8 px, teks "Klik" (Inter 16 px, bobot 600, putih, rata tengah) muncul di Figma dengan ukuran, posisi, warna, radius, dan properti teks yang sama.
- K1-02. Kotak dengan border 2 px solid, opacity 0.5, dan box-shadow `0 4px 12px rgba(0,0,0,0.25)` dirender dengan nilai yang sama.
- K1-03. Kontainer `overflow: hidden` memotong anaknya di Figma (clip content aktif).
- K1-04. `<img>` dari domain lain muncul sebagai Image Fill dengan ukuran sama; gambar yang sengaja dibuat gagal muncul sebagai placeholder dan tercatat di laporan.
- K1-05. Teks dengan font yang tidak ada di Figma dirender dengan pengganti, dan laporan menampilkan nama font asli serta penggantinya.
- K1-06. Hierarki layer di Figma sama dengan nesting elemen yang menggambar kotak atau berperan sebagai wadah di fixture; elemen inline polos diserap menjadi run teks, bukan layer terpisah (11.1 no. 23).
- K1-07. Alur langsung: setelah penyiapan awal (pasang extension, impor plugin, jalankan komponen lokal bila diperlukan oleh mekanisme transfer yang dipilih, dan pairing token sekali) dan dengan plugin sudah terbuka di Figma, setiap capture membutuhkan maksimal 1 langkah manual, yaitu klik "Capture" di extension, sampai frame muncul di Figma.
- K1-08. Keempat jalur cadangan (download, copy, upload/drag-drop, tempel) menghasilkan frame yang identik dengan jalur langsung.
- K1-09. Fixture berisi nilai CSS yang tidak dikenali (termasuk nilai flex seperti `stretch`) di-import tanpa crash, dan peringatan tercatat.
- K1-10. JSON rusak atau tidak lengkap ditolak/diproses sebagian sesuai FR-PLG-03 dan NFR-02, tanpa crash plugin.
- K1-11. Halaman SPA dan halaman di balik login dari daftar acuan dapat ditangkap.
- K1-12. Selama capture dan import, indikator progres tampil di extension dan di plugin; setelah ekstraksi fixture, laporan ringkas extension menampilkan jumlah elemen, jumlah gambar, font, dan peringatan yang sesuai isi fixture.
- K1-13. Fixture berisi iframe lintas domain, iframe same-origin, canvas, dan video menghasilkan kotak abu-abu bertanda jenis kontennya dengan ukuran dan posisi asli.

**v2 selesai jika:**
- K2-01. Linear gradient dua warna dengan sudut tertentu dirender dengan sudut dan color stop yang sama.
- K2-02. Ikon SVG inline menjadi node vector yang dapat diedit, bukan gambar raster.
- K2-03. Badge yang dibuat lewat `::before` muncul di posisi dan ukuran yang sama.
- K2-04. Kontainer flex baris dengan 3 anak berjarak `gap` 16 px menjadi Auto Layout horizontal dengan spacing 16, dan posisi anak tetap sama.
- K2-05. Kontainer flex yang hasil Auto Layout-nya tidak cocok (mis. memakai margin negatif) tetap memakai posisi absolut.
- K2-06. Elemen di dalam open shadow root muncul di Figma seperti elemen DOM biasa **[ASUMSI: v2]**.

**v3 selesai jika:**
- K3-01. Header `position: fixed` muncul sekali di posisi atas halaman, tidak berulang dan tidak tergeser.
- K3-02. Elemen dengan `transform: rotate(…)` dirender dengan rotasi yang sama.
- K3-03. Memilih preset viewport menghasilkan frame akar dengan lebar preset tersebut, tanpa mengubah ukuran jendela browser pengguna.

## 10. Risiko teknis dan asumsi

**Risiko**

| ID | Risiko | Dampak | Mitigasi |
|---|---|---|---|
| R1 | **Transfer langsung extension → plugin.** Sandbox plugin Figma dan batasan MV3 membatasi komunikasi; mekanisme (mis. relay localhost) bisa menambah langkah instalasi. | Alur langsung gagal atau penyiapan awal bertambah. | Jalur cadangan wajib sejak v1 (FR-EXT-11, FR-EXT-12, FR-PLG-02); mekanisme dikaji di ARCHITECTURE. |
| R2 | **Halaman besar / sangat panjang.** Jumlah node dan data gambar yang besar. | Capture/import lambat, tab atau Figma membeku, atau melebihi batas memori. | Ukur metrik NFR-01 dan tetapkan ambang dari hasilnya; bila perlu batasi kedalaman atau jumlah node; batas ukuran gambar (FR-EXT-09); indikator progres (FR-EXT-13, FR-PLG-15). |
| R3 | **Perbedaan model render.** Beberapa perilaku CSS (line-height, letter-spacing, text wrapping, subpixel) tidak punya padanan persis di Figma. | Teks bisa membungkus berbeda dan posisi bergeser dari aslinya. | Posisi dan ukuran diambil dari browser (prinsip 1); selisih diukur lewat fixture dan halaman acuan (9.1). |
| R4 | **Font.** Font web yang tidak tersedia di Figma. | Metrik teks pasti berubah walaupun ada padanan. | Penanganan font bertingkat (FR-PLG-05), nama font asli disimpan (FR-PLG-06), dan dilaporkan (FR-PLG-10). |
| R5 | **Lazy loading.** Tidak semua pola lazy load terpicu oleh scroll. | Sebagian konten hilang dari hasil capture. | Menunggu dan scroll dengan batas (FR-EXT-03); pemotongan dicatat di laporan (FR-EXT-19). |
| R6 | **Verifikasi Auto Layout.** Perhitungan bisa terlalu ketat atau terlalu longgar. | Auto Layout jarang dipakai, atau layout bergeser. | Verifikasi dengan toleransi yang dapat dikonfigurasi dan default posisi absolut (FR-PLG-13); nilai final dari hasil uji (9.1). |
| R7 | **Perubahan API.** Perubahan API Chrome atau Figma. | Fungsi yang sudah ada rusak. | Kriteria 9.2 diuji ulang pada versi terbaru (NFR-04, NFR-05). |
| R8 | **Gambar diblokir server.** Beberapa server memblokir permintaan gambar dari extension meskipun lewat service worker. | Gambar hilang dari hasil. | Kotak abu-abu bertanda (FR-PLG-09) disertai laporan (FR-PLG-10), sehingga pengguna bisa menambahkan gambar manual. |

**Asumsi** (selain yang ditandai [ASUMSI] di atas)

| ID | Asumsi | Perlu divalidasi? |
|---|---|---|
| A1 | Pengguna memakai Chrome desktop, akun Figma yang dapat menjalankan plugin development, dan Node.js LTS (untuk build dan menjalankan komponen lokal), serta melakukan pairing token sekali saat penyiapan awal. | Tidak (prasyarat penggunaan) |
| A2 | Pengguna bertanggung jawab atas halaman yang ditangkap; tidak ada bagian hukum/etika di PRD ini. | Tidak |
| A3 | Teknologi (TypeScript, Vite atau esbuild, satu repo dengan folder `extension`, `plugin`, `shared`) adalah kecenderungan, difinalkan di ARCHITECTURE. | Ya, di ARCHITECTURE |
| A4 | Font Inter tersedia sebagai fallback default di semua instalasi Figma. | Ya |
| A5 | Figma Plugin API mendukung semua operasi yang dibutuhkan (Frame, Text, Vector, Image Fill, shadow, Auto Layout). | Ya; dukungan Vector node perlu investigasi lebih lanjut |
| A6 | Aturan elemen di luar area halaman (FR-EXT-05): elemen di dalam area halaman penuh ditangkap; elemen yang sepenuhnya di luar area halaman atau sepenuhnya terpotong `overflow: hidden` induknya dilewati. | Ya, pada halaman acuan (9.1) |
| A7 | Plugin Figma hanya aktif saat dibuka pengguna dan tidak dapat dijalankan dari luar. | Ya, di ARCHITECTURE |

## 11. Keputusan dan pertanyaan terbuka

### 11.1 Keputusan yang sudah dibuat

| No. | Pertanyaan | Keputusan | Lokasi dampak |
|---|---|---|---|
| 1 | Mekanisme transfer langsung dan langkah manual maksimum | Komponen lokal (relay localhost) boleh. Maksimal 1 langkah manual per capture (klik "Capture") setelah penyiapan awal. Mekanisme detail di ARCHITECTURE. | FR-EXT-10, NFR-06, K1-07 |
| 2 | Batas ukuran gambar dan placeholder | Nilai awal per gambar dan total per capture [DITENTUKAN DI ARCHITECTURE]. Placeholder: kotak abu-abu bertanda. | 6, FR-EXT-09, FR-PLG-09 |
| 3 | Ambang performa | Tidak dikunci; ditetapkan setelah pengukuran awal. Metrik: waktu ekstraksi, waktu rendering, jumlah node, ukuran JSON. | 6, NFR-01, R2 |
| 4 | Toleransi akurasi | Mulai ±1 px untuk akurasi umum dan verifikasi Auto Layout, dapat dikonfigurasi; nilai final dari hasil uji. | 9.1, FR-PLG-13 |
| 5 | Aturan padanan font terdekat | Nama dulu, lalu kategori (serif/sans/mono), plus daftar pemetaan manual kecil untuk kasus umum. | FR-PLG-05 |
| 6 | Daftar halaman acuan dan metode | 5–8 halaman sederhana sampai kompleks, termasuk satu React dan satu tampilan mobile; overlay screenshot. Halaman konkret dipilih Indra. | 9.1 |
| 7 | Penamaan layer | Tag + class utama, atau isi teks singkat untuk node teks (`div.header`, `h1 "Selamat datang"`). | FR-PLG-11 |
| 8 | Batas waktu tunggu dan infinite scroll | Beberapa detik dengan batas jumlah scroll; infinite scroll dipotong dan dicatat di laporan. Angka di ARCHITECTURE. | 6, FR-EXT-03, FR-EXT-19 |
| 9 | Placeholder konten tidak didukung | Kotak abu-abu bertanda jenis kontennya. | 6, FR-PLG-16, K1-13 |
| 10 | Preset viewport v3 | Desktop 1440, Tablet 768, Mobile 375; diemulasikan lewat extension tanpa mengubah ukuran jendela. | 5.3, FR-EXT-18, K3-03 |
| 11 | Pengayaan font dan gambar v3 | Ditunda, diputuskan setelah v2 selesai. | 5.3 |
| 12 | Dukungan Figma di browser | Tidak wajib; cukup Figma Desktop untuk saat ini. | NFR-05 |
| 13 | Partial capture | Ditunda; v1 dan v2 menangkap seluruh halaman. Kandidat fitur setelah v2. Format data disiapkan agar root bisa elemen mana pun. | 5.4, NFR-08 |
| 14 | Elemen di luar viewport | Elemen di dalam area halaman penuh ditangkap; dilewati jika sepenuhnya di luar area halaman atau sepenuhnya terpotong `overflow: hidden` induk. Jumlahnya dicatat di laporan. [ASUMSI], divalidasi pada halaman acuan. | FR-EXT-05, FR-EXT-19, A6 |
| 15 | Plugin harus terbuka? | Ya, prasyarat transfer langsung. Extension memeriksa koneksi dan menawarkan jalur cadangan bila belum siap. Penyimpanan capture terakhir di komponen lokal [DITENTUKAN DI ARCHITECTURE]. | FR-EXT-10, FR-EXT-21, FR-PLG-01, K1-07, A7 |
| 16 | G2 vs K1-06 (P-01) | v1 tidak meratakan wrapper; hierarki sama dengan nesting elemen terlihat. Perataan wrapper kandidat opsi versi berikutnya. | G2, 5.4 |
| 17 | iframe same-origin (P-02) | Di v1 diperlakukan sama dengan iframe lintas domain: placeholder. | 5.4, 6 |
| 18 | Copy/tempel capture besar (P-03) | Praktis hanya untuk capture kecil; capture besar lewat Download lalu upload. K1-08 tetap berlaku pada fixture. | FR-EXT-12, FR-PLG-02 |
| 19 | Font yang dipakai (P-04) | Dicatat sebagai perkiraan: keluarga pertama di `font-family` yang tersedia menurut `document.fonts`. | FR-EXT-07 |
| 20 | Kegagalan di tengah render (P-05) | "Tanpa node setengah jadi" berlaku untuk penolakan validasi; error di tengah render menyisakan frame akar "… (tidak lengkap)" + laporan error. | FR-PLG-03, NFR-02 |
| 21 | Prasyarat penyiapan (P-06) | Node.js LTS untuk build dan komponen lokal; pairing token sekali saat penyiapan awal. | A1, NFR-06, K1-07 |
| 22 | SVG lewat `<img>` (P-07) | v1 dirasterisasi bila memungkinkan [ASUMSI] (SP-06); vector di v2. | 5.1, 6 |
| 23 | Elemen inline polos dan K1-06 (SCHEMA PQ-03) | Elemen inline polos (`display: inline` tanpa background, border, shadow; opacity 1) diserap menjadi run teks, bukan layer. Hierarki frame mengikuti nesting elemen yang menggambar kotak atau berperan sebagai wadah. | G2, K1-06 |
| 24 | Privasi URL (SCHEMA PQ-01) | URL halaman dan URL gambar disimpan tanpa query string dan hash. Pengambilan gambar dan deduplikasi di memori tetap memakai URL penuh. | FR-EXT-14, NFR-03 |
| 25 | `visibility: hidden` dengan keturunan terlihat (SCHEMA PQ-02) | Elemen tetap dicatat (kotaknya tidak digambar) untuk menjaga hierarki; dilewati hanya bila tidak punya keturunan terlihat. | FR-EXT-05 |

### 11.2 Pertanyaan terbuka tersisa

Tidak ada pada saat ini. Hal yang perlu divalidasi tercatat di tabel asumsi (bagian 10).

---

## Riwayat revisi

| Versi | Tanggal | Perubahan |
|---|---|---|
| 0.1 | 2026-10-12 | Draf awal. |
| 0.2 | 2026-10-13 | Menerapkan keputusan 12 pertanyaan terbuka; menambah open shadow DOM, halaman sangat panjang, laporan/progres (FR-EXT-19, FR-PLG-15), placeholder konten (FR-PLG-16), R8, A4–A5; risiko & asumsi jadi tabel. |
| 0.3 | 2026-10-13 | Menutup pertanyaan 13–15: partial capture ditunda (5.4, NFR-08), aturan elemen di luar area halaman (FR-EXT-05, A6), plugin terbuka sebagai prasyarat (FR-EXT-21, A7); 11.2 kosong. |
| 0.3.1 | 2026-10-13 | K1-07 dibuat netral terhadap mekanisme transfer langsung. |
| 0.4 | 2026-10-13 | Menerapkan P-01 sampai P-07 hasil tinjauan ARCHITECTURE. |
| 0.5 | 2026-10-13 | Menerapkan hasil tinjauan SCHEMA (PQ-01 sampai PQ-03, U-07, U-08). |
