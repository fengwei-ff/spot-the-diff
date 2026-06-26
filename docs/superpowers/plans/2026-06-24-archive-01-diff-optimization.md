# archive_01 Difference Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the first level (`archive_01`) so all 5 differences are subtle, character-focused changes, and add `hitR` support so small visual differences remain easy to tap.

**Architecture:** Keep the existing `DiffPainter`/`DiffHitTester` architecture. Add a `hitR` override to `DiffHitTester` and replace the level's diff configuration. No new files or modules are required.

**Tech Stack:** JavaScript (WeChat mini-program game project), Node.js for unit testing `DiffHitTester`.

---

## File Map

| file | responsibility | change |
|---|---|---|
| `src/game/DiffHitTester.js` | Converts screen taps to image-local coordinates and tests circle overlap | Use `d.hitR ?? d.r` for the hit radius |
| `levels/south_archive.js` | Level data for the "南部档案馆" chapter | Replace `archive_01.diffs` with 5 character-focused diffs |
| `tests/DiffHitTester.test.js` | Node unit test for `DiffHitTester` | New file (created ad-hoc since project has no test runner) |

---

### Task 1: Add `hitR` support to `DiffHitTester`

**Files:**
- Modify: `src/game/DiffHitTester.js:27-35`
- Create: `tests/DiffHitTester.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/DiffHitTester.test.js`:

```javascript
const DiffHitTester = require('../src/game/DiffHitTester.js');
const assert = require('assert');

const tester = new DiffHitTester({
  aRect: { x: 0, y: 0, w: 900, h: 675 },
  bRect: { x: 0, y: 675, w: 900, h: 675 },
  imageSize: { w: 900, h: 675 },
});

const diffs = [
  { id: 'small', x: 100, y: 100, r: 10 },
  { id: 'largeHit', x: 200, y: 200, r: 10, hitR: 40 },
];

// Plain r=10 diff hits inside r=10
assert.strictEqual(tester.hitDiff(105, 105, diffs, new Set()).id, 'small');
// Plain r=10 diff misses at (115,115) — outside r=10
assert.strictEqual(tester.hitDiff(115, 115, diffs, new Set()), null);

// hitR=40 diff hits inside visual r=10
assert.strictEqual(tester.hitDiff(205, 205, diffs, new Set()).id, 'largeHit');
// hitR=40 diff also hits inside hitR but outside visual r
assert.strictEqual(tester.hitDiff(230, 230, diffs, new Set()).id, 'largeHit');
// hitR=40 diff misses outside hitR
assert.strictEqual(tester.hitDiff(250, 250, diffs, new Set()), null);

// Already-found diffs are excluded
assert.strictEqual(tester.hitDiff(105, 105, diffs, new Set(['small'])), null);

console.log('DiffHitTester tests passed');
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
node tests/DiffHitTester.test.js
```

Expected output (failure):

```
assert.strictEqual(tester.hitDiff(230, 230, diffs, new Set()).id, 'largeHit')
                ^
AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
+ actual - expected
+ undefined
- 'largeHit'
```

- [ ] **Step 3: Write minimal implementation**

Edit `src/game/DiffHitTester.js` and replace the `hitDiff` method with:

```javascript
  hitDiff(localX, localY, diffs, foundIds) {
    for (const d of diffs) {
      if (foundIds.has(d.id)) continue;
      const hitR = d.hitR ?? d.r;
      const dx = localX - d.x;
      const dy = localY - d.y;
      if (dx * dx + dy * dy <= hitR * hitR) return d;
    }
    return null;
  }
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
node tests/DiffHitTester.test.js
```

Expected output:

```
DiffHitTester tests passed
```

- [ ] **Step 5: Commit**

```bash
git add src/game/DiffHitTester.js tests/DiffHitTester.test.js
git commit -m "feat: support hitR override for difference hit testing"
```

---

### Task 2: Replace `archive_01` differences with 5 character-focused diffs

**Files:**
- Modify: `levels/south_archive.js:24-28`

- [ ] **Step 1: Replace the diffs array**

In `levels/south_archive.js`, replace the `archive_01.diffs` array with:

```javascript
      diffs: [
        {
          id: 'd1',
          type: 'patch',
          x: 575,
          y: 262,
          r: 16,
          hitR: 32,
          sampleFrom: { x: 575, y: 242 },
          feather: 0.85,
          desc: '左眉变细',
        },
        {
          id: 'd2',
          type: 'recolor',
          x: 345,
          y: 302,
          r: 10,
          hitR: 28,
          color: '#2a1a1a',
          blendAlpha: 0.5,
          feather: 0.9,
          desc: '右眼瞳孔色微调',
        },
        {
          id: 'd3',
          type: 'patch',
          x: 470,
          y: 365,
          r: 12,
          hitR: 28,
          sampleFrom: { x: 490, y: 360 },
          feather: 0.85,
          desc: '鼻尖高光消失',
        },
        {
          id: 'd4',
          type: 'recolor',
          x: 175,
          y: 515,
          r: 26,
          hitR: 38,
          color: '#7a6a3a',
          blendAlpha: 0.35,
          feather: 0.9,
          desc: '右侧胸前花纹颜色微变',
        },
        {
          id: 'd5',
          type: 'patch',
          x: 430,
          y: 530,
          r: 14,
          hitR: 30,
          sampleFrom: { x: 470, y: 530 },
          feather: 0.8,
          desc: '衣领盘扣少一个',
        },
      ],
```

- [ ] **Step 2: Verify JSON/JS syntax**

Run:

```bash
node -e "require('./levels/south_archive.js'); console.log('south_archive.js loads ok')"
```

Expected output:

```
south_archive.js loads ok
```

- [ ] **Step 3: Commit**

```bash
git add levels/south_archive.js
git commit -m "feat: redesign archive_01 with 5 subtle character-focused differences"
```

---

### Task 3: Verify in WeChat Dev Tools simulator and fine-tune coordinates

**Files:**
- Modify (if needed): `levels/south_archive.js`

- [ ] **Step 1: Open the project in WeChat Dev Tools**

Import `/Users/a58/Desktop/找不同/miniGame` as a mini-program game project.

- [ ] **Step 2: Launch the simulator and enter the level**

Navigate to `南部档案 → 第一夜 · 南洋峇来`. Confirm the game loads without console errors.

- [ ] **Step 3: Inspect B image for obvious color patches**

Visually compare the top (A) and bottom (B) images. Confirm there are no large colored circle overlays like the previous `r=50~60` recolors.

- [ ] **Step 4: Tap each of the 5 differences**

Tap near:

1. Character's left eyebrow (viewer-right)
2. Character's right eye pupil (viewer-left)
3. Nose tip
4. Right chest flower (viewer-left)
5. Center collar button

Each tap should register as a found difference. If any tap misses, increase its `hitR` slightly (e.g., from 28 to 34) and recompile.

- [ ] **Step 5: Fine-tune coordinates if visual effects are off**

If a difference is invisible or unnatural, adjust `x`/`y`/`sampleFrom` in `levels/south_archive.js` by ±5~10 pixels and recompile until the effect looks natural. Typical adjustments:

- Eyebrow patch: move `sampleFrom` up/down to match forehead skin tone.
- Nose highlight: move `sampleFrom` to the closest matching skin area.
- Missing button: move `sampleFrom` to nearby collar fabric.

- [ ] **Step 6: Commit any coordinate adjustments**

```bash
git add levels/south_archive.js
git commit -m "fix: fine-tune archive_01 difference coordinates after simulator check"
```

---

## Self-Review

- **Spec coverage:**
  - 5 differences on character → Task 2
  - Remove obvious colored masks → Task 2 (small radii + feather)
  - `hitR` support → Task 1
  - Mini-program verification → Task 3
- **Placeholder scan:** No TBD/TODO/fill-in-details.
- **Type consistency:** `hitR` is used consistently as a number in `DiffHitTester` and level config.

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-06-24-archive-01-diff-optimization.md`. Two execution options:**

1. **Subagent-Driven (recommended)** - Dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
