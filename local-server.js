const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 4173;
const ROOT = process.cwd();

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".ico": "image/x-icon",
};

function sendFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  });
}

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const normalized = path.normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  return path.join(ROOT, normalized);
}

http
  .createServer((req, res) => {
    const urlPath = req.url.split("?")[0];

    // Proxy API requests to the deployed backend so everything stays under one local domain.
    if (urlPath === "/api" || urlPath.startsWith("/api/")) {
      const upstream = new URL(req.url, "https://new-5t2n.onrender.com");
      const forwardedHeaders = { ...req.headers, host: upstream.hostname };
      delete forwardedHeaders.origin;
      delete forwardedHeaders.referer;

      const proxyReq = https.request(
        {
          protocol: upstream.protocol,
          hostname: upstream.hostname,
          port: 443,
          method: req.method,
          path: `${upstream.pathname}${upstream.search}`,
          headers: forwardedHeaders,
        },
        (proxyRes) => {
          res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
          proxyRes.pipe(res);
        }
      );

      proxyReq.on("error", () => {
        res.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ message: "API proxy error" }));
      });

      req.pipe(proxyReq);
      return;
    }

    // Dashboard SPA fallback
    if (urlPath === "/dashboard" || urlPath.startsWith("/dashboard/")) {
      const fileCandidate = safePath(urlPath);
      if (fs.existsSync(fileCandidate) && fs.statSync(fileCandidate).isFile()) {
        return sendFile(res, fileCandidate);
      }
      return sendFile(res, path.join(ROOT, "dashboard", "index.html"));
    }

    // Static file request
    const candidate = safePath(urlPath === "/" ? "/index.html" : urlPath);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return sendFile(res, candidate);
    }

    // cleanUrls support for root pages (/about -> /about.html)
    const cleanUrlCandidate = safePath(`${urlPath}.html`);
    if (fs.existsSync(cleanUrlCandidate) && fs.statSync(cleanUrlCandidate).isFile()) {
      return sendFile(res, cleanUrlCandidate);
    }

    return sendFile(res, path.join(ROOT, "index.html"));
  })
  .listen(PORT, "127.0.0.1", () => {
    console.log(`Local server running at http://127.0.0.1:${PORT}`);
  });
