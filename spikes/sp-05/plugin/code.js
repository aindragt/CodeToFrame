// SP-05 spike: is Inter available as fallback, and what are its style names?
// Throwaway code. No network. Results are shown in the UI as JSON to copy.

figma.showUI(__html__, { width: 520, height: 640, themeColors: true });

const WEIGHT_GUESSES = {
  100: ['Thin'], 200: ['Extra Light', 'ExtraLight'], 300: ['Light'], 400: ['Regular'],
  500: ['Medium'], 600: ['Semi Bold', 'SemiBold'], 700: ['Bold'], 800: ['Extra Bold', 'ExtraBold'], 900: ['Black'],
};
// Families a web page commonly asks for; tells us what the manual map must cover.
const PROBE_FAMILIES = ['Inter', 'Roboto', 'Arial', 'Helvetica', 'Helvetica Neue', 'Segoe UI', 'Times New Roman', 'Georgia', 'Courier New', 'Consolas', 'Menlo', 'SF Pro Text', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Noto Sans', 'Roboto Mono', 'Source Code Pro', 'Merriweather'];

const errStr = (e) => (e && e.message ? e.message : String(e));

async function run() {
  const r = { kind: 'sp05', at: new Date().toISOString(), apiVersion: figma.apiVersion, editorType: figma.editorType };

  // T1: listAvailableFontsAsync
  let t0 = Date.now();
  const fonts = await figma.listAvailableFontsAsync();
  r.T1 = { ms: Date.now() - t0, totalFonts: fonts.length, families: new Set(fonts.map((f) => f.fontName.family)).size };

  // T2: Inter styles as reported by Figma
  const inter = fonts.filter((f) => f.fontName.family === 'Inter').map((f) => f.fontName.style);
  r.T2 = { interStyles: inter, count: inter.length, otherInterFamilies: [...new Set(fonts.map((f) => f.fontName.family).filter((n) => /inter/i.test(n) && n !== 'Inter'))] };

  // T3: load every Inter style
  r.T3 = [];
  for (const style of inter) {
    t0 = Date.now();
    try { await figma.loadFontAsync({ family: 'Inter', style }); r.T3.push({ style, ok: true, ms: Date.now() - t0 }); }
    catch (e) { r.T3.push({ style, ok: false, ms: Date.now() - t0, error: errStr(e) }); }
  }

  // T4: CSS weight 100–900 (normal + italic) → which style name works
  r.T4 = {};
  for (const [w, names] of Object.entries(WEIGHT_GUESSES)) {
    for (const italic of [false, true]) {
      const tried = [];
      for (const n of names) {
        const style = italic ? (n === 'Regular' ? 'Italic' : n + ' Italic') : n;
        try { await figma.loadFontAsync({ family: 'Inter', style }); tried.push({ style, ok: true }); }
        catch (e) { tried.push({ style, ok: false, error: errStr(e).slice(0, 120) }); }
      }
      r.T4[w + (italic ? 'i' : '')] = tried;
    }
  }

  // T5: other families commonly requested by web pages
  const byFamily = new Map();
  for (const f of fonts) { const a = byFamily.get(f.fontName.family) || []; a.push(f.fontName.style); byFamily.set(f.fontName.family, a); }
  r.T5 = PROBE_FAMILIES.map((fam) => ({ family: fam, available: byFamily.has(fam), styles: (byFamily.get(fam) || []).slice(0, 20) }));

  // T6: a family that does not exist
  try { await figma.loadFontAsync({ family: 'CodeToFrame Nonexistent', style: 'Regular' }); r.T6 = { ok: true }; }
  catch (e) { r.T6 = { ok: false, error: errStr(e) }; }

  // T7: render Inter 100–900 on canvas (visual check incl. K1-01 Inter 600)
  try {
    const frame = figma.createFrame();
    frame.name = 'SP-05 Inter weights';
    frame.layoutMode = 'VERTICAL'; frame.itemSpacing = 8; frame.paddingLeft = frame.paddingTop = frame.paddingRight = frame.paddingBottom = 16;
    frame.primaryAxisSizingMode = 'AUTO'; frame.counterAxisSizingMode = 'AUTO';
    const made = [];
    for (const [w, tried] of Object.entries(r.T4)) {
      const ok = tried.find((t) => t.ok);
      if (!ok) continue;
      const t = figma.createText();
      t.fontName = { family: 'Inter', style: ok.style };
      t.characters = `${w} → Inter ${ok.style}: Klik 0123`;
      t.fontSize = 16;
      frame.appendChild(t);
      made.push(w);
    }
    figma.currentPage.appendChild(frame);
    figma.viewport.scrollAndZoomIntoView([frame]);
    r.T7 = { ok: true, rendered: made.length, missingFontAfterRender: frame.findAll((n) => n.type === 'TEXT' && n.hasMissingFont).length };
  } catch (e) { r.T7 = { ok: false, error: errStr(e) }; }

  return r;
}

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'run') {
    try { figma.ui.postMessage({ type: 'result', report: await run() }); }
    catch (e) { figma.ui.postMessage({ type: 'result', report: { fatal: errStr(e) } }); }
  }
};
