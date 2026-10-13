# Spike SP-01 + SP-02: jalur transfer langsung dan siklus hidup plugin

**Kode sekali pakai.** Tidak masuk produksi. Yang disimpan hanya hasil dan catatan di `docs/spikes/SP-01.md`.

Tujuan: membuktikan bahwa jalur AD-02 bekerja. Jalurnya: extension Chrome (MV3) → relay HTTP lokal ← plugin Figma Desktop yang polling (ARCHITECTURE 3, 11; SCHEMA 8).

## Isi folder

| Path | Isi |
|---|---|
| `relay/relay.mjs` | Relay minimal (port 47821, `127.0.0.1` + `::1`, token dicetak ke terminal, satu slot di memori) |
| `scripts/run-node-tests.mjs` | Uji otomatis N1–N9 (menyalakan relay sendiri di port **47822**, jadi tidak bentrok dengan relay di 47821) |
| `plugin/` | Plugin Figma: `manifest.json`, `code.js` (main thread), `ui.html` (iframe) |
| `extension/` | Extension MV3: `manifest.json`, `background.js` (service worker), `popup.html`, `popup.js` |
| `manual-observations.template.md` | Templat pengamatan manual |
| `results/` | Hasil uji (**tidak di-commit**, ada di `.gitignore`) |

Prasyarat: Node.js (diuji dengan v24), Chrome, dan Figma Desktop. Tidak perlu `npm install` dan tidak ada langkah build.

Semua perintah di bawah dijalankan dari **root repo** (`CodeToFrame/`). Perintahnya sama di PowerShell (Windows) dan di terminal macOS/Linux, kecuali yang ditandai.

---

## Langkah 1: Jalankan relay

```
node spikes/sp-01/relay/relay.mjs
```

Yang diharapkan:
- Muncul banner `listening: 127.0.0.1:47821, [::1]:47821`, diikuti baris `token: <32 karakter hex>` dan `READY`.
- **Salin tokennya.** Token tidak ditulis ke disk; setiap kali relay dijalankan ulang, token baru dibuat.
- Biarkan terminal ini tetap terbuka. Setiap request dicetak sebagai satu baris JSON berisi metadata saja: `method`, `path`, `status`, `family`, `origin`, `host`, `acrpn` (ada tidaknya header Private Network), `secFetchSite`. **Simpan atau salin log ini** setelah Langkah 3–7, karena berguna untuk laporan.

Opsi (untuk percobaan):
- PowerShell: `$env:CTF_PNA='0'; node spikes/sp-01/relay/relay.mjs`
- macOS/Linux: `CTF_PNA=0 node spikes/sp-01/relay/relay.mjs`

`CTF_PNA=0` mematikan balasan `Access-Control-Allow-Private-Network`. Pakai hanya bila diminta, untuk menguji apakah header itu diperlukan.

## Langkah 2: Uji Node (otomatis)

Di terminal kedua:

```
node spikes/sp-01/scripts/run-node-tests.mjs
```

Yang diharapkan: `11/11 lulus` (N1–N9, NP payload sintetis, DISK), dan laporan tersimpan di `spikes/sp-01/results/node-report.json`. Durasinya sekitar 1 menit, karena ada payload 100 MB dan 132 MB.

## Langkah 3: Plugin Figma (P1–P7)

1. Buka Figma Desktop, lalu buka file desain apa saja (boleh file kosong baru).
2. Menu **Plugins → Development → Import plugin from manifest…** → pilih `spikes/sp-01/plugin/manifest.json`.
   - Bila import **gagal karena `id`**: tambahkan baris `"id": "codetoframe-sp01-spike",` di `manifest.json`, lalu import ulang. Catat di M1/M2.
   - Bila Figma menolak salah satu entri `devAllowedDomains`: hapus entri itu, import ulang, lalu catat entri dan pesannya di M3.
3. Jalankan plugin: **Plugins → Development → CodeToFrame SP-01 spike**.
4. Tempel token, klik **Simpan token**, lalu klik **Run tests**.
   - P3 berjalan sekitar 15 detik, dan P4 mengunduh sampai 100 MB.
   - Di akhir, laporan dikirim otomatis ke relay (`results/plugin-report.json`). Bila POST gagal, klik **Tampilkan teks laporan**, salin isinya, dan simpan sendiri sebagai `results/plugin-report.json`.
5. Console plugin ada di **Plugins → Development → Show/Hide console**. Salin galat yang muncul ke M15.

Yang diharapkan: P1–P7 berstatus PASS. P2 menunjukkan bentuk URL mana (`localhost`, `127.0.0.1`, `[::1]`) yang diterima. P7 menguji `fetch` dari **main thread**: dokumentasi Figma *Making network requests* menyebut fetch di kode plugin, sedangkan ARCHITECTURE 3.1 berasumsi main thread tidak punya network.

**Biarkan plugin tetap terbuka** untuk Langkah 6–7.

## Langkah 4: Extension Chrome (E1, E2)

1. Buka `chrome://extensions`, aktifkan **Developer mode**, klik **Load unpacked**, lalu pilih folder `spikes/sp-01/extension`.
   - Bila muncul galat untuk `http://[::1]/*`: hapus entri itu dari `extension/manifest.json`, klik reload, lalu catat di M4.
2. Klik ikon extension (pin bila perlu) untuk membuka popup. Tempel token dan klik **Simpan**.
3. Kotak "Status relay" seharusnya menampilkan `HTTP 200` dan `pluginConnected: true` (karena plugin terbuka dan sedang polling).
4. Klik **Run tests**. Progres tampil di bawah popup. Popup boleh ditutup; uji tetap berjalan di service worker.
   - Hasilnya ada di `results/extension-report.json`.
   - Console service worker: `chrome://extensions` → kartu extension → tautan **service worker**.

## Langkah 5: Uji W1 (situs web biasa tidak boleh menjangkau relay)

1. Buka `https://example.com` di Chrome, lalu buka DevTools (F12) → Console.
2. Tempel baris ini (ganti `<token>`):

```js
fetch('http://127.0.0.1:47821/v1/status', {headers:{Authorization:'Bearer <token>'}}).then(r => r.text()).then(console.log, console.error)
```

3. Ulangi dengan `http://localhost:47821/v1/status`.

Yang diharapkan: ditolak. Bentuknya bisa salah satu dari ini:
- relay mencatat `403 RELAY_FORBIDDEN_ORIGIN` untuk preflight dengan `origin: "https://example.com"`;
- browser memblokir (galat CORS atau Private/Local Network Access);
- Chrome menampilkan prompt izin jaringan lokal.

Catat pesan console persis (M8, M9) beserta baris log relay terkait.

## Langkah 6: Ujung ke ujung (X1, X2)

1. Di plugin, klik **Start listen** (kondisi: `bebas`).
2. Di popup extension, pilih **1 KB**, lalu klik **Send capture**.
   - Plugin seharusnya menampilkan baris `X-1 PASS …` (terdeteksi, diunduh, di-parse, di-ack).
   - Popup seharusnya menampilkan `lastImport: imported …` dan `slot: (kosong)`.
3. Ulangi dengan **100 MB** (X2), lalu catat M11 dan M12.
4. Di plugin, klik **Kirim laporan**.

## Langkah 7: Siklus hidup (SP-02)

Plugin tetap dalam mode listen. Untuk setiap kondisi:
1. pilih kondisinya di dropdown **Kondisi**;
2. pertahankan kondisi itu selama **2 menit**;
3. kembali ke plugin dan klik **Kirim laporan**.

| Kondisi | Cara |
|---|---|
| L1 | Jendela Figma di depan, file yang menjalankan plugin aktif |
| L2 | Buka tab file Figma lain di Figma Desktop dan biarkan aktif |
| L3 | Aplikasi lain di depan, atau minimize jendela Figma |
| L4 (opsional) | Klik **L4: sembunyikan UI 120 dtk**. UI hilang dan muncul lagi otomatis. Catat M13 |
| L5 | Tutup plugin (tombol × di jendela plugin). Lihat popup extension: `pluginConnected` seharusnya menjadi `false` sekitar 3 detik kemudian. Catat M14 |

Laporan mencatat interval antar-poll per kondisi (`lifecycleSummary`: mean, p95, max, jumlah interval > 2 dtk dan > 3 dtk).

## Langkah 8: Pengamatan manual

PowerShell:

```
New-Item -ItemType Directory -Force spikes/sp-01/results | Out-Null
Copy-Item spikes/sp-01/manual-observations.template.md spikes/sp-01/results/manual-observations.md
```

macOS/Linux:

```
mkdir -p spikes/sp-01/results && cp spikes/sp-01/manual-observations.template.md spikes/sp-01/results/manual-observations.md
```

Isi semua baris M1–M15, termasuk versi OS, Figma Desktop, dan Chrome. Simpan juga log terminal relay ke `results/relay-log.txt` (salin-tempel).

## Setelah selesai

Pastikan berkas berikut ada di `spikes/sp-01/results/`:
- `node-report.json`
- `plugin-report.json`
- `extension-report.json`
- `manual-observations.md`
- `relay-log.txt` (opsional, tetapi membantu)

Lalu beri tahu Claude bahwa uji manual sudah selesai.

## Keamanan dan data

- Semua payload sintetis (`http://synthetic.invalid/`, isi base64 acak). Tidak ada halaman web nyata yang ditangkap.
- Token hanya ada di memori relay, `chrome.storage.local` (extension), dan `figma.clientStorage` (plugin). Token tidak ada di git.
- Relay hanya mendengarkan loopback. Matikan dengan Ctrl+C setelah selesai.
- Endpoint `/spike/*` (report, payload, echo, metrics) hanya ada di spike ini.
