/**
 * Penyimpanan pendaftaran: satu berkas JSON, ditulis secara atomik.
 *
 * Tanpa dependency dan tanpa database — cukup untuk satu acara dengan kuota
 * 120 peserta. Semua penulisan diantrekan lewat satu rantai promise, jadi dua
 * pendaftaran yang datang bersamaan tidak saling menimpa.
 *
 * DATA_DIR menentukan lokasi berkasnya. Di Railway arahkan ke volume yang
 * dipasang (mis. /data), kalau tidak datanya ikut hilang setiap kali deploy.
 */
const fs = require("fs");
const path = require("path");

const DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const FILE = path.join(DIR, "pendaftaran.json");
const KUOTA = Number(process.env.KUOTA_PESERTA || 120);

let antre = Promise.resolve();

function bacaSync() {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch (e) {
    return { peserta: [] };
  }
}

function tulisSync(data) {
  fs.mkdirSync(DIR, { recursive: true });
  const tmp = FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, FILE);
}

/** Jalankan fn(data) secara berurutan; kembaliannya dikirim ke pemanggil. */
function ubah(fn) {
  const hasil = antre.then(function () {
    const data = bacaSync();
    const keluaran = fn(data);
    tulisSync(data);
    return keluaran;
  });
  antre = hasil.catch(function () {});
  return hasil;
}

function semua() {
  return bacaSync().peserta;
}

function cari(kode) {
  return semua().find(function (p) { return p.kode === kode; }) || null;
}

function terpakai(peserta) {
  return (peserta || semua()).filter(function (p) { return p.status !== "batal"; }).length;
}

function kuota() {
  const dipakai = terpakai();
  return { total: KUOTA, terpakai: dipakai, sisa: Math.max(0, KUOTA - dipakai) };
}

const ABJAD = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function kodeBaru(peserta) {
  const crypto = require("crypto");
  for (let coba = 0; coba < 50; coba++) {
    let k = "AGC26-";
    const acak = crypto.randomBytes(5);
    for (let i = 0; i < 5; i++) k += ABJAD[acak[i] % ABJAD.length];
    if (!peserta.some(function (p) { return p.kode === k; })) return k;
  }
  throw new Error("gagal membuat kode unik");
}

module.exports = { ubah, semua, cari, kuota, terpakai, kodeBaru, KUOTA, FILE, DIR };
