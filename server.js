/**
 * Server situs Akpol Golf Charity 2026.
 *
 * Situs ini hanya memuat informasi acara. Pendaftaran dilayani panitia lewat
 * WhatsApp, jadi tidak ada formulir, basis data, maupun data pribadi yang
 * tersimpan di sini. Tanpa dependency: `node server.js` sudah cukup.
 *
 * Environment:
 *   PORT        disuntik host (Railway). Default 3000.
 *   TRUST_PROXY "0" untuk mengabaikan header X-Forwarded-For.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { buildPage } = require("./page.js");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
  ".txt": "text/plain; charset=utf-8"
};

/* Berkas program tidak pernah dilayani sebagai aset, dan hanya jenis berkas
   pada daftar izin ini yang boleh keluar. */
const RAHASIA = new Set(["server.js", "page.js", "build-docs.js", "package.json", "railway.json"]);
const ASET = new Set(Object.keys(TYPES));

const page = buildPage(ROOT);
const pageGz = zlib.gzipSync(Buffer.from(page), { level: 9 });
const pageEtag = '"' + require("crypto").createHash("sha1").update(page).digest("hex").slice(0, 16) + '"';

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "object-src 'none'"
].join("; ");

function headerKeamanan(req, res) {
  res.setHeader("content-security-policy", CSP);
  res.setHeader("x-content-type-options", "nosniff");
  res.setHeader("x-frame-options", "SAMEORIGIN");
  res.setHeader("referrer-policy", "strict-origin-when-cross-origin");
  res.setHeader("permissions-policy", "camera=(), microphone=(), geolocation=(), payment=()");
  if ((req.headers["x-forwarded-proto"] || "").split(",")[0].trim() === "https") {
    res.setHeader("strict-transport-security", "max-age=15552000; includeSubDomains");
  }
}

function gzipDidukung(req) {
  return /\bgzip\b/.test(req.headers["accept-encoding"] || "");
}

/* Aset memakai nama tetap, jadi ETag dari ukuran + waktu ubah yang menentukan
   kapan browser boleh memakai salinannya: foto yang diganti langsung terlihat. */
function berkas(req, res, url) {
  const aman = path.normalize(url).replace(/^(\.\.[/\\])+/, "");
  const file = path.resolve(ROOT, "." + path.sep + aman);
  const nama = path.basename(file);
  if (!file.startsWith(ROOT + path.sep)) return false;
  if (RAHASIA.has(nama) || nama.startsWith(".")) return false;
  if (!ASET.has(path.extname(file).toLowerCase())) return false;
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return false;

  const st = fs.statSync(file);
  const etag = '"' + st.size.toString(16) + "-" + Math.floor(st.mtimeMs).toString(16) + '"';
  const cache = "public, max-age=300, must-revalidate";
  if (req.headers["if-none-match"] === etag) {
    res.writeHead(304, { etag: etag, "cache-control": cache });
    res.end();
    return true;
  }
  res.writeHead(200, {
    "content-type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream",
    "content-length": st.size,
    etag: etag,
    "last-modified": st.mtime.toUTCString(),
    "cache-control": cache
  });
  fs.createReadStream(file).pipe(res);
  return true;
}

const server = http.createServer(function (req, res) {
  headerKeamanan(req, res);
  const jalur = new URL(req.url, "http://x").pathname;

  if (jalur === "/healthz") {
    res.writeHead(200, { "content-type": TYPES[".txt"] });
    return res.end("ok");
  }

  if (jalur === "/" || jalur === "/index.html") {
    const head = {
      "content-type": TYPES[".html"],
      etag: pageEtag,
      vary: "accept-encoding",
      "cache-control": "public, max-age=60, must-revalidate"
    };
    if (req.headers["if-none-match"] === pageEtag) {
      res.writeHead(304, { etag: pageEtag, "cache-control": head["cache-control"] });
      return res.end();
    }
    if (gzipDidukung(req)) {
      head["content-encoding"] = "gzip";
      head["content-length"] = pageGz.length;
      res.writeHead(200, head);
      return res.end(pageGz);
    }
    head["content-length"] = Buffer.byteLength(page);
    res.writeHead(200, head);
    return res.end(page);
  }

  if (berkas(req, res, jalur)) return;

  res.writeHead(404, { "content-type": TYPES[".html"] });
  res.end(page);
});

server.listen(PORT, function () {
  console.log("Akpol Golf Charity 2026 berjalan di port " + PORT);
  console.log("Situs informasi — pendaftaran diarahkan ke WhatsApp panitia.");
});
