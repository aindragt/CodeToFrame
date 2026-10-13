// SP-01 spike relay. Throwaway code: minimal implementation of
// ARCHITECTURE 3.4/3.8/3.9 and SCHEMA chapter 8. Zero dependencies.
//
// Env (all optional):
//   CTF_PORT           listen port (default 47821)
//   CTF_TOKEN          fixed token (default: random 128-bit, printed, never written to disk)
//   CTF_EXTRA_ORIGINS  comma-separated extra allowed Origin values
//   CTF_PNA            "0" disables Access-Control-Allow-Private-Network replies
//   CTF_RESULTS_DIR    where /spike/report writes (default ../results)

import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.CTF_PORT || 47821);
const TOKEN = process.env.CTF_TOKEN || crypto.randomBytes(16).toString('hex');
const RESULTS_DIR = path.resolve(process.env.CTF_RESULTS_DIR || path.join(HERE, '..', 'results'));
const PNA = process.env.CTF_PNA !== '0';
const EXTRA_ORIGINS = (process.env.CTF_EXTRA_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);

// Values from ARCHITECTURE section 9.
const MAX_BODY = 128 * 1024 * 1024; // relayMaxBodyBytes
const SLOT_TTL_MS = 15 * 60 * 1000; // relaySlotTtlMs
const HEARTBEAT_MS = 3000; // pluginHeartbeatTimeoutMs
const SMALL_BODY = 64 * 1024; // ack body limit
const REPORT_BODY = 16 * 1024 * 1024; // spike report limit
const PROTOCOL = '1.0';
const RELAY_VERSION = 'spike-sp01';

const ALLOWED_HOSTS = new Set([`localhost:${PORT}`, `127.0.0.1:${PORT}`, `[::1]:${PORT}`]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOW_HEADERS = 'Authorization, Content-Type, X-CTF-Capture-Id, X-CTF-Format-Version, X-CTF-Captured-At, X-CTF-Title';

let slot = null; // { captureId, receivedAt, expiresAt, sizeBytes, formatVersion, capturedAt, title, body }
let lastImport = null;
let pluginLastSeen = 0;
let uploadInProgress = false;

const tokenHash = crypto.createHash('sha256').update(TOKEN).digest();
function tokenOk(header) {
  const m = /^Bearer (.+)$/.exec(header || '');
  if (!m) return false;
  // Hash both sides so timingSafeEqual always compares equal-length buffers.
  const given = crypto.createHash('sha256').update(m[1]).digest();
  return crypto.timingSafeEqual(given, tokenHash);
}

function originAllowed(origin) {
  if (origin === undefined) return true; // non-browser client (curl, Node tests): no Origin header
  if (origin === 'null') return true;
  if (origin.startsWith('chrome-extension://')) return true;
  return EXTRA_ORIGINS.includes(origin);
}

function expireSlot() {
  if (slot && Date.now() > slot.expiresAt) slot = null;
}
setInterval(expireSlot, 10_000).unref();

function log(entry) {
  // Metadata only: never body content or token values.
  process.stdout.write(JSON.stringify({ t: new Date().toISOString(), ...entry }) + '\n');
}

function corsHeaders(req, url) {
  const origin = req.headers.origin;
  if (origin === undefined || !originAllowed(origin)) return {};
  const h = { Vary: 'Origin', 'Access-Control-Expose-Headers': 'X-CTF-Capture-Id' };
  // Spike-only switch to compare "echo origin" (SCHEMA 8.7) with "*" (Figma docs claim).
  h['Access-Control-Allow-Origin'] = url.searchParams.get('spike_acao') === 'star' ? '*' : origin;
  return h;
}

function handler(req, res) {
  const started = Date.now();
  const url = new URL(req.url, 'http://relay.invalid');
  const meta = {
    method: req.method,
    path: url.pathname,
    family: req.socket.remoteFamily,
    remote: req.socket.remoteAddress,
    origin: req.headers.origin ?? '(absent)',
    host: req.headers.host ?? '(absent)',
    acrpn: 'access-control-request-private-network' in req.headers,
    secFetchSite: 'sec-fetch-site' in req.headers,
    probe: req.headers['x-spike-probe'], // spike-only test tag
    bytesIn: 0,
  };
  let cors = {};
  const send = (status, body, extra = {}) => {
    if (res.headersSent) return;
    const isBuf = Buffer.isBuffer(body);
    const payload = body === undefined ? undefined : isBuf ? body : Buffer.from(JSON.stringify(body));
    const headers = { ...cors, ...extra };
    if (payload !== undefined && !headers['Content-Type']) headers['Content-Type'] = 'application/json; charset=utf-8';
    if (payload !== undefined) headers['Content-Length'] = payload.length;
    res.writeHead(status, headers);
    res.end(payload);
    log({ ...meta, status, bytesOut: payload ? payload.length : 0, ms: Date.now() - started });
  };
  const fail = (status, code, more = {}, extra = {}) => send(status, { protocol: PROTOCOL, error: { code, ...more } }, extra);

  // 1. Host allowlist (DNS rebinding).
  if (!ALLOWED_HOSTS.has(req.headers.host)) return fail(403, 'RELAY_FORBIDDEN_HOST');
  // 2. Origin allowlist, before token.
  if (!originAllowed(req.headers.origin)) return fail(403, 'RELAY_FORBIDDEN_ORIGIN');
  cors = corsHeaders(req, url);
  // 3. Preflight ends here, no token.
  if (req.method === 'OPTIONS') {
    const h = {
      'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS',
      'Access-Control-Allow-Headers': ALLOW_HEADERS,
    };
    if (PNA && req.headers['access-control-request-private-network'] === 'true') {
      h['Access-Control-Allow-Private-Network'] = 'true';
    }
    return send(204, undefined, h);
  }
  // 4. Token.
  if (!tokenOk(req.headers.authorization)) return fail(401, 'RELAY_UNAUTHORIZED');
  // 5. Routing.
  route(req, res, url, meta, send, fail).catch((err) => {
    log({ ...meta, internalError: String(err && err.message) });
    fail(500, 'RELAY_INTERNAL');
  });
}

function readBody(req, meta, limit) {
  return new Promise((resolve, reject) => {
    const declared = Number(req.headers['content-length']);
    if (Number.isFinite(declared) && declared > limit) return reject(Object.assign(new Error('too large'), { tooLarge: true }));
    const chunks = [];
    let size = 0;
    let done = false;
    req.on('data', (c) => {
      if (done) return;
      size += c.length;
      meta.bytesIn = size;
      if (size > limit) {
        done = true;
        chunks.length = 0;
        req.pause();
        return reject(Object.assign(new Error('too large'), { tooLarge: true }));
      }
      chunks.push(c);
    });
    req.on('end', () => { if (!done) { done = true; resolve(Buffer.concat(chunks, size)); } });
    req.on('error', (e) => { if (!done) { done = true; reject(e); } });
  });
}

function rejectTooLarge(req, res, fail, limit) {
  fail(413, 'RELAY_PAYLOAD_TOO_LARGE', { limitBytes: limit }, { Connection: 'close' });
  // Discard (not buffer) the rest of the upload for a short grace period so the client can
  // read the 413 instead of seeing a reset, then close the socket.
  req.resume();
  res.on('finish', () => setTimeout(() => req.socket.destroy(), 2000).unref());
}

async function route(req, res, url, meta, send, fail) {
  const p = url.pathname;
  expireSlot();

  if (p === '/v1/status') {
    if (req.method !== 'GET') return fail(405, 'RELAY_METHOD_NOT_ALLOWED');
    const body = { protocol: PROTOCOL, relayVersion: RELAY_VERSION, pluginConnected: pluginLastSeen > 0 && Date.now() - pluginLastSeen <= HEARTBEAT_MS };
    if (pluginLastSeen > 0) body.pluginLastSeenMsAgo = Date.now() - pluginLastSeen;
    if (slot) body.slot = { captureId: slot.captureId, receivedAt: slot.receivedAt, expiresAt: new Date(slot.expiresAt).toISOString(), sizeBytes: slot.sizeBytes, formatVersion: slot.formatVersion };
    if (lastImport) body.lastImport = lastImport;
    return send(200, body);
  }

  if (p === '/v1/capture') {
    if (req.method !== 'PUT') return fail(405, 'RELAY_METHOD_NOT_ALLOWED');
    if (!/^application\/json\b/i.test(req.headers['content-type'] || '')) return fail(415, 'RELAY_UNSUPPORTED_MEDIA');
    const id = req.headers['x-ctf-capture-id'];
    const fv = req.headers['x-ctf-format-version'];
    const at = req.headers['x-ctf-captured-at'];
    if (!UUID_RE.test(id || '') || !/^[0-9]+\.[0-9]+$/.test(fv || '') || !at || Number.isNaN(Date.parse(at))) return fail(400, 'RELAY_BAD_REQUEST');
    let title;
    if (req.headers['x-ctf-title'] !== undefined) {
      try { title = decodeURIComponent(req.headers['x-ctf-title']); } catch { return fail(400, 'RELAY_BAD_REQUEST'); }
    }
    if (uploadInProgress) return fail(409, 'RELAY_UPLOAD_IN_PROGRESS');
    uploadInProgress = true;
    let body;
    try {
      body = await readBody(req, meta, MAX_BODY);
    } catch (e) {
      uploadInProgress = false;
      if (e.tooLarge) return rejectTooLarge(req, res, fail, MAX_BODY);
      throw e;
    }
    uploadInProgress = false;
    const now = Date.now();
    slot = { captureId: id.toLowerCase(), receivedAt: new Date(now).toISOString(), expiresAt: now + SLOT_TTL_MS, sizeBytes: body.length, formatVersion: fv, capturedAt: at, title, body };
    lastImport = null;
    return send(200, { protocol: PROTOCOL, captureId: slot.captureId, receivedAt: slot.receivedAt, sizeBytes: slot.sizeBytes });
  }

  if (p === '/v1/pending') {
    if (req.method !== 'GET') return fail(405, 'RELAY_METHOD_NOT_ALLOWED');
    const known = url.searchParams.get('known');
    if (known !== null && known !== '' && !UUID_RE.test(known)) return fail(400, 'RELAY_BAD_REQUEST');
    pluginLastSeen = Date.now();
    const body = { protocol: PROTOCOL };
    if (slot && slot.captureId !== (known || '').toLowerCase()) {
      body.pending = { captureId: slot.captureId, capturedAt: slot.capturedAt, receivedAt: slot.receivedAt, sizeBytes: slot.sizeBytes, formatVersion: slot.formatVersion };
      if (slot.title !== undefined) body.pending.title = slot.title;
    }
    return send(200, body);
  }

  let m = /^\/v1\/capture\/([^/]+)$/.exec(p);
  if (m) {
    if (req.method !== 'GET') return fail(405, 'RELAY_METHOD_NOT_ALLOWED');
    if (!slot || slot.captureId !== m[1].toLowerCase()) return fail(404, 'RELAY_NOT_FOUND');
    return send(200, slot.body, { 'Content-Type': 'application/json', 'X-CTF-Capture-Id': slot.captureId });
  }

  m = /^\/v1\/capture\/([^/]+)\/ack$/.exec(p);
  if (m) {
    if (req.method !== 'POST') return fail(405, 'RELAY_METHOD_NOT_ALLOWED');
    let raw;
    try { raw = await readBody(req, meta, SMALL_BODY); } catch (e) { if (e.tooLarge) return rejectTooLarge(req, res, fail, SMALL_BODY); throw e; }
    let ack;
    try { ack = JSON.parse(raw.toString('utf8')); } catch { return fail(400, 'RELAY_BAD_REQUEST'); }
    const okOutcome = ['imported', 'incomplete', 'rejected'].includes(ack && ack.outcome);
    if (!okOutcome || !Number.isInteger(ack.nodesCreated)) return fail(400, 'RELAY_BAD_REQUEST');
    if (!slot || slot.captureId !== m[1].toLowerCase()) return fail(404, 'RELAY_NOT_FOUND');
    const counts = ack.warningCounts && typeof ack.warningCounts === 'object' ? Object.values(ack.warningCounts) : [];
    lastImport = { captureId: slot.captureId, at: new Date().toISOString(), outcome: ack.outcome, nodesCreated: ack.nodesCreated, warningCount: counts.reduce((a, b) => a + (Number(b) || 0), 0) };
    slot = null;
    return send(200, { protocol: PROTOCOL, captureId: lastImport.captureId, slotCleared: true });
  }

  // ---- Spike-only endpoints ----
  m = /^\/spike\/report\/(plugin|extension)$/.exec(p);
  if (m) {
    if (req.method !== 'POST') return fail(405, 'RELAY_METHOD_NOT_ALLOWED');
    let raw;
    try { raw = await readBody(req, meta, REPORT_BODY); } catch (e) { if (e.tooLarge) return rejectTooLarge(req, res, fail, REPORT_BODY); throw e; }
    let parsed;
    try { parsed = JSON.parse(raw.toString('utf8')); } catch { return fail(400, 'RELAY_BAD_REQUEST'); }
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
    fs.writeFileSync(path.join(RESULTS_DIR, `${m[1]}-report.json`), JSON.stringify(parsed, null, 2));
    return send(200, { ok: true });
  }

  if (p === '/spike/payload') {
    if (req.method !== 'GET') return fail(405, 'RELAY_METHOD_NOT_ALLOWED');
    const bytes = Number(url.searchParams.get('bytes'));
    if (!Number.isInteger(bytes) || bytes < 512 || bytes > 256 * 1024 * 1024) return fail(400, 'RELAY_BAD_REQUEST');
    return streamPayload(res, bytes, meta, corsHeaders(req, url), Date.now());
  }

  if (p === '/spike/echo') {
    // Request metadata as seen by the relay, so plugin/extension can record their own Origin.
    return send(200, {
      origin: req.headers.origin ?? null,
      host: req.headers.host ?? null,
      family: req.socket.remoteFamily,
      remoteAddress: req.socket.remoteAddress,
      secFetchSite: req.headers['sec-fetch-site'] ?? null,
      secFetchMode: req.headers['sec-fetch-mode'] ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
  }

  if (p === '/spike/metrics') {
    if (req.method !== 'GET') return fail(405, 'RELAY_METHOD_NOT_ALLOWED');
    const mu = process.memoryUsage();
    return send(200, { rss: mu.rss, heapUsed: mu.heapUsed, external: mu.external, arrayBuffers: mu.arrayBuffers, slotBytes: slot ? slot.sizeBytes : 0 });
  }

  return fail(404, 'RELAY_NOT_FOUND');
}

// Synthetic "envelope-like" JSON of exactly `bytes` bytes, padded with random base64
// (random so transport compression would not help).
export function payloadParts(bytes) {
  const head = '{"format":"codetoframe","formatVersion":"3.0","meta":{"captureId":"00000000-0000-4000-8000-000000000000","url":"http://synthetic.invalid/","title":"SP-01 synthetic","capturedAt":"2026-10-13T00:00:00.000Z","viewport":{"width":1280,"height":720},"page":{"width":1280,"height":720},"devicePixelRatio":1,"extensionVersion":"spike","root":{"scope":"document","tag":"html"}},"rootId":"n0","nodes":[{"id":"n0","kind":"element","tag":"html","rect":{"x":0,"y":0,"w":1280,"h":720}}],"assets":[{"id":"a0","status":"ok","mime":"image/png","width":1,"height":1,"byteLength":1,"data":"';
  const tail = '"}],"report":{"spikePadding":"';
  const end = '"}}';
  const fixed = head.length + tail.length + end.length;
  const fill = Math.max(0, bytes - fixed);
  const b64Len = Math.floor(fill / 4) * 4; // keeps padding char out of the data
  const pad = fill - b64Len; // filler for the report string
  return { head, tail, end, b64Len, pad };
}

function streamPayload(res, bytes, meta, cors, started) {
  const { head, tail, end, b64Len, pad } = payloadParts(bytes);
  res.writeHead(200, { ...cors, 'Content-Type': 'application/json', 'Content-Length': bytes });
  res.write(head);
  let left = b64Len;
  const CHUNK_B64 = 4 * 1024 * 1024; // 4 MiB of base64 per write (multiple of 4)
  const pump = () => {
    while (left > 0) {
      const n = Math.min(CHUNK_B64, left);
      const raw = crypto.randomBytes((n / 4) * 3);
      if (!res.write(raw.toString('base64'))) { left -= n; res.once('drain', pump); return; }
      left -= n;
    }
    res.end(tail + 'x'.repeat(pad) + end);
    log({ ...meta, status: 200, bytesOut: bytes, ms: Date.now() - started });
  };
  pump();
}

// ---- Start ----
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const servers = [];
  const listenOn = (host, opts = {}) => new Promise((resolve) => {
    const s = http.createServer(handler);
    s.on('clientError', (err, socket) => {
      log({ clientError: err.code || String(err.message) });
      if (socket.writable) socket.end(err.code === 'HPE_HEADER_OVERFLOW' ? 'HTTP/1.1 431 Request Header Fields Too Large\r\nConnection: close\r\n\r\n' : 'HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
    });
    s.once('error', (e) => { log({ listenError: host, code: e.code }); resolve(null); });
    s.listen({ host, port: PORT, ...opts }, () => { servers.push(s); resolve(host); });
  });
  const hosts = (await Promise.all([listenOn('127.0.0.1'), listenOn('::1', { ipv6Only: true })])).filter(Boolean);
  console.log('==============================================');
  console.log(' CodeToFrame SP-01 spike relay');
  console.log(` listening: ${hosts.map((h) => (h.includes(':') ? `[${h}]` : h) + ':' + PORT).join(', ')}`);
  console.log(` token: ${TOKEN}`);
  console.log(` maxHeaderSize: ${http.maxHeaderSize}  PNA replies: ${PNA ? 'on' : 'off'}`);
  console.log(' (token is not written to disk; Ctrl+C to stop)');
  console.log('==============================================');
  console.log('READY');
}
