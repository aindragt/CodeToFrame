// SP-01 Node test runner (N1–N9). Starts its own relay on a separate port so it
// does not clash with a relay the user runs on 47821. Results: results/node-report.json
import http from 'node:http';
import crypto from 'node:crypto';
import dns from 'node:dns/promises';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const RESULTS = path.join(ROOT, 'results');
const PORT = Number(process.env.CTF_TEST_PORT || 47822);
const TOKEN = crypto.randomBytes(16).toString('hex');
const MiB = 1024 * 1024;

const report = { generatedAt: new Date().toISOString(), node: process.version, platform: `${process.platform} ${process.arch}`, port: PORT, tests: [] };
const relayLog = [];

function record(id, status, details) {
  report.tests.push({ id, status, ...details });
  console.log(`${status === 'pass' ? 'PASS' : status.toUpperCase()}  ${id}  ${details.summary || ''}`);
}

// ---- helpers ----
function request({ host = '127.0.0.1', family, method = 'GET', path: p = '/v1/status', headers = {}, body, auth = true, hostHeader }) {
  return new Promise((resolve) => {
    const h = { ...headers };
    if (auth) h.Authorization = `Bearer ${TOKEN}`;
    if (hostHeader !== undefined) h.Host = hostHeader;
    const t0 = performance.now();
    const req = http.request({ host, port: PORT, family, method, path: p, headers: h, agent: false }, (res) => {
      const chunks = [];
      const hash = crypto.createHash('sha256');
      let size = 0;
      res.on('data', (c) => { size += c.length; hash.update(c); if (size <= 1 * MiB) chunks.push(c); });
      res.on('end', () => {
        const text = size <= 1 * MiB ? Buffer.concat(chunks).toString('utf8') : null;
        let json = null;
        try { json = text ? JSON.parse(text) : null; } catch { /* not json */ }
        resolve({ status: res.statusCode, headers: res.headers, size, sha256: hash.digest('hex'), json, text, ms: performance.now() - t0 });
      });
    });
    req.on('error', (e) => resolve({ error: e.code || e.message, ms: performance.now() - t0 }));
    if (body instanceof Readable) body.pipe(req);
    else req.end(body);
  });
}

// Random base64 stream of exactly `bytes` bytes; returns { stream, digest() }.
function randomBody(bytes) {
  const hash = crypto.createHash('sha256');
  let left = bytes;
  const stream = new Readable({
    read() {
      if (left <= 0) return this.push(null);
      const n = Math.min(4 * MiB, left);
      const chunk = Buffer.from(crypto.randomBytes(Math.ceil((n * 3) / 4)).toString('base64').slice(0, n));
      left -= n;
      hash.update(chunk);
      this.push(chunk);
    },
  });
  return { stream, digest: () => hash.digest('hex') };
}

const captureHeaders = (id, extra = {}) => ({
  'Content-Type': 'application/json',
  'X-CTF-Capture-Id': id,
  'X-CTF-Format-Version': '3.0',
  'X-CTF-Captured-At': new Date().toISOString(),
  ...extra,
});

function snapshotFiles(dir, out = new Map()) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (p === RESULTS) continue;
    if (e.isDirectory()) snapshotFiles(p, out);
    else out.set(path.relative(ROOT, p), fs.statSync(p).size);
  }
  return out;
}

async function metrics() {
  const r = await request({ path: '/spike/metrics' });
  return r.json;
}

// ---- start relay ----
fs.mkdirSync(RESULTS, { recursive: true });
const filesBefore = snapshotFiles(ROOT);
const child = spawn(process.execPath, [path.join(ROOT, 'relay', 'relay.mjs')], {
  env: { ...process.env, CTF_PORT: String(PORT), CTF_TOKEN: TOKEN, CTF_RESULTS_DIR: path.join(RESULTS, 'node-test-reports') },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let exited = null;
child.on('exit', (code, sig) => { exited = { code, sig }; });
await new Promise((resolve, reject) => {
  let buf = '';
  child.stdout.on('data', (d) => {
    buf += d.toString();
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (line === 'READY') resolve();
      if (line.startsWith('{')) { try { relayLog.push(JSON.parse(line)); } catch { /* ignore */ } }
      else if (line.startsWith(' listening') || line.startsWith(' maxHeaderSize')) report[line.trim().split(':')[0]] = line.trim();
    }
  });
  child.stderr.on('data', (d) => process.stderr.write(d));
  setTimeout(() => reject(new Error('relay did not start')), 10_000);
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function logFor(probe) {
  for (let i = 0; i < 40; i++) {
    const hit = relayLog.find((l) => l.probe === probe);
    if (hit) return hit;
    await sleep(25);
  }
  return null;
}

try {
  // N1: listeners and localhost resolution
  {
    const v4 = await request({ host: '127.0.0.1', hostHeader: `127.0.0.1:${PORT}`, headers: { 'X-Spike-Probe': 'N1-v4' } });
    const fam4 = (await logFor('N1-v4'))?.family;
    const v6 = await request({ host: '::1', hostHeader: `[::1]:${PORT}`, headers: { 'X-Spike-Probe': 'N1-v6' } });
    const fam6 = (await logFor('N1-v6'))?.family;
    const lookupAll = await dns.lookup('localhost', { all: true });
    const lookupDefault = await dns.lookup('localhost');
    const viaName = await request({ host: 'localhost', hostHeader: `localhost:${PORT}`, headers: { 'X-Spike-Probe': 'N1-name' } });
    const famName = (await logFor('N1-name'))?.family;
    const ok = v4.status === 200 && v6.status === 200 && viaName.status === 200;
    record('N1', ok ? 'pass' : 'fail', {
      summary: `127.0.0.1→${v4.status}(${fam4}), ::1→${v6.status ?? v6.error}(${fam6}), localhost→${viaName.status}(${famName})`,
      ipv4: { status: v4.status, family: fam4 }, ipv6: { status: v6.status, error: v6.error, family: fam6 },
      localhostLookupAll: lookupAll, localhostLookupDefault: lookupDefault, localhostRequestFamily: famName,
    });
  }

  // N2: foreign Host
  {
    const a = await request({ hostHeader: `evil.example:${PORT}` });
    const b = await request({ hostHeader: 'localhost' });
    const ok = a.status === 403 && a.json?.error?.code === 'RELAY_FORBIDDEN_HOST' && b.status === 403;
    record('N2', ok ? 'pass' : 'fail', { summary: `evil.example→${a.status} ${a.json?.error?.code}; Host tanpa port→${b.status}`, foreignHost: a.json, hostWithoutPort: b.json });
  }

  // N3: Origin allowlist runs before token
  {
    const evil = await request({ headers: { Origin: 'https://evil.example' }, auth: false });
    const evilTok = await request({ headers: { Origin: 'https://evil.example' } });
    const ext = await request({ headers: { Origin: 'chrome-extension://abcdefghijklmnopabcdefghijklmnop' } });
    const nul = await request({ headers: { Origin: 'null' } });
    const ok = evil.status === 403 && evil.json?.error?.code === 'RELAY_FORBIDDEN_ORIGIN' && evilTok.status === 403 && ext.status === 200 && nul.status === 200 &&
      ext.headers['access-control-allow-origin'] === 'chrome-extension://abcdefghijklmnopabcdefghijklmnop' && nul.headers['access-control-allow-origin'] === 'null';
    record('N3', ok ? 'pass' : 'fail', {
      summary: `situs tanpa token→${evil.status} ${evil.json?.error?.code}; situs+token→${evilTok.status}; extension→${ext.status}; null→${nul.status}`,
      acaoExtension: ext.headers['access-control-allow-origin'], acaoNull: nul.headers['access-control-allow-origin'], evilHasAcao: 'access-control-allow-origin' in evil.headers,
    });
  }

  // N4: token checks
  {
    const none = await request({ auth: false });
    const wrongSame = await request({ auth: false, headers: { Authorization: `Bearer ${'0'.repeat(TOKEN.length)}` } });
    const wrongShort = await request({ auth: false, headers: { Authorization: 'Bearer x' } });
    const notBearer = await request({ auth: false, headers: { Authorization: TOKEN } });
    const ok = [none, wrongSame, wrongShort, notBearer].every((r) => r.status === 401 && r.json?.error?.code === 'RELAY_UNAUTHORIZED');
    record('N4', ok ? 'pass' : 'fail', {
      summary: `tanpa token/salah/pendek/bukan Bearer → ${[none, wrongSame, wrongShort, notBearer].map((r) => r.status).join('/')}`,
      constantTime: 'sha256 kedua sisi lalu crypto.timingSafeEqual (panjang selalu sama); diverifikasi dari kode, bukan dari pengukuran waktu',
    });
  }

  // N5: preflight
  {
    const pre = (origin, extra = {}) => request({ method: 'OPTIONS', path: '/v1/capture', auth: false, headers: { Origin: origin, 'Access-Control-Request-Method': 'PUT', 'Access-Control-Request-Headers': 'authorization,content-type,x-ctf-capture-id', ...extra } });
    const ok1 = await pre('null');
    const evil = await pre('https://evil.example');
    const pna = await pre('null', { 'Access-Control-Request-Private-Network': 'true' });
    const h = ok1.headers;
    const expect = {
      status204: ok1.status === 204,
      emptyBody: ok1.size === 0,
      acao: h['access-control-allow-origin'] === 'null',
      vary: h.vary === 'Origin',
      methods: h['access-control-allow-methods'] === 'GET, PUT, POST, OPTIONS',
      allowHeaders: h['access-control-allow-headers'] === 'Authorization, Content-Type, X-CTF-Capture-Id, X-CTF-Format-Version, X-CTF-Captured-At, X-CTF-Title',
      exposeHeaders: h['access-control-expose-headers'] === 'X-CTF-Capture-Id',
      evil403: evil.status === 403,
      pnaReply: pna.headers['access-control-allow-private-network'] === 'true',
      noPnaWithoutRequest: !('access-control-allow-private-network' in h),
    };
    const ok = Object.values(expect).every(Boolean);
    record('N5', ok ? 'pass' : 'fail', { summary: `OPTIONS null→${ok1.status}; situs→${evil.status}; PNA reply=${pna.headers['access-control-allow-private-network']}`, checks: expect, headers: h });
  }

  // N6: 1 KB round trip + pending + title + ack + lastImport
  {
    const id = crypto.randomUUID();
    const title = 'Halaman uji SP-01 — ünïcödé';
    const bodyBuf = Buffer.from(JSON.stringify({ format: 'codetoframe', formatVersion: '3.0', pad: 'x'.repeat(980) }));
    const put = await request({ method: 'PUT', path: '/v1/capture', headers: captureHeaders(id, { 'X-CTF-Title': encodeURIComponent(title), 'Content-Length': bodyBuf.length }), body: bodyBuf });
    const status = await request({});
    const pending = await request({ path: '/v1/pending' });
    const pendingKnown = await request({ path: `/v1/pending?known=${id}` });
    const get = await request({ path: `/v1/capture/${id}` });
    const ack = await request({ method: 'POST', path: `/v1/capture/${id}/ack`, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ outcome: 'imported', nodesCreated: 1, fontSubstitutions: 0, placeholders: 0, warningCounts: { VAL_UNKNOWN_FIELD: 2 }, durationMs: 5 }) });
    const after = await request({});
    const get404 = await request({ path: `/v1/capture/${id}` });
    const sameBytes = get.sha256 === crypto.createHash('sha256').update(bodyBuf).digest('hex');
    const checks = {
      put200: put.status === 200 && put.json?.captureId === id,
      statusSlot: status.json?.slot?.captureId === id && !('title' in (status.json?.slot || {})),
      statusNoTitle: !JSON.stringify(status.json).includes('SP-01'),
      pendingTitle: pending.json?.pending?.title === title,
      pendingKnownOmitted: pendingKnown.status === 200 && !('pending' in pendingKnown.json),
      pluginConnected: after.json?.pluginConnected === true,
      getSameBytes: get.status === 200 && sameBytes && get.headers['x-ctf-capture-id'] === id,
      ack200: ack.json?.slotCleared === true,
      lastImport: after.json?.lastImport?.captureId === id && after.json?.lastImport?.warningCount === 2 && !after.json?.slot,
      get404AfterAck: get404.status === 404,
    };
    record('N6', Object.values(checks).every(Boolean) ? 'pass' : 'fail', { summary: `PUT ${put.status}, GET ${get.status} (byte sama: ${sameBytes}), ack ${ack.status}, lastImport ${!!after.json?.lastImport}`, checks, putMs: put.ms, getMs: get.ms });
  }

  // N7: large payloads, streaming upload, RSS
  {
    const rows = [];
    for (const mb of [1, 10, 50, 100]) {
      const bytes = mb * MiB;
      const id = crypto.randomUUID();
      const before = await metrics();
      const { stream, digest } = randomBody(bytes);
      const put = await request({ method: 'PUT', path: '/v1/capture', headers: captureHeaders(id, { 'Content-Length': bytes }), body: stream });
      const sent = digest();
      const mid = await metrics();
      const get = await request({ path: `/v1/capture/${id}` });
      const ack = await request({ method: 'POST', path: `/v1/capture/${id}/ack`, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ outcome: 'imported', nodesCreated: 0, fontSubstitutions: 0, placeholders: 0, warningCounts: {}, durationMs: 0 }) });
      if (global.gc) global.gc();
      const after = await metrics();
      rows.push({
        mb, putStatus: put.status, putMs: Math.round(put.ms), getStatus: get.status, getMs: Math.round(get.ms), sameBytes: get.sha256 === sent && get.size === bytes, ackStatus: ack.status,
        rssBeforeMB: +(before.rss / MiB).toFixed(1), rssWithSlotMB: +(mid.rss / MiB).toFixed(1), rssAfterAckMB: +(after.rss / MiB).toFixed(1),
      });
    }
    const ok = rows.every((r) => r.putStatus === 200 && r.getStatus === 200 && r.sameBytes && r.ackStatus === 200);
    record('N7', ok ? 'pass' : 'fail', { summary: rows.map((r) => `${r.mb}MB put ${r.putMs}ms/get ${r.getMs}ms rss ${r.rssWithSlotMB}MB`).join('; '), rows });
  }

  // N8: > 128 MiB rejected, relay survives
  {
    const limit = 128 * MiB;
    const declared = await request({ method: 'PUT', path: '/v1/capture', headers: captureHeaders(crypto.randomUUID(), { 'Content-Length': limit + 1 }), body: randomBody(limit + 1).stream });
    const chunked = await request({ method: 'PUT', path: '/v1/capture', headers: captureHeaders(crypto.randomUUID(), { 'Transfer-Encoding': 'chunked' }), body: randomBody(limit + 4 * MiB).stream });
    const alive = await request({});
    const m = await metrics();
    const ok = (declared.status === 413 || declared.error) && (chunked.status === 413 || chunked.error) && alive.status === 200 && exited === null;
    record('N8', ok ? 'pass' : 'fail', {
      summary: `Content-Length>batas → ${declared.status ?? declared.error}; chunked>batas → ${chunked.status ?? chunked.error}; relay hidup: ${alive.status === 200}`,
      declared: { status: declared.status, error: declared.error, body: declared.json }, chunked: { status: chunked.status, error: chunked.error, body: chunked.json },
      rssAfterMB: +(m.rss / MiB).toFixed(1), slotAfter: alive.json?.slot ?? null,
    });
  }

  // N9: maxHeaderSize and worst-case X-CTF-Title
  {
    const emoji = ['😀', '🎨', '🚀', '🧩'];
    const cjk = ['漢', '字', '日', '本'];
    // 120 code points, half emoji (4 UTF-8 bytes → 12 chars encoded), half CJK (3 bytes → 9 chars)
    const cps = Array.from({ length: 120 }, (_, i) => (i % 2 ? cjk[i % 4] : emoji[i % 4]));
    const title = cps.join('');
    const enc = encodeURIComponent(title);
    const id = crypto.randomUUID();
    const put = await request({ method: 'PUT', path: '/v1/capture', headers: captureHeaders(id, { 'X-CTF-Title': enc, 'Content-Length': 2 }), body: '{}' });
    const pending = await request({ path: '/v1/pending' });
    const allEmoji = encodeURIComponent('😀'.repeat(120));
    const id2 = crypto.randomUUID();
    const putEmoji = await request({ method: 'PUT', path: '/v1/capture', headers: captureHeaders(id2, { 'X-CTF-Title': allEmoji, 'Content-Length': 2 }), body: '{}' });
    const huge = 'a'.repeat(http.maxHeaderSize + 1024);
    const big = await request({ method: 'PUT', path: '/v1/capture', headers: captureHeaders(crypto.randomUUID(), { 'X-CTF-Title': huge, 'Content-Length': 2 }), body: '{}' });
    const alive = await request({});
    const ok = put.status === 200 && pending.json?.pending?.title === title && putEmoji.status === 200 && (big.status === 431 || big.error) && alive.status === 200;
    record('N9', ok ? 'pass' : 'fail', {
      summary: `maxHeaderSize=${http.maxHeaderSize}; judul 120 cp campuran (${enc.length} char) → ${put.status}; 120 emoji (${allEmoji.length} char) → ${putEmoji.status}; header ${huge.length} char → ${big.status ?? big.error}`,
      maxHeaderSize: http.maxHeaderSize, titleCodePoints: cps.length, titleUtf16Length: title.length, encodedLength: enc.length, mixedStatus: put.status, titleRoundTrip: pending.json?.pending?.title === title,
      allEmojiEncodedLength: allEmoji.length, allEmojiStatus: putEmoji.status, oversizedHeaderLength: huge.length, oversizedResult: big.status ?? big.error, relayAliveAfter: alive.status === 200,
    });
  }

  // NP: spike payload generator used by plugin P4 (exact size, valid JSON, CORS for null origin)
  {
    const rows = [];
    for (const n of [1024, 10 * MiB]) {
      const t0 = performance.now();
      const r = await fetch(`http://127.0.0.1:${PORT}/spike/payload?bytes=${n}`, { headers: { Authorization: `Bearer ${TOKEN}`, Origin: 'null' } });
      const text = await r.text();
      let parsed = false;
      try { parsed = JSON.parse(text).format === 'codetoframe'; } catch { /* invalid */ }
      rows.push({ bytes: n, status: r.status, received: Buffer.byteLength(text), exact: Buffer.byteLength(text) === n, parsed, acao: r.headers.get('access-control-allow-origin'), ms: Math.round(performance.now() - t0) });
    }
    const ok = rows.every((r) => r.status === 200 && r.exact && r.parsed && r.acao === 'null');
    record('NP', ok ? 'pass' : 'fail', { summary: rows.map((r) => `${r.bytes}B → ${r.status}, ukuran tepat ${r.exact}, JSON ${r.parsed}`).join('; '), rows });
  }

  // Disk check: relay must not write captures anywhere in the spike folder
  {
    const after = snapshotFiles(ROOT);
    const added = [...after.keys()].filter((k) => !filesBefore.has(k));
    const changed = [...after.keys()].filter((k) => filesBefore.has(k) && filesBefore.get(k) !== after.get(k));
    const reportsDir = path.join(RESULTS, 'node-test-reports');
    const reportFiles = fs.existsSync(reportsDir) ? fs.readdirSync(reportsDir) : [];
    record('DISK', added.length === 0 && changed.length === 0 && reportFiles.length === 0 ? 'pass' : 'fail', {
      summary: `file baru: ${added.length}, berubah: ${changed.length} (di luar results/)`, added, changed, spikeReportFilesDuringNodeTests: reportFiles,
    });
  }
} finally {
  report.relayAlive = exited === null;
  report.relayLogSample = relayLog.slice(0, 12);
  report.relayLogFamilies = relayLog.reduce((acc, l) => { if (l.family) acc[l.family] = (acc[l.family] || 0) + 1; return acc; }, {});
  report.relayLogContainsToken = relayLog.some((l) => JSON.stringify(l).includes(TOKEN));
  child.kill();
  fs.writeFileSync(path.join(RESULTS, 'node-report.json'), JSON.stringify(report, null, 2));
  const fails = report.tests.filter((t) => t.status !== 'pass').length;
  console.log(`\n${report.tests.length - fails}/${report.tests.length} lulus. Token di log relay: ${report.relayLogContainsToken}. Laporan: results/node-report.json`);
}
