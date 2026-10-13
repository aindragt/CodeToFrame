# Pengamatan manual SP-01 / SP-02

Salin berkas ini ke `spikes/sp-01/results/manual-observations.md` lalu isi. Folder `results/` tidak di-commit.

## Lingkungan

| Item | Nilai |
|---|---|
| OS dan versi | |
| Figma Desktop (Help → About Figma) | |
| Chrome (`chrome://version`) | |
| Node (`node --version`) | |

## Pemuatan

| # | Pertanyaan | Ya/Tidak | Catatan (teks galat persis bila ada) |
|---|---|---|---|
| M1 | Plugin berhasil di-import dari `manifest.json` **tanpa** field `id`? | | |
| M2 | Bila M1 = Tidak: berhasil setelah menambahkan `"id"`? Nilai apa yang dipakai? | | |
| M3 | Figma menolak salah satu entri `devAllowedDomains` (`localhost` / `127.0.0.1` / `[::1]`)? Entri mana dan pesannya? | | |
| M4 | Extension berhasil di-load unpacked tanpa galat? (Bila `http://[::1]/*` ditolak, catat pesannya) | | |

## Prompt izin jaringan lokal

| # | Pertanyaan | Ya/Tidak | Catatan |
|---|---|---|---|
| M5 | Figma Desktop menampilkan prompt izin jaringan lokal / akses perangkat lokal? Kapan dan teks apa? | | |
| M6 | Prompt Figma muncul berulang (setiap request / setiap buka plugin)? | | |
| M7 | Chrome menampilkan prompt izin jaringan lokal untuk extension? Kapan dan teks apa? | | |
| M8 | Chrome menampilkan prompt untuk uji W1 di `https://example.com`? Teks apa? | | |
| M9 | Pesan console Chrome pada uji W1 (salin persis) | | |

## Performa dan perilaku

| # | Pertanyaan | Ya/Tidak | Catatan |
|---|---|---|---|
| M10 | Figma terasa membeku saat P4 (unduh/parse 100 MB)? Berapa lama kira-kira? | | |
| M11 | Figma terasa membeku saat X2 (import 100 MB lewat mode listen)? | | |
| M12 | Popup Chrome atau Chrome terasa membeku saat E2 100 MB? | | |
| M13 | L4: tombol "sembunyikan UI" bekerja (UI hilang lalu muncul lagi setelah ~120 dtk)? | | |
| M14 | L5: setelah plugin ditutup, `pluginConnected` di popup menjadi `false` dalam berapa detik? | | |
| M15 | Catatan lain (perilaku aneh, galat di console plugin: Plugins → Development → Open console) | | |
