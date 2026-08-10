# SKILL.md — AI Workflow Procedures for CodeToFrame

> **Purpose:** Step-by-step procedures for AI assistants to execute common, repetitive tasks in this repository. Each skill is a self-contained checklist — follow every step in order, do not skip.  
> **Audience:** AI coding assistants (Cursor, Copilot, Claude, Gemini, etc.)  
> **Last updated:** August 10, 2026

---

## How to Use This File

When the user requests a task that matches one of the skills below, follow the corresponding procedure **exactly**. Each skill uses this format:

```
IF USER ASKS TO: [description of the task]
THEN EXECUTE THESE STEPS:
  Step 1 → ...
  Step 2 → ...
  ...
VERIFICATION:
  → How to confirm the task was completed correctly
```

**Rules:**
- Execute steps **in order**. Later steps depend on earlier ones.
- If a step references a file that does not exist yet, **create it** following the naming conventions in `AGENTS.md`.
- If a step is unclear for the specific request, **ask the user** before proceeding.
- After completing all steps, run the **Verification** checklist.

---

## Table of Skills

| # | Skill | When to Use |
|---|---|---|
| 1 | [Adding a New Supported CSS Property](#skill-1-adding-a-new-supported-css-property) | User wants to extract and render a new CSS property (e.g., `border-radius`, `opacity`) |
| 2 | [Adding a New HTML Element Type](#skill-2-adding-a-new-html-element-type) | User wants to support a new element type (e.g., `BUTTON`, `IMAGE`, `INPUT`) |
| 3 | [Testing & Building the Project](#skill-3-testing--building-the-project) | User wants to type-check, build, or prepare the project for deployment |

---

## SKILL 1: Adding a New Supported CSS Property

### IF USER ASKS TO:

> "Add support for `<CSS_PROPERTY>`" (e.g., `border-radius`, `opacity`, `box-shadow`, `border`)

### THEN EXECUTE THESE STEPS:

---

#### Step 1 — Update the Shared Type Definitions (The "Contract")

**Files to modify:**
- `browser-extension/src/types/schema.ts`
- `figma-plugin/src/types/schema.ts`

**Action:** Add the new property field to the appropriate element interface(s).

**Checklist:**
- [ ] Determine which element type(s) need this property (`RectangleElement`, `TextElement`, or both).
- [ ] Choose a descriptive `camelCase` field name that matches the CSS property.
- [ ] Add the field as **optional** (`?:`) unless the user explicitly says it should be required.
- [ ] Use the correct TypeScript type (see mapping table below).

**CSS → TypeScript Type Mapping:**

| CSS Value Type | TypeScript Type | Example |
|---|---|---|
| Length (px) | `number` | `borderRadius?: number` |
| Color | `RGBColor` | `borderColor?: RGBColor` |
| Percentage | `number` (0–100) | `opacity?: number` |
| Keyword | `string` literal union | `borderStyle?: "solid" \| "dashed" \| "none"` |
| Shorthand (multiple values) | Dedicated interface | `border?: BorderStyle` (create new interface) |

**Example — Adding `borderRadius`:**

```typescript
// In schema.ts — BOTH browser-extension AND figma-plugin
export interface RectangleElement {
  type: "RECTANGLE";
  x: number;
  y: number;
  width: number;
  height: number;
  backgroundColor: RGBColor;
  borderRadius?: number; // ← NEW: corner radius in pixels (0 = sharp corners)
}
```

> **⚠️ CRITICAL:** Both `schema.ts` files must be identical. If you edit one, edit the other the same way.

---

#### Step 2 — Update the Extractor (Browser Extension)

**File to modify:**
- `browser-extension/src/content/extractor.ts`

**Action:** Read the CSS property value from the DOM element and include it in the extracted JSON.

**Checklist:**
- [ ] Locate the extraction function that builds element objects (look for `getComputedStyle` calls).
- [ ] Add a line to read the new CSS property using `window.getComputedStyle(element).propertyName`.
- [ ] Parse the raw CSS value into the correct format (see parsing guide below).
- [ ] Add the parsed value to the element object being constructed.
- [ ] Handle edge cases: what if the value is `""`, `"none"`, `"0px"`, or `undefined`? Set a sensible default or omit the field.

**CSS Value Parsing Guide:**

| CSS Raw Value | How to Parse | Result |
|---|---|---|
| `"12px"` | `parseFloat("12px")` | `12` |
| `"rgb(59, 130, 246)"` | Regex or split on `,` then `parseInt` each | `{ r: 59, g: 130, b: 246 }` |
| `"rgba(59, 130, 246, 0.5)"` | Same as above, extract alpha separately | `{ r: 59, g: 130, b: 246 }` + `opacity: 0.5` |
| `"0px"` or `"none"` | Treat as default / skip | `undefined` or `0` |
| `"transparent"` | Skip — no meaningful color | `undefined` |

**Example — Extracting `borderRadius`:**

```typescript
// In extractor.ts
const computedStyle = window.getComputedStyle(element);

// Read border-radius (CSS returns "8px" or "0px")
const rawBorderRadius = computedStyle.borderRadius;
const borderRadius = parseFloat(rawBorderRadius) || 0;

// Only include if non-zero (to keep JSON clean)
const rectangleElement: RectangleElement = {
  type: "RECTANGLE",
  x: rect.x,
  y: rect.y,
  width: rect.width,
  height: rect.height,
  backgroundColor: parsedColor,
  ...(borderRadius > 0 && { borderRadius }), // ← NEW: conditional inclusion
};
```

---

#### Step 3 — Update the Renderer (Figma Plugin)

**File to modify:**
- `figma-plugin/src/plugin/renderer.ts`

**Action:** Read the new property from the JSON element and apply it to the Figma node.

**Checklist:**
- [ ] Locate the render function for the relevant element type (e.g., `renderRectangle`, `renderText`).
- [ ] After creating the Figma node, check if the new property exists in the element data.
- [ ] Apply the value using the correct Figma API call (see mapping table below).
- [ ] Handle the case where the property is `undefined` (optional field) — use a sensible default or skip.

**JSON Property → Figma API Mapping:**

| JSON Property | Figma API | Notes |
|---|---|---|
| `borderRadius` (number) | `node.cornerRadius = value` | Works on `RectangleNode` |
| `opacity` (0–100) | `node.opacity = value / 100` | Figma uses 0–1 range |
| `borderColor` (RGBColor) | `node.strokes = [{ type: 'SOLID', color: toFigmaColor(value) }]` | Must convert 0–255 → 0–1 |
| `borderWidth` (number) | `node.strokeWeight = value` | In pixels |

**Example — Rendering `borderRadius`:**

```typescript
// In renderer.ts
function renderRectangle(element: RectangleElement): RectangleNode {
  const rect = figma.createRectangle();
  rect.x = element.x;
  rect.y = element.y;
  rect.resize(element.width, element.height);
  rect.fills = [{ type: 'SOLID', color: toFigmaColor(element.backgroundColor) }];

  // ← NEW: Apply border radius if present
  if (element.borderRadius !== undefined && element.borderRadius > 0) {
    rect.cornerRadius = element.borderRadius;
  }

  return rect;
}
```

---

#### Step 4 — Update Documentation

**Files to update:**
- `PRD.md` — Add the new property to the "Properti yang Disalin" table in Section 5.2.
- `AGENTS.md` — If the property is now part of MVP scope, move it from the "NOT Supported" table to the "Supported" table in Section 2.

---

### VERIFICATION:

Run these checks after completing all steps:

```bash
# 1. Type-check browser extension (must pass with zero errors)
cd browser-extension && npx tsc --noEmit

# 2. Type-check Figma plugin (must pass with zero errors)
cd figma-plugin && npx tsc --noEmit

# 3. Build both projects
cd browser-extension && npm run build
cd figma-plugin && npm run build
```

- [ ] Both `schema.ts` files contain the same interface changes.
- [ ] Extractor reads the CSS property and outputs it in JSON.
- [ ] Renderer reads the JSON property and applies it to the Figma node.
- [ ] Edge cases handled (missing value, zero, `"none"`, etc.).
- [ ] No TypeScript errors in either project.
- [ ] Documentation updated.

---

## SKILL 2: Adding a New HTML Element Type

### IF USER ASKS TO:

> "Add support for `<ELEMENT_TYPE>` elements" (e.g., `BUTTON`, `IMAGE`, `INPUT`, `LINK`)

### THEN EXECUTE THESE STEPS:

---

#### Step 1 — Design the Element Interface

Before writing any code, determine:

| Question | How to Decide | Example (IMAGE) |
|---|---|---|
| What Figma node type? | Check [Figma Plugin API docs](https://www.figma.com/plugin-docs/api/api-reference/) | `RectangleNode` with image fill |
| What properties to extract? | List the CSS/HTML attributes unique to this element | `src`, `alt`, `width`, `height` |
| What properties to render? | Map each extracted property to a Figma API call | `node.fills = [{ type: 'IMAGE', ... }]` |

Document your design decision in a brief comment before proceeding.

---

#### Step 2 — Update the Shared Type Definitions

**Files to modify:**
- `browser-extension/src/types/schema.ts`
- `figma-plugin/src/types/schema.ts`

**Action:** Create a new element interface and add it to the `FrameElement` union type.

**Checklist:**
- [ ] Create a new interface named `<Type>Element` (PascalCase) with `type: "<TYPE>"` (UPPER_SNAKE_CASE string literal).
- [ ] Include base fields: `x`, `y`, `width`, `height` (all elements need these).
- [ ] Add type-specific fields with clear JSDoc comments.
- [ ] Add the new interface to the `FrameElement` union type.

**Example — Adding `ImageElement`:**

```typescript
// In schema.ts — BOTH projects

/** Represents an image element extracted from the DOM. */
export interface ImageElement {
  type: "IMAGE";
  x: number;
  y: number;
  width: number;
  height: number;
  /** The source URL of the image. */
  imageUrl: string;
  /** Alt text for accessibility context. */
  altText: string;
}

// Update the union type
export type FrameElement = RectangleElement | TextElement | ImageElement; // ← ADD HERE
```

> **⚠️ CRITICAL:** Both `schema.ts` files must be identical.

---

#### Step 3 — Update the Extractor (Browser Extension)

**File to modify:**
- `browser-extension/src/content/extractor.ts`

**Action:** Add detection logic for the new HTML element and extract its properties.

**Checklist:**
- [ ] Add a detection condition to identify the element type. This could be:
  - Tag name check: `element.tagName === 'IMG'`
  - CSS property check: `computedStyle.backgroundImage !== 'none'`
  - Content check: `element.textContent.trim().length > 0`
- [ ] Create an extraction function specific to this element type.
- [ ] Wire the detection into the main traversal loop (the `if/else if` chain or `switch` statement).
- [ ] Handle graceful skipping if critical data is missing.

**Example — Extracting `IMAGE` elements:**

```typescript
// In extractor.ts

/**
 * Checks if a DOM element should be classified as an IMAGE element.
 */
function isImageElement(element: Element): element is HTMLImageElement {
  return element.tagName === 'IMG';
}

/**
 * Extracts properties from an IMG element.
 * Returns null if the image has no valid src (skip gracefully).
 */
function extractImageElement(element: HTMLImageElement): ImageElement | null {
  const rect = element.getBoundingClientRect();
  const src = element.src;

  // Skip images without a source
  if (!src || src === '') {
    console.warn("[CodeToFrame] Skipping image with no src:", element);
    return null;
  }

  return {
    type: "IMAGE",
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    imageUrl: src,
    altText: element.alt || '',
  };
}

// In the main traversal loop:
if (isImageElement(el)) {
  const imageEl = extractImageElement(el);
  if (imageEl) elements.push(imageEl);
}
```

---

#### Step 4 — Update the Renderer (Figma Plugin)

**File to modify:**
- `figma-plugin/src/plugin/renderer.ts`

**Action:** Add a render function for the new element type.

**Checklist:**
- [ ] Create a new `render<Type>` function (e.g., `renderImage`).
- [ ] Use the correct `figma.create*()` method for the target node type.
- [ ] Set position (`x`, `y`) and dimensions (`resize(width, height)`).
- [ ] Apply type-specific properties using the Figma API.
- [ ] Add the new type to the main dispatch logic in `controller.ts` (the `switch` or `if/else` that routes elements to render functions).

**Update the dispatcher in `controller.ts`:**

```typescript
// In controller.ts — add a new case to the element dispatch

for (const element of data.elements) {
  switch (element.type) {
    case "RECTANGLE":
      renderRectangle(element);
      break;
    case "TEXT":
      await renderText(element);
      break;
    case "IMAGE":            // ← NEW
      await renderImage(element);
      break;
    default:
      console.warn("[CodeToFrame] Unknown element type, skipping:", (element as { type: string }).type);
  }
}
```

---

#### Step 5 — Update Documentation

**Files to update:**
- `PRD.md` — Add the new element type to the "Elemen yang Diekstrak" table in Section 5.1 and add its properties to Section 5.2.
- `AGENTS.md` — Move the element from the "NOT Supported" table to the "Supported" table in Section 2 (if applicable).
- `ARCHITECTURE.md` — If the data flow changed (e.g., new async steps for image download), update Section 5.

---

### VERIFICATION:

```bash
# 1. Type-check both projects
cd browser-extension && npx tsc --noEmit
cd figma-plugin && npx tsc --noEmit

# 2. Build both projects
cd browser-extension && npm run build
cd figma-plugin && npm run build
```

- [ ] New interface exists in both `schema.ts` files (identical content).
- [ ] `FrameElement` union type includes the new element interface.
- [ ] Extractor detects the new element type and outputs valid JSON.
- [ ] Renderer creates the correct Figma node with correct properties.
- [ ] Dispatcher in `controller.ts` handles the new `type` string.
- [ ] Unknown/unsupported elements are still skipped gracefully (no regressions).
- [ ] No TypeScript errors in either project.
- [ ] Documentation updated.

---

## SKILL 3: Testing & Building the Project

### IF USER ASKS TO:

> "Build the project", "Check for errors", "Run type checking", "Prepare for deployment", or "Make sure everything compiles"

### THEN EXECUTE THESE STEPS:

---

#### Step 1 — Pre-Build: Verify Dependencies Are Installed

Run `npm install` in both project directories to ensure all dependencies are up to date.

```bash
# Install dependencies for browser extension
cd browser-extension && npm install

# Install dependencies for Figma plugin
cd figma-plugin && npm install
```

**Expected output:** No errors. If there are peer dependency warnings, they are usually safe to ignore unless they mention TypeScript or Vite.

---

#### Step 2 — Type-Check: Catch TypeScript Errors Before Building

Run the TypeScript compiler in check-only mode (`--noEmit`) to find type errors **without generating output files**.

```bash
# Type-check browser extension
cd browser-extension && npx tsc --noEmit

# Type-check Figma plugin
cd figma-plugin && npx tsc --noEmit
```

**Expected output:** No output = no errors. ✅

**If there ARE errors:**
- Read each error message carefully.
- Fix errors in this priority order:
  1. `schema.ts` type mismatches (contract errors — highest priority)
  2. Import/export errors (missing or incorrect paths)
  3. Type annotation errors (wrong types assigned)
  4. Unused variable warnings (lowest priority, but still fix them)
- After fixing, re-run `npx tsc --noEmit` to confirm zero errors.

> **⚠️ IMPORTANT:** Do NOT proceed to Step 3 if there are TypeScript errors. Fix them first.

---

#### Step 3 — Build: Browser Extension

```bash
cd browser-extension && npm run build
```

**What this does:**
- Vite bundles the TypeScript source files into JavaScript.
- Output goes to `browser-extension/dist/`.
- The `public/` folder (including `manifest.json` and `icons/`) is copied to `dist/` as-is.

**Expected output:** Build completes with no errors. The `dist/` folder should contain:
```
browser-extension/dist/
├── manifest.json          # Copied from public/
├── icons/                 # Copied from public/
├── popup.html             # Bundled popup
├── popup.js               # Bundled popup script
├── content.js             # Bundled content script
└── service-worker.js      # Bundled background script (if applicable)
```

**If the build fails:**
- Check for syntax errors in `.ts` files.
- Check `vite.config.ts` for misconfigured entry points.
- Ensure `manifest.json` references the correct output file names.

---

#### Step 4 — Build: Figma Plugin

```bash
cd figma-plugin && npm run build
```

**What this does:**
- TypeScript compiler (or bundler) compiles `.ts` files to `.js`.
- Output goes to `figma-plugin/dist/`.

**Expected output:** Build completes with no errors. The `dist/` folder should contain:
```
figma-plugin/dist/
├── plugin/
│   └── controller.js      # Compiled plugin sandbox code
└── ui/
    ├── ui.html             # Plugin UI (may be bundled inline)
    └── ui.css              # Plugin styles (may be inlined)
```

**If the build fails:**
- Check for Figma API usage errors (e.g., calling `document` in sandbox code).
- Verify `manifest.json` paths point to correct `dist/` output locations.

---

#### Step 5 — Post-Build: Verify Manifest References

After building, confirm that manifest files point to files that actually exist in `dist/`.

**For Browser Extension** — check `browser-extension/dist/manifest.json`:
```bash
# Verify that files referenced in manifest.json exist
cat browser-extension/dist/manifest.json
# Then check each file path listed under "content_scripts", "background", "action" exists in dist/
```

**For Figma Plugin** — check `figma-plugin/manifest.json`:
```bash
# Verify that "main" and "ui" paths exist
cat figma-plugin/manifest.json
# Then check that dist/plugin/controller.js and dist/ui/ui.html exist
```

---

#### Step 6 — (Optional) Load and Smoke Test

If the user wants to verify the build works end-to-end:

**Browser Extension:**
1. Open Chrome → `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked" → select `browser-extension/dist/`
4. Navigate to any web page → click the CodeToFrame extension icon
5. Verify the popup opens without errors

**Figma Plugin:**
1. Open Figma Desktop
2. Go to **Plugins** → **Development** → **Import plugin from manifest...**
3. Select `figma-plugin/manifest.json`
4. Open a Figma file → run the CodeToFrame plugin
5. Verify the plugin UI opens without errors

---

### VERIFICATION:

Summary checklist for the entire build process:

| Step | Check | Command | Pass Criteria |
|:---:|---|---|---|
| 1 | Dependencies installed | `npm install` (both dirs) | No errors |
| 2 | TypeScript type-check | `npx tsc --noEmit` (both dirs) | Zero errors, zero output |
| 3 | Extension build | `npm run build` (extension) | `dist/` folder populated |
| 4 | Plugin build | `npm run build` (plugin) | `dist/` folder populated |
| 5 | Manifest paths valid | Manual check | All referenced files exist |
| 6 | Smoke test (optional) | Load in Chrome + Figma | UI opens without console errors |

---

## Quick Reference: Files Modified Per Skill

This table shows which files are touched by each skill, making it easy to plan your changes:

| File | Skill 1 (CSS Property) | Skill 2 (Element Type) | Skill 3 (Build) |
|---|:---:|:---:|:---:|
| `browser-extension/src/types/schema.ts` | ✏️ Modify | ✏️ Modify | — |
| `figma-plugin/src/types/schema.ts` | ✏️ Modify | ✏️ Modify | — |
| `browser-extension/src/content/extractor.ts` | ✏️ Modify | ✏️ Modify | — |
| `figma-plugin/src/plugin/renderer.ts` | ✏️ Modify | ✏️ Modify | — |
| `figma-plugin/src/plugin/controller.ts` | — | ✏️ Modify | — |
| `PRD.md` | ✏️ Update | ✏️ Update | — |
| `AGENTS.md` | ✏️ Update | ✏️ Update | — |
| `ARCHITECTURE.md` | — | ✏️ Maybe | — |
| `package.json` (both) | — | — | 📖 Read |
| `tsconfig.json` (both) | — | — | 📖 Read |
| `vite.config.ts` | — | — | 📖 Read |
| `manifest.json` (both) | — | — | ✅ Verify |

---

*End of AI Workflow Procedures.*
