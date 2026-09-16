# Akpol Golf Charity 2026 — "Swing for NTT"

Situs acara dan pendaftaran peserta. Satu halaman statis, tanpa dependency.

```
index.html      halaman (sumber tunggal; juga dipublikasikan sebagai Artifact)
logo-mark.png   logo (mark) — navbar & kartu peserta
logo-full.png   logo lockup penuh — footer
page.js         pembungkus: index.html -> dokumen HTML utuh (dipakai server & build)
server.js       server statis Node (Railway, atau lokal)
build-docs.js   menulis hasil build ke /docs di root repo (GitHub Pages)
package.json    npm start / npm run build:docs
railway.json    konfigurasi deploy Railway
```

`index.html` ditulis sebagai fragment Artifact — tanpa `<!doctype>`, `<head>`,
atau `<body>`. `page.js` yang menambahkannya, dipakai baik oleh server maupun
build statis, jadi halaman ini hanya punya satu salinan yang perlu diedit.
Setelah mengubah `index.html`, jalankan `npm run build:docs` agar `/docs`
ikut diperbarui.

## Jalankan lokal

```bash
node server.js       # http://localhost:3000
```

## Pilihan hosting

| Cara | Publik? | Yang perlu Anda lakukan |
| --- | --- | --- |
| **Artifact claude.ai** | ya, setelah di-share | buka halaman Artifact → tombol Share → "anyone with the link" |
| **GitHub Pages** | ya | repo harus publik (Pages gratis hanya untuk repo publik), lalu Settings → Pages |
| **Railway** | ya | buat project dari repo ini — tanpa konfigurasi tambahan |
| **Netlify / Vercel** | ya | drag-and-drop folder `docs/`, atau hubungkan repo |

## Deploy ke GitHub Pages

Isi `/docs` di root repo sudah siap saji (`npm run build:docs` untuk memperbarui).

1. Repo harus **publik** — Pages pada repo privat memerlukan GitHub Pro/Team.
   Settings → General → Danger Zone → Change visibility.
2. **Settings → Pages → Build and deployment**: Source `Deploy from a branch`,
   branch `main`, folder `/docs` → Save.
3. Setelah beberapa menit halaman terbit di
   `https://rivaldianggarapurwadi-gif.github.io/akpol-golf-charity-2026/`.

## Deploy ke Railway

1. Railway → **New Project** → **Deploy from GitHub repo** → pilih
   `rivaldianggarapurwadi-gif/akpol-golf-charity-2026`.
2. Tidak ada yang perlu dikonfigurasi. Situs ini ada di root repo, jadi
   **Root Directory dibiarkan kosong** dan branch-nya `main`.
3. **Settings → Networking → Generate Domain**. Railway memberi URL
   `*.up.railway.app` yang bisa dibuka kapan saja.
4. Tidak ada environment variable yang perlu diisi. Railway menyuntikkan `PORT`
   sendiri; health check ada di `/healthz`.

Setiap push ke branch tersebut otomatis men-deploy ulang.

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
