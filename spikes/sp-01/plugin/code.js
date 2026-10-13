// SP-01 spike plugin, main thread. Throwaway code.
// Responsibilities: show UI, keep the pairing token in figma.clientStorage,
// answer probes from the UI (env, storage, main-thread fetch, hide/show for L4).

figma.showUI(__html__, { width: 560, height: 760, themeColors: true });

const TOKEN_KEY = 'ctf-spike-token';
const PROBE_KEY = 'ctf-spike-probe';

function errStr(e) {
  return e && (e.name ? e.name + ': ' : '') + (e && e.message ? e.message : String(e));
}

figma.ui.onmessage = async (msg) => {
  const reply = (data) => figma.ui.postMessage(Object.assign({ reqId: msg.reqId }, data));
  try {
    switch (msg.type) {
      case 'env': {
        let pluginId = null;
        try { pluginId = figma.pluginId === undefined ? '(undefined)' : figma.pluginId; } catch (e) { pluginId = 'error: ' + errStr(e); }
        reply({
          editorType: figma.editorType,
          apiVersion: figma.apiVersion,
          pluginId,
          mainHasFetch: typeof fetch,
          mainHasSetTimeout: typeof setTimeout,
        });
        break;
      }
      case 'token:get':
        reply({ token: (await figma.clientStorage.getAsync(TOKEN_KEY)) || null });
        break;
      case 'token:set':
        await figma.clientStorage.setAsync(TOKEN_KEY, msg.token);
        reply({ ok: true });
        break;
      case 'token:probe': {
        const value = 'probe-' + Math.random().toString(36).slice(2);
        await figma.clientStorage.setAsync(PROBE_KEY, value);
        const back = await figma.clientStorage.getAsync(PROBE_KEY);
        await figma.clientStorage.deleteAsync(PROBE_KEY);
        const keys = await figma.clientStorage.keysAsync();
        reply({ roundTripOk: back === value, keys });
        break;
      }
      case 'main-fetch': {
        if (typeof fetch !== 'function') { reply({ error: 'fetch is not available in the main thread (typeof ' + typeof fetch + ')' }); break; }
        const t0 = Date.now();
        try {
          const r = await fetch(msg.url, { method: 'GET', headers: msg.headers || {} });
          const text = await r.text();
          reply({ status: r.status, ok: r.ok, body: text.slice(0, 600), ms: Date.now() - t0 });
        } catch (e) {
          reply({ error: errStr(e), ms: Date.now() - t0 });
        }
        break;
      }
      case 'hide': {
        if (typeof setTimeout !== 'function') { reply({ error: 'setTimeout unavailable in main thread; L4 cannot auto-restore' }); break; }
        reply({ ok: true });
        figma.ui.hide();
        setTimeout(() => { figma.ui.show(); figma.ui.postMessage({ type: 'shown' }); }, msg.ms || 20000);
        break;
      }
      case 'notify':
        figma.notify(String(msg.text).slice(0, 200));
        reply({ ok: true });
        break;
      case 'close':
        figma.closePlugin();
        break;
      default:
        reply({ error: 'unknown message ' + msg.type });
    }
  } catch (e) {
    reply({ error: errStr(e) });
  }
};
