# Studli

A 3D brick building application built with React, Three.js, and TypeScript.

![React](https://img.shields.io/badge/React-18-blue) ![Three.js](https://img.shields.io/badge/Three.js-r158-green) ![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)

## Features

- **Build**: Place bricks on a 3D grid with a live ghost preview (red when invalid)
- **Brick Types**: Bricks, plates, tiles, slopes, and corner slopes (including inverted variants)
- **Smart Stacking**: Bricks snap to valid positions on the ground or on top of other bricks
- **Rotate**: Rotate the preview before placing (R key or Rotate button)
- **Undo/Redo**: Ctrl/Cmd+Z / Ctrl/Cmd+Y (Undo button in the toolbar)
- **Desktop Camera**: Esc toggles mouse capture, WASD movement, Shift sprint, scroll wheel zoom
- **Mobile**: Dual on-screen joysticks, tap-to-place, pinch zoom
- **PWA**: Installable app (works offline after first load)

## Controls

### Desktop
| Input | Action |
|------:|--------|
| Esc | Toggle mouse capture (look) / release (UI) |
| Mouse Move | Look around (when captured) |
| Left Click | Place brick (uses crosshair when captured) |
| Scroll Wheel | Zoom in/out |
| WASD | Move |
| Space / Ctrl | Up / Down |
| Shift | Move faster |
| R | Rotate preview |
| Ctrl/Cmd+Z | Undo |
| Ctrl/Cmd+Y | Redo |

### Mobile / Touch
| Input | Action |
|------:|--------|
| Left joystick | Move |
| Right joystick | Look |
| Tap | Place brick |
| Pinch | Zoom in/out |
| Bottom toolbar | Bricks, color, recent, rotate, undo |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/studli.git
   cd studli
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## PWA (Install as App)

- **Chrome/Edge (desktop & Android)**: use the browser's Install option (or the install icon in the address bar).
- **iOS Safari**: Share → Add to Home Screen.

## Native Android App (Capacitor)

This repo also includes a native Android project (no web portal; the app runs fully offline from packaged assets).

### Prerequisites

- Android Studio (includes Android SDK + emulator tooling)
- Java/JDK (Android Studio usually installs what you need)

### Build + Sync

```bash
npm run build
npm run cap:sync:android
```

### Open in Android Studio

```bash
npm run cap:open:android
```

Then build/run from Android Studio (device or emulator).

### App Icon

App icons/splash screens are generated from `brick.png` via `@capacitor/assets`:

```bash
npm run cap:assets:android
```

## Brick Thumbnail Spritesheet (Faster UI)

The brick picker can use a prebuilt spritesheet for brick thumbnails to avoid slow on-device WebGL thumbnail generation.

- Generate (writes `public/brick-thumbs.png` + `public/brick-thumbs.json`): `npm run gen:spritesheet`
- If the spritesheet files are missing, the app automatically falls back to the existing thumbnail renderer.

## Tech Stack

- **React 18** - UI framework
- **Three.js** / **React Three Fiber** - 3D rendering
- **Drei** - Three.js helpers and abstractions
- **Zustand** - State management
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Material UI Icons** - Action icons
- **Capacitor** - Native Android app shell

## Project Structure

```
src/
  components/
    Brick.tsx
    BrickPreview.tsx
    FirstPersonControls.tsx
    Grid.tsx
    Scene.tsx
  store/
    useBrickStore.ts
  types/
    brick.ts
  ui/
    BottomBar.tsx
    BrickPickerPopout.tsx
    ColorPopout.tsx
    Crosshair.tsx
    VirtualJoystick.tsx
    VirtualJoystickCamera.tsx
  utils/
    collision.ts
    geometry.ts
    math.ts
    snapToGrid.ts
  App.tsx
  index.css
  main.tsx
```

## License

MIT
