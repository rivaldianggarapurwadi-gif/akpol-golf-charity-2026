/**
 * Static server for the Akpol Golf Charity 2026 site.
 *
 * The page itself is wrapped into a full HTML document by page.js.
 *
 * No dependencies: `node server.js` is the whole thing.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json"
};

const { buildPage } = require("./page.js");

let page = buildPage(ROOT);

const server = http.createServer(function (req, res) {
  const url = (req.url || "/").split("?")[0];

  if (url === "/healthz") {
    res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
    return res.end("ok");
  }

  if (url === "/" || url === "/index.html") {
    res.writeHead(200, { "content-type": TYPES[".html"], "cache-control": "public, max-age=60" });
    return res.end(page);
  }

  // any other path: serve the file if it exists next to this script, else the page
  const safe = path.normalize(url).replace(/^(\.\.[/\\])+/, "");
  const file = path.join(ROOT, safe);
  if (file.startsWith(ROOT) && path.basename(file) !== "server.js" && fs.existsSync(file) && fs.statSync(file).isFile()) {
    const type = TYPES[path.extname(file).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, { "content-type": type, "cache-control": "public, max-age=86400" });
    return fs.createReadStream(file).pipe(res);
  }

  res.writeHead(404, { "content-type": TYPES[".html"] });
  res.end(page);
});

server.listen(PORT, function () {
  console.log("Akpol Golf Charity 2026 listening on port " + PORT);
});
