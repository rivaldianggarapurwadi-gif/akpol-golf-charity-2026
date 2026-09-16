/**
 * Writes the standalone page into /docs at the repo root, the folder GitHub
 * Pages serves. Run after editing index.html: `npm run build:docs`.
 */
const fs = require("fs");
const path = require("path");
const { buildPage } = require("./page.js");

const OUT = path.join(__dirname, "docs");
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "index.html"), buildPage(__dirname));
fs.writeFileSync(path.join(OUT, ".nojekyll"), "");
for (const asset of ["logo-mark.png", "logo-full.png", "akpol-crest.png"]) {
  fs.copyFileSync(path.join(__dirname, asset), path.join(OUT, asset));
}
console.log("docs/ written:", fs.readdirSync(OUT).join(", "));
