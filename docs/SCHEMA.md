# CodeToFrame — Schema (Kontrak Data)

| | |
|---|---|
| Pemilik | Indra Pramudya |
| Status | Draft |
| Versi | 0.1.2 |
| Tanggal | 2026-10-13 |
| Dokumen terkait | `docs/PRD.md` v0.5, `docs/ARCHITECTURE.md` v0.1.3, `docs/spikes/SP-01.md` |

Label yang dipakai:
- **SD-xx**: keputusan SCHEMA (ringkasan di bagian 11.1). Prefiks AD milik ARCHITECTURE.
- **[ASUMSI]**: keputusan sementara yang belum dikonfirmasi pemilik.
- **[PERLU VERIFIKASI]**: fakta platform yang belum terkonfirmasi.
- **PQ-xx**: pertanyaan untuk pemilik; semuanya sudah diputuskan (bagian 11.2).

---

## 1. Tujuan, cakupan, dan konvensi

### 1.1 Tujuan dan cakupan

Dokumen ini adalah kontrak data antara extension dan plugin. Isinya:
- format amplop capture yang dipakai oleh semua jalur (relay, Download, Copy, upload; AD-05);
- struktur laporan impor dan katalog kode peringatan;
- body HTTP relay (pelengkap ARCHITECTURE 3.4).

**Tabel field di dokumen ini bersifat normatif.** Contoh JSON dan potongan tipe hanya ilustrasi. Bila keduanya berbeda, tabel yang berlaku. Validator (`shared/validate`) dan tipe TypeScript (`shared/types`) ditulis secara mekanis dari tabel ini (SD-12).

Di luar cakupan dokumen ini:
- pemetaan nilai ke properti Figma (dokumen pemetaan / MAPPING);
- cara ekstraksi dan perilaku pipeline (ARCHITECTURE 4).

Dokumen ini hanya menetapkan **apa** yang dicatat, bukan **bagaimana** dirender.

### 1.2 Konvensi tabel field

| Kolom | Arti |
|---|---|
| Field | Nama field JSON (camelCase). Notasi `a.b` berarti field `b` di dalam objek `a` |
| Tipe | Lihat 1.3 |
| Wajib | **W** = wajib; **O** = opsional; **W\*** = wajib dengan syarat (syarat ditulis di Deskripsi) |
| Versi | Versi produk pertama yang **mengisi** field ini: [v1], [v2], [v3]. Field [v2]/[v3] sudah sah di format, tetapi extractor v1 tidak mengisinya |
| Deskripsi | Makna, satuan, aturan |
| Rujukan | FR/NFR/K di PRD atau bagian ARCHITECTURE |

### 1.3 Tipe dasar

| Tipe | Definisi |
|---|---|
| `string` | String JSON. Bila tidak disebut lain, boleh kosong |
| `int` | Bilangan bulat JSON |
| `number` | Bilangan JSON berhingga |
| `bool` | `true` / `false` |
| `Px` | `number` dalam CSS px, dibulatkan ke 2 desimal |
| `Px≥0` | `Px` dengan nilai ≥ 0 |
| `Rect` | `{ x: Px, y: Px, w: Px≥0, h: Px≥0 }`, keempat field wajib |
| `Color` | `{ r: number, g: number, b: number, a: number }`. r, g, b berada di rentang 0–255 dalam ruang sRGB (2 desimal); a berada di rentang 0–1 (3 desimal). Semua field wajib (SD-04) |
| `LengthPct` | `Px` atau `{ pct: number }` (persen, 2 desimal) |
| `Unparsed` | `{ raw: string }`: nilai CSS asli yang tidak dapat dinormalisasi (SD-04, ARCHITECTURE 4.1 C6) |
| `T†` | Field boleh berisi `T` **atau** `Unparsed` |
| `enum(a, b, …)` | `string` yang nilainya salah satu dari daftar. Nilai di luar daftar mengikuti aturan 7.4 |
| `T[]` | Array JSON berisi elemen bertipe `T` |
| `Id` | `string` tidak kosong, panjang maksimal 64. Format yang dihasilkan extractor dijelaskan di SD-03 |

### 1.4 Koordinat, satuan, dan angka

- **Satuan:** semua panjang dalam CSS px (bukan device px). `meta.devicePixelRatio` dicatat terpisah.
- **Koordinat halaman:**
  - Titik asal (0, 0) adalah sudut kiri atas dokumen. Sumbu x ke kanan, sumbu y ke bawah.
  - `rect` = `getBoundingClientRect()` + (`scrollX`, `scrollY`) pada saat elemen diukur (ARCHITECTURE 4.1 C5). Hasilnya sama untuk semua node, tidak bergantung posisi scroll. Pengecualian: rect node root mengikuti aturan rect root (3.2).
  - Rect adalah border-box. Posisi relatif terhadap induk dihitung oleh plugin.
- **Pembulatan:**
  - px dan kanal warna r, g, b dibulatkan ke 2 desimal;
  - alpha dan `opacity` ke 3 desimal;
  - persen ke 2 desimal.

  Alasannya: 0,01 px jauh di bawah toleransi 1 px (`layoutTolerancePx`), dan pembulatan tetap membuat snapshot uji stabil (ARCHITECTURE 10.2). Pembulatan hanya mengubah presisi, bukan makna, sehingga mengubah aturan ini **tidak** menaikkan versi.
- **NaN dan tak terhingga** tidak dapat ditulis di JSON dan tidak pernah dipakai. Extractor yang mendapat nilai tak berhingga membuang field tersebut dan mencatat `EXT_VALUE_UNPARSED`.

### 1.5 `null` dan field absen (SD-05)

- **`null` tidak dipakai di mana pun dalam amplop.** Field yang bernilai `null` diperlakukan sebagai tipe salah (`VAL_FIELD_TYPE`).
- **Field gaya yang absen** berarti "nilai awal CSS" (tabel 7.3).
- **Extractor boleh menghilangkan** field gaya yang nilainya sama dengan nilai awal. Tujuannya menghemat ukuran amplop.
- **Field non-gaya yang absen** mengikuti kolom Wajib.

---

## 2. Keputusan struktur data

### SD-01 Daftar datar dengan `parentId`

- **Konteks.** ARCHITECTURE menyebut "pohon node". Namun pipeline memotong data per chunk (C7), memvalidasi per node (R2), dan menarik batch node dengan urutan induk sebelum anak (R5, AD-07).
- **Opsi.**

| Kriteria | A. Pohon bersarang (`children[]`) | B. Daftar datar `nodes[]` + `parentId` |
|---|---|---|
| Chunking C7 | Harus diserialisasi utuh lalu dipotong per byte; potongan tidak bermakna | Sama (dipotong per byte), tetapi dapat dialirkan per node bila nanti dibutuhkan |
| Batch R5 (induk sebelum anak) | Plugin harus meratakan pohon dulu | Langsung: ambil irisan `nodes[i..j]` |
| Validasi per node | Error di satu node bisa membuat subtree "yatim" tanpa jejak | Setiap node berdiri sendiri. Node rusak dibuang, anaknya ditempel ulang lewat `parentId` |
| Uji snapshot | Diff bersarang dalam, satu perubahan menggeser indentasi banyak baris | Diff per baris node; mudah dibaca |
| Keterbacaan manusia | Struktur langsung terlihat | Perlu mengikuti `parentId`, terbantu urutan preorder |
| Root bebas (NFR-08) | Root = objek teratas | Root = `rootId`; node mana pun dapat menjadi root |
| Kedalaman ekstrem | Rekursi parse/validasi dalam | Iteratif |

- **Keputusan.** Opsi B. Amplop memuat `rootId` dan `nodes[]`.
  - Urutan `nodes[]` **wajib preorder**: induk muncul sebelum anaknya.
  - Saudara diurutkan sesuai urutan DOM pada flat tree (termasuk isi open shadow root dan slot di v2).
  - Urutan saudara ini juga menjadi urutan layer bawaan.
- **Alasan.** Opsi B cocok langsung dengan C7, R2, R5, dan uji snapshot. Kekurangannya hanya keterbacaan, yang tertolong oleh urutan preorder.
- **Konsekuensi.**
  - Validator perlu memeriksa rujukan `parentId`, siklus, dan urutan (7.5).
  - Teks ARCHITECTURE yang menyebut "pohon node" sudah disesuaikan (U-01, diterapkan di ARCHITECTURE v0.1.2).
  - Perubahan dari datar ke bersarang di masa depan adalah perubahan MAJOR.
  - `zIndex` dan `position` dicatat sebagai fakta (5.3), sehingga pengurutan cat yang lebih akurat dapat ditambahkan nanti tanpa capture ulang.

### SD-02 Teks: satu node per segmen teks, dengan run bergaya

- **Konteks.** ARCHITECTURE 13.3 meminta keputusan run bergaya; ARCHITECTURE 4.1 C5 menyebut "teks per text node". Kriteria v1 (K1-01, K1-05) hanya memakai teks satu gaya. Hasil SP-08 (metrik teks) belum ada.
- **Opsi.**
  - **A. Satu node teks per DOM text node.** Ekstraksinya paling sederhana. Kekurangannya: `<p>Halo <b>dunia</b> lagi</p>` menjadi 3 layer teks. Bila sebuah baris dibungkus di tengah run, teksnya tidak dapat direproduksi oleh kotak-kotak terpisah, sehingga hasil di Figma berantakan.
  - **B. Satu node teks per segmen** (rangkaian teks inline yang bersambung) dengan `runs[]` bergaya. Hasilnya satu layer teks yang dapat diedit, dan Figma mendukung gaya per rentang karakter. Ekstraksinya lebih rumit: perlu mengelompokkan teks dan menghitung rect gabungan dengan `Range.getClientRects`.
- **Keputusan.** Opsi B. Format **selalu** memakai `runs[]` (minimal 1 run). Aturan pengelompokan v1 dijelaskan di 4.4. Elemen inline "polos" (tanpa kotak visual sendiri) diserap menjadi run dan tidak menjadi node elemen, sesuai keputusan PRD v0.5 (11.1 no. 23). **Dikonfirmasi pemilik (2026-10-13).**
- **Alasan.**
  - K1-01 dan K1-05 tetap sederhana (1 run).
  - Hasil di Figma rapi (G2).
  - Karena format selalu memakai `runs`, aturan pengelompokan bisa dipersempit atau diperluas setelah SP-08 **tanpa mengubah format**.
- **Konsekuensi dan migrasi.**
  - Mengubah aturan pengelompokan (mis. kembali ke opsi A untuk kasus tertentu) tidak menaikkan versi, karena bentuk datanya sama.
  - Menambah field gaya run menaikkan MINOR.
  - Mengganti `runs` dengan struktur lain menaikkan MAJOR.
  - Kata "per text node" di ARCHITECTURE C5 sudah disesuaikan (U-02, diterapkan di ARCHITECTURE v0.1.2).

### SD-03 Identitas node dan aset

- **Opsi.** UUID per node; indeks angka; string berprefiks.
- **Keputusan.**
  - Node: `id` = `"n"` + indeks preorder, mulai dari 0 (`n0`, `n1`, …).
  - Aset: `"a"` + indeks sesuai urutan kemunculan pertama (`a0`, …).
  - Capture: `meta.captureId` = UUID v4 (`crypto.randomUUID()`).
- **Alasan.**
  - Deterministik untuk halaman yang sama, sehingga snapshot stabil.
  - Pendek, sehingga menghemat ukuran.
  - Prefiks membedakan rujukan node dan aset di peringatan.
- **Aturan.**
  - `id` unik dalam satu amplop. Validator **tidak** mewajibkan pola `n<k>`: cukup `Id` yang unik, agar data buatan tangan untuk uji tetap sah.
  - `id` hanya stabil dalam satu capture. Tidak ada jaminan dua capture memberi id yang sama untuk elemen yang sama.
  - Peringatan, laporan, dan node gambar merujuk node/aset dengan id ini.

### SD-04 Representasi nilai

| Nilai | Representasi | Catatan |
|---|---|---|
| Warna | `Color` sRGB, r/g/b 0–255, a 0–1 | Sama dengan cara membaca `#2563EB` atau `rgba()` (K1-01). Warna di ruang lain (mis. `oklch()`, `color(display-p3 …)`) dikonversi ke sRGB dengan gamut clip dan dicatat `EXT_COLOR_CONVERTED` **[ASUMSI: konversi dilakukan dengan fungsi murni di `shared/normalize`]**. Bila konversi tidak dapat dilakukan, nilai disimpan sebagai `Unparsed` |
| Panjang | `Px` (number) | Computed style sudah dalam px |
| Persen | `{ pct }` | Hanya di tempat yang ditandai `LengthPct` (mis. `objectPosition`). `border-radius` dalam persen sudah diresolusi ke px oleh extractor |
| Keyword | `enum(…)` | Ditulis sesuai serialisasi computed style (huruf kecil) |
| `font-family` | `string[]` | Daftar terurai sesuai urutan. Tanda kutip dan spasi tepi dibuang, kapitalisasi asli dipertahankan. Keluarga generik ditulis sebagai keyword (`sans-serif`) |
| Font yang dipakai | `fontFamilyUsed: string` | Perkiraan sesuai FR-EXT-07 / P-04: keluarga pertama yang lolos `document.fonts.check()` atau keluarga generik |
| Tidak dapat diurai | `Unparsed` `{ raw }` | Hanya untuk field bertanda †. Extractor mencatat `EXT_VALUE_UNPARSED`. Plugin memakai nilai awal (7.3) dan mencatat `RND_VALUE_DEFAULTED` |

### SD-05 Field absen = nilai awal; `null` tidak dipakai

Lihat 1.5. Keputusan ini menetapkan tabel nilai awal 7.3 sebagai bagian normatif dari format. **Mengubah nilai awal di tabel 7.3 adalah perubahan makna, sehingga menaikkan MAJOR.**

---

## 3. Amplop (envelope)

### 3.1 Objek akar

| Field | Tipe | Wajib | Versi | Deskripsi | Rujukan |
|---|---|---|---|---|---|
| `format` | `string` | W | [v1] | Harus persis `"codetoframe"` | NFR-07 |
| `formatVersion` | `string` | W | [v1] | Pola `^[0-9]+\.[0-9]+$`. Nilai awal `"3.0"` (SD-06) | NFR-07 |
| `meta` | `Meta` | W | [v1] | 3.2. Bila absen atau rusak, akibatnya per bagian (7.2), bukan fatal | FR-EXT-14 |
| `rootId` | `Id` | W | [v1] | `id` node yang menjadi frame akar | NFR-08, SD-01 |
| `nodes` | `Node[]` | W | [v1] | Preorder, minimal berisi root (bagian 4) | SD-01 |
| `assets` | `Asset[]` | W | [v1] | Boleh `[]` (bagian 5) | FR-EXT-08/09 |
| `report` | `ExtractionReport` | W | [v1] | Laporan ekstraksi + metrik (bagian 6). Bila absen: peringatan, tidak fatal | FR-EXT-19, NFR-01 |

Field tak dikenal di objek akar diabaikan (7.4).

### SD-06 Nilai awal `formatVersion` = `"3.0"` dan penanda format

- **Konteks.** Format proyek lama memakai "2.0" dan tidak perlu didukung.
- **Opsi.**
  - (a) Mulai dari `"1.0"`.
  - (b) Mulai dari `"3.0"`.
- **Keputusan.** (b) `"3.0"`, ditambah field penanda `format: "codetoframe"`.
- **Alasan.**
  - Nomor versi naik secara monoton di sepanjang riwayat proyek, sehingga tidak ada versi baru yang bisa tertukar dengan file lama.
  - File lama yang membawa "2.0" ditolak dengan pesan khusus "format lama" (`E_LEGACY_FORMAT`), bukan pesan yang menyesatkan seperti "versi lebih baru".
  - Biayanya nol.
- **Deteksi format lama.** Bila `format` tidak ada **dan** objek akar punya `version` atau `formatVersion` yang diawali `"2."`, validator mengembalikan `E_LEGACY_FORMAT` **[ASUMSI: format lama menyimpan versinya di salah satu field itu; struktur persisnya tidak diketahui]**. Bila tidak cocok, validator mengembalikan `E_NOT_CODETOFRAME`.

### 3.2 `Meta`

| Field | Tipe | Wajib | Versi | Deskripsi | Rujukan |
|---|---|---|---|---|---|
| `captureId` | `string` | W | [v1] | UUID v4 dari extension. Sama dengan header `X-CTF-Capture-Id` di relay (8.3) | SD-03 |
| `url` | `string` | W | [v1] | URL halaman tanpa query string, hash, dan userinfo (SD-13). Validator hanya memeriksa tipenya | FR-EXT-14, NFR-03 |
| `title` | `string` | W | [v1] | `document.title`, boleh `""` | FR-EXT-14 |
| `capturedAt` | `string` | W | [v1] | ISO 8601 UTC dengan milidetik, mis. `"2026-10-13T08:15:30.123Z"` | FR-EXT-14 |
| `viewport` | `{ width: Px≥0, height: Px≥0 }` | W | [v1] | Lebar dan tinggi area layout viewport (`documentElement.clientWidth/clientHeight`, tanpa scrollbar) **[ASUMSI]** | FR-EXT-02, -14 |
| `page` | `{ width: Px≥0, height: Px≥0 }` | W | [v1] | Dimensi dokumen penuh (`scrollWidth/scrollHeight` setelah C2). `page.height` = "tinggi halaman" FR-EXT-14 | FR-EXT-02, -14, -05 |
| `devicePixelRatio` | `number` | W | [v1] | `window.devicePixelRatio` | ARCHITECTURE 7.5 |
| `extensionVersion` | `string` | W | [v1] | `version` dari manifest extension | NFR-07 |
| `browserVersion` | `string` | O | [v1] | Versi Chrome (`navigator.userAgentData` atau UA). Membantu membaca selisih snapshot | ARCHITECTURE 10.2 |
| `root` | `RootInfo` | W | [v1] | Deskripsi root | NFR-08 |
| `viewportPreset` | `string` | O | [v3] | Ruang ekstensi untuk preset (FR-EXT-18) | FR-EXT-18 |

`RootInfo`:

| Field | Tipe | Wajib | Versi | Deskripsi |
|---|---|---|---|---|
| `scope` | `enum(document, element)` | W | [v1] | v1–v2 selalu `document` (root = `documentElement`). `element` disiapkan untuk partial capture (PRD 5.4) |
| `tag` | `string` | W | [v1] | Tag elemen root (huruf kecil), mis. `"html"` |
| `selector` | `string` | O | [v3+] | Ruang ekstensi untuk partial capture |

**Rect root.** Untuk `scope = "document"`, `rect` node root = `{ x: 0, y: 0, w: page.width, h: page.height }` (ukuran halaman penuh, ARCHITECTURE bagian 6), bukan `getBoundingClientRect()` mentah dari `html`. Untuk `scope = "element"` (partial capture di masa depan), `rect` = border-box elemen tersebut dalam koordinat halaman.

---

## 4. Node

### 4.1 Field bersama semua node

| Field | Tipe | Wajib | Versi | Deskripsi | Rujukan |
|---|---|---|---|---|---|
| `id` | `Id` | W | [v1] | Unik dalam amplop | SD-03 |
| `kind` | `enum(element, text, image, placeholder, pseudo, svg)` | W | [v1] | `pseudo` dan `svg` diisi mulai [v2] | 4.2–4.7 |
| `parentId` | `Id` | W\* | [v1] | Wajib untuk semua node kecuali root. Harus merujuk node yang muncul **lebih awal** di `nodes[]` | SD-01 |
| `tag` | `string` | W | [v1] | Nama tag huruf kecil. Untuk node `text`: tag elemen pemilik segmen (dipakai penamaan `h1 "…"`) | FR-PLG-11 |
| `rect` | `Rect` | W | [v1] | Border-box (element/image/placeholder/svg/pseudo) atau gabungan line box (text), dalam koordinat halaman | FR-EXT-04 |
| `classes` | `string[]` | O | [v1] | `classList` lengkap sesuai urutan. Penyaringan class "tampak hash" dilakukan di plugin (ARCHITECTURE 7.3) | FR-PLG-11 |
| `domId` | `string` | O | [v1] | Atribut `id` elemen, untuk keterlacakan ke elemen asal | FR-PLG-11 |
| `fallback` | `bool` | O | [v1] | `true` = node minimal hasil kegagalan ekstraksi per elemen (C5): hanya `id`, `kind: "element"`, `parentId`, `tag`, `rect`. Disertai `EXT_NODE_FAILED` | NFR-02 |
| `inShadowTree` | `bool` | O | [v2] | `true` bila node berasal dari open shadow root | FR-EXT-20 |

Root (`id == rootId`) harus berjenis `element` dan tidak punya `parentId`. `rect` root mengikuti aturan rect root di 3.2: halaman penuh untuk `scope = "document"`, border-box elemen untuk `scope = "element"`. Bila `parentId` tetap ada di root, field itu diabaikan dan dicatat `VAL_ROOT_HAS_PARENT`.

### 4.2 `kind: "element"`

| Field | Tipe | Wajib | Versi | Deskripsi | Rujukan |
|---|---|---|---|---|---|
| `style` | `BoxStyle` | O | [v1] | 4.3. Bila absen, semua nilai memakai nilai awal | FR-EXT-06 |

Anak node element: node apa pun.

Kasus khusus di v1:
- **`<svg>` inline** dicatat sebagai `element` dengan `tag: "svg"`, tanpa anak, disertai `EXT_FEATURE_NOT_IN_VERSION {feature: "svg-inline"}`. Mulai v2 dicatat sebagai `kind: "svg"`.
- **`<br>`** tidak menjadi node; di dalam segmen teks, `<br>` menjadi `"\n"` (4.4).

### 4.3 `BoxStyle` (dipakai element, image, placeholder, pseudo, svg)

| Field | Tipe | Wajib | Versi | Deskripsi | Rujukan |
|---|---|---|---|---|---|
| `display` | `string` | O | [v1] | Computed `display` apa adanya (informasi; tidak di-enum karena variasinya banyak) | FR-EXT-16 (v2) |
| `position` | `enum(static, relative, absolute, fixed, sticky)` | O | [v1] | Fakta. Penanganan fixed/sticky di v3 | FR-EXT-17 |
| `zIndex` | `int` atau `"auto"` | O | [v1] | Fakta untuk urutan cat di masa depan (SD-01) | — |
| `visibility` | `enum(visible, hidden, collapse)` | O | [v1] | `hidden`/`collapse` hanya muncul pada elemen yang dipertahankan karena punya keturunan terlihat (SD-14); kotaknya tidak digambar | FR-EXT-05 |
| `opacity` | `number` (0–1) | O | [v1] | Computed `opacity` | 5.1, K1-02 |
| `overflowX` | `enum(visible, hidden, clip, scroll, auto)` | O | [v1] | — | K1-03 |
| `overflowY` | `enum(visible, hidden, clip, scroll, auto)` | O | [v1] | — | K1-03 |
| `backgroundColor` | `Color†` | O | [v1] | — | 5.1, K1-01 |
| `border` | `BorderSides` | O | [v1] | Sisi yang tidak tergambar (lebar 0 atau style `none`/`hidden`) **dihilangkan** | 5.1, K1-02 |
| `borderRadius` | `CornerRadii` | O | [v1] | Sudah diresolusi ke px | 5.1, K1-01 |
| `boxShadow` | `Shadow[]` | O | [v1] | Urutan sesuai CSS (pertama = paling atas) | 5.1, K1-02 |
| `padding` | `{ top, right, bottom, left: Px≥0 }` | O | [v2] | Untuk usulan Auto Layout | FR-EXT-16 |
| `backgroundImage` | `BackgroundLayer[]` | O | [v2] | 4.8 | FR-EXT-15 |
| `layout` | `FlexContainer` | O | [v2] | 4.8 | FR-EXT-16 |
| `flexItem` | `FlexItem` | O | [v2] | 4.8 | FR-EXT-16 |
| `transform` | — | — | [v3] | Ruang ekstensi; bentuknya ditetapkan saat v3 | FR-EXT-17 |

`BorderSides` = `{ top?, right?, bottom?, left?: BorderSide }`.

`BorderSide`:

| Field | Tipe | Wajib | Deskripsi |
|---|---|---|---|
| `width` | `Px≥0` | W | — |
| `style` | `enum(solid, dashed, dotted, double, groove, ridge, inset, outset)` | W | `none`/`hidden` tidak pernah dicatat (sisi dihilangkan) |
| `color` | `Color†` | W | `currentcolor` sudah diresolusi oleh computed style |

`CornerRadii` = `{ tl?, tr?, br?, bl?: [Px≥0, Px≥0] }`. Setiap sudut berisi `[horizontal, vertikal]`; sudut yang absen bernilai `[0, 0]`. Nilai yang dicatat adalah nilai computed sebelum penskalaan CSS untuk radius yang saling tumpang; penskalaan dilakukan oleh plugin.

`Shadow`:

| Field | Tipe | Wajib | Deskripsi |
|---|---|---|---|
| `x` | `Px` | W | offset-x |
| `y` | `Px` | W | offset-y |
| `blur` | `Px≥0` | W | — |
| `spread` | `Px` | W | — |
| `color` | `Color†` | W | — |
| `inset` | `bool` | W | — |

### 4.4 `kind: "text"`

| Field | Tipe | Wajib | Versi | Deskripsi | Rujukan |
|---|---|---|---|---|---|
| `textStyle` | `TextStyle` | O | [v1] | Gaya dasar segmen: computed style elemen pemilik | 5.1, K1-01 |
| `runs` | `TextRun[]` | W | [v1] | Minimal 1 run dengan `text` tidak kosong | SD-02 |
| `lineCount` | `int` (≥1) | O | [v1] | Jumlah line box berbeda dari `Range.getClientRects()`. Untuk verifikasi pembungkusan (SP-08) | R3 |

Node teks tidak punya anak dan tidak punya `style`.

**Aturan pengelompokan segmen v1** (mekanis; `shared` menyediakan fungsi predikat yang dapat diuji):
1. **Inline polos** adalah elemen dengan computed `display: inline` yang **tidak** menggambar kotak sendiri: `backgroundColor` transparan, tanpa border, tanpa `boxShadow`, `opacity` 1. Selain itu elemen tersebut bukan `img`, `svg`, `iframe`, `canvas`, `video`, atau elemen yang menjadi placeholder.
2. Untuk setiap elemen yang dicatat (E), anak-anak DOM E dibagi menjadi **segmen**. Segmen adalah rangkaian maksimal anak yang bersambung, terdiri dari text node dan inline polos (rekursif: isi inline polos juga harus text node, inline polos, atau `<br>`).
3. Setiap segmen yang berisi karakter non-whitespace setelah collapse menjadi **satu node `text`** dengan `parentId` = E dan `tag` = tag E. Segmen yang hanya berisi whitespace dibuang.
4. Elemen inline polos di dalam segmen **tidak** menjadi node; gayanya menjadi run (PRD v0.5 11.1 no. 23).
5. Anak yang bukan bagian segmen (block, inline-block, inline bergaya kotak, img, dan seterusnya) menjadi node biasa sesuai urutan. Segmen dan node anak lain tetap berurutan sesuai DOM.
6. **Run:** karakter yang bersebelahan dengan gaya efektif yang sama digabung menjadi satu run.
7. **Teks** ditulis sesuai yang dirender:
   - whitespace di-collapse sesuai `whiteSpace`;
   - `text-transform` sudah diterapkan;
   - `<br>` menjadi `"\n"`;
   - pembungkusan lunak (soft wrap) **tidak** disisipkan sebagai `"\n"`.
8. **`rect`** adalah gabungan (union) seluruh `getClientRects()` dari Range yang mencakup segmen.

`TextStyle`:

| Field | Tipe | Wajib | Versi | Deskripsi | Rujukan |
|---|---|---|---|---|---|
| `fontFamily` | `string[]` | O | [v1] | SD-04 | FR-EXT-07 |
| `fontFamilyUsed` | `string` | O | [v1] | Perkiraan font yang dipakai (P-04). Absen bila tidak dapat diperkirakan (`EXT_FONT_ESTIMATE_UNKNOWN`) | FR-EXT-07 |
| `fontSize` | `Px≥0` | O | [v1] | — | 5.1 |
| `fontWeight` | `number` (1–1000) | O | [v1] | — | 5.1 |
| `fontStyle` | `enum(normal, italic, oblique)` | O | [v1] | `oblique <sudut>` dinormalisasi menjadi `oblique` | 5.1 |
| `color` | `Color†` | O | [v1] | — | 5.1 |
| `textAlign` | `enum(start, end, left, right, center, justify, match-parent, -webkit-left, -webkit-right, -webkit-center)` | O | [v1] | Nilai serialisasi Chrome apa adanya; resolusi `start`/`end` memakai `direction` | 5.1 |
| `direction` | `enum(ltr, rtl)` | O | [v1] | Untuk resolusi `textAlign` | 5.1 |
| `lineHeight` | `"normal"` atau `Px≥0` | O | [v1] | — | 5.1 |
| `letterSpacing` | `"normal"` atau `Px` | O | [v1] | Fakta tambahan (SD-11) | R3 |
| `whiteSpace` | `enum(normal, nowrap, pre, pre-wrap, pre-line, break-spaces)` | O | [v1] | Fakta tambahan (SD-11), menentukan perilaku bungkus | R3 |
| `textDecorationLine` | `enum(underline, overline, line-through)[]` | O | [v1] | Fakta tambahan (SD-11). `[]` = none | — |

`TextRun`:

| Field | Tipe | Wajib | Versi | Deskripsi |
|---|---|---|---|---|
| `text` | `string` | W | [v1] | Tidak kosong |
| `style` | `RunStyle` | O | [v1] | Hanya field yang **berbeda** dari `textStyle` node. Field absen = mengikuti `textStyle` (bukan nilai awal CSS) |

`RunStyle` = subset `TextStyle`: `fontFamily`, `fontFamilyUsed`, `fontSize`, `fontWeight`, `fontStyle`, `color`, `letterSpacing`, `textDecorationLine`. Field yang berlaku per blok (`textAlign`, `direction`, `lineHeight`, `whiteSpace`) hanya ada di `textStyle` **[ASUMSI: `lineHeight` per blok cukup untuk v1]**.

### SD-11 Fakta teks tambahan dicatat sejak v1

`letterSpacing`, `whiteSpace`, `textDecorationLine`, `lineCount`, `position`, dan `zIndex` tidak disebut di cakupan render v1 (PRD 5.1). Field ini tetap dicatat sebagai fakta, dengan dua alasan:
- prinsip "perbaikan pemetaan tanpa capture ulang" (AD-08);
- R3 (perbedaan model teks).

Plugin v1 boleh mengabaikannya. Biayanya kecil, karena field yang bernilai awal dihilangkan (SD-05).

### 4.5 `kind: "image"` (`<img>`)

| Field | Tipe | Wajib | Versi | Deskripsi | Rujukan |
|---|---|---|---|---|---|
| `style` | `BoxStyle` | O | [v1] | Border, radius, shadow, opacity milik `<img>` | 5.1 |
| `image` | `ImageInfo` | W | [v1] | — | FR-EXT-08 |

Node image tidak punya anak.

`ImageInfo`:

| Field | Tipe | Wajib | Versi | Deskripsi | Rujukan |
|---|---|---|---|---|---|
| `assetId` | `Id` | W | [v1] | Merujuk `assets[].id` (berhasil atau gagal) | FR-EXT-09 |
| `naturalWidth` | `int` (≥0) | W | [v1] | `naturalWidth` di halaman (0 bila tidak termuat) | ARCHITECTURE 7.5 |
| `naturalHeight` | `int` (≥0) | W | [v1] | — | ARCHITECTURE 7.5 |
| `objectFit` | `enum(fill, contain, cover, none, scale-down)` | O | [v1] | — | ARCHITECTURE 7.5 |
| `objectPosition` | `[LengthPct, LengthPct]` | O | [v1] | `[x, y]` | ARCHITECTURE 7.5 |

`currentSrc` tidak disimpan di node. URL sumber dicatat sekali di aset (`sourceUrl`, 5.1), karena aset dideduplikasi per URL.

### 4.6 `kind: "placeholder"` (konten tidak didukung)

| Field | Tipe | Wajib | Versi | Deskripsi | Rujukan |
|---|---|---|---|---|---|
| `placeholder` | `{ content: enum(iframe, canvas, video) }` | W | [v1] | `iframe` mencakup iframe lintas domain **dan** same-origin (P-02) | FR-PLG-16, K1-13 |
| `style` | `BoxStyle` | O | [v1] | Boleh dicatat; plugin v1 boleh mengabaikannya | — |

Node placeholder tidak punya anak; isi iframe, canvas, dan video tidak ditelusuri. Setiap placeholder disertai `EXT_UNSUPPORTED_CONTENT`.

### 4.7 Ruang v2 dan v3

| Jenis / field | Versi | Isi yang sudah pasti | Rujukan |
|---|---|---|---|
| `kind: "pseudo"` | [v2] | `pseudo: { type: enum(before, after) }`, `style: BoxStyle`, anak boleh berupa satu node `text` (isi `content`). `tag` = tag elemen host | FR-EXT-15, K2-03 |
| `kind: "svg"` | [v2] | `svg: { markup: string }` berisi serialisasi outerHTML SVG (bentuk sanitasi ditetapkan di v2), `style: BoxStyle` | FR-EXT-15, K2-02, SP-04 |
| `style.backgroundImage` | [v2] | 4.8 | FR-EXT-15, K2-01 |
| `style.layout`, `style.flexItem`, `style.padding` | [v2] | 4.8 | FR-EXT-16, K2-04/05 |
| `inShadowTree` | [v2] | 4.1 | FR-EXT-20, K2-06 |
| `style.transform`, data sticky, `meta.viewportPreset` | [v3] | Ruang ekstensi; bentuk ditetapkan saat v3 (penambahan field opsional = MINOR) | FR-EXT-17/18 |

### 4.8 Struktur v2 yang sudah pasti

`BackgroundLayer` (urutan CSS, pertama = paling atas):

| Field | Tipe | Wajib | Deskripsi |
|---|---|---|---|
| `type` | `enum(linear-gradient, url)` | W | Jenis lain (radial, conic) ditambahkan sebagai MINOR saat dibutuhkan |
| `angleDeg` | `number` | W\* | Wajib untuk `linear-gradient` (K2-01) |
| `stops` | `{ color: Color†, pos: LengthPct }[]` | W\* | Wajib untuk `linear-gradient` |
| `assetId` | `Id` | W\* | Wajib untuk `url` |
| `size`, `position`, `repeat` | — | O | Bentuk ditetapkan di v2 |

`FlexContainer`: `display` (`flex`, `inline-flex`), `flexDirection`, `flexWrap`, `justifyContent`, `alignItems`, `alignContent`, `rowGap: Px`, `columnGap: Px`. Keyword dicatat apa adanya sebagai `string`; pemetaan ke enum Figma dilakukan di plugin (AD-08), sehingga kasus `stretch` (K1-09) ditangani di pemetaan.

`FlexItem`: `alignSelf`, `flexGrow: number`, `flexShrink: number`, `flexBasis: Px† atau "auto"`, `order: int`, `margin: { top, right, bottom, left: Px }`.

### 4.9 Elemen yang dilewati (FR-EXT-05)

Elemen yang dilewati (SD-07) **tidak menjadi node**. Jumlahnya dicatat per alasan di `report.skipped` (6.1). Turunan dari elemen yang dilewati juga ikut dilewati, kecuali dinyatakan lain di tabel.

| Kode alasan | Kondisi | Dihitung di laporan |
|---|---|---|
| `SKIP_DISPLAY_NONE` | `display: none` | Ya |
| `SKIP_VISIBILITY_HIDDEN` | `visibility: hidden/collapse` tanpa keturunan yang terlihat. Bila punya keturunan terlihat, elemen tetap dicatat (SD-14) | Ya |
| `SKIP_ZERO_SIZE` | `w == 0` atau `h == 0` tanpa keturunan yang terlihat | Ya |
| `SKIP_OUTSIDE_PAGE` | Rect sepenuhnya di luar `[0, page.width] × [0, page.height]` (A6 a) | Ya (FR-EXT-19) |
| `SKIP_CLIPPED_BY_ANCESTOR` | Rect sepenuhnya di luar rect clip leluhur dengan overflow ≠ `visible` (A6 b) | Ya (FR-EXT-19) |
| `SKIP_NODE_LIMIT` | Melewati `maxNodes` bila diaktifkan (ARCHITECTURE 9) | Ya |
| `SKIP_NON_RENDERED` | `head`, `script`, `style`, `template`, `noscript`, `meta`, `link`, `title` | Tidak (derau) |

**`display: contents`:** elemennya tidak menjadi node dan tidak dihitung. Anak-anaknya ditempel ke leluhur terdekat yang dicatat **[ASUMSI]**.

### SD-07 Elemen dilewati hanya dihitung, tidak didaftar

- **Opsi.**
  - (a) Daftar elemen dilewati dengan selector/rect.
  - (b) Hanya jumlah per alasan.
- **Keputusan.** (b) untuk v1.
- **Alasan.**
  - FR-EXT-19 hanya meminta jumlah.
  - Daftar bisa sangat besar (menu off-canvas, ribuan elemen tersembunyi) dan memuat isi halaman.
- **Konsekuensi.** Untuk diagnosis, sampel bisa ditambahkan nanti sebagai field opsional (`skippedSamples`), dan itu perubahan MINOR.

### SD-14 Induk `visibility: hidden` dengan keturunan terlihat

- **Konteks.** CSS mengizinkan anak bergaya `visibility: visible` tampil di bawah induk `visibility: hidden`. FR-EXT-05 menyatakan elemen tidak terlihat tidak diekspor.
- **Opsi.**
  - (a) Induk tetap dicatat dengan `style.visibility: "hidden"`.
  - (b) Induk dilewati dan anak ditempel ke leluhur.
- **Keputusan.** (a), diputuskan pemilik pada 2026-10-13 (PQ-02; PRD v0.5 11.1 no. 25).
  - Elemen `visibility: hidden`/`collapse` yang punya keturunan terlihat dicatat dengan `style.visibility` bernilai aslinya; kotaknya tidak digambar oleh plugin.
  - Elemen tersebut dilewati (`SKIP_VISIBILITY_HIDDEN`) hanya bila tidak punya keturunan terlihat.
- **Alasan.** Hierarki K1-06 tetap terjaga.
- **Konsekuensi.** Tidak ada field baru. Plugin harus menghormati `style.visibility` (tidak menggambar fill, border, dan shadow node tersebut, tetapi tetap membuat anaknya).

---

## 5. Aset gambar

### SD-08 Aset dideduplikasi per URL, base64 standar, MIME terbatas

- Satu entri `assets[]` per URL sumber unik (URL penuh, sebelum dibersihkan; SD-13). Banyak node image boleh merujuk satu aset.
- `data` memakai base64 standar RFC 4648: alfabet `+/`, dengan padding `=`, tanpa prefiks `data:` dan tanpa baris baru.
- `mime` hanya `image/png`, `image/jpeg`, atau `image/gif`, karena format lain sudah dikonversi oleh service worker (ARCHITECTURE 7.5). Dengan begitu plugin bisa langsung memanggil `figma.createImage`.

### 5.1 `Asset`

| Field | Tipe | Wajib | Versi | Deskripsi | Rujukan |
|---|---|---|---|---|---|
| `id` | `Id` | W | [v1] | Unik di `assets[]` | SD-03 |
| `status` | `enum(ok, failed)` | W | [v1] | — | FR-EXT-09 |
| `sourceUrl` | `string` | O | [v1] | URL sumber tanpa query string, hash, dan userinfo (SD-13). Tidak dijamin unik antar aset. Untuk `data:` hanya ditulis `"data:<mime>"`; untuk `blob:` hanya `"blob:"` | ARCHITECTURE 7.5 |
| `sourceMime` | `string` | O | [v1] | MIME asli sebelum konversi (mis. `image/webp`, `image/svg+xml`) | P-07, SP-06 |
| `mime` | `enum(image/png, image/jpeg, image/gif)` | W\* | [v1] | Wajib bila `status: ok` | ARCHITECTURE 5 |
| `width` | `int` (1–4096) | W\* | [v1] | Lebar data terenkode (setelah downscale). Wajib bila `ok` | ARCHITECTURE 7.5 |
| `height` | `int` (1–4096) | W\* | [v1] | Wajib bila `ok` | ARCHITECTURE 7.5 |
| `byteLength` | `int` (≥1) | W\* | [v1] | Panjang byte hasil decode `data`. Wajib bila `ok` | ARCHITECTURE 9 |
| `data` | `string` | W\* | [v1] | Base64 (SD-08). Wajib bila `ok`, dilarang bila `failed` | AD-05 |
| `failure` | `{ code: enum(…), httpStatus?: int }` | W\* | [v1] | Wajib bila `failed`. Kode di 5.2 | FR-EXT-09, R8 |

### 5.2 Kode alasan gagal (stabil)

| Kode | Kondisi | Rujukan |
|---|---|---|
| `IMG_BLOCKED` | Server menolak: HTTP 401, 403, atau 451. `httpStatus` diisi | R8 |
| `IMG_HTTP_ERROR` | Respons non-2xx lainnya. `httpStatus` diisi | FR-EXT-09 |
| `IMG_NETWORK` | Fetch gagal tanpa respons (DNS, koneksi, TLS) | FR-EXT-09 |
| `IMG_TIMEOUT` | Melewati `imageFetchTimeoutMs` | ARCHITECTURE 9 |
| `IMG_TOO_LARGE` | Setelah konversi, ukurannya > `imageMaxBytes` | FR-EXT-09 |
| `IMG_TOTAL_LIMIT` | Batas `imageMaxTotalBytes` sudah tercapai | FR-EXT-09 |
| `IMG_UNSUPPORTED_FORMAT` | Konversi ke PNG/JPEG/GIF gagal (mis. SVG di worker, SP-06) | P-07 |
| `IMG_DECODE_FAILED` | Data yang diterima tidak dapat di-decode sebagai gambar | ARCHITECTURE 7.5 |
| `IMG_SOURCE_UNAVAILABLE` | `<img>` tanpa `currentSrc`, atau gambar tidak termuat di halaman (`complete && naturalWidth == 0`) | — |
| `IMG_OTHER` | Kegagalan lain yang tidak terklasifikasi | — |

Kode baru boleh ditambahkan dengan menaikkan MINOR. Plugin yang menerima kode tak dikenal memperlakukannya sebagai `IMG_OTHER` (7.4).

### SD-13 URL disimpan tanpa query, hash, dan userinfo

- **Konteks.** `meta.url` dan `assets[].sourceUrl` bisa memuat token di query atau hash (halaman di balik login, URL gambar bertanda tangan). Amplop tersimpan di file `.json`, clipboard, dan relay.
- **Opsi.**
  - (1) Simpan utuh.
  - (2) Buang query dan hash.
  - (3) Simpan hanya origin + path.
- **Keputusan.** (2), diputuskan pemilik pada 2026-10-13 (PQ-01). Berlaku untuk `meta.url` dan `assets[].sourceUrl`.
  - Bagian userinfo URL (`user:pass@`) juga dibuang **[ASUMSI]**.
  - Aturan `data:` (hanya `"data:<mime>"`) dan `blob:` (hanya `"blob:"`) di 5.1 tetap berlaku.
- **Alasan.** Token umum tidak ikut tersimpan, sementara origin dan path tetap tersedia untuk diagnosis.
- **Konsekuensi.**
  - Pengambilan gambar oleh service worker dan deduplikasi aset di memori tetap memakai URL penuh. Hanya nilai yang ditulis ke amplop yang dibersihkan.
  - Akibatnya, dua aset bisa memiliki `sourceUrl` yang sama (mis. URL yang hanya berbeda query). Plugin tidak boleh mendeduplikasi berdasarkan `sourceUrl`; rujukan selalu lewat `assetId`.
  - Format tidak berubah (tetap `string`), sehingga mengubah kebijakan ini nanti tidak menaikkan versi.

---

## 6. Laporan dan peringatan

### SD-09 Peringatan berkode, berparameter, dan diagregasi

- Data hanya memuat `code` dan `params`. **Pesan manusia tidak masuk data.** Teks pesan disimpan di katalog `shared/messages` dan dapat diubah tanpa menaikkan versi.
- Peringatan dengan `code` dan `params` yang sama digabung menjadi satu entri berisi `count` dan sampel `nodeIds`. Jumlah sampel dibatasi oleh `warningSampleNodeIds` (K-01, ARCHITECTURE bagian 9). Tujuannya agar laporan tidak membengkak, misalnya 5.000 peringatan identik untuk satu nilai CSS yang sama.

`Warning`:

| Field | Tipe | Wajib | Deskripsi |
|---|---|---|---|
| `code` | `string` | W | Dari katalog 6.4 |
| `count` | `int` (≥1) | W | Jumlah kejadian |
| `params` | `{ [k: string]: string \| number \| bool }` | O | Parameter sesuai katalog (bukan pesan) |
| `nodeIds` | `Id[]` | O | Sampel node terkait (maksimal K-01) |
| `assetIds` | `Id[]` | O | Sampel aset terkait |

### 6.1 `ExtractionReport` (di amplop)

| Field | Tipe | Wajib | Versi | Deskripsi | Rujukan |
|---|---|---|---|---|---|
| `counts.elements` | `int` | W | [v1] | Node berjenis element + image + placeholder (+ pseudo, svg di v2) | FR-EXT-19 |
| `counts.textNodes` | `int` | W | [v1] | Node `text` | FR-EXT-19 |
| `counts.imagesOk` | `int` | W | [v1] | Aset `ok` | FR-EXT-19 |
| `counts.imagesFailed` | `int` | W | [v1] | Aset `failed` | FR-EXT-19 |
| `counts.placeholders` | `int` | W | [v1] | Node `placeholder` | K1-13 |
| `fonts` | `FontUsage[]` | W | [v1] | Font yang dipakai | FR-EXT-19 |
| `skipped` | `{ [kode SKIP_*]: int }` | W | [v1] | Per alasan, kecuali `SKIP_NON_RENDERED`; boleh `{}` | FR-EXT-05, -19 |
| `scroll` | `{ steps: int, truncated: bool, waitedMs: int }` | W | [v1] | Hasil tahap C2 | FR-EXT-03 |
| `warnings` | `Warning[]` | W | [v1] | Kategori `ext` (6.4); boleh `[]` | FR-EXT-19 |
| `metrics` | `ExtractionMetrics` | W | [v1] | — | NFR-01 |

`FontUsage`: `{ family: string, used?: string, weights: number[], textNodes: int }`. Satu entri per keluarga **pertama** di `fontFamily`, beserta perkiraan font yang dipakai.

`ExtractionMetrics`:

| Field | Tipe | Wajib | Deskripsi |
|---|---|---|---|
| `stageMs` | `{ wait, walk, collect, images, assemble: int }` | W | Durasi per tahap: C2, C3–C4, C5–C6, C8, C9 |
| `nodeCount` | `int` | W | `nodes.length` |
| `nodesJsonBytes` | `int` | W | Panjang byte UTF-8 dari `JSON.stringify(nodes)` ("ukuran JSON" NFR-01; amplop tidak dapat memuat ukurannya sendiri) |
| `imageBytesTotal` | `int` | W | Jumlah `byteLength` aset `ok` |
| `assetsBase64Bytes` | `int` | W | Jumlah panjang string `data` |

### 6.2 `ImportReport` (dibuat plugin; tidak masuk amplop)

Tipe bersama di `shared/types`. Dipakai oleh main → UI untuk tampilan (FR-PLG-10) dan sebagai sumber ringkasan `ack` (8.6).

| Field | Tipe | Wajib | Deskripsi | Rujukan |
|---|---|---|---|---|
| `captureId` | `string` | W | Dari `meta.captureId`, atau `""` bila tidak ada | — |
| `outcome` | `enum(imported, incomplete, rejected)` | W | `incomplete` = error di tengah render (P-05); `rejected` = fatal di validasi | FR-PLG-03 |
| `fatal` | `{ code: string, params?: {…} }` | W\* | Wajib bila `rejected` | 7.1 |
| `nodesCreated` | `int` | W | Jumlah node Figma yang berhasil dibuat dari node amplop, termasuk placeholder. Node yang dilewati karena validasi atau kegagalan tidak dihitung | FR-PLG-10 |
| `fontSubstitutions` | `{ from: string, to: string, tier: enum(name, manual, category, fallback), textNodes: int }[]` | W | `from` = keluarga asli, `to` = keluarga Figma yang dipakai | FR-PLG-05, -10, K1-05 |
| `placeholders` | `{ images: int, unsupported: int }` | W | — | FR-PLG-09, -16 |
| `warnings` | `Warning[]` | W | Kategori `val` dan `rnd` | FR-PLG-10 |
| `metrics` | `{ stageMs: { validate, fonts, create, autolayout: int }, nodeCount: int }` | W | `autolayout` diisi 0 di v1 | NFR-01 |

### 6.3 Tingkat keparahan

- `info`: tidak ada yang hilang secara visual.
- `warning`: ada kemungkinan selisih visual atau konten diganti.
- `error`: konten hilang atau hasil tidak lengkap.
- `fatal`: hanya dari validasi (7.1); tidak masuk `warnings`.

### 6.4 Katalog kode (awal)

Pesan manusia di kolom terakhir hanya contoh untuk `shared/messages`; teks ini **tidak** masuk data.

| Kode | Kategori | Tingkat | Parameter | Rujukan | Contoh pesan |
|---|---|---|---|---|---|
| `EXT_SCROLL_LIMIT_REACHED` | ext | warning | `steps`, `maxSteps` | FR-EXT-03, -19 | "Halaman dipotong setelah {steps} langkah scroll." |
| `EXT_WAIT_TIMEOUT` | ext | warning | `waitedMs` | FR-EXT-03 | "Batas waktu tunggu tercapai; sebagian konten mungkin belum termuat." |
| `EXT_NODE_FAILED` | ext | warning | — | NFR-02, C5 | "Satu elemen hanya ditangkap posisinya." |
| `EXT_VALUE_UNPARSED` | ext | warning | `property` | C6 | "Nilai {property} tidak dikenali." |
| `EXT_COLOR_CONVERTED` | ext | info | `property`, `space` | SD-04 | "Warna {space} dikonversi ke sRGB." |
| `EXT_IMAGE_FAILED` | ext | warning | `reason` (kode 5.2) | FR-EXT-09, K1-04 | "Gambar gagal diambil: {reason}." |
| `EXT_UNSUPPORTED_CONTENT` | ext | info | `content` | FR-PLG-16, K1-13 | "{content} diganti placeholder." |
| `EXT_FEATURE_NOT_IN_VERSION` | ext | info | `feature` (`svg-inline`, `background-image`, `gradient`, `pseudo-element`, `transform`, `fixed`, `sticky`) | PRD 5 | "Fitur {feature} belum didukung di versi ini." |
| `EXT_NODE_LIMIT_REACHED` | ext | warning | `maxNodes` | NFR-01 | "Batas {maxNodes} node tercapai." |
| `EXT_FONT_ESTIMATE_UNKNOWN` | ext | info | — | FR-EXT-07 | "Font yang dipakai tidak dapat diperkirakan." |
| `VAL_NEWER_MINOR` | val | info | `dataVersion`, `supported` | NFR-07 | "Data dari extension yang lebih baru; sebagian info diabaikan." |
| `VAL_UNKNOWN_FIELD` | val | info | `path` | 7.4 | "Field tak dikenal diabaikan." |
| `VAL_META_INCOMPLETE` | val | warning | `field` | 7.2 | "Metadata capture tidak lengkap." |
| `VAL_REPORT_MISSING` | val | info | — | 7.2 | "Laporan ekstraksi tidak ada." |
| `VAL_FIELD_MISSING` | val | warning | `field`, `action` (`default`, `skip`) | NFR-02, K1-10 | "Field {field} tidak ada." |
| `VAL_FIELD_TYPE` | val | warning | `field`, `expected`, `action` | NFR-02, K1-10 | "Tipe {field} salah." |
| `VAL_ENUM_UNKNOWN` | val | warning | `field`, `value` | FR-PLG-08, K1-09/10 | "Nilai {value} untuk {field} tidak dikenali; memakai default." |
| `VAL_RECT_INVALID` | val | warning | `reason` | K1-10 | "Posisi atau ukuran node tidak valid; node dilewati." |
| `VAL_KIND_UNKNOWN` | val | warning | `value` | 7.4 | "Jenis node {value} tidak dikenal; dirender sebagai frame." |
| `VAL_DUPLICATE_ID` | val | warning | `id` | 7.5 | "Id ganda; node kedua dilewati." |
| `VAL_PARENT_MISSING` | val | warning | `parentId` | 7.5 | "Induk tidak ditemukan; node ditempel ke root." |
| `VAL_PARENT_CYCLE` | val | error | — | 7.5 | "Rujukan induk melingkar; node dilewati." |
| `VAL_ORDER_FIXED` | val | info | — | 7.5 | "Urutan node diperbaiki." |
| `VAL_ROOT_HAS_PARENT` | val | info | — | 4.1 | — |
| `VAL_CHILDREN_REPARENTED` | val | info | `count` | 7.5 | "{count} node ditempel ke induk terdekat." |
| `VAL_TEXT_EMPTY` | val | warning | — | 4.4 | "Node teks kosong dilewati." |
| `VAL_ASSET_MISSING` | val | warning | `assetId` | K1-10 | "Aset gambar tidak ada; diganti placeholder." |
| `VAL_ASSET_INVALID` | val | warning | `reason` | 5.1 | "Data gambar rusak; diganti placeholder." |
| `RND_FONT_SUBSTITUTED` | rnd | warning | `from`, `to`, `tier` | FR-PLG-05, K1-05 | "Font {from} diganti {to}." |
| `RND_FONT_LOAD_FAILED` | rnd | warning | `family`, `style` | FR-PLG-05 | "Font {family} gagal dimuat." |
| `RND_TEXT_SKIPPED_NO_FONT` | rnd | error | — | ARCHITECTURE 4.2 R4 | "Teks dilewati karena tidak ada font yang dapat dimuat." |
| `RND_VALUE_DEFAULTED` | rnd | warning | `property`, `value` | FR-PLG-08, K1-09 | "{property} memakai nilai default." |
| `RND_IMAGE_PLACEHOLDER` | rnd | warning | `reason` | FR-PLG-09, K1-04 | "Gambar diganti placeholder: {reason}." |
| `RND_IMAGE_CREATE_FAILED` | rnd | warning | — | ARCHITECTURE 7.5 | "Figma menolak data gambar." |
| `RND_UNSUPPORTED_PLACEHOLDER` | rnd | info | `content` | FR-PLG-16 | — |
| `RND_NODE_FAILED` | rnd | warning | — | NFR-02, R5 | "Satu node gagal dibuat." |
| `RND_INCOMPLETE` | rnd | error | `atNodeId` | FR-PLG-03 (P-05) | "Import berhenti di tengah; hasil tidak lengkap." |
| `RND_AUTOLAYOUT_REVERTED` | rnd | info | — | FR-PLG-13 [v2] | — |

Menambah kode baru tidak menaikkan versi format. Plugin menampilkan kode tak dikenal dengan pesan umum. Mengubah makna atau parameter kode yang sudah ada dilarang; kode lama dipensiunkan dan kode baru dibuat.

---

## 7. Validasi dan versioning

### 7.1 Kegagalan fatal (seluruh data ditolak, tanpa node)

Pemeriksaan dilakukan berurutan; pemeriksaan pertama yang gagal menentukan kodenya.

| # | Kode | Kondisi | Rujukan |
|---|---|---|---|
| F1 | `E_NOT_JSON` | `JSON.parse` gagal (termasuk JSON terpotong) | K1-10 |
| F2 | `E_NOT_CODETOFRAME` | Bukan objek, atau `format !== "codetoframe"`, dan bukan format lama | FR-PLG-03 |
| F3 | `E_LEGACY_FORMAT` | Deteksi format lama (SD-06) | — |
| F4 | `E_VERSION_INVALID` | `formatVersion` absen atau tidak cocok pola `MAJOR.MINOR` | NFR-07 |
| F5 | `E_VERSION_MAJOR_UNSUPPORTED` | MAJOR ≠ MAJOR yang didukung plugin. Parameter `dataVersion`, `supportedMajor` | NFR-07, K1-10 |
| F6 | `E_ROOT_MISSING` | `nodes` bukan array, `rootId` absen atau bukan `Id`, atau tidak ada node dengan `id == rootId` | K1-10 |
| F7 | `E_ROOT_INVALID` | Root bukan `kind: "element"`, `rect`-nya tidak valid (7.5), atau `w == 0`/`h == 0` | NFR-08 |

### 7.2 Kegagalan per bagian (bukan fatal)

| Kondisi | Tindakan | Kode |
|---|---|---|
| `meta` absen atau bukan objek | Nama frame memakai default "CodeToFrame import". Field lain dianggap absen | `VAL_META_INCOMPLETE {field: "meta"}` |
| Field `meta` wajib absen atau tipenya salah | Field tersebut dianggap absen | `VAL_META_INCOMPLETE {field}` |
| `assets` absen atau bukan array | Dianggap `[]`; semua node image menjadi placeholder | `VAL_FIELD_MISSING {field: "assets", action: "default"}` |
| `report` absen atau rusak | Diabaikan | `VAL_REPORT_MISSING` |

### 7.3 Nilai awal untuk field yang absen (normatif, SD-05)

| Field | Nilai awal | Catatan |
|---|---|---|
| `style.display` | `"inline"` | Nilai awal CSS |
| `style.position` | `"static"` | — |
| `style.zIndex` | `"auto"` | — |
| `style.visibility` | `"visible"` | — |
| `style.opacity` | `1` | — |
| `style.overflowX`, `overflowY` | `"visible"` | — |
| `style.backgroundColor` | `{r:0,g:0,b:0,a:0}` | transparan |
| `style.border` (atau sisi) | tidak ada border | — |
| `style.borderRadius` (atau sudut) | `[0, 0]` | — |
| `style.boxShadow` | `[]` | — |
| `style.padding` [v2] | 0 di semua sisi | — |
| `style.backgroundImage` [v2] | `[]` | — |
| `style.layout`, `style.flexItem` [v2] | tidak ada (bukan flex) | — |
| `textStyle.fontFamily` | `["serif"]` | Nilai awal CSS bergantung UA; Chrome memakai font standar serif **[ASUMSI]** |
| `textStyle.fontFamilyUsed` | tidak ada | Plugin memakai `fontFamily` |
| `textStyle.fontSize` | `16` | `medium` di Chrome |
| `textStyle.fontWeight` | `400` | — |
| `textStyle.fontStyle` | `"normal"` | — |
| `textStyle.color` | `{r:0,g:0,b:0,a:1}` | `canvastext` pada skema terang **[ASUMSI]** |
| `textStyle.textAlign` | `"start"` | — |
| `textStyle.direction` | `"ltr"` | — |
| `textStyle.lineHeight` | `"normal"` | — |
| `textStyle.letterSpacing` | `"normal"` | — |
| `textStyle.whiteSpace` | `"normal"` | — |
| `textStyle.textDecorationLine` | `[]` | — |
| `runs[].style.*` | sama dengan `textStyle` node | Bukan nilai awal CSS |
| `image.objectFit` | `"fill"` | — |
| `image.objectPosition` | `[{pct:50},{pct:50}]` | — |

Ketentuan:
- `Unparsed` dan nilai enum asing diperlakukan sama dengan field absen (memakai nilai awal), ditambah peringatan.
- Nilai di luar rentang juga memakai nilai awal: `opacity` > 1 atau < 0, `fontWeight` di luar 1–1000, dan `Px≥0` negatif. Kodenya `VAL_FIELD_TYPE {action: "default"}`.

### 7.4 Nilai asing dan field tak dikenal

| Kasus | Tindakan | Kode |
|---|---|---|
| Nilai enum gaya tak dikenal | Nilai awal (7.3) | `VAL_ENUM_UNKNOWN` |
| `kind` tak dikenal | Bila `rect` valid: dirender sebagai frame kosong dengan anak tetap diproses. Bila tidak: dilewati | `VAL_KIND_UNKNOWN` |
| `placeholder.content` tak dikenal | Placeholder dengan label umum | `VAL_ENUM_UNKNOWN` |
| `failure.code` aset tak dikenal | Diperlakukan `IMG_OTHER` | `VAL_ENUM_UNKNOWN` |
| Field tak dikenal, data MINOR > yang didukung | Diabaikan diam-diam; satu `VAL_NEWER_MINOR` per amplop | `VAL_NEWER_MINOR` |
| Field tak dikenal, data MINOR ≤ yang didukung | Diabaikan dan diagregasi per path | `VAL_UNKNOWN_FIELD` |
| Tipe field salah (termasuk `null`) | Field gaya: nilai awal. Field struktural: aturan 7.5 | `VAL_FIELD_TYPE` |

### 7.5 Struktur: rect, induk, id, aset

| Kasus | Tindakan | Kode |
|---|---|---|
| `rect` absen | Node dilewati; anaknya ditempel ke leluhur valid terdekat (posisi absolut tetap benar karena koordinat halaman) | `VAL_FIELD_MISSING {field:"rect", action:"skip"}`, `VAL_CHILDREN_REPARENTED` |
| `rect` tidak valid (field kurang, bukan number, `w`/`h` negatif) | Sama dengan di atas | `VAL_RECT_INVALID` |
| `id` absen atau bukan `Id` | Node dilewati; anak yang merujuknya ditangani lewat `VAL_PARENT_MISSING` | `VAL_FIELD_MISSING {field:"id", action:"skip"}` |
| `id` duplikat | Kemunculan pertama dipakai; kemunculan berikutnya dilewati. Anak yang merujuk id itu dikaitkan ke kemunculan pertama | `VAL_DUPLICATE_ID` |
| `parentId` absen pada non-root, atau merujuk id yang tidak ada | Ditempel ke root | `VAL_PARENT_MISSING` |
| `parentId` merujuk dirinya sendiri, atau rantai induk berupa siklus | Semua node di siklus dan turunannya dilewati | `VAL_PARENT_CYCLE` |
| Induk muncul **setelah** anak (bukan siklus) | Diurutkan ulang secara stabil menjadi preorder | `VAL_ORDER_FIXED` |
| Node `text` tanpa `runs` valid, atau semua `text` kosong | Dilewati | `VAL_TEXT_EMPTY` |
| Node `image` dengan `image.assetId` yang tidak ada di `assets` | Placeholder gambar | `VAL_ASSET_MISSING` |
| Aset `ok` dengan `data` bukan base64 valid, `mime` di luar enum, atau `byteLength` tidak cocok dengan panjang `data` | Aset dianggap `failed` (`IMG_OTHER`) → placeholder | `VAL_ASSET_INVALID` |
| `id` aset duplikat | Kemunculan pertama dipakai | `VAL_DUPLICATE_ID` |
| Anak pada node yang tidak boleh punya anak (`text`, `image`, `placeholder`) | Anak ditempel ke induk node tersebut | `VAL_CHILDREN_REPARENTED` |

Pemeriksaan panjang base64 cukup memakai rumus `byteLength == len(data)/4*3 − jumlah '='`, sehingga tidak perlu decode saat validasi; decode dilakukan lazy di R3.

### 7.6 Aturan versioning konkret

- **Plugin** mendukung satu MAJOR (konstanta `FORMAT_MAJOR` di `shared`) dan MINOR maksimum yang dikenal (`FORMAT_MINOR`).
  - MINOR data > `FORMAT_MINOR` → diterima dengan `VAL_NEWER_MINOR`.
  - MINOR data ≤ `FORMAT_MINOR` → diterima tanpa peringatan versi.
- **Extension** selalu menulis versi terbarunya sendiri.

| Contoh perubahan | Dampak |
|---|---|
| Menambah field opsional (mis. `style.padding` mulai diisi; `meta.viewportPreset` di v3) | MINOR |
| Menambah nilai enum baru (mis. `placeholder.content: "embed"`; `BackgroundLayer.type: "radial-gradient"`) | MINOR (plugin lama memakai default + `VAL_ENUM_UNKNOWN`) |
| Menambah `kind` baru | MINOR (plugin lama: `VAL_KIND_UNKNOWN`) |
| Menambah kode peringatan atau kode gagal gambar | Tanpa perubahan versi |
| Mengubah aturan pengelompokan teks (SD-02) atau aturan pembulatan | Tanpa perubahan versi (bentuk dan makna data tetap) |
| Menjadikan field opsional menjadi wajib | MAJOR |
| Menghapus atau mengganti nama field | MAJOR |
| Mengubah satuan atau makna (mis. rect relatif induk; warna 0–1) | MAJOR |
| Mengubah nilai awal di 7.3 | MAJOR |
| Struktur bersarang menggantikan daftar datar | MAJOR |

### 7.7 Daftar periksa validator (dasar uji unit)

Setiap butir = minimal satu kasus uji. Butir bertanda K1-10 wajib ada di fixture data rusak (ARCHITECTURE 10.1).

| # | Pemeriksaan | Hasil yang diharapkan |
|---|---|---|
| VC-01 | String bukan JSON / JSON terpotong (K1-10) | `E_NOT_JSON` |
| VC-02 | JSON array, angka, atau objek tanpa `format` | `E_NOT_CODETOFRAME` |
| VC-03 | Objek tanpa `format` dengan `version: "2.0"` | `E_LEGACY_FORMAT` |
| VC-04 | `formatVersion` absen / `"3"` / `"v3.0"` | `E_VERSION_INVALID` |
| VC-05 | `formatVersion: "4.0"` dan `"2.5"` dengan marker (K1-10) | `E_VERSION_MAJOR_UNSUPPORTED` |
| VC-06 | `formatVersion: "3.9"` + field tak dikenal | Diterima, `VAL_NEWER_MINOR`, field diabaikan |
| VC-07 | `rootId` tidak ada / tidak cocok node mana pun / `nodes` bukan array | `E_ROOT_MISSING` |
| VC-08 | Root ber-`kind: "text"` atau rect root `w: 0` | `E_ROOT_INVALID` |
| VC-09 | Tidak ada node yang dibuat sebelum hasil fatal | Fungsi validasi murni; render tidak dipanggil |
| VC-10 | Node non-root tanpa `rect` (K1-10) | Node dilewati, anak ditempel ulang |
| VC-11 | `rect.w: -5` / `rect.x: "10"` | `VAL_RECT_INVALID` |
| VC-12 | `textAlign: "middle"` (K1-10), `overflowX: "overlay"` | `VAL_ENUM_UNKNOWN`, nilai awal |
| VC-13 | `opacity: 2`, `fontWeight: 0`, `fontSize: -1`, `backgroundColor: null` | `VAL_FIELD_TYPE {action:"default"}` |
| VC-14 | `backgroundColor: {raw: "color-mix(…)"}` | Nilai awal, tanpa error tipe |
| VC-15 | `kind: "hologram"` dengan rect valid | `VAL_KIND_UNKNOWN`, frame kosong |
| VC-16 | Dua node `id: "n3"` | `VAL_DUPLICATE_ID`, yang kedua dilewati |
| VC-17 | `parentId: "n99"` (tidak ada) | `VAL_PARENT_MISSING`, ditempel ke root |
| VC-18 | n2 → n3 → n2 (siklus); `parentId` = dirinya | `VAL_PARENT_CYCLE`, keduanya dilewati |
| VC-19 | Anak muncul sebelum induknya | `VAL_ORDER_FIXED`, urutan menjadi preorder |
| VC-20 | Node `text` dengan `runs: []` / `runs: [{text: ""}]` | `VAL_TEXT_EMPTY` |
| VC-21 | `image.assetId: "a7"` tanpa aset (K1-10) | `VAL_ASSET_MISSING` |
| VC-22 | Aset `ok` dengan `data` berisi karakter non-base64 / `byteLength` salah / `mime: "image/webp"` | `VAL_ASSET_INVALID` |
| VC-23 | Aset `failed` dengan `failure.code: "IMG_FUTURE"` | Diperlakukan `IMG_OTHER` |
| VC-24 | `meta` absen | Diterima, `VAL_META_INCOMPLETE` |
| VC-25 | Field di dalam node yang tidak dikenal (data MINOR sama) | `VAL_UNKNOWN_FIELD` teragregasi |
| VC-26 | 10.000 node dengan nilai enum asing yang sama | Satu entri peringatan, `count: 10000`, `nodeIds` ≤ K-01 |
| VC-27 | Anak di bawah node `image` | `VAL_CHILDREN_REPARENTED` |
| VC-28 | Amplop sah hasil extractor (snapshot fixture) | Lolos tanpa peringatan `val` |
| VC-29 | **Uji extractor/snapshot, bukan validator.** Fixture dengan `root.scope = "document"` | `rect` root = `{ x: 0, y: 0, w: meta.page.width, h: meta.page.height }` (3.2) |

---

## 8. Kontrak relay (pelengkap ARCHITECTURE 3.4)

### SD-10 Body capture diperlakukan opaque oleh relay; metadata lewat header

- **Konteks.**
  - Relay tidak boleh memproses atau mengubah isi capture (ARCHITECTURE 2.1).
  - Respons status dan ack tidak boleh memuat isi halaman (aturan dokumen ini).
  - Plugin perlu judul untuk "Import capture terakhir: {judul}" (AD-03).
- **Opsi.**
  - (a) Relay mem-parse amplop untuk membaca `meta`.
  - (b) Extension mengirim metadata kecil lewat header; body disimpan sebagai byte apa adanya.
- **Keputusan.** (b).
  - `GET /v1/status` (dibaca extension) **tidak** memuat judul.
  - `GET /v1/pending` (dibaca plugin, yang toh akan menerima seluruh capture) memuat judul.
- **Alasan.** Relay tetap "bodoh" dan tidak perlu mem-parse JSON besar. Judul tidak mengalir ke endpoint yang tidak membutuhkannya.
- **Konsekuensi.** ARCHITECTURE 3.4 sudah disesuaikan: respons status tidak memuat judul (U-03, diterapkan di ARCHITECTURE v0.1.2).

### 8.1 Konvensi umum

- **Prefiks dan versi.** Semua path di bawah `/v1`. `/v1` adalah MAJOR protokol relay, terpisah dari `formatVersion`. Semua body respons JSON memuat `"protocol": "1.0"`. Field baru di respons = MINOR protokol; klien mengabaikan field yang tidak dikenal.
- **Autentikasi.** Header `Authorization: Bearer <token>` di semua request kecuali `OPTIONS` (ARCHITECTURE 3.9).
- **Tipe konten.** Respons JSON memakai `application/json; charset=utf-8`.
- **Waktu.** Semua waktu dalam ISO 8601 UTC.
- **Larangan isi.** Respons tidak pernah menggemakan header atau body request (ARCHITECTURE 3.9).

### 8.2 Format galat

```json
{ "protocol": "1.0", "error": { "code": "RELAY_UNAUTHORIZED" } }
```

`error` hanya berisi `code` dan, untuk 413, `limitBytes`. Tidak ada pesan teks.

Pengecualian: header request yang melebihi `maxHeaderSize` Node (default 16 384 byte) dijawab **431** oleh parser HTTP Node, tanpa body JSON di atas (SP-01, N9). Klien memperlakukan 431 sama dengan `RELAY_BAD_REQUEST`.

| HTTP | Kode | Kondisi |
|---|---|---|
| 400 | `RELAY_BAD_REQUEST` | Header wajib absen atau rusak, `known` bukan UUID, body ack tidak valid |
| 401 | `RELAY_UNAUTHORIZED` | Token absen atau salah |
| 403 | `RELAY_FORBIDDEN_HOST` | Header `Host` di luar allowlist |
| 403 | `RELAY_FORBIDDEN_ORIGIN` | `Origin` di luar allowlist (diperiksa sebelum token) |
| 404 | `RELAY_NOT_FOUND` | Path tidak dikenal, slot kosong, `captureId` tidak cocok dengan slot, atau slot sudah kedaluwarsa |
| 405 | `RELAY_METHOD_NOT_ALLOWED` | Method tidak didukung untuk path tersebut |
| 409 | `RELAY_UPLOAD_IN_PROGRESS` | Upload lain sedang berjalan (ARCHITECTURE 3.9) |
| 413 | `RELAY_PAYLOAD_TOO_LARGE` | Body > `relayMaxBodyBytes`; `limitBytes` diisi. Bila `Content-Length` sudah melebihi batas, relay dapat memutus koneksi sebelum klien membaca 413 (SP-01, N8); lihat 8.3 |
| 415 | `RELAY_UNSUPPORTED_MEDIA` | `Content-Type` PUT bukan `application/json` |

Urutan pemeriksaan: `Host` → `Origin` → (OPTIONS selesai di sini) → token → method/path → isi.

Allowlist `Origin` (ARCHITECTURE 3.9): `chrome-extension://*`, `null`, dan Origin absen (GET dari service worker tidak membawa `Origin`, SP-01). Origin `http(s)` lain ditolak dengan `RELAY_FORBIDDEN_ORIGIN`.

### 8.3 `PUT /v1/capture` (extension)

Header request:

| Header | Wajib | Isi |
|---|---|---|
| `Content-Type` | W | `application/json` |
| `X-CTF-Capture-Id` | W | `meta.captureId` (UUID v4) |
| `X-CTF-Format-Version` | W | `formatVersion` amplop |
| `X-CTF-Captured-At` | W | `meta.capturedAt` |
| `X-CTF-Title` | O | `meta.title` di-encode `encodeURIComponent`, dipotong ke `relayTitleMaxChars` karakter **sebelum** di-encode (K-02, ARCHITECTURE bagian 9) |

- Body: amplop utuh (byte UTF-8). Relay **tidak** mem-parse body.
- Respons `200`:

```json
{ "protocol": "1.0", "captureId": "7f9c2b1e-5d4a-4c3b-9e8f-1a2b3c4d5e6f", "receivedAt": "2026-10-13T08:15:31.004Z", "sizeBytes": 18234 }
```

Sebelum PUT, extension membandingkan ukuran amplop dengan `relayMaxBodyBytes`. Bila lebih besar, extension tidak mengirim dan menawarkan Download. Galat jaringan saat PUT besar diperlakukan sebagai kemungkinan melebihi batas (ARCHITECTURE 3.7; SP-01).

`captureId` dibuat extension, bukan relay. Relay hanya menggemakan nilai header (U-04). Slot sebelumnya diganti, dan `lastImport` (8.4) dihapus.

### 8.4 `GET /v1/status` (extension)

Respons `200`. Tidak memuat judul, URL, atau isi halaman.

| Field | Tipe | Wajib | Deskripsi |
|---|---|---|---|
| `protocol` | `string` | W | `"1.0"` |
| `relayVersion` | `string` | W | Versi build relay |
| `pluginConnected` | `bool` | W | `true` bila `GET /v1/pending` terakhir ≤ `pluginHeartbeatTimeoutMs` yang lalu (FR-EXT-21) |
| `pluginLastSeenMsAgo` | `int` | O | Absen bila plugin belum pernah terhubung sejak relay dinyalakan |
| `slot` | `{ captureId, receivedAt, expiresAt, sizeBytes, formatVersion }` | O | Absen bila slot kosong |
| `lastImport` | `{ captureId, at, outcome, nodesCreated, warningCount }` | O | Ringkasan ack terakhir, disimpan sampai PUT berikutnya atau relay dimatikan. Dipakai popup untuk "Sudah diimpor ke Figma" setelah slot dikosongkan (U-05) |

### 8.5 `GET /v1/pending?known=<captureId>` (UI plugin)

- Setiap panggilan memperbarui heartbeat plugin. Parameter `known` opsional.
- Respons `200`:

| Field | Tipe | Wajib | Deskripsi |
|---|---|---|---|
| `protocol` | `string` | W | — |
| `pending` | `{ captureId, capturedAt, receivedAt, sizeBytes, formatVersion, title? }` | O | Absen bila slot kosong atau `captureId` slot == `known`. `title` = hasil decode `X-CTF-Title` |

### 8.6 `GET /v1/capture/<captureId>` dan `POST /v1/capture/<captureId>/ack` (UI plugin)

- **`GET`**: `200` dengan body = byte amplop persis seperti yang diterima. Header `Content-Type: application/json` dan `X-CTF-Capture-Id`. Bila id tidak cocok dengan slot → `404 RELAY_NOT_FOUND`.
- **`POST …/ack`**: body request (`Content-Type: application/json`). **Hanya jumlah dan kode**, tanpa nama font, teks, URL, atau id node:

| Field | Tipe | Wajib | Deskripsi |
|---|---|---|---|
| `outcome` | `enum(imported, incomplete, rejected)` | W | Dari `ImportReport.outcome` |
| `fatalCode` | `string` | W\* | Wajib bila `rejected` (kode 7.1) |
| `nodesCreated` | `int` | W | — |
| `fontSubstitutions` | `int` | W | Jumlah entri `fontSubstitutions` |
| `placeholders` | `int` | W | `images + unsupported` |
| `warningCounts` | `{ [code]: int }` | W | Jumlah per kode (dari `count`) |
| `durationMs` | `int` | W | Total waktu impor |

Respons `200`: `{ "protocol": "1.0", "captureId": "…", "slotCleared": true }`. Slot dikosongkan (AD-03), lalu `lastImport` diisi. Bila id tidak cocok dengan slot → `404` dan tidak ada perubahan.

### 8.7 `OPTIONS /v1/*` (preflight)

- Tidak butuh token. `Host` dan `Origin` tetap diperiksa (403 bila gagal).
- Bila lolos: `204` tanpa body, dengan header berikut:
  - `Access-Control-Allow-Origin: <origin yang lolos>`
  - `Vary: Origin`
  - `Access-Control-Allow-Methods: GET, PUT, POST, OPTIONS`
  - `Access-Control-Allow-Headers: Authorization, Content-Type, X-CTF-Capture-Id, X-CTF-Format-Version, X-CTF-Captured-At, X-CTF-Title`
  - `Access-Control-Expose-Headers: X-CTF-Capture-Id`
  - `Access-Control-Allow-Private-Network: true`, **hanya** bila request preflight membawa `Access-Control-Request-Private-Network: true` (Figma mengirimnya; SP-01)
- Respons non-OPTIONS dari origin yang lolos juga membawa `Access-Control-Allow-Origin` dan `Vary: Origin`.

---

## 9. Contoh

Angka posisi teks dan isi base64 di contoh ini ilustratif, tetapi semuanya konsisten dengan tabel field.

### 9.1 (a) Fixture K1-01: tombol dengan teks

Fixture: `body { margin: 0 }`; tombol `120×40` di (24, 24); latar `#2563EB`; radius 8; tanpa border; teks "Klik" Inter 16/600 putih, rata tengah. Viewport 1280×720.

```json
{
  "format": "codetoframe",
  "formatVersion": "3.0",
  "meta": {
    "captureId": "7f9c2b1e-5d4a-4c3b-9e8f-1a2b3c4d5e6f",
    "url": "http://127.0.0.1:47900/button.html",
    "title": "K1-01 Button",
    "capturedAt": "2026-10-13T08:15:30.123Z",
    "viewport": { "width": 1280, "height": 720 },
    "page": { "width": 1280, "height": 720 },
    "devicePixelRatio": 1,
    "extensionVersion": "0.1.0",
    "root": { "scope": "document", "tag": "html" }
  },
  "rootId": "n0",
  "nodes": [
    { "id": "n0", "kind": "element", "tag": "html", "rect": { "x": 0, "y": 0, "w": 1280, "h": 720 },
      "style": { "display": "block" } },
    { "id": "n1", "kind": "element", "parentId": "n0", "tag": "body", "rect": { "x": 0, "y": 0, "w": 1280, "h": 88 },
      "style": { "display": "block" } },
    { "id": "n2", "kind": "element", "parentId": "n1", "tag": "button", "classes": ["btn", "btn-primary"],
      "rect": { "x": 24, "y": 24, "w": 120, "h": 40 },
      "style": {
        "display": "inline-block",
        "backgroundColor": { "r": 37, "g": 99, "b": 235, "a": 1 },
        "borderRadius": { "tl": [8, 8], "tr": [8, 8], "br": [8, 8], "bl": [8, 8] }
      } },
    { "id": "n3", "kind": "text", "parentId": "n2", "tag": "button",
      "rect": { "x": 68.69, "y": 34.32, "w": 30.62, "h": 19.36 },
      "textStyle": {
        "fontFamily": ["Inter", "sans-serif"],
        "fontFamilyUsed": "Inter",
        "fontWeight": 600,
        "color": { "r": 255, "g": 255, "b": 255, "a": 1 },
        "textAlign": "center"
      },
      "runs": [ { "text": "Klik" } ],
      "lineCount": 1 }
  ],
  "assets": [],
  "report": {
    "counts": { "elements": 3, "textNodes": 1, "imagesOk": 0, "imagesFailed": 0, "placeholders": 0 },
    "fonts": [ { "family": "Inter", "used": "Inter", "weights": [600], "textNodes": 1 } ],
    "skipped": {},
    "scroll": { "steps": 0, "truncated": false, "waitedMs": 540 },
    "warnings": [],
    "metrics": {
      "stageMs": { "wait": 540, "walk": 2, "collect": 3, "images": 0, "assemble": 1 },
      "nodeCount": 4, "nodesJsonBytes": 1180, "imageBytesTotal": 0, "assetsBase64Bytes": 0
    }
  }
}
```

Catatan:
- `fontSize: 16` dan `opacity: 1` dihilangkan karena sama dengan nilai awal (SD-05).
- Elemen `head` dan turunannya tidak dihitung (`SKIP_NON_RENDERED`).
- Nama layer yang dihasilkan plugin: `button.btn` dan `button "Klik"`.
- Rect `n0` = `{ x: 0, y: 0, w: 1280, h: 720 }` = `{0, 0, page.width, page.height}`, sesuai aturan rect root (3.2), bukan `getBoundingClientRect()` mentah dari `html`.

### 9.2 (b) Gambar berhasil dan gambar gagal (K1-04)

Hanya bagian yang berbeda dari 9.1 yang ditampilkan. Aset `a0` adalah PNG 1×1 nyata (70 byte) supaya konsisten. Gambar ditampilkan diperbesar di halaman.

```json
{
  "rootId": "n0",
  "nodes": [
    { "id": "n0", "kind": "element", "tag": "html", "rect": { "x": 0, "y": 0, "w": 1280, "h": 720 } },
    { "id": "n1", "kind": "element", "parentId": "n0", "tag": "body", "rect": { "x": 0, "y": 0, "w": 1280, "h": 400 } },
    { "id": "n2", "kind": "image", "parentId": "n1", "tag": "img", "classes": ["hero"],
      "rect": { "x": 24, "y": 24, "w": 200, "h": 150 },
      "style": { "borderRadius": { "tl": [12, 12], "tr": [12, 12], "br": [12, 12], "bl": [12, 12] } },
      "image": { "assetId": "a0", "naturalWidth": 1, "naturalHeight": 1, "objectFit": "cover" } },
    { "id": "n3", "kind": "image", "parentId": "n1", "tag": "img",
      "rect": { "x": 248, "y": 24, "w": 200, "h": 150 },
      "image": { "assetId": "a1", "naturalWidth": 800, "naturalHeight": 600 } }
  ],
  "assets": [
    { "id": "a0", "status": "ok",
      "sourceUrl": "http://127.0.0.1:47901/img/pixel.png", "sourceMime": "image/png",
      "mime": "image/png", "width": 1, "height": 1, "byteLength": 70,
      "data": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==" },
    { "id": "a1", "status": "failed",
      "sourceUrl": "http://127.0.0.1:47901/img/forbidden.jpg",
      "failure": { "code": "IMG_BLOCKED", "httpStatus": 403 } }
  ]
}
```

Hasil yang diharapkan:
- `n2` menjadi Image Fill `scaleMode` sesuai pemetaan `cover`, dengan radius 12.
- `n3` menjadi placeholder abu-abu 200×150 bertanda "gambar: diblokir server" (FR-PLG-09).
- Laporan ekstraksi memuat `EXT_IMAGE_FAILED {reason: "IMG_BLOCKED"}`.
- Laporan impor memuat `RND_IMAGE_PLACEHOLDER {reason: "IMG_BLOCKED"}`.

### 9.3 (c) Laporan dengan peringatan, laporan impor, dan ack

`report` di dalam amplop:

```json
{
  "counts": { "elements": 1843, "textNodes": 612, "imagesOk": 41, "imagesFailed": 2, "placeholders": 3 },
  "fonts": [
    { "family": "Roboto", "used": "Roboto", "weights": [400, 500, 700], "textNodes": 590 },
    { "family": "Brand Sans", "used": "Brand Sans", "weights": [700], "textNodes": 22 }
  ],
  "skipped": { "SKIP_DISPLAY_NONE": 311, "SKIP_OUTSIDE_PAGE": 14, "SKIP_CLIPPED_BY_ANCESTOR": 37, "SKIP_ZERO_SIZE": 52 },
  "scroll": { "steps": 30, "truncated": true, "waitedMs": 10000 },
  "warnings": [
    { "code": "EXT_SCROLL_LIMIT_REACHED", "count": 1, "params": { "steps": 30, "maxSteps": 30 } },
    { "code": "EXT_IMAGE_FAILED", "count": 1, "params": { "reason": "IMG_BLOCKED" }, "assetIds": ["a17"] },
    { "code": "EXT_IMAGE_FAILED", "count": 1, "params": { "reason": "IMG_TIMEOUT" }, "assetIds": ["a29"] },
    { "code": "EXT_UNSUPPORTED_CONTENT", "count": 3, "params": { "content": "iframe" }, "nodeIds": ["n402", "n977", "n1550"] },
    { "code": "EXT_VALUE_UNPARSED", "count": 6, "params": { "property": "backgroundColor" }, "nodeIds": ["n88", "n89", "n90", "n91", "n92", "n93"] },
    { "code": "EXT_FEATURE_NOT_IN_VERSION", "count": 48, "params": { "feature": "svg-inline" }, "nodeIds": ["n12", "n13"] }
  ],
  "metrics": {
    "stageMs": { "wait": 10000, "walk": 210, "collect": 1340, "images": 2875, "assemble": 95 },
    "nodeCount": 2455, "nodesJsonBytes": 1489220, "imageBytesTotal": 3120455, "assetsBase64Bytes": 4160608
  }
}
```

Catatan: sampel `nodeIds` di entri `svg-inline` dipotong dua demi ringkas.

`ImportReport` (UI plugin):

```json
{
  "captureId": "7f9c2b1e-5d4a-4c3b-9e8f-1a2b3c4d5e6f",
  "outcome": "imported",
  "nodesCreated": 2455,
  "fontSubstitutions": [
    { "from": "Brand Sans", "to": "Inter", "tier": "category", "textNodes": 22 }
  ],
  "placeholders": { "images": 2, "unsupported": 3 },
  "warnings": [
    { "code": "RND_FONT_SUBSTITUTED", "count": 22, "params": { "from": "Brand Sans", "to": "Inter", "tier": "category" } },
    { "code": "RND_IMAGE_PLACEHOLDER", "count": 1, "params": { "reason": "IMG_BLOCKED" }, "nodeIds": ["n301"] },
    { "code": "RND_IMAGE_PLACEHOLDER", "count": 1, "params": { "reason": "IMG_TIMEOUT" }, "nodeIds": ["n733"] },
    { "code": "RND_VALUE_DEFAULTED", "count": 6, "params": { "property": "backgroundColor", "value": "unparsed" }, "nodeIds": ["n88"] },
    { "code": "VAL_ENUM_UNKNOWN", "count": 2, "params": { "field": "textStyle.textAlign", "value": "-internal-center" }, "nodeIds": ["n640", "n641"] }
  ],
  "metrics": { "stageMs": { "validate": 120, "fonts": 340, "create": 4210, "autolayout": 0 }, "nodeCount": 2455 }
}
```

Body `ack` yang dikirim ke relay (tanpa nama font atau id node):

```json
{
  "outcome": "imported", "nodesCreated": 2455, "fontSubstitutions": 1, "placeholders": 5,
  "warningCounts": { "RND_FONT_SUBSTITUTED": 22, "RND_IMAGE_PLACEHOLDER": 2, "RND_VALUE_DEFAULTED": 6, "VAL_ENUM_UNKNOWN": 2 },
  "durationMs": 4670
}
```

### 9.4 (d) Data rusak untuk K1-10

| # | Data (cuplikan) | Tingkat | Hasil yang diharapkan |
|---|---|---|---|
| D1 | `{"format":"codetoframe","formatVersion":"3.0","meta":{"captureId":"7f9c` (terpotong) | Fatal | `E_NOT_JSON`; tidak ada node dibuat |
| D2 | `{"format":"codetoframe","formatVersion":"4.0", …}` | Fatal | `E_VERSION_MAJOR_UNSUPPORTED {dataVersion:"4.0", supportedMajor:3}` |
| D3 | `{"version":"2.0","elements":[…]}` | Fatal | `E_LEGACY_FORMAT` |
| D4 | `"rootId":"n9"` sementara `nodes` hanya `n0..n3` | Fatal | `E_ROOT_MISSING` |
| D5 | Node `{"id":"n2","kind":"element","parentId":"n1","tag":"div"}` (tanpa `rect`), dengan anak `n3` | Per node | `n2` dilewati: `VAL_FIELD_MISSING {field:"rect", action:"skip"}`; `n3` ditempel ke `n1`: `VAL_CHILDREN_REPARENTED {count:1}`; impor lanjut |
| D6 | `"textStyle":{"textAlign":"middle"}` pada `n3` | Per node | `VAL_ENUM_UNKNOWN {field:"textStyle.textAlign", value:"middle"}`; memakai `"start"` |
| D7 | `"image":{"assetId":"a7", …}` tanpa `a7` di `assets` | Per node | `VAL_ASSET_MISSING {assetId:"a7"}`; placeholder gambar |
| D8 | `"formatVersion":"3.2"` + `"style":{"glow":{…}}` | Info | `VAL_NEWER_MINOR {dataVersion:"3.2", supported:"3.0"}`; `glow` diabaikan |
| D9 | `"opacity":null` | Per node | `VAL_FIELD_TYPE {field:"style.opacity", expected:"number", action:"default"}`; opacity 1 |

---

## 10. Keterlacakan

| Persyaratan | Bagian SCHEMA |
|---|---|
| FR-EXT-02 (viewport, tinggi penuh) | 3.2 `viewport`, `page` |
| FR-EXT-03 (tunggu, batas scroll) | 6.1 `scroll`, 6.4 `EXT_SCROLL_LIMIT_REACHED`, `EXT_WAIT_TIMEOUT` |
| FR-EXT-04 (rect, computed style, hierarki) | 1.4, 4.1, 4.3, SD-01 |
| FR-EXT-05 (dilewati) | 4.9, SD-07, 6.1 `skipped` |
| FR-EXT-06 (properti v1) | 4.3, 4.4 |
| FR-EXT-07 (font asli + perkiraan) | 4.4 `fontFamily`, `fontFamilyUsed`, SD-04 |
| FR-EXT-08/09 (gambar, gagal + alasan, batas) | 4.5, 5, SD-08 |
| FR-EXT-10, -21 (transfer, status koneksi) | 8, SD-10 |
| FR-EXT-11/12 (Download/Copy) | 3 (amplop sama, AD-05) |
| FR-EXT-14 (metadata) | 3.1, 3.2 |
| FR-EXT-15/16 (v2) | 4.7, 4.8 |
| FR-EXT-17/18 (v3) | 4.3 `transform`, 3.2 `viewportPreset` (ruang ekstensi) |
| FR-EXT-19 (laporan ringkas) | 6.1, 6.4 |
| FR-EXT-20 (open shadow, v2) | 4.1 `inShadowTree`, SD-01 (urutan flat tree) |
| FR-PLG-02 (upload/tempel) | 3 (amplop sama) |
| FR-PLG-03 (validasi, P-05) | 7.1–7.5, 6.2 `outcome`, `RND_INCOMPLETE` |
| FR-PLG-04 (frame akar) | 3.1 `rootId`, 4.1 |
| FR-PLG-05/06 (font) | 4.4, 6.2 `fontSubstitutions`, `RND_FONT_SUBSTITUTED` |
| FR-PLG-08 (pemetaan defensif) | 7.3, 7.4, `RND_VALUE_DEFAULTED` |
| FR-PLG-09/16 (placeholder) | 4.6, 5.2, 6.2 `placeholders` |
| FR-PLG-10 (laporan impor) | 6.2, 6.4 |
| FR-PLG-11 (penamaan) | 4.1 `tag`, `classes`, `domId`; 4.4 `runs` |
| FR-PLG-12/13 (v2) | 4.7, 4.8 |
| FR-PLG-15 (progres) | Tidak ada di data (status UI). `ImportReport.metrics` hanya untuk ukuran |
| NFR-01 (metrik) | 6.1 `metrics`, 6.2 `metrics` |
| NFR-02 (ketahanan) | 4.1 `fallback`, 7.2–7.5 |
| NFR-03 (privasi) | 8 (status/ack tanpa isi), SD-10, SD-13 (URL tanpa query dan hash) |
| NFR-07 (versi) | 3.1, SD-06, 7.1, 7.6 |
| NFR-08 (root bebas) | 3.1 `rootId`, 3.2 `root`, SD-01 |
| K1-01 | 9.1 |
| K1-02, K1-03 | 4.3 `opacity`, `border`, `boxShadow`, `overflowX/Y` |
| K1-04 | 5, 9.2 |
| K1-05 | 4.4, 6.2 |
| K1-06 | SD-01, 4.4, SD-14 (PRD v0.5 11.1 no. 23) |
| K1-08 | 3 (satu amplop) |
| K1-09 | 7.3, 7.4, `VAL_ENUM_UNKNOWN`, `RND_VALUE_DEFAULTED` |
| K1-10 | 7.1–7.7, 9.4 |
| K1-12 | 6.1 |
| K1-13 | 4.6, `EXT_UNSUPPORTED_CONTENT` |

---

## 11. Daftar keputusan dan hal terbuka

### 11.1 Ringkasan SD

| ID | Keputusan | Opsi ditolak | Dampak versi |
|---|---|---|---|
| SD-01 | `rootId` + `nodes[]` datar, preorder, `parentId` | Pohon bersarang | Kembali ke bersarang = MAJOR |
| SD-02 | Satu node teks per segmen dengan `runs[]` (selalu ≥1); inline polos diserap | Satu node per DOM text node | Aturan pengelompokan bebas berubah tanpa versi |
| SD-03 | `n<k>` preorder, `a<k>`, `captureId` UUID v4 | UUID per node | — |
| SD-04 | Warna sRGB 0–255/alpha 0–1, px number, `{pct}`, font-family terurai, `Unparsed {raw}` | Warna 0–1 (gaya Figma; melanggar "fakta browser"), string CSS mentah | Ganti satuan = MAJOR |
| SD-05 | Field absen = nilai awal (tabel 7.3); `null` tidak dipakai | `null` eksplisit; semua field selalu ditulis | Ubah nilai awal = MAJOR |
| SD-06 | `formatVersion` awal `"3.0"` + `format: "codetoframe"`, deteksi format lama | Mulai `"1.0"` | — |
| SD-07 | Elemen dilewati hanya dihitung per alasan | Daftar elemen dilewati | Sampel nanti = MINOR |
| SD-08 | Aset dideduplikasi per URL, base64 RFC 4648, MIME PNG/JPEG/GIF | Data URL per node | — |
| SD-09 | Peringatan = kode + params, diagregasi dengan sampel; pesan di luar data | Pesan teks di data; satu entri per kejadian | Kode baru tanpa versi |
| SD-10 | Body relay opaque; metadata lewat header; judul hanya di `/pending` | Relay mem-parse amplop | Protokol `/v1` |
| SD-11 | Fakta teks/posisi tambahan dicatat sejak v1 | Hanya properti yang dirender v1 | — |
| SD-13 | URL (`meta.url`, `assets[].sourceUrl`) disimpan tanpa query, hash, dan userinfo; fetch dan deduplikasi tetap memakai URL penuh | Simpan utuh; hanya origin + path | Ubah kebijakan tanpa versi |
| SD-14 | Induk `visibility: hidden` dengan keturunan terlihat tetap dicatat; dilewati hanya bila tanpa keturunan terlihat | Lewati induk, tempel anak ke leluhur | — |
| SD-12 | Sumber kebenaran: tabel dokumen ini → tipe TS + validator tulisan tangan di `shared` (nol dependensi runtime, AD-10). JSON Schema boleh dihasilkan kemudian untuk dokumentasi | JSON Schema + pustaka validator runtime | — |

### 11.2 Pertanyaan terbuka

Tidak ada pertanyaan terbuka. Keputusan pemilik (2026-10-13):

| # | Pertanyaan | Keputusan | Rujukan |
|---|---|---|---|
| PQ-01 | Privasi URL | URL disimpan tanpa query string dan hash; fetch dan deduplikasi di memori memakai URL penuh | SD-13; PRD v0.5 11.1 no. 24 |
| PQ-02 | `visibility: hidden` dengan keturunan terlihat | Induk tetap dicatat (kotak tidak digambar); dilewati hanya bila tanpa keturunan terlihat | SD-14; PRD v0.5 11.1 no. 25 |
| PQ-03 | Inline polos dan K1-06 | SD-02 dipertahankan; inline polos diserap menjadi run. K1-06 dibaca sebagai nesting elemen yang menggambar kotak atau berperan sebagai wadah | SD-02; PRD v0.5 11.1 no. 23 |

### 11.3 Usulan konfigurasi baru (untuk ARCHITECTURE bagian 9)

| # | Kunci | Nilai awal | Alasan | Dipakai di | Status |
|---|---|---|---|---|---|
| K-01 | `warningSampleNodeIds` | 20 | Cukup untuk menemukan contoh di panel layer Figma, sekaligus membatasi ukuran laporan (VC-26) | shared/report | Diterima, diterapkan di ARCHITECTURE v0.1.2 |
| K-02 | `relayTitleMaxChars` | 120 | Judul cukup terbaca di satu baris UI plugin. Batas ini menjaga header jauh di bawah batas header Node.js (terkonfirmasi SP-01: `maxHeaderSize` 16 384 byte; judul terburuk 1440 karakter) | SW, relay | Diterima, diterapkan di ARCHITECTURE v0.1.2 |

Selain itu, `FORMAT_MAJOR = 3` dan `FORMAT_MINOR = 0` adalah konstanta format, bukan konfigurasi. Konstanta ini diletakkan di `shared/src/schema` (atau `shared/types`), bukan di `config.ts`.

### 11.4 Usulan perubahan dokumen lain

| # | Dokumen / bagian | Usulan | Alasan | Status |
|---|---|---|---|---|
| U-01 | ARCHITECTURE 2 (diagram), 4.1 C3/C7/C9, 6 ("`root` (pohon node)") | Ganti "pohon node" menjadi "daftar node (`rootId` + `nodes[]`)" | SD-01 | Diterima, diterapkan di ARCHITECTURE v0.1.2 |
| U-02 | ARCHITECTURE 4.1 C5 ("teks per text node via `Range.getClientRects`") | "teks per segmen dengan run bergaya (SCHEMA 4.4)" | SD-02 | Diterima, diterapkan di ARCHITECTURE v0.1.2 |
| U-03 | ARCHITECTURE 3.4 (`GET /v1/status` memuat "id, judul, waktu") | Judul dipindah ke `GET /v1/pending`; status tanpa isi halaman | SD-10, NFR-03 | Diterima, diterapkan di ARCHITECTURE v0.1.2 |
| U-04 | ARCHITECTURE 3.4 (`PUT` "mengembalikan `captureId`") | `captureId` dibuat extension (`meta.captureId`) dan digemakan relay | SD-03, SD-10 | Diterima, diterapkan di ARCHITECTURE v0.1.2 |
| U-05 | ARCHITECTURE 3.5–3.6 (status "diimpor" setelah slot dikosongkan) | Tambahkan bahwa relay menyimpan `lastImport` (hanya jumlah) sampai PUT berikutnya | Konsistensi diagram dengan AD-03 | Diterima, diterapkan di ARCHITECTURE v0.1.2 |
| U-06 | ARCHITECTURE 3.6 | Catat bahwa pemilihan judul untuk prompt plugin memakai `X-CTF-Title` | SD-10 | Diterima, diterapkan di ARCHITECTURE v0.1.2 |
| U-07 | PRD FR-PLG-16, K1-13 | Sebut iframe same-origin (P-02) secara eksplisit. Skema sudah memakai satu nilai `iframe` untuk keduanya | Temuan tinjauan sebelumnya yang belum diterapkan | Diterima, diterapkan di PRD v0.5 |
| U-08 | PRD bagian 6 ("Gradient, background-image, SVG, pseudo-element") | "SVG" → "SVG inline", agar tidak tampak bertentangan dengan baris `<img>` berformat SVG | Temuan tinjauan sebelumnya | Diterima, diterapkan di PRD v0.5 |

---

## Riwayat revisi

| Versi | Tanggal | Perubahan |
|---|---|---|
| 0.1 | 2026-10-13 | Draf awal. |
| 0.1.1 | 2026-10-13 | Keputusan PQ-01 sampai PQ-03, aturan rect root, definisi nodesCreated, status usulan. |
| 0.1.2 | 2026-10-21 | Hasil SP-01: allowlist Origin absen, cek ukuran sebelum PUT, catatan 413/431, header Private Network di preflight, K-02 terkonfirmasi. |
