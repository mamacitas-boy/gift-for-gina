# Roomscape

An interactive Three.js room based on the supplied architectural reference. The room is fully enclosed with four walls, a faceted ceiling, a floor, centered camera orbit, and HTML/CSS3D content attached to all five available surfaces.

## Run locally

Requirements: Node.js 18+ and npm.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. For a production check or preview:

```bash
npm run build
npm run preview
```

## GitHub Pages

The project is configured for repository-hosted Pages URLs such as `https://username.github.io/repository-name/`:

1. Push the project to a GitHub repository with the default branch named `main`.
2. In **Settings → Pages**, set the source to **GitHub Actions**.
3. Push to `main` or run the **Deploy Roomscape to GitHub Pages** workflow manually.

Vite uses relative asset paths, the static `.config` file is copied into `dist`, and the workflow publishes the production build automatically.

## Controls

- Open **Settings** in the top-left and switch between **View mode** and **Edit mode**.
- In View mode, drag or swipe to spin through the room. Horizontal orbit is unrestricted for a full 360° view.
- Use the wheel or pinch gesture to move closer and farther away. The camera is clamped inside the four walls.
- In Edit mode, add text or images to the front, back, left, right, or ceiling surface.
- Select an object to drag it directly, or use the position, rotation, scale, opacity, and nudge controls.
- Import and export the complete room state through `roomscape.config`.

The project uses `WebGLRenderer` for the room and `CSS3DRenderer` for cards and images. No background image is used. The default configuration lives at `public/roomscape.config`.

For the full product requirements and a chronological implementation handoff, see [PRD.md](./PRD.md) and [SESSION_HANDOFF.md](./SESSION_HANDOFF.md).
