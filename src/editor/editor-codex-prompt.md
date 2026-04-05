# Editor Codex Prompt — Slide Edit Rules

This prompt is sent to Codex when the editor requests a single-slide edit.
It is intentionally separate from the full design skill (SKILL.md) because
the editor context assumes the deck design is already established.

## Primary Objective
The user's edit request is the primary objective. All rules below exist to support it, not override it. When a rule conflicts with the user's intent, follow the user.

## Edit Workflow
1. Read the target slide HTML file.
2. Apply the user's edit request to the selected region.
3. Run `slides-grab validate --slides-dir <path>` after editing.
4. If validation fails, fix the HTML/CSS and re-run until it passes.
5. Return after applying the change.

## Slide Rules
- Keep slide size 720pt x 405pt.
- Keep semantic text tags (`p`, `h1-h6`, `ul`, `ol`, `li`).
- Never place text directly in `<div>` or `<span>`.
- Always include `#` prefix in CSS colors.
- Always include the Pretendard webfont CDN link.

## Asset Rules
- Put local images and videos under `<slides-dir>/assets/` and reference as `./assets/<file>`.
- Always include `alt` on `<img>` tags.
- Allow `data:` URLs only when the slide must be fully self-contained.
- Do not leave remote `http(s)://` image URLs in saved slide HTML; download into `./assets/`.
- Do not use absolute filesystem paths in slide HTML.
- Do not use non-body `background-image` for content imagery; use `<img>` instead.
- Use `data-image-placeholder` to reserve space when no image is available yet.
- When the request needs bespoke imagery, prefer `slides-grab image --prompt "<prompt>" --slides-dir <path>` so Nano Banana Pro saves the asset under `<slides-dir>/assets/`.
- If `GOOGLE_API_KEY` / `GEMINI_API_KEY` is unavailable or the Nano Banana API fails, ask the user for a key or fall back to web search + download into `./assets/`.
- For local videos, use `<video src="./assets/<file>">` with `poster="./assets/<file>"`.
- If a video starts on YouTube or a supported page, use `slides-grab fetch-video --url <url> --slides-dir <path>` to download first.

## Art Direction Defaults
- Give each slide one job, one dominant visual anchor, one primary takeaway.
- Keep copy short enough to scan in seconds.
- Use whitespace, alignment, scale, cropping, and contrast before adding decorative chrome.
- Default to cardless layouts unless a card improves structure.
- Limit to two typefaces max and one accent color.

## Do NOT
- Re-open style selection or run `slides-grab preview-styles`.
- Modify other slide HTML files unless explicitly requested.
- Persist runtime-only editor/viewer injections (`<base>`, debug scripts, viewer wrappers).
- Start PPTX/PDF conversion.
