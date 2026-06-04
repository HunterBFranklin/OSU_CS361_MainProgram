// Hunter B. Franklin
// CS361-400, Spring 2026
// Assignment #9: Main Program, Big Pool Implementation
// Date: 06/03/2026

// Node.js module setup:
const http =  require("http");
const https = require("https");
const fs =    require("fs");
const path =  require("path");
const url =   require("url");

// Port setup:
const PORT =    process.env.PORT    || 3000;
const API_URL = process.env.API_URL || "http://127.0.0.1:5001";

// File extension mapping for browser:
const MIME = {
  ".html": "text/html",
  ".css":  "text/css",
  ".js":   "application/javascript",
  ".json": "application/json",
  ".png":  "image/png",
  ".svg":  "image/svg+xml",
  ".ico":  "image/x-icon",
};

// Forwards browser requests to Flask backend and pipes responses back to
// browser. Direct Flask contact isn't needed.
function proxyToFlask(req, res) {
  const target  = new url.URL(API_URL); // Parses into parts for separate use.
  const options = {
    hostname: target.hostname,
    port:     target.port || 5001,
    path:     req.url,
    method:   req.method,
    headers:  { ...req.headers, host: target.host },
  }; // Describes Flask request.

  const proto = target.protocol === "https:" ? https : http; // HTTPS vs HTTP.
  const proxy = proto.request(options, (flaskRes) => {
    res.writeHead(flaskRes.statusCode, flaskRes.headers);
    flaskRes.pipe(res);
  }); // Making request, copies status code and header, sends body without buffering.

  proxy.on("error", (err) => {
    console.error("[proxy error]", err.message);
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Backend unavailable.", detail: err.message }));
  }); // If Flask fails, sends 502 instead of crashing.

  req.pipe(proxy); // Streams the browser's request body to Flask.
}

// Reads file from /public folders and sends it to the browser (used for non-API
// requests):
function serveStatic(req, res) {
  let filePath = path.join(__dirname, "public", req.url === "/" ? "index.html" : req.url);

  if (!fs.existsSync(filePath)) {
    filePath = path.join(__dirname, "public", "index.html");
  } // If no file, falls back to index.html.

  // For correct content-type (use MIME table):
  const ext      = path.extname(filePath);
  const mimeType = MIME[ext] || "application/octet-stream";

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("404 Not Found");
      return;
    }
    res.writeHead(200, { "Content-Type": mimeType });
    res.end(data);
  }); // Reads file from disk and sends to browser (200=good, 404=not found).
}

// HTTP server creation (runs every request from browser):
const server = http.createServer((req, res) => {
  // /habits routes go to Flask (habit CRUD).
  // /api/* routes go to Flask (microservice proxies for quote, streak, schedule, progress).
  // Everything else is served as a static file from /public.
  if (req.url.startsWith("/habits") || req.url.startsWith("/api")) {
    proxyToFlask(req, res);
  } else {
    serveStatic(req, res);
  }
});

server.listen(PORT, () => {
  console.log(`[habit-at frontend] http://localhost:${PORT}`);
  console.log(`[habit-at api proxy] → ${API_URL}`);
}); // Starts server and logs address for dev.