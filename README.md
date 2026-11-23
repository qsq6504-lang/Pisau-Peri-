# Pisau Peri

Gim knife hit bertema dongeng pink. Ada login/daftar, skor tersimpan, dan suara.

## Membuka di Visual Studio Code
1. Ekstrak zip, lalu di VS Code pilih **File > Open Folder** dan pilih folder `pisau-peri`.
2. Pasang ekstensi yang disarankan (**Live Server**) jika muncul pemberitahuan.
3. Klik kanan `index.html`, lalu **Open with Live Server**. Tanpa ekstensi pun, `index.html` bisa dibuka langsung di browser.

## Struktur
- `index.html`: kerangka halaman
- `css/style.css`: tampilan
- `js/game.js`: akun, penyimpanan skor, gim, gambar kanvas, dan suara

## Catatan
- Akun dan skor tersimpan di browser (localStorage), tidak pindah antar perangkat.
- Login ini ringan untuk gim, bukan sistem keamanan sungguhan.
