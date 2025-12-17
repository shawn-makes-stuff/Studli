import { Scene } from './components/Scene';
import { FloatingToolbar } from './ui/FloatingToolbar';
import { ContextMenu } from './ui/ContextMenu';
import { BottomBar } from './ui/BottomBar';

function App() {
  return (
    <div className="h-screen w-screen bg-gray-900 overflow-hidden">
      {/* 3D Scene */}
      <Scene />

      {/* UI Overlays */}
      <FloatingToolbar />
      <ContextMenu />
      <BottomBar />
    </div>
  );
}

export default App;
