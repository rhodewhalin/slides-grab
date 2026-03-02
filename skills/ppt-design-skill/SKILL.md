---
name: ppt-design-skill
description: Stage 2 design skill for Codex. Generate and iterate slides/slide-XX.html from approved outline.
metadata:
  short-description: Build HTML slides and viewer for review loop
---

# PPT Design Skill (Codex)

Use this after `slide-outline.md` is approved.

## Goal
Generate high-quality `slides/slide-XX.html` files and support revision loops.

## Inputs
- Approved `slide-outline.md`
- Theme/layout preferences
- Requested edits per slide

## Outputs
- `slides/slide-01.html ... slide-XX.html`
- Updated `slides/viewer.html` via build script

## Workflow
1. Read approved `slide-outline.md`.
2. Generate slide HTML files in `slides/` with 2-digit numbering.
3. Run `node scripts/build-viewer.js` after generation or edits.
4. Iterate on user feedback by editing only requested slide files.
5. Keep revising until user approves conversion stage.

## Rules
- Keep slide size 720pt x 405pt.
- Keep semantic text tags (`p`, `h1-h6`, `ul`, `ol`, `li`).
- Do not start conversion before approval.

## Reference
For full constraints and style system, follow:
- `.claude/skills/design-skill/SKILL.md`
