# PRD — CodeToFrame

| | |
|---|---|
| Status | Draf v0.1 (rebuild dari nol) |
| Pemilik | Indra Pramudya |
| Dokumen terkait | `ARCHITECTURE.md`, `SCHEMA.md` (belum dibuat) |

> Label yang dipakai: **[Asumsi]** = belum diputuskan, dipakai sementara agar dokumen bisa diuji. **[Q-xx]** = rujukan ke bagian Pertanyaan terbuka.

---

## 1. Overview dan masalah

CodeToFrame mengekstrak tampilan halaman web yang sedang dibuka (struktur DOM, gaya CSS, tipografi, layout) lalu merendernya menjadi Frame dan Auto Layout di Figma.

Arsitektur dua lapis:
1. **Chrome Extension (Manifest V3)** — mengekstrak halaman menjadi file JSON.
2. **Figma Companion Plugin** — menerima JSON tersebut dan membuat node di kanvas Figma.

**Masalah yang diselesaikan:** membuat ulang halaman web yang sudah ada ke Figma secara manual lambat dan tidak presisi. CodeToFrame mengotomatiskannya dengan hasil yang mirip dengan aslinya dan struktur frame yang rapi.

**Mengapa dibuat ulang:** versi lama sulit dilanjutkan karena alur data dan kodenya kusut. Pelajaran yang dibawa ke rewrite ini:

| Masalah di versi lama | Keputusan di versi baru |
|---|---|
| Menulis clipboard dari content script gagal ("Document is not focused") | Ekstraksi dan penulisan/penyimpanan output dipisahkan |
| Paste native (Ctrl+V) ke kanvas Figma gagal | Pakai Figma plugin sebagai penerima |
| Plugin crash karena nilai CSS flexbox tidak cocok dengan enum Auto Layout (mis. `"STRETCH"`) | Pemetaan nilai CSS → Figma yang defensif dan terpusat |
| Alur salin JSON → tempel di textarea → "Generate Design" merepotkan | File `.json` sebagai jalur utama, tempel teks sebagai cadangan |

## 2. Tujuan dan non-goals

**Tujuan**
- G1. Hasil di Figma sangat mirip dengan halaman aslinya (posisi, ukuran, warna, tipografi).
- G2. Struktur frame rapi: hierarki mengikuti nesting DOM, Auto Layout dipakai bila aman.
- G3. Minimal setara fungsi html.to.design dari sisi kemiripan dan kerapian struktur.
- G4. Kode dan dokumen cukup jelas untuk dikerjakan bersama AI agent dan dipakai orang lain (repo publik).

**Non-goals**
- Tidak menghasilkan kode dari desain (arah Figma → kode).
- Tidak memakai server lokal maupun layanan cloud untuk transfer data.
- Tidak mendukung iframe, shadow DOM, canvas, dan video pada cakupan awal.
- Tidak mengklaim lebih baik dari html.to.design; diferensiasi belum diputuskan [Q-01].
- Tidak mendukung browser selain Chrome [Asumsi] [Q-02].

## 3. Target pengguna dan skenario

**Pengguna:** pemilik proyek sendiri, teman, dan publik yang memasang dari repo — desainer atau developer yang memakai Chrome dan Figma.

**Skenario utama**
- S1. **Rekreasi halaman:** pengguna membuka halaman di Chrome, klik ekstensi, unduh `.json`, buka plugin di Figma, drag-drop file, dan frame halaman muncul di kanvas.
- S2. **Jalur cepat:** pengguna klik "Copy" di ekstensi, lalu menempelkan teks ke plugin.
- S3. **Referensi desain:** pengguna mengambil halaman yang ada sebagai titik awal redesain atau dokumentasi UI, lalu menyunting layer di Figma.

## 4. Prinsip desain

1. **Akurasi dulu, kerapian kemudian.** Posisi dan ukuran asli dari browser adalah sumber kebenaran. Auto Layout hanya dipakai bila terverifikasi tidak menggeser elemen.
2. **Gagal dengan aman.** Nilai yang tidak dikenal atau data yang tidak lengkap diturunkan ke default yang aman, bukan membuat crash.
3. **Sederhana.** Satu alur data satu arah: halaman → JSON → Figma. Tanpa server.
4. **Privasi: semua diproses lokal.** Data halaman tidak dikirim ke pihak mana pun.
5. **Kontrak eksplisit.** Extension dan plugin hanya terhubung lewat format JSON berversi yang didefinisikan di `SCHEMA.md`.

## 5. Ruang lingkup per versi

| Versi | Fokus | Cakupan |
|---|---|---|
| **v1 — Inti** | Hasil benar secara dasar | Frame (hierarki sesuai DOM, posisi absolut), teks (font, ukuran, bobot, warna, alignment, line-height), warna latar, border, border-radius, opacity, overflow clip |
| **v2 — Kemiripan** | Mendekati aslinya | Shadow, gradient, gambar (Image Fill), SVG inline sebagai vector, pseudo-element `::before`/`::after`, Auto Layout dengan verifikasi |
| **v3 — Lanjutan** | Kasus sulit | `position: fixed/sticky`, transform, background-image kompleks, fallback font yang tidak tersedia di Figma, beberapa viewport |
| **Ditunda** | Di luar cakupan awal | iframe, shadow DOM, canvas, video |

**Strategi layout dua tahap**
1. Ekstraksi akurat: posisi dan ukuran dari `getBoundingClientRect`, gaya dari `getComputedStyle`, hierarki frame mengikuti nesting DOM.
2. Auto Layout diterapkan hanya jika hasil perhitungannya menghasilkan posisi anak yang sama dengan aslinya (dalam toleransi, lihat NFR-07). Jika tidak, tetap posisi absolut.

## 6. Persyaratan fungsional

### Chrome Extension

| ID | Persyaratan | Versi |
|---|---|---|
| FR-EXT-01 | Pengguna dapat memulai ekstraksi halaman aktif dari UI ekstensi (popup/action). | v1 |
| FR-EXT-02 | Ekstraksi mencakup elemen terlihat beserta hierarki DOM, posisi/ukuran dari `getBoundingClientRect`, dan gaya dari `getComputedStyle`. | v1 |
| FR-EXT-03 | Ekstraksi mencakup properti v1 (lihat §5) untuk setiap elemen. | v1 |
| FR-EXT-04 | Elemen tidak terlihat (mis. `display: none`, `visibility: hidden`, ukuran 0) tidak diekspor [Asumsi]. | v1 |
| FR-EXT-05 | Tombol **"Download .json"** (jalur utama) menyimpan hasil sebagai file `.json`. | v1 |
| FR-EXT-06 | Tombol **"Copy"** (cadangan) menyalin JSON ke clipboard; penulisan clipboard dilakukan di konteks yang terpisah dari content script. | v1 |
| FR-EXT-07 | Output menyertakan versi skema, URL sumber, judul halaman, ukuran viewport, dan waktu ekstraksi [Asumsi]. | v1 |
| FR-EXT-08 | Bila ekstraksi gagal sebagian, ekstensi tetap menghasilkan output untuk bagian yang berhasil dan menampilkan jumlah elemen yang dilewati. | v1 |
| FR-EXT-09 | Halaman yang tidak dapat diakses ekstensi (mis. `chrome://`, Chrome Web Store) menampilkan pesan yang menjelaskan alasannya, bukan error mentah. | v1 |
| FR-EXT-10 | Ekstraksi properti v2: shadow, gradient, gambar, SVG inline, pseudo-element. | v2 |
| FR-EXT-11 | Ekstraksi properti v3: fixed/sticky, transform, background-image kompleks, beberapa viewport. | v3 |

### Figma Plugin

| ID | Persyaratan | Versi |
|---|---|---|
| FR-PLG-01 | Plugin menerima input lewat upload file, drag-drop file `.json`, dan tempel teks. | v1 |
| FR-PLG-02 | Plugin memvalidasi input terhadap skema dan versinya sebelum membuat node; input yang tidak valid ditolak dengan pesan yang menyebut alasannya. | v1 |
| FR-PLG-03 | Plugin membuat satu frame root seukuran viewport sumber, dengan hierarki frame mengikuti nesting DOM. | v1 |
| FR-PLG-04 | Plugin merender properti v1 (lihat §5) dengan posisi dan ukuran sesuai data sumber. | v1 |
| FR-PLG-05 | Semua konversi nilai CSS → enum/properti Figma melewati satu lapisan pemetaan terpusat; nilai tak dikenal memakai default aman dan dicatat sebagai peringatan. | v1 |
| FR-PLG-06 | Font yang tidak tersedia tidak menghentikan render; teks tetap dibuat dengan font pengganti dan dicatat sebagai peringatan. Fallback yang lebih cerdas masuk v3. | v1 |
| FR-PLG-07 | Setelah selesai, plugin menampilkan ringkasan: jumlah node dibuat, jumlah peringatan, dan daftar peringatan. | v1 |
| FR-PLG-08 | Layer diberi nama yang bermakna (mis. dari tag, id, atau class) [Asumsi, aturan penamaan → Q-05]. | v1 |
| FR-PLG-09 | Render properti v2, termasuk Auto Layout yang hanya diterapkan setelah lolos verifikasi posisi (§5). | v2 |
| FR-PLG-10 | Render properti v3, termasuk fallback font dan beberapa viewport sebagai frame terpisah. | v3 |

## 7. Persyaratan non-fungsional

| ID | Kategori | Persyaratan |
|---|---|---|
| NFR-01 | Performa | Ekstraksi halaman berukuran ±2.000 elemen selesai ≤ 5 detik di laptop kelas menengah [Asumsi angka → Q-03]. |
| NFR-02 | Performa | Plugin merender ±2.000 node ≤ 30 detik dan UI plugin tetap responsif (menampilkan progres) [Asumsi angka → Q-03]. |
| NFR-03 | Ketahanan | Plugin tidak crash pada input dengan field hilang, bernilai `null`, atau nilai enum tak dikenal; diuji dengan fixture JSON rusak. |
| NFR-04 | Keamanan & privasi | Tidak ada request jaringan keluar yang membawa data halaman dari extension maupun plugin. Dapat diverifikasi lewat tab Network dan izin `manifest.json`. |
| NFR-05 | Keamanan & privasi | Extension hanya meminta izin minimum yang dibutuhkan; daftar izin dan alasannya didokumentasikan di README. |
| NFR-06 | Kompatibilitas | Extension berjalan di Chrome versi stabil terbaru (Manifest V3); plugin berjalan di Figma desktop dan web versi terbaru [Asumsi → Q-02]. |
| NFR-07 | Akurasi | Selisih posisi dan ukuran tiap node terhadap data sumber ≤ 1 px [Asumsi toleransi → Q-04]. |
| NFR-08 | Keterpeliharaan | Format JSON berversi; plugin menolak versi mayor yang tidak didukung dengan pesan jelas. |

## 8. Kriteria sukses

**Kriteria umum (terukur)**
- KS-01. Pada set halaman uji (fixture HTML lokal di repo), 0 crash plugin.
- KS-02. Untuk seluruh node di halaman uji, selisih posisi/ukuran memenuhi NFR-07.
- KS-03. Uji jaringan menunjukkan 0 request keluar berisi data halaman (NFR-04).
- KS-04. Perbandingan visual berdampingan (screenshot browser vs ekspor PNG Figma) pada halaman uji lolos pemeriksaan manual; metrik otomatis seperti pixel diff belum diputuskan [Q-06].

**Kriteria selesai per fase**

*v1*
- Tombol 120×40 px berlatar biru dengan teks "Klik" muncul di Figma dengan ukuran, warna latar, teks, font, ukuran font, dan posisi yang sama.
- Kartu dengan border 1 px, border-radius 8 px, opacity 0.5, dan konten yang melebihi batas (overflow hidden) tampil dengan border, sudut, transparansi, dan clipping yang sama.
- Paragraf multi-baris dengan `line-height` dan `text-align: center` memiliki jumlah baris dan perataan yang sama.
- JSON dengan nilai `align-items: stretch` atau nilai tak dikenal tidak membuat crash dan menghasilkan peringatan.
- Ketiga cara input (upload, drag-drop, tempel) menghasilkan output yang identik untuk file yang sama.

*v2*
- Elemen dengan `box-shadow` dan `linear-gradient` tampil dengan efek dan gradient yang setara.
- `<img>` tampil sebagai Image Fill dengan rasio dan crop sesuai `object-fit`.
- Ikon SVG inline menjadi node vector yang dapat disunting.
- Konten `::before`/`::after` muncul sebagai node tersendiri.
- Container flex baris dengan tiga anak berjarak `gap` seragam menjadi Auto Layout; container yang perhitungan Auto Layout-nya menggeser anak > toleransi NFR-07 tetap memakai posisi absolut.

*v3*
- Header `position: fixed` dan elemen `transform: rotate(...)` tampil di posisi visual yang sama.
- Font yang tidak ada di Figma diganti sesuai aturan fallback dan dicatat di ringkasan.
- Satu halaman diekstrak di dua viewport (mis. desktop dan mobile) menghasilkan dua frame terpisah.

## 9. Risiko dan asumsi

**Risiko**

| Risiko | Mitigasi |
|---|---|
| Halaman sangat besar membuat ekstraksi/render lambat atau kehabisan memori | Uji dengan fixture besar; tampilkan progres; batas ukuran dibahas di ARCHITECTURE |
| Perbedaan model render browser dan Figma (teks, line-height, subpixel) | Toleransi akurasi (NFR-07); prioritaskan posisi absolut |
| Gambar lintas domain (CORS) gagal diambil | Gambar gagal diganti placeholder + peringatan (v2) |
| Font tidak tersedia di Figma | Font pengganti + peringatan (v1), fallback cerdas (v3) |
| API Chrome/Figma berubah | Batasi ke API stabil; versi minimal dicatat di README |
| Kode kembali kusut selama vibe coding | Kontrak JSON eksplisit, pemetaan terpusat, ID persyaratan dirujuk di commit/PR |

**Asumsi**
- A1. Pengguna memakai Chrome desktop dan Figma (desktop atau web).
- A2. Ekstraksi mengambil seluruh tinggi halaman (bukan hanya area yang terlihat di layar) [→ Q-07].
- A3. Semua angka performa dan toleransi di §7 adalah target sementara.
- A4. Repo dirilis publik dengan lisensi open source [lisensi → Q-08].

**Catatan hukum dan privasi**
- Konten halaman (teks, gambar, logo, desain) milik pihak lain dan dapat dilindungi hak cipta atau merek dagang. CodeToFrame adalah alat bantu; tanggung jawab penggunaan ada pada pengguna. README akan menyertakan disclaimer bahwa hasil hanya untuk referensi, belajar, atau halaman milik sendiri/yang diizinkan.
- Halaman yang sedang login dapat memuat data pribadi. Karena semua diproses lokal, data tidak keluar dari perangkat, tetapi file `.json` hasil ekstraksi dapat memuatnya; pengguna perlu diingatkan sebelum membagikan file tersebut.
- Ekstensi tidak mengumpulkan telemetri [Asumsi].

## 10. Pertanyaan terbuka

| ID | Pertanyaan |
|---|---|
| Q-01 | Apakah CodeToFrame akan punya diferensiasi dari html.to.design? Jika ya, apa? |
| Q-02 | Browser/aplikasi apa yang wajib didukung: hanya Chrome, atau juga Edge/Brave? Figma desktop dan web, atau salah satu? |
| Q-03 | Berapa target performa yang diinginkan (jumlah elemen halaman uji, batas waktu ekstraksi dan render)? |
| Q-04 | Berapa toleransi akurasi posisi/ukuran yang dapat diterima (usulan: ≤ 1 px)? |
| Q-05 | Aturan penamaan layer di Figma: berdasarkan tag, id, class, atau kombinasinya? |
| Q-06 | Apakah perlu uji visual otomatis (pixel diff) dan berapa ambangnya, atau cukup pemeriksaan manual? |
| Q-07 | Ekstraksi mencakup seluruh halaman (full page) atau hanya viewport yang terlihat? Apakah perlu opsi pilih elemen tertentu? |
| Q-08 | Lisensi open source apa yang dipakai? |
| Q-09 | Apakah ekstensi dan plugin akan dipublikasikan ke Chrome Web Store dan Figma Community, atau cukup dipasang manual dari repo? |
| Q-10 | Daftar halaman/fixture uji apa yang menjadi acuan kemiripan dengan html.to.design? |
