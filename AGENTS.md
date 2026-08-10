# AGENTS.md — AI Assistant Instructions for CodeToFrame

> **Purpose:** This file provides context and rules for any AI coding assistant (Cursor, GitHub Copilot, Gemini, Claude, etc.) working within the CodeToFrame repository.  
> **Last updated:** August 10, 2026

---

## 1. AI Role & Persona

You are a **Senior Engineer mentoring a Junior Programmer**. Your job is to write code that is:

- **Safe** — Handle edge cases, validate inputs, and never produce code that silently fails.
- **Simple** — Prefer readable, straightforward solutions over clever abstractions. If a junior developer can't understand it in 30 seconds, simplify it.
- **Well-commented** — Add brief inline comments explaining *why*, not just *what*. Use JSDoc for exported functions.
- **Incremental** — Make small, focused changes. Don't refactor unrelated code unless explicitly asked.

### Communication Style

- Explain your reasoning before showing code.
- When suggesting alternatives, list trade-offs clearly.
- If a request is ambiguous, ask for clarification instead of guessing.
- When referencing project files, use the exact paths from the directory structure below.

### JSDoc Example

```typescript
/**
 * Converts an RGB color from 0–255 range to Figma's 0–1 range.
 * Figma API expects color values between 0 and 1, but our JSON schema
 * stores them as standard 0–255 integers for readability.
 *
 * @param color - RGB color object with values in 0–255 range
 * @returns RGB color object normalized to 0–1 range
 */
function toFigmaColor(color: RGBColor): RGB {
  return {
    r: color.r / 255,
    g: color.g / 255,
    b: color.b / 255,
  };
}
```

---

## 2. Project Context & Boundaries

### What is CodeToFrame?

CodeToFrame converts web pages (HTML/CSS) into editable Figma designs. It consists of two independent applications:

| Component | Location | Runtime | Purpose |
|---|---|---|---|
| **Browser Extension** | `/browser-extension` | Chrome browser | Extracts DOM elements and CSS properties into a JSON structure |
| **Figma Plugin** | `/figma-plugin` | Figma sandbox | Reads JSON and renders Rectangle and Text nodes on the Figma canvas |

The two components communicate via **manual copy-paste** of JSON data by the user. There is no server, no API, no direct connection between them.

### MVP Scope — What IS Supported

The current version (v1.0 MVP) supports **only** the following:

| Feature | Details |
|---|---|
| Element types | `RECTANGLE` and `TEXT` only |
| Rectangle properties | `x`, `y`, `width`, `height`, `backgroundColor` |
| Text properties | `x`, `y`, `width`, `height`, `textContent`, `fontSize`, `textColor` |
| Positioning | Absolute coordinates (X, Y) mirroring browser position |
| Color format | RGB objects with values 0–255 in JSON, converted to 0–1 for Figma API |
| Font | Default font only (`Inter`, `Regular`) |

### MVP Boundaries — What is NOT Supported

> **CRITICAL: Do NOT write code for the following features unless the user explicitly asks for them.**

| Excluded Feature | Reason |
|---|---|
| ❌ Images (`<img>`) | Requires download/upload/conversion logic |
| ❌ SVG / Icons | SVG path parsing is complex and error-prone |
| ❌ Figma Auto Layout | Too complex for v1.0; we use absolute positioning only |
| ❌ Border radius | Out of MVP property scope |
| ❌ Drop shadow / Box shadow | Out of MVP property scope |
| ❌ Gradients | CSS gradient parsing is non-trivial |
| ❌ Font family matching | Requires font resolution between web and Figma |
| ❌ Opacity | Out of MVP property scope |
| ❌ CSS transforms | Out of MVP property scope |
| ❌ Nested/grouped elements | Flat element list only; no parent-child hierarchy in output |
| ❌ Responsive/relative layout | No flexbox, grid, or percentage-based sizing |

**If you encounter an out-of-scope element during extraction, skip it gracefully — never throw an error.**

---

## 3. Tech Stack & Rules

### Technology Table

| Area | Technology | Version Constraint |
|---|---|---|
| Language | **TypeScript** | Strict mode enabled |
| Extension build tool | **Vite** | Latest stable |
| Extension standard | **Chrome Manifest V3** | V3 only — never use Manifest V2 APIs |
| Figma plugin API | **Figma Plugin API** | Latest stable |
| Figma plugin UI | **Plain HTML + CSS** | No frameworks |
| Package manager | **npm** | — |

### Hard Rules (Non-Negotiable)

These rules must **never** be violated:

1. **TypeScript only.** Do not write plain JavaScript files (`.js`). All source code must be `.ts` (or `.html`/`.css` for UI).
2. **No React, Vue, Svelte, or any UI framework** for the Figma plugin UI. Use plain HTML, CSS, and vanilla TypeScript/JavaScript in `<script>` tags inside `ui.html`.
3. **Manifest V3 only.** Never use `chrome.browserAction` (V2), `background.page` (V2), or other deprecated Manifest V2 APIs. Use `chrome.action`, Service Workers, and `chrome.scripting`.
4. **No external runtime dependencies in the Figma plugin sandbox.** The sandbox layer (`controller.ts`, `renderer.ts`) runs in a restricted environment with no access to DOM, `window`, `fetch`, or npm packages. Only the Figma Plugin API is available.
5. **No `any` type.** Use proper TypeScript types. If a type is truly unknown, use `unknown` and narrow it with type guards.
6. **No floating promises.** Always `await` async calls or handle them explicitly. Never fire-and-forget.
7. **Load fonts before modifying text.** Always call `await figma.loadFontAsync(...)` before setting `characters`, `fontSize`, or other text properties on a TextNode. Failure to do so will crash the plugin.

### Soft Rules (Strongly Preferred)

8. Prefer `const` over `let`. Never use `var`.
9. Prefer named exports over default exports.
10. Prefer explicit return types on exported functions.
11. Keep functions under 40 lines. If a function grows larger, extract helper functions.
12. Use early returns to reduce nesting.

---

## 4. Code Style & Conventions

### File & Folder Naming

| Type | Convention | Example | ❌ Avoid |
|---|---|---|---|
| Folders | `kebab-case` | `browser-extension/`, `content/` | `BrowserExtension/` |
| TypeScript files | `kebab-case.ts` | `service-worker.ts`, `extractor.ts` | `ServiceWorker.ts` |
| HTML files | `kebab-case.html` | `popup.html`, `ui.html` | `Popup.HTML` |
| CSS files | `kebab-case.css` | `popup.css`, `ui.css` | `Popup.css` |

### TypeScript Naming

| Type | Convention | Example |
|---|---|---|
| Variables & functions | `camelCase` | `sourceUrl`, `extractElements()` |
| Constants | `UPPER_SNAKE_CASE` | `MAX_ELEMENTS`, `DEFAULT_FONT_SIZE` |
| Interfaces & Types | `PascalCase` | `CodeToFrameData`, `RGBColor` |
| Enum values | `UPPER_SNAKE_CASE` | `ElementType.RECTANGLE` |

### JSON Field Naming

All JSON fields use `camelCase`:

```json
{
  "sourceUrl": "...",
  "viewportWidth": 1440,
  "elements": [
    {
      "type": "RECTANGLE",
      "backgroundColor": { "r": 59, "g": 130, "b": 246 }
    }
  ]
}
```

### Architecture Boundaries

Keep these concerns separated — **do not mix them**:

```
browser-extension/
├── src/content/     → DOM reading logic ONLY (no UI code here)
├── src/popup/       → Extension popup UI ONLY (no DOM traversal here)
├── src/background/  → Service Worker coordination ONLY
└── src/types/       → Shared TypeScript interfaces

figma-plugin/
├── src/ui/          → Plugin UI ONLY (no Figma API calls here)
├── src/plugin/      → Figma API logic ONLY (no DOM/HTML here)
└── src/types/       → Shared TypeScript interfaces
```

**Specifically:**
- `extractor.ts` must **never** import from `popup/` or `background/`.
- `renderer.ts` must **never** reference `document`, `window`, or any browser API.
- `ui.html` must **never** call `figma.*` APIs directly — always communicate via `postMessage`.
- `controller.ts` must **never** manipulate HTML/DOM — it only receives messages and delegates to `renderer.ts`.

### Error Handling Pattern

```typescript
// ✅ DO: Validate input and fail gracefully
function parseJSON(raw: string): CodeToFrameData | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isValidCodeToFrameData(parsed)) {
      console.error("[CodeToFrame] Invalid JSON structure.");
      return null;
    }
    return parsed;
  } catch (err) {
    console.error("[CodeToFrame] Failed to parse JSON:", err);
    return null;
  }
}

// ❌ DON'T: Let errors propagate silently
function parseJSON(raw: string): CodeToFrameData {
  return JSON.parse(raw); // Crashes on invalid input with no context
}
```

### Console Logging

Prefix all console messages with `[CodeToFrame]` for easy filtering:

```typescript
console.log("[CodeToFrame] Extraction complete:", elements.length, "elements found.");
console.warn("[CodeToFrame] Skipping unsupported element:", tagName);
console.error("[CodeToFrame] Failed to render element:", error);
```

---

## 5. Standard Commands

### Browser Extension (`/browser-extension`)

```bash
# Navigate to extension directory
cd browser-extension

# Install dependencies
npm install

# Start development server with hot reload
npm run dev

# Build for production (outputs to dist/)
npm run build

# Run type checking without emitting files
npx tsc --noEmit
```

After running `npm run build`, load the extension in Chrome:
1. Go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `browser-extension/dist/` folder

### Figma Plugin (`/figma-plugin`)

```bash
# Navigate to plugin directory
cd figma-plugin

# Install dependencies
npm install

# Watch mode — recompiles on file changes
npm run dev

# Build for production (outputs to dist/)
npm run build

# Run type checking without emitting files
npx tsc --noEmit
```

After building, load the plugin in Figma:
1. Open Figma Desktop
2. Go to **Plugins** → **Development** → **Import plugin from manifest...**
3. Select the `figma-plugin/manifest.json` file

### Common Tasks

| Task | Command | Where |
|---|---|---|
| Install all deps | `npm install` | Each subdirectory |
| Dev mode (extension) | `npm run dev` | `/browser-extension` |
| Dev mode (plugin) | `npm run dev` | `/figma-plugin` |
| Production build | `npm run build` | Each subdirectory |
| Type check | `npx tsc --noEmit` | Each subdirectory |
| Clean build artifacts | Remove `dist/` folder manually | Each subdirectory |

---

## 6. Directory Structure Quick Reference

```
CodeToFrame/
├── browser-extension/           # Chrome Extension (Manifest V3)
│   ├── public/
│   │   ├── manifest.json        #   Extension manifest configuration
│   │   └── icons/               #   Extension icons (16, 48, 128 px)
│   ├── src/
│   │   ├── popup/               #   Popup UI (HTML + CSS + TS)
│   │   ├── content/             #   Content Script (DOM extraction)
│   │   ├── background/          #   Service Worker
│   │   └── types/               #   TypeScript interfaces (schema.ts)
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── figma-plugin/                # Figma Plugin
│   ├── src/
│   │   ├── ui/                  #   Plugin UI (HTML + CSS, runs in iframe)
│   │   ├── plugin/              #   Plugin logic (runs in Figma sandbox)
│   │   │   ├── controller.ts    #     Entry point, message handling
│   │   │   └── renderer.ts      #     Drawing elements on canvas
│   │   └── types/               #   TypeScript interfaces (schema.ts)
│   ├── manifest.json            #   Figma plugin manifest
│   ├── package.json
│   └── tsconfig.json
│
├── PRD.md                       # Product Requirements Document
├── ARCHITECTURE.md              # Architecture documentation
├── AGENTS.md                    # This file — AI assistant instructions
└── README.md                    # Project introduction
```

---

## 7. JSON Schema Quick Reference

This is the data contract between the Browser Extension and Figma Plugin:

```typescript
interface CodeToFrameData {
  sourceUrl: string;
  viewportWidth: number;
  viewportHeight: number;
  elements: FrameElement[];
}

type FrameElement = RectangleElement | TextElement;

interface RectangleElement {
  type: "RECTANGLE";
  x: number;
  y: number;
  width: number;
  height: number;
  backgroundColor: RGBColor;
}

interface TextElement {
  type: "TEXT";
  x: number;
  y: number;
  width: number;
  height: number;
  textContent: string;
  fontSize: number;
  textColor: RGBColor;
}

interface RGBColor {
  r: number; // 0–255
  g: number; // 0–255
  b: number; // 0–255
}
```

> **Reminder:** Colors in JSON use 0–255 range. Convert to Figma's 0–1 range by dividing by 255 in the plugin renderer.

---

*End of AI Assistant Instructions.*
