# Akpol Golf Charity 2026 — "Swing for Hope, Drive for NTT"

Situs acara dan pendaftaran peserta. Satu halaman statis, tanpa dependency.

```
index.html      halaman (sumber tunggal; juga dipublikasikan sebagai Artifact)
hero.jpg        foto latar hero
logo-mark.png   logo (mark) — navbar & kartu peserta
logo-full.png   logo lockup penuh — footer
akpol-crest.png lambang Akademi Kepolisian — footer & kontak
page.js         pembungkus: index.html -> dokumen HTML utuh (dipakai server & build)
server.js       server statis: gzip, ETag, header keamanan
build-docs.js   menulis hasil build ke /docs (versi statis, tanpa pendaftaran)
package.json    npm start / npm run build:docs
railway.json    konfigurasi deploy Railway
```

## Pendaftaran

Situs ini **hanya memuat informasi**. Tidak ada formulir, basis data, maupun data
pribadi peserta yang tersimpan di sini — seluruh pendaftaran dilayani panitia
melalui WhatsApp.

Setiap tombol daftar membuka `wa.me` dengan pesan yang sudah tersusun sesuai
kategorinya (peserta umum, peserta internal, sponsor). Nomor panitia tertulis
langsung di tautan-tautan itu **dan** pada konstanta `PANITIA` di atas `<script>`.
Bila narahubung berganti, perbarui keduanya:

```bash
grep -n "6282221660855" index.html      # daftar tautan yang perlu diubah
```

## Halaman panitia

Tidak ada lagi. Panel verifikasi, API pendaftaran, dan penyimpanan data dihapus
bersamaan dengan perubahan konsep ini; riwayatnya masih tersimpan di git bila
suatu saat diperlukan kembali.

## Latar hero

Latar hero memakai `hero.jpg` — foto komposit milik panitia. Di atasnya ada
scrim navy agar judul terbaca, dan di bagian bawah ada pita gradasi yang
melarutkan foto menjadi putih, menyambung ke bagian berikutnya.

Kalau `--hero-photo` dikosongkan (`none`), latar otomatis kembali ke gambar
seismograf yang digambar di canvas.

Untuk **mengganti fotonya**:

1. Taruh file baru di repo ini, misalnya `hero-baru.jpg`.
2. Di `index.html`, pada blok `:root`, ubah:
   ```css
   --hero-photo: url("hero-baru.jpg");
   --hero-photo-opacity: 1;   /* turunkan kalau fotonya terlalu ramai */
   ```
3. Isi kredit fotonya di atas `<script>` — wajib kalau fotonya milik pihak lain:
   ```js
   var HERO_PHOTO_CREDIT = "Foto: <nama sumber>, <keterangan>";
   ```
4. `npm run build:docs`.

Scrim navy di atas foto sudah disiapkan, jadi judul tetap terbaca di foto
apa pun. Pakai hanya foto yang Anda punya haknya atau yang lisensinya
mengizinkan — foto kantor berita tidak boleh dipakai tanpa izin.

## Sebelum dibagikan ke peserta

Isi kontak panitia di bagian atas `<script>` dalam `index.html`:

```js
var PANITIA = { wa: "6281234567890", email: "panitia@contoh.id" };
```

Selama `wa` masih kosong, tombol WhatsApp dinonaktifkan dan peserta diminta
menyalin ringkasan pendaftaran secara manual.

## Catatan isi

Konten disusun dari proposal kegiatan. Hal yang belum ditetapkan panitia
ditandai terbuka di halaman: tarif peserta internal, isi goodie bag, hadiah
hole in one, dan ketentuan pembatalan.
