# Studli

A 3D LEGO-style brick building application built with React, Three.js, and TypeScript.

![React](https://img.shields.io/badge/React-18-blue) ![Three.js](https://img.shields.io/badge/Three.js-r158-green) ![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)

## Features

- **Build Mode**: Place bricks, plates, and tiles on a 3D grid
- **Edit Mode**: Select, move, copy/paste, and delete bricks
- **Multiple Brick Types**:
  - **Bricks** - Standard height building blocks (1×1, 2×2, 2×4)
  - **Plates** - Thin bricks, 1/3 the height (1×1, 2×2, 2×4)
  - **Tiles** - Smooth-top pieces with no studs (1×1, 2×2, 2×4)
- **Smart Stacking**: Bricks automatically snap to valid positions
- **Layer Navigation**: Use W/S or arrow keys to place bricks at different heights
- **Color Picker**: Customize brick colors with a full palette
- **Undo/Redo**: Full history support (Ctrl+Z / Ctrl+Y)
- **Copy/Paste**: Duplicate selections (Ctrl+C / Ctrl+V)
- **Rotate**: Rotate individual bricks or selections (R key)

## Controls

### Mouse
| Action | Description |
|--------|-------------|
| Left Click | Place brick / Select brick |
| Right Click | Context menu (edit mode) / Cancel (move/paste) |
| Right Drag | Rotate camera view |
| Scroll | Zoom in/out |

### Keyboard
| Key | Description |
|-----|-------------|
| R | Rotate brick/selection |
| W / ↑ | Move to higher layer |
| S / ↓ | Move to lower layer |
| Delete | Delete selected bricks |
| Escape | Cancel current operation |
| Enter | Confirm move/paste |
| Ctrl+Z | Undo |
| Ctrl+Y | Redo |
| Ctrl+C | Copy selection |
| Ctrl+V | Paste |
| Ctrl+A | Select all |

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

## Tech Stack

- **React 18** - UI framework
- **Three.js** / **React Three Fiber** - 3D rendering
- **Drei** - Three.js helpers and abstractions
- **Zustand** - State management
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling

## Project Structure

```
src/
├── components/       # 3D scene components
│   ├── Brick.tsx        # Individual brick rendering
│   ├── BrickPreview.tsx # Ghost preview while building
│   ├── GhostPreview.tsx # Preview for move/paste operations
│   ├── Grid.tsx         # Base grid and click handling
│   └── Scene.tsx        # Main 3D scene setup
├── store/            # State management
│   └── useBrickStore.ts # Zustand store for all app state
├── types/            # TypeScript types
│   └── brick.ts         # Brick types and constants
├── ui/               # 2D UI components
│   ├── ColorPicker.tsx  # Color selection palette
│   ├── ContextMenu.tsx  # Right-click menu
│   ├── FloatingToolbar.tsx # Top toolbar
│   └── SidePanel.tsx    # Brick selection panel
├── utils/            # Utility functions
│   └── snapToGrid.ts    # Grid snapping and collision logic
├── App.tsx           # Main app component
├── index.css         # Global styles
└── main.tsx          # Entry point
```

## License

MIT
