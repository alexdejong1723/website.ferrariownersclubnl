// Eenvoudige lokale server (geen externe pakketten nodig): node server.js
// Serveert de website en ontvangt het contactformulier op POST /api/contact.
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const MAIL_TO = "info@ferrariownersclubnl.nl";
const OUTBOX = path.join(ROOT, "berichten.jsonl");

const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".png": "image/png", ".gif": "image/gif", ".ico": "image/x-icon" };
const PUBLIC = /^\/(index\.html|programma\.html|doe-mee\.html|informatie\.html|contact\.html|assets\/|data\/)/;

function send(res, code, body, type) { res.writeHead(code, { "Content-Type": type || "application/json" }); res.end(typeof body === "string" ? body : JSON.stringify(body)); }

function handleContact(req, res) {
  let raw = "";
  req.on("data", (c) => { raw += c; if (raw.length > 20000) req.destroy(); });
  req.on("end", () => {
    let d;
    try { d = JSON.parse(raw); } catch { return send(res, 400, { error: "Ongeldig verzoek" }); }
    if (d.website) return send(res, 200, { ok: true }); // honeypot: bots stil negeren
    const f = (k) => String(d[k] || "").trim();
    const msg = { naam: f("naam"), telefoon: f("telefoon"), email: f("email"), opmerking: f("opmerking") };
    if (msg.naam.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(msg.email) || msg.opmerking.length < 3 || msg.telefoon.length < 8)
      return send(res, 400, { error: "Controleer de ingevulde velden" });
    const entry = { ontvangen: new Date().toISOString(), aan: MAIL_TO, ...msg };
    fs.appendFile(OUTBOX, JSON.stringify(entry) + "\n", (err) => {
      if (err) return send(res, 500, { error: "Opslaan mislukt" });
      // TODO bij livegang: hier het bericht e-mailen naar MAIL_TO (SMTP of een mail-dienst).
      console.log(`Contactbericht van ${msg.naam} opgeslagen in berichten.jsonl (te versturen naar ${MAIL_TO})`);
      send(res, 200, { ok: true });
    });
  });
}

http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  if (req.method === "POST" && url === "/api/contact") return handleContact(req, res);
  if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, { error: "Niet toegestaan" });
  const rel = url === "/" ? "/index.html" : url;
  const file = path.join(ROOT, path.normalize(rel));
  if (!PUBLIC.test(rel) || !file.startsWith(ROOT + path.sep)) return send(res, 404, "Niet gevonden", "text/plain; charset=utf-8");
  fs.readFile(file, (err, buf) => {
    if (err) return send(res, 404, "Niet gevonden", "text/plain; charset=utf-8");
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
    res.end(buf);
  });
}).listen(PORT, () => console.log(`Website draait op http://localhost:${PORT}`));
