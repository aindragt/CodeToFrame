# CodeToFrame 🖼️⚡

CodeToFrame adalah ekosistem *tools* yang dirancang untuk menjembatani kesenjangan antara *development* dan desain. Proyek ini mengonversi halaman web apa pun menjadi *layer* dan *frame* Figma yang terstruktur dan sepenuhnya dapat diedit. 

Alih-alih membuat ulang elemen UI dari awal atau mengandalkan *screenshot* statis, CodeToFrame mengekstrak data HTML/CSS secara presisi dan menerjemahkannya ke dalam logika desain Figma (termasuk warna, teks, gambar, dan tata letak).

**Proyek ini terdiri dari dua komponen utama:**
1. **Chrome Extension:** Bertugas membaca halaman web aktif, mengekstrak data DOM (Document Object Model) dan CSS, lalu mengubahnya menjadi format standar (JSON).
2. **Figma Plugin:** Menerima data JSON yang telah distandardisasi dan menggunakan Figma API untuk merender elemen tersebut ke dalam *canvas* sebagai *node* yang bisa diedit.
