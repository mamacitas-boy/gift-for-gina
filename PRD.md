# Roomscape Product Requirements Document

## 1. Product summary

Roomscape is a browser-based interactive 3D room editor. It transforms the supplied architectural line reference into a navigable Three.js environment where users can look around a complete four-wall room and place HTML text cards or images onto the room’s real surfaces.

The application is a standalone Vite project intended to run locally and deploy as a static site on GitHub Pages.

## 2. Product goals

- Recreate the reference’s architectural proportions with real 3D geometry rather than a flat image or fake perspective.
- Provide a fast, polished, responsive environment that works with mouse, touch, wheel, and pinch interaction.
- Separate passive exploration from authoring so users can explore safely in View mode and edit intentionally in Edit mode.
- Make the room customizable without requiring a backend.
- Make the complete room state portable through a human-readable `.config` file.

## 3. Room requirements

- Four solid walls: front, back, left, and right.
- A floor and a continuous ceiling.
- The back wall is rectangular and centered.
- Side walls remain angled/splayed toward the front, following the reference composition.
- The ceiling keeps the faceted reference language:
  - central rear panel;
  - filled forward trapezoid;
  - left sloped wing;
  - right sloped wing;
  - visible seam beams.
- No flat reference image is used in the scene.
- Walls, floor, ceiling, lights, shadows, camera, and mounted content are actual 3D objects.

## 4. Camera and navigation

- Use a perspective camera inside the room.
- Start centered on the room’s central interior axis.
- Allow unrestricted horizontal orbit for a full 360° view.
- Support mouse drag, touch drag, wheel zoom, and pinch gestures through OrbitControls.
- Disable panning.
- Constrain vertical orbit so the user cannot look through the floor or ceiling.
- Clamp camera position and distance so the camera remains inside the four-wall enclosure.
- Provide a Recenter camera control.

## 5. Modes and settings

The top-left Settings drawer is the main application control surface.

### View mode

- Explore the room without selecting or dragging mounted content.
- Change orbit sensitivity.
- Toggle surface labels.
- Recenter the camera.

### Edit mode

- Add text or images.
- Choose front wall, back wall, left wall, right wall, or ceiling.
- Select existing mounted content.
- Drag content directly on its surface.
- Adjust horizontal position, vertical position, rotation, scale, opacity, and width.
- Nudge selected content with directional buttons.
- Duplicate or delete selected content.
- Customize room dimensions, material colors, roughness, background, and lighting.
- Export or import the complete configuration.

## 6. Mounted HTML content

HTML content must remain attached to real 3D surfaces and preserve perspective when the camera moves.

Supported content:

- Text cards.
- Images from local files.
- Images from remote URLs.
- CSS-styled headings, captions, metadata, and selected states.

Implementation requirements:

- Use CSS3DRenderer and CSS3DObject.
- Parent each object to a named surface group.
- Keep each surface’s local position and rotation independent from the camera.
- Disable content pointer interaction in View mode.
- Enable selection and drag interaction in Edit mode.
- Give images alt text and content objects accessible labels.

## 7. Image workflow

- Local upload through an image file input.
- Drag/drop upload zone.
- Remote image URL input.
- Accept common image types: PNG, JPEG, WebP, GIF, and SVG.
- Reject files larger than 8 MB.
- Convert local files to data URLs so exported configs remain self-contained.
- Preserve remote URLs when exporting.
- Support direct dragging and slider-based transforms.

## 8. Configuration contract

The default configuration is stored at `public/roomscape.config` and is copied to `dist/roomscape.config` during build.

```json
{
  "version": 1,
  "room": {
    "width": 9.2,
    "depth": 9,
    "height": 5
  },
  "materials": {
    "wall": "#b8b0a5",
    "floor": "#5f625d",
    "ceiling": "#d1c8bb",
    "background": "#131716",
    "wallRoughness": 0.88,
    "floorRoughness": 0.73
  },
  "lighting": {
    "exposure": 1.12,
    "keyIntensity": 3.1,
    "ambientIntensity": 1.8,
    "warmth": 0.5
  },
  "camera": {
    "orbitSensitivity": 0.42,
    "maxDistance": 3.25
  },
  "content": []
}
```

Each content item stores an id, type, surface, text/caption, source when applicable, local x/y position, rotation, scale, opacity, and width.

The app validates the version, clamps numeric values to safe ranges, loads defaults when the static config cannot be fetched, and exports the current in-memory state as `roomscape.config`.

## 9. Visual and UX direction

- Minimal architectural gallery aesthetic.
- Warm gray room surfaces with slate UI text and gold accents.
- Cinzel, Manrope, and DM Mono typography with fallbacks.
- Realistic rough materials, directional light, ambient fill, warm back wash, and soft shadows.
- Responsive top-left settings drawer that becomes a full-width mobile panel.
- Keyboard-visible focus states.
- Minimum touch target sizing.
- Reduced-motion support.
- No emoji-based structural icons; controls use text and simple geometric glyphs.

## 10. Performance and hosting requirements

- Vite production build.
- Relative asset base (`./`) so the app works at both domain root and GitHub Pages repository paths.
- Separate Three.js chunk for browser caching.
- No source maps in production build.
- Responsive renderer pixel ratio: up to 2 on desktop and 1.5 on smaller screens.
- Lazy-loaded image elements.
- Limited shadow map workload to the primary directional light.
- Static `.nojekyll` marker.
- GitHub Actions deployment to Pages from `main`.

## 11. Acceptance criteria

- The room renders as a fully enclosed 3D environment.
- The ceiling has no visible geometric gap.
- The camera starts centered and can orbit horizontally through 360°.
- The camera cannot leave the room.
- View and Edit modes are available from the top-left settings drawer.
- Text and images can be placed on every supported surface.
- Images can be uploaded or supplied by URL, dragged, rotated, scaled, and adjusted with sliders.
- Room settings can be customized live.
- Config export/import restores the room layout and appearance.
- `npm run check` passes.
- `npm run build` passes.
- The built output uses relative asset paths and contains `roomscape.config` and `.nojekyll`.
- GitHub Pages workflow can build and publish `dist` from a clean clone.
