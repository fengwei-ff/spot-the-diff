# Design: archive_01 Difference Optimization

## Context
The user wants to optimize the first level (`archive_01`) of the mini-game so that differences are concentrated on the character, less obvious, and increased from 3 to 5. The verification target is the WeChat mini-program, not the web demo.

## Goals
- Move all 5 differences onto the character (face + clothing).
- Eliminate the "colored circle mask" look by using small radii and the existing `feather` support.
- Decouple visual radius from hit-test radius so small visual changes are still easy to tap.
- Increase the difference count from 3 to 5.

## Difference Design

Image size: 900 × 675.

| id | type | location | visual radius `r` | hit radius `hitR` | effect | notes |
|---|---|---|---|---|---|---|
| d1 | patch | left eyebrow (character's left, viewer's right) | 16 | 32 | eyebrow becomes thinner | sample forehead skin above to partially cover |
| d2 | recolor | right eye pupil (character's right, viewer's left) | 10 | 28 | pupil color slightly darker | `feather=0.9`, `blendAlpha=0.5` |
| d3 | patch | nose tip highlight | 12 | 28 | highlight disappears | sample nearby nose/cheek skin, `feather=0.85` |
| d4 | recolor | right chest flower (character's right, viewer's left) | 26 | 38 | flower color slightly aged | `feather=0.9`, `blendAlpha=0.35` |
| d5 | patch | collar button (lower center) | 14 | 30 | one button missing | sample collar fabric nearby, `feather=0.8` |

All differences use radii between 10 and 26, with `hitR` between 28 and 38 to keep tapping comfortable.

## Code Changes

1. **`src/game/DiffHitTester.js`**  
   Update `hitDiff` to use `d.hitR ?? d.r` for the hit-test radius, so the visual radius can stay small while the tap target remains large.

2. **`levels/south_archive.js`**  
   Replace the `archive_01.diffs` array. Remove the two large background recolors and the large chest patch. Add the 5 character-focused differences above with `hitR` and `feather` parameters.

3. **`src/render/DiffPainter.js`**  
   No changes required. `recolor` and `patch` already support radial-gradient feathering via the `feather` option. Fine-tune coordinates during implementation if the visual effect is not natural.

## Verification

- Build and run the WeChat mini-program.
- Enter `南部档案 → 第一夜`.
- Confirm that B-side differences are subtle and no longer look like large colored overlays.
- Confirm all 5 differences are on the character.
- Confirm all 5 differences can be tapped and registered correctly.
- Confirm the star thresholds remain appropriate for 5 differences.

## Open Questions / Notes

- Exact coordinates may need pixel-level adjustment after seeing the rendered B image in the mini-program.
- If any difference is still too hard to spot, increase `r` slightly or reduce `feather`.
