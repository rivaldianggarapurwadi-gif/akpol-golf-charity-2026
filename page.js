/**
 * Wraps index.html — authored as an Artifact fragment, so it carries no
 * doctype, head or body — in a real HTML document. Shared by server.js (which
 * wraps on each boot) and build-docs.js (which writes the result to disk for
 * static hosts), so there is only ever one copy of the page to edit.
 */
const fs = require("fs");
const path = require("path");

const HEAD =
  '<!doctype html>\n<html lang="id">\n<head>\n' +
  '<meta charset="utf-8">\n' +
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' +
  '<meta name="theme-color" content="#072A5C">\n' +
  '<meta name="description" content="Akpol Golf Charity 2026 — Swing for NTT. Turnamen golf amal, Jumat 23 Oktober 2026 di Semarang Royale Golf. Pendaftaran peserta dibuka.">\n' +
  '<meta property="og:title" content="Akpol Golf Charity 2026 — Swing for NTT">\n' +
  '<meta property="og:description" content="Turnamen golf amal, Jumat 23 Oktober 2026 di Semarang Royale Golf. Rp2.500.000 per peserta umum, kuota 120 peserta.">\n' +
  '<meta property="og:type" content="website">\n' +
  '<meta property="og:image" content="logo-full.png">\n' +
  '<meta name="twitter:card" content="summary_large_image">\n' +
  '<link rel="icon" href="logo-mark.png">\n' +
  '<link rel="apple-touch-icon" href="logo-mark.png">\n' +
  '<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}' +
  'body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>\n';

function buildPage(dir) {
  const src = fs.readFileSync(path.join(dir || __dirname, "index.html"), "utf8");
  const split = src.indexOf('<header class="nav"');
  if (split === -1) throw new Error("index.html: nav landmark not found");
  return HEAD + src.slice(0, split) + "</head>\n<body>\n" + src.slice(split) + "\n</body>\n</html>\n";
}

module.exports = { buildPage };
