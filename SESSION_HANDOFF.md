# Roomscape Session Handoff

This document preserves the work completed in the conversation so another developer can continue without reconstructing the chat.

## Current project location

`/home/medo/Coding/gina`

The folder was created as a new standalone Vite project because the original workspace did not contain an existing web app to extend. The user selected this location during planning.

## Chronological progress

### Initial request

The user supplied a line-drawn architectural reference and requested a realistic Three.js website with:

- centered back wall;
- angled left and right walls;
- ceiling shaped like the reference;
- open-front camera perspective at first;
- real 3D geometry, lighting, shadows, and materials;
- OrbitControls or equivalent interaction;
- HTML/CSS3D content attached to real surfaces;
- text entry and surface selection;
- example wall content;
- responsive desktop/mobile behavior;
- complete runnable code and setup instructions.

### Planning decisions

- The project was placed in `/home/medo/Coding/gina`.
- Vite and npm were selected.
- Three.js, OrbitControls, WebGLRenderer, and CSS3DRenderer were selected.
- The UI direction was set to a restrained architectural gallery style with warm gray materials, slate text, and gold accents.
- A floor was included for realism and camera boundary definition.
- The UI skill was used for responsive layout, interaction sizing, typography, focus states, and reduced-motion guidance.

### First implementation

The first version added:

- Three.js room geometry.
- Back, left, and right walls.
- Floor and faceted ceiling sections.
- WebGL lighting and shadows.
- CSS3D cards attached to back, left, right, and ceiling surfaces.
- A text composer.
- Responsive floating controls.
- GitHub-ready setup instructions.

### User-requested expansion

The user then requested:

- a fully enclosed four-wall room;
- centered camera;
- 360° horizontal spin;
- separate View/Edit modes;
- settings at the top-left;
- more customization;
- a `.config` file;
- image placement on walls;
- image movement and rotation controls with sliders;
- a fast, polished experience.

That expansion produced the current editor architecture.

### Four-wall/editor implementation

Implemented changes:

- Added a solid front wall.
- Added a front-wall CSS3D surface group.
- Moved the camera to the room center axis.
- Removed horizontal azimuth limits for full 360° orbit.
- Kept vertical orbit constrained.
- Added camera position clamping against the room boundaries.
- Replaced the old right-side composer with a top-left Settings drawer.
- Added View mode and Edit mode tabs.
- Added room width, depth, and height controls.
- Added wall, floor, ceiling, and background color controls.
- Added key-light intensity control.
- Added object list, selection, delete, duplicate, and nudge controls.
- Added X position, Y position, rotation, scale, opacity, and width controls.
- Added image file upload, drag/drop, and URL loading.
- Added local image size/type validation.
- Added image alt text and accessible content labels.
- Added config import/export.

### Bug fixed during implementation

When new text or image content was added, the first implementation appended a second copy of all existing CSS3D objects instead of replacing the render set. This was fixed by adding `clearContentObjects()` before re-rendering dynamic content.

### Ceiling fix

The user reported that the ceiling was not fully filled. The original ceiling had:

- a central rear panel;
- left and right wings;
- a missing central forward section.

A forward trapezoidal ceiling panel was added between the rear central panel and the front wall, closing the gap while preserving the faceted/sloped design.

### GitHub Pages optimization

The user asked for local use and GitHub Pages hosting. The project was then optimized for both:

- Added `vite.config.js` with `base: './'`.
- Confirmed built asset URLs are relative (`./assets/...`).
- Added a separate `three` manual chunk for caching.
- Set production target to ES2020.
- Disabled production source maps.
- Enabled CSS splitting.
- Added responsive renderer pixel-ratio caps.
- Changed config fetch to use normal browser caching.
- Added `public/.nojekyll`.
- Added `.github/workflows/deploy.yml` for GitHub Pages deployment.
- Added `.gitignore` for `node_modules`, `dist`, and local artifacts.
- Added README deployment instructions.
- Changed the brand link from `/` to `./` for repository subpaths.

## Current files

| File | Responsibility |
| --- | --- |
| `index.html` | App shell, scene containers, top bar, top-left settings drawer, View/Edit controls, composer form, transform sliders, config controls. |
| `src/main.js` | Three.js scene, dynamic room geometry, four walls, continuous ceiling, floor, lighting, camera, OrbitControls, CSS3D surfaces, content state, image loading, drag movement, editor state, config import/export. |
| `src/style.css` | Dark architectural UI, responsive settings drawer, form styles, sliders, selected CSS3D objects, mobile layout, focus states, reduced-motion rules. |
| `vite.config.js` | Relative GitHub Pages base, production build target, chunk splitting, CSS splitting, dependency optimization. |
| `public/roomscape.config` | Default JSON room/material/light/camera configuration. |
| `public/.nojekyll` | Prevents GitHub Pages Jekyll processing. |
| `.github/workflows/deploy.yml` | Builds with npm CI and deploys `dist` to GitHub Pages on `main`. |
| `package.json` | Vite scripts, Three.js dependency, and syntax check script. |
| `package-lock.json` | Locked npm dependency graph for repeatable GitHub Actions builds. |
| `README.md` | Local development, editor controls, and GitHub Pages instructions. |
| `PRD.md` | Full product requirements, configuration contract, UX requirements, and acceptance criteria. |
| `SESSION_HANDOFF.md` | This chronological implementation record. |
| `dist/` | Generated production output. It is ignored by Git and regenerated by `npm run build`. |

## Runtime architecture

### Three.js scene

- `scene` contains the actual room and lights.
- `roomGroup` contains walls, floor, ceiling panels, and seam beams.
- `cssScene` contains surface groups and CSS3D content.
- `camera` is a perspective camera orbiting the room center.
- `controls` is OrbitControls with unlimited horizontal azimuth and bounded polar angle/distance.

### Room surfaces

The surface map is:

```text
front   → solid front wall, CSS3D plane facing toward room center
back    → rectangular rear wall
left    → splayed left wall
right   → splayed right wall
ceiling → horizontal/sloped ceiling content plane
```

### Content state

Content is stored in `state.config.content`. Each item includes:

- `id`
- `type`: `text` or `image`
- `surface`
- `text`
- `caption`
- `source` and `sourceName` for images
- `x`, `y`
- `rotation`
- `scale`
- `opacity`
- `width`

The CSS3D object transform is updated from that state, and the selected item is synchronized with the editor sliders.

## Commands

From `/home/medo/Coding/gina`:

```bash
npm install
npm run dev
```

Open the Vite URL, normally `http://localhost:5173`.

Production validation:

```bash
npm run check
npm run build
npm run preview
```

GitHub Pages deployment:

1. Push the project to a GitHub repository.
2. Use the `main` branch.
3. In GitHub repository settings, choose **Pages → GitHub Actions**.
4. Push to `main` or run the deploy workflow manually.

## Validation completed

The following checks passed after the ceiling fix and GitHub Pages changes:

```text
npm run check
node --check src/main.js
npm run build
```

The production build output was confirmed to include:

- relative JS asset paths;
- separate app and Three.js chunks;
- minified CSS;
- `roomscape.config`;
- `.nojekyll`.

The build reported no errors. The only expected note was the normal Three.js bundle-size warning before manual chunk splitting; after splitting, the app and Three.js chunks are separate and cacheable.

## Known environment limitation

The coding sandbox allowed dependency installation and production builds, but it denied opening a local listening port with `EPERM`. This prevents an in-sandbox browser/server smoke test. The project is intended to be run normally on a local machine with `npm run dev`.

## Remaining optional work

These are not required for the current acceptance criteria but could be added later:

- Add a hosted demo URL after pushing to GitHub.
- Add screenshot-based visual regression tests.
- Add undo/redo for editor transforms.
- Add per-object z-index/layer ordering.
- Add a persistent browser-local autosave separate from explicit config export.
- Add image compression before embedding large local files.
