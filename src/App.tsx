import { Scene } from './components/Scene';
import { SidePanel } from './ui/SidePanel';
import { FloatingToolbar } from './ui/FloatingToolbar';
import { ContextMenu } from './ui/ContextMenu';

function App() {
  return (
    <div className="h-screen w-screen bg-gray-900 overflow-hidden">
      {/* 3D Scene */}
      <Scene />

      {/* UI Overlays */}
      <SidePanel />
      <FloatingToolbar />
      <ContextMenu />
    </div>
  );
}

export default App;
