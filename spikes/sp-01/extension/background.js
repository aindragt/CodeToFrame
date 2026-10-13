// SP-01 spike service worker. Throwaway code.
// Runs E1/E2 against the relay and handles "Send capture" for X1/X2.

const RELAY = 'http://localhost:47821';
const MiB = 1024 * 1024;
const SW_INSTANCE = Math.random().toString(36).slice(2, 8);
const SW_STARTED = new Date().toISOString();

const errStr = (e) => (e && e.name ? e.name + ': ' : '') + (e && e.message ? e.message : String(e));

// If a previous worker instance died mid-upload, the marker is still here.
const startup = chrome.storage.local.get(['inflight', 'terminated']).then(async ({ inflight, terminated = [] }) => {
  if (inflight) {
    terminated.push({ ...inflight, detectedBy: SW_INSTANCE, detectedAt: SW_STARTED });
    await chrome.storage.local.set({ terminated });
    await chrome.storage.local.remove('inflight');
  }
});

async function token() {
  const { token = '' } = await chrome.storage.local.get('token');
  return token;
}
async function progress(text) {
  await chrome.storage.session.set({ progress: { text, at: new Date().toISOString(), sw: SW_INSTANCE } });
}

async function api(path, { method = 'GET', headers = {}, body } = {}) {
  const t0 = performance.now();
  try {
    const r = await fetch(RELAY + path, { method, headers: { Authorization: 'Bearer ' + (await token()), ...headers }, body });
    const text = await r.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* not json */ }
    return { status: r.status, json, ms: Math.round(performance.now() - t0) };
  } catch (e) {
    return { error: errStr(e), ms: Math.round(performance.now() - t0) };
  }
}

// One 1 MiB base64 block of random bytes, reused as Blob parts (upload over loopback is not compressed).
let blockCache = null;
function randomBlock() {
  if (blockCache) return blockCache;
  const raw = new Uint8Array(768 * 1024);
  for (let i = 0; i < raw.length; i += 65536) crypto.getRandomValues(raw.subarray(i, i + 65536));
  let bin = '';
  for (let i = 0; i < raw.length; i += 8192) bin += String.fromCharCode.apply(null, raw.subarray(i, i + 8192));
  blockCache = btoa(bin); // 1 MiB, length multiple of 4
  return blockCache;
}

// Synthetic envelope-like JSON Blob of exactly `bytes` bytes.
function buildEnvelope(bytes, captureId, title) {
  const meta = { captureId, url: 'http://synthetic.invalid/', title, capturedAt: new Date().toISOString(), viewport: { width: 1280, height: 720 }, page: { width: 1280, height: 720 }, devicePixelRatio: 1, extensionVersion: 'spike', root: { scope: 'document', tag: 'html' } };
  const head = `{"format":"codetoframe","formatVersion":"3.0","meta":${JSON.stringify(meta)},"rootId":"n0","nodes":[{"id":"n0","kind":"element","tag":"html","rect":{"x":0,"y":0,"w":1280,"h":720}}],"assets":[{"id":"a0","status":"ok","mime":"image/png","width":1,"height":1,"byteLength":1,"data":"`;
  const tail = '"}],"report":{"spikePadding":"';
  const end = '"}}';
  const enc = new TextEncoder();
  const fixed = enc.encode(head).length + tail.length + end.length;
  let fill = Math.max(0, bytes - fixed);
  const b64 = Math.floor(fill / 4) * 4;
  const pad = fill - b64;
  const block = randomBlock();
  const parts = [head];
  let left = b64;
  while (left > 0) { const n = Math.min(block.length, left); parts.push(n === block.length ? block : block.slice(0, n)); left -= n; }
  parts.push(tail, 'x'.repeat(pad), end);
  return new Blob(parts, { type: 'application/json' });
}

async function putCapture(bytes, title) {
  const id = crypto.randomUUID();
  const blob = buildEnvelope(bytes, id, title);
  await chrome.storage.local.set({ inflight: { bytes, captureId: id, startedAt: new Date().toISOString(), sw: SW_INSTANCE } });
  const t0 = performance.now();
  const r = await api('/v1/capture', {
    method: 'PUT',
    body: blob,
    headers: { 'Content-Type': 'application/json', 'X-CTF-Capture-Id': id, 'X-CTF-Format-Version': '3.0', 'X-CTF-Captured-At': new Date().toISOString(), 'X-CTF-Title': encodeURIComponent(title) },
  });
  await chrome.storage.local.remove('inflight');
  return { bytes, blobSize: blob.size, captureId: id, status: r.status, error: r.error, ms: Math.round(performance.now() - t0), sw: SW_INSTANCE };
}

async function runTests(sizes) {
  await startup;
  const report = { kind: 'extension', generatedAt: null, startedAt: new Date().toISOString(), swInstance: SW_INSTANCE, swStarted: SW_STARTED, userAgent: navigator.userAgent, extensionOrigin: location.origin, tests: {} };
  await progress('E1: GET /v1/status');
  const e1 = await api('/v1/status');
  const echo = await api('/spike/echo');
  report.tests.E1 = { id: 'E1', status: e1.status === 200 ? 'pass' : 'fail', statusResponse: e1, echo: echo.json || echo.error, summary: `status ${e1.status || e1.error}; Origin terlihat relay: ${echo.json ? echo.json.origin : '-'}; Sec-Fetch-Site: ${echo.json ? echo.json.secFetchSite : '-'}` };
  // E1b: the three localhost spellings from the service worker.
  const bases = [];
  for (const b of ['http://localhost:47821', 'http://127.0.0.1:47821', 'http://[::1]:47821']) {
    try {
      const r = await fetch(b + '/spike/echo', { headers: { Authorization: 'Bearer ' + (await token()) } });
      bases.push({ base: b, status: r.status, echo: r.status === 200 ? await r.json() : null });
    } catch (e) { bases.push({ base: b, error: errStr(e) }); }
  }
  report.tests.E1.bases = bases;
  report.tests.E1.summary += ' | ' + bases.map((x) => `${x.base.replace('http://', '')}: ${x.status || x.error}${x.echo ? ' (' + x.echo.family + ')' : ''}`).join(', ');
  const rows = [];
  for (const mb of sizes) {
    await progress(`E2: PUT ${mb} MB…`);
    try { rows.push(await putCapture(Math.round(mb * MiB), `SP-01 E2 ${mb} MB — ünïcödé 漢字 😀`)); } catch (e) { rows.push({ mb, error: errStr(e), sw: SW_INSTANCE }); }
  }
  const { terminated = [] } = await chrome.storage.local.get('terminated');
  const ok = rows.every((r) => r.status === 200);
  report.tests.E2 = { id: 'E2', status: ok ? 'pass' : 'fail', rows, terminatedUploadsFromEarlierRuns: terminated, swSurvived: rows.every((r) => r.sw === SW_INSTANCE), summary: rows.map((r) => `${(r.bytes / MiB).toFixed(r.bytes < MiB ? 3 : 0)}MB ${r.status || r.error} ${r.ms}ms`).join('; ') };
  report.generatedAt = new Date().toISOString();
  await progress('mengirim laporan…');
  const post = await api('/spike/report/extension', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(report, null, 2) });
  report.reportPost = post.status || post.error;
  await chrome.storage.local.set({ lastReport: report });
  await progress(`selesai; laporan ${post.status === 200 ? 'terkirim' : 'GAGAL dikirim (' + (post.status || post.error) + ')'}`);
  return report;
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'status') { api('/v1/status').then(sendResponse); return true; }
  if (msg.type === 'run-tests') { runTests(msg.sizes).catch((e) => progress('error: ' + errStr(e))); sendResponse({ started: true }); return false; }
  if (msg.type === 'send-capture') {
    progress(`Send capture ${msg.mb} MB…`)
      .then(() => putCapture(Math.round(msg.mb * MiB), `SP-01 X ${msg.mb} MB`))
      .then(async (r) => { await progress(`Send capture ${msg.mb} MB: ${r.status || r.error} dalam ${r.ms} ms`); sendResponse(r); });
    return true;
  }
  return false;
});
