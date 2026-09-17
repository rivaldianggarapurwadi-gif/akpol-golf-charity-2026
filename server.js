/**
 * Server situs Akpol Golf Charity 2026.
 *
 * Menyajikan halaman (dibungkus jadi dokumen HTML utuh oleh page.js), aset,
 * dan API pendaftaran. Tanpa dependency: `node server.js` sudah cukup.
 *
 * Environment:
 *   PORT          disuntik host (Railway). Default 3000.
 *   DATA_DIR      lokasi berkas data. Arahkan ke volume agar data tidak hilang.
 *   KUOTA_PESERTA default 120.
 *   ADMIN_TOKEN   wajib diisi agar halaman panitia bisa dipakai.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { buildPage } = require("./page.js");
const store = require("./store.js");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

const RAHASIA = new Set(["server.js", "store.js", "page.js", "build-docs.js", "package.json", "railway.json"]);

let page = buildPage(ROOT);
const pageGz = zlib.gzipSync(Buffer.from(page), { level: 9 });
const pageEtag = '"' + require("crypto").createHash("sha1").update(page).digest("hex").slice(0, 16) + '"';

/* ---------- utilitas ---------- */

/* Teks dikirim terkompresi kalau browsernya mendukung: halaman 81 KB turun
   ke sekitar 15 KB, dan itu berlaku untuk setiap kunjungan. */
function gzipDidukung(req) {
  return /\bgzip\b/.test(req.headers["accept-encoding"] || "");
}

function kirim(res, status, type, body, extra) {
  const head = Object.assign({ "content-type": type }, extra || {});
  res.writeHead(status, head);
  res.end(body);
}

function kirimTeks(req, res, status, type, body, extra) {
  const head = Object.assign({ "content-type": type, vary: "accept-encoding" }, extra || {});
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(body);
  if (buf.length > 1024 && gzipDidukung(req)) {
    const gz = zlib.gzipSync(buf, { level: 6 });
    head["content-encoding"] = "gzip";
    head["content-length"] = gz.length;
    res.writeHead(status, head);
    return res.end(gz);
  }
  head["content-length"] = buf.length;
  res.writeHead(status, head);
  res.end(buf);
}

function json(res, status, obj) {
  const body = JSON.stringify(obj);
  if (res.req && body.length > 1024) return kirimTeks(res.req, res, status, TYPES[".json"], body);
  kirim(res, status, TYPES[".json"], body);
}

function badanJson(req, batas) {
  return new Promise(function (resolve, reject) {
    let buf = "";
    req.on("data", function (c) {
      buf += c;
      if (buf.length > (batas || 16000)) { reject(new Error("terlalu besar")); req.destroy(); }
    });
    req.on("end", function () {
      try { resolve(buf ? JSON.parse(buf) : {}); } catch (e) { reject(new Error("json tidak valid")); }
    });
    req.on("error", reject);
  });
}

function teks(v, maks) {
  return String(v == null ? "" : v).trim().slice(0, maks || 200);
}

function normalWa(raw) {
  let d = String(raw || "").replace(/[^0-9]/g, "");
  if (d.indexOf("0") === 0) d = "62" + d.slice(1);
  if (d.indexOf("62") !== 0 && d.length >= 9) d = "62" + d;
  return d;
}

/* Pembatas laju sederhana per alamat IP. */
const jejak = new Map();
function lajuTerlampaui(ip) {
  const now = Date.now(), jam = 60 * 60 * 1000;
  const list = (jejak.get(ip) || []).filter(function (t) { return now - t < jam; });
  list.push(now);
  jejak.set(ip, list);
  if (jejak.size > 5000) jejak.clear();
  return list.length > 8;
}

function adminBoleh(req) {
  if (!ADMIN_TOKEN) return false;
  const h = req.headers.authorization || "";
  return h === "Bearer " + ADMIN_TOKEN;
}

const KATEGORI = { umum: "Peserta umum / eksternal", internal: "Peserta internal", sponsor: "Slot peserta sponsor" };
const JERSEY = ["S", "M", "L", "XL", "XXL", "XXXL"];
const STATUS = ["menunggu", "terverifikasi", "batal"];

function publik(p) {
  return {
    kode: p.kode, nama: p.nama, kategori: p.kategori, kategoriLabel: KATEGORI[p.kategori],
    jersey: p.jersey, status: p.status, checkin: !!p.checkin_pada, dibuat: p.dibuat
  };
}

/* ---------- API ---------- */

async function daftar(req, res, ip) {
  if (lajuTerlampaui(ip)) return json(res, 429, { error: "Terlalu banyak pendaftaran dari perangkat ini. Coba lagi nanti atau hubungi panitia." });

  let b;
  try { b = await badanJson(req); } catch (e) { return json(res, 400, { error: "Data tidak terbaca." }); }

  const kategori = teks(b.kategori, 20);
  const nama = teks(b.nama, 120);
  const wa = normalWa(b.wa);
  const email = teks(b.email, 160);
  const jersey = teks(b.jersey, 6).toUpperCase();
  const kodeUndangan = teks(b.kode_undangan, 40);

  const salah = [];
  if (!KATEGORI[kategori]) salah.push("Kategori peserta tidak dikenal.");
  if (nama.length < 3) salah.push("Nama lengkap belum diisi.");
  if (wa.length < 10 || wa.length > 15) salah.push("Nomor WhatsApp belum benar.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) salah.push("Alamat email belum benar.");
  if (JERSEY.indexOf(jersey) === -1) salah.push("Ukuran jersey belum dipilih.");
  if ((kategori === "internal" || kategori === "sponsor") && !kodeUndangan) salah.push("Kategori ini memerlukan kode dari panitia.");
  if (b.setuju !== true) salah.push("Persetujuan pendaftaran belum dicentang.");
  if (salah.length) return json(res, 400, { error: salah[0], semua: salah });

  try {
    const hasil = await store.ubah(function (data) {
      const aktif = data.peserta.filter(function (p) { return p.status !== "batal"; });
      if (aktif.length >= store.KUOTA) {
        return { penuh: true };
      }
      const kembar = aktif.find(function (p) { return p.wa === wa || p.email.toLowerCase() === email.toLowerCase(); });
      if (kembar) return { kembar: publik(kembar) };

      const peserta = {
        kode: store.kodeBaru(data.peserta),
        kategori: kategori,
        kode_undangan: kodeUndangan,
        nama: nama,
        wa: wa,
        email: email,
        instansi: teks(b.instansi, 120),
        jersey: jersey,
        handicap: teks(b.handicap, 60) || "Tidak diisi",
        catatan: teks(b.catatan, 600),
        status: "menunggu",
        dibuat: new Date().toISOString(),
        diverifikasi_pada: null,
        checkin_pada: null
      };
      data.peserta.push(peserta);
      return { peserta: peserta, sisa: store.KUOTA - (aktif.length + 1) };
    });

    if (hasil.penuh) return json(res, 409, { error: "Kuota peserta sudah penuh. Hubungi panitia untuk daftar tunggu." });
    if (hasil.kembar) return json(res, 409, { error: "Nomor WhatsApp atau email ini sudah terdaftar.", peserta: hasil.kembar });
    return json(res, 201, { peserta: publik(hasil.peserta), sisa: hasil.sisa });
  } catch (e) {
    return json(res, 500, { error: "Pendaftaran gagal disimpan. Coba lagi atau hubungi panitia." });
  }
}

function statusPeserta(res, kode) {
  const p = store.cari(teks(kode, 20).toUpperCase());
  if (!p) return json(res, 404, { error: "Kode pendaftaran tidak ditemukan." });
  json(res, 200, { peserta: publik(p) });
}

function rekap() {
  const peserta = store.semua();
  const aktif = peserta.filter(function (p) { return p.status !== "batal"; });
  const hitung = function (list, kunci) {
    return list.reduce(function (acc, p) { acc[p[kunci]] = (acc[p[kunci]] || 0) + 1; return acc; }, {});
  };
  return {
    kuota: store.kuota(),
    status: hitung(peserta, "status"),
    kategori: hitung(aktif, "kategori"),
    jersey: hitung(aktif, "jersey"),
    checkin: aktif.filter(function (p) { return p.checkin_pada; }).length
  };
}

function csv(res) {
  const kolom = ["kode", "status", "kategori", "kode_undangan", "nama", "wa", "email", "instansi", "jersey", "handicap", "catatan", "dibuat", "diverifikasi_pada", "checkin_pada"];
  const baris = [kolom.join(",")];
  store.semua().forEach(function (p) {
    baris.push(kolom.map(function (k) {
      return '"' + String(p[k] == null ? "" : p[k]).replace(/"/g, '""') + '"';
    }).join(","));
  });
  kirim(res, 200, "text/csv; charset=utf-8", "﻿" + baris.join("\n"), {
    "content-disposition": 'attachment; filename="peserta-akpol-golf-2026.csv"'
  });
}

async function ubahStatus(req, res) {
  let b;
  try { b = await badanJson(req); } catch (e) { return json(res, 400, { error: "Data tidak terbaca." }); }
  const kode = teks(b.kode, 20).toUpperCase();
  const status = teks(b.status, 20);
  if (STATUS.indexOf(status) === -1) return json(res, 400, { error: "Status tidak dikenal." });

  const hasil = await store.ubah(function (data) {
    const p = data.peserta.find(function (x) { return x.kode === kode; });
    if (!p) return null;
    if (status === "terverifikasi" && p.status !== "terverifikasi") p.diverifikasi_pada = new Date().toISOString();
    if (status !== "terverifikasi") p.diverifikasi_pada = null;
    p.status = status;
    return p;
  });
  if (!hasil) return json(res, 404, { error: "Kode tidak ditemukan." });
  json(res, 200, { peserta: hasil });
}

async function checkin(req, res) {
  let b;
  try { b = await badanJson(req); } catch (e) { return json(res, 400, { error: "Data tidak terbaca." }); }
  const kode = teks(b.kode, 20).toUpperCase();
  const hasil = await store.ubah(function (data) {
    const p = data.peserta.find(function (x) { return x.kode === kode; });
    if (!p) return null;
    p.checkin_pada = b.batal === true ? null : new Date().toISOString();
    return p;
  });
  if (!hasil) return json(res, 404, { error: "Kode tidak ditemukan." });
  json(res, 200, { peserta: hasil });
}

/* ---------- berkas statis ---------- */

function berkas(req, res, url) {
  const aman = path.normalize(url).replace(/^(\.\.[/\\])+/, "");
  const file = path.join(ROOT, aman);
  if (!file.startsWith(ROOT) || RAHASIA.has(path.basename(file))) return false;
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return false;

  const st = fs.statSync(file);
  /* Aset dipakai dengan nama tetap (hio-chery-q.jpg dan kawan-kawan), jadi
     nama berkas tidak bisa jadi penanda versi. ETag dari ukuran + waktu ubah
     membuat browser bertanya dulu sebelum memakai salinan lamanya: foto yang
     diganti langsung terlihat, tanpa peserta perlu menghapus cache. */
  const etag = '"' + st.size.toString(16) + "-" + Math.floor(st.mtimeMs).toString(16) + '"';
  if (req.headers["if-none-match"] === etag) {
    res.writeHead(304, { etag: etag, "cache-control": "public, max-age=300, must-revalidate" });
    return res.end(), true;
  }

  const type = TYPES[path.extname(file).toLowerCase()] || "application/octet-stream";
  res.writeHead(200, {
    "content-type": type,
    "content-length": st.size,
    etag: etag,
    "last-modified": st.mtime.toUTCString(),
    "cache-control": "public, max-age=300, must-revalidate"
  });
  fs.createReadStream(file).pipe(res);
  return true;
}

/* ---------- router ---------- */

const server = http.createServer(function (req, res) {
  const u = new URL(req.url, "http://x");
  const jalur = u.pathname;
  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket.remoteAddress || "?";

  if (jalur === "/healthz") return kirim(res, 200, "text/plain; charset=utf-8", "ok");

  /* API peserta */
  if (jalur === "/api/daftar" && req.method === "POST") return void daftar(req, res, ip);
  if (jalur === "/api/status" && req.method === "GET") return statusPeserta(res, u.searchParams.get("kode"));
  if (jalur === "/api/kuota" && req.method === "GET") return json(res, 200, store.kuota());

  /* API panitia */
  if (jalur.startsWith("/api/panitia/")) {
    if (!ADMIN_TOKEN) return json(res, 503, { error: "ADMIN_TOKEN belum diatur di server, halaman panitia dinonaktifkan." });
    if (!adminBoleh(req)) return json(res, 401, { error: "Token panitia salah." });
    if (jalur === "/api/panitia/peserta" && req.method === "GET") return json(res, 200, { peserta: store.semua(), rekap: rekap() });
    if (jalur === "/api/panitia/rekap" && req.method === "GET") return json(res, 200, rekap());
    if (jalur === "/api/panitia/status" && req.method === "POST") return void ubahStatus(req, res);
    if (jalur === "/api/panitia/checkin" && req.method === "POST") return void checkin(req, res);
    if (jalur === "/api/panitia/ekspor.csv" && req.method === "GET") return csv(res);
    return json(res, 404, { error: "Endpoint tidak dikenal." });
  }

  if (jalur.startsWith("/api/")) return json(res, 404, { error: "Endpoint tidak dikenal." });

  /* halaman panitia */
  if (jalur === "/panitia" || jalur === "/panitia/") {
    const f = path.join(ROOT, "panitia.html");
    if (fs.existsSync(f)) return kirim(res, 200, TYPES[".html"], fs.readFileSync(f));
  }

  /* halaman utama + aset */
  if (jalur === "/" || jalur === "/index.html") {
    if (req.headers["if-none-match"] === pageEtag) {
      res.writeHead(304, { etag: pageEtag, "cache-control": "public, max-age=60, must-revalidate" });
      return res.end();
    }
    const head = { etag: pageEtag, "cache-control": "public, max-age=60, must-revalidate", vary: "accept-encoding" };
    if (gzipDidukung(req)) {
      head["content-encoding"] = "gzip";
      head["content-length"] = pageGz.length;
      res.writeHead(200, Object.assign({ "content-type": TYPES[".html"] }, head));
      return res.end(pageGz);
    }
    return kirim(res, 200, TYPES[".html"], page, head);
  }
  if (berkas(req, res, jalur)) return;

  res.writeHead(404, { "content-type": TYPES[".html"] });
  res.end(page);
});

server.listen(PORT, function () {
  console.log("Akpol Golf Charity 2026 berjalan di port " + PORT);
  console.log("Data pendaftaran: " + store.FILE + (process.env.DATA_DIR ? "" : "  (DATA_DIR belum diatur — data hilang tiap deploy)"));
  if (!ADMIN_TOKEN) console.log("PERINGATAN: ADMIN_TOKEN belum diatur, halaman /panitia dinonaktifkan.");
});
