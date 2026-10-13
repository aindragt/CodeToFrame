// SP-01 spike popup. Throwaway code. Only UI; all relay traffic goes through the service worker.
const $ = (id) => document.getElementById(id);

chrome.storage.local.get('token').then(({ token = '' }) => { $('token').value = token; });
$('save').onclick = async () => {
  await chrome.storage.local.set({ token: $('token').value.trim() });
  $('saved').textContent = 'tersimpan';
  refresh();
};

async function refresh() {
  const r = await chrome.runtime.sendMessage({ type: 'status' });
  if (r.error) { $('status').textContent = 'Relay tidak menjawab: ' + r.error; return; }
  if (r.status === 401) { $('status').textContent = '401: token tidak cocok'; return; }
  const j = r.json || {};
  const lines = [
    `HTTP ${r.status} (${r.ms} ms)`,
    `pluginConnected: ${j.pluginConnected}` + (j.pluginLastSeenMsAgo !== undefined ? ` (terakhir ${j.pluginLastSeenMsAgo} ms lalu)` : ''),
    `slot: ${j.slot ? `${j.slot.captureId.slice(0, 8)}… ${(j.slot.sizeBytes / 1048576).toFixed(2)} MB` : '(kosong)'}`,
    `lastImport: ${j.lastImport ? `${j.lastImport.outcome}, ${j.lastImport.nodesCreated} node, ${j.lastImport.at}` : '-'}`,
    `waktu popup: ${new Date().toLocaleTimeString()}`,
  ];
  $('status').textContent = lines.join('\n');
}
$('refresh').onclick = refresh;
refresh();
setInterval(() => { if ($('auto').checked) refresh(); }, 1000);

$('run').onclick = async () => {
  const sizes = [...document.querySelectorAll('.size:checked')].map((c) => Number(c.value));
  await chrome.runtime.sendMessage({ type: 'run-tests', sizes });
};
$('send').onclick = async () => {
  const r = await chrome.runtime.sendMessage({ type: 'send-capture', mb: Number($('mb').value) });
  $('progress').textContent = `Send capture: ${r.status || r.error} dalam ${r.ms} ms`;
};

function showProgress(p) { if (p) $('progress').textContent = `${p.text} (${new Date(p.at).toLocaleTimeString()}, sw ${p.sw})`; }
chrome.storage.session.get('progress').then(({ progress }) => showProgress(progress));
chrome.storage.onChanged.addListener((changes, area) => { if (area === 'session' && changes.progress) showProgress(changes.progress.newValue); });
