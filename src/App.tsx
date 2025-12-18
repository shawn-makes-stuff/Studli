import { useEffect, useMemo, useState } from 'react';
import { Scene } from './components/Scene';
import { BottomBar } from './ui/BottomBar';
import { Crosshair } from './ui/Crosshair';
import { LandscapeRequiredOverlay } from './ui/LandscapeRequiredOverlay';
import { VirtualJoystick } from './ui/VirtualJoystick';
import { VirtualJoystickCamera } from './ui/VirtualJoystickCamera';

// Detect actual mobile/tablet devices (including iPad)
const detectMobile = () => {
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isIPad = (navigator.userAgent.includes('Mac') && 'ontouchstart' in window && navigator.maxTouchPoints > 1);
  const isSmallTouch = window.innerWidth <= 1024 && 'ontouchstart' in window;
  return mobileRegex || isIPad || isSmallTouch;
};

const getViewport = () => {
  if (typeof window === 'undefined') return { width: 0, height: 0 };
  return { width: window.innerWidth, height: window.innerHeight };
};

function App() {
  const [viewport, setViewport] = useState(getViewport);

  const isMobile = useMemo(() => detectMobile(), []);
  const isLandscape = viewport.width > viewport.height;
  const isPhone = isMobile && Math.min(viewport.width, viewport.height) <= 600;
  const requireLandscape = isPhone && !isLandscape;

  useEffect(() => {
    const update = () => setViewport(getViewport());
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-gray-900 overflow-hidden">
      {/* 3D Scene */}
      <Scene />

      {/* UI Overlays */}
      <Crosshair />
      {!requireLandscape && <BottomBar />}

      {/* Mobile Controls */}
      {isMobile && !requireLandscape && (
        <>
          <VirtualJoystick />
          <VirtualJoystickCamera />
        </>
      )}

      {requireLandscape && <LandscapeRequiredOverlay />}
    </div>
  );
}

export default App;
