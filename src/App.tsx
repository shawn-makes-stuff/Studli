import { useEffect, useMemo, useState } from 'react';
import { Scene } from './components/Scene';
import { BottomBar } from './ui/BottomBar';
import { Crosshair } from './ui/Crosshair';
import { LandscapeRequiredOverlay } from './ui/LandscapeRequiredOverlay';
import { VirtualJoystick } from './ui/VirtualJoystick';
import { VirtualJoystickCamera } from './ui/VirtualJoystickCamera';
import { MainMenu } from './ui/MainMenu';
import { MenuButton } from './ui/MenuButton';
import { ConnectionPointCycleButton } from './ui/ConnectionPointCycleButton';
import { DesktopControlsHint } from './ui/DesktopControlsHint';
import { useBrickStore } from './store/useBrickStore';
import { setSfxConfig } from './utils/sfx';
import { installMusicAutostart, pauseMusic, resumeMusicIfPossible, setMusicConfig } from './utils/music';
import { resumeExistingAudioContext, setMasterOutputGain, suspendExistingAudioContext } from './utils/audio';

// Detect actual mobile/tablet devices (including iPad)
const detectMobile = () => {
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isIPad = (navigator.userAgent.includes('Mac') && 'ontouchstart' in window && navigator.maxTouchPoints > 1);
  const isSmallTouch = window.innerWidth <= 1024 && 'ontouchstart' in window;
  return mobileRegex || isIPad || isSmallTouch;
};

const getViewport = () => {
  if (typeof window === 'undefined') return { width: 0, height: 0 };
  const vv = window.visualViewport;
  return {
    width: Math.round(vv?.width ?? window.innerWidth),
    height: Math.round(vv?.height ?? window.innerHeight),
  };
};

function App() {
  const [viewport, setViewport] = useState(getViewport);
  const menuOpen = useBrickStore((state) => state.menuOpen);
  const settings = useBrickStore((state) => state.settings);
  const uiPopoverOpen = useBrickStore((state) => state.uiPopoverOpen);

  const isMobile = useMemo(() => detectMobile(), []);
  const isLandscape = viewport.width > viewport.height;
  const requireLandscape = isMobile && !isLandscape;

  useEffect(() => {
    const update = () => setViewport(getViewport());
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
    };
  }, []);

  useEffect(() => {
    const setInsets = () => {
      const vv = window.visualViewport;
      const bottomInset = vv
        ? Math.max(0, window.innerHeight - (vv.height + vv.offsetTop))
        : 0;
      document.documentElement.style.setProperty('--app-bottom-inset', `${Math.round(bottomInset)}px`);
    };

    setInsets();
    window.addEventListener('resize', setInsets);
    window.addEventListener('orientationchange', setInsets);
    window.visualViewport?.addEventListener('resize', setInsets);
    window.visualViewport?.addEventListener('scroll', setInsets);
    return () => {
      window.removeEventListener('resize', setInsets);
      window.removeEventListener('orientationchange', setInsets);
      window.visualViewport?.removeEventListener('resize', setInsets);
      window.visualViewport?.removeEventListener('scroll', setInsets);
    };
  }, []);

  useEffect(() => {
    installMusicAutostart();
  }, []);

  useEffect(() => {
    const pause = () => {
      pauseMusic();
      suspendExistingAudioContext();
    };
    const resume = () => {
      resumeExistingAudioContext();
      resumeMusicIfPossible();
    };

    const onVisibility = () => {
      if (document.hidden) pause();
      else resume();
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', pause);
    window.addEventListener('blur', pause);
    window.addEventListener('focus', resume);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', pause);
      window.removeEventListener('blur', pause);
      window.removeEventListener('focus', resume);
    };
  }, []);

  useEffect(() => {
    const update = () => setMasterOutputGain(settings.soundEnabled ? settings.masterVolume : 0);
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
    };
  }, [settings.masterVolume, settings.soundEnabled]);

  useEffect(() => {
    const master = settings.soundEnabled ? settings.masterVolume : 0;
    setMasterOutputGain(master);

    setSfxConfig({
      enabled: settings.soundEnabled,
      volume: settings.masterVolume * settings.effectsVolume,
    });

    setMusicConfig({
      enabled: settings.soundEnabled,
      volume: settings.masterVolume * settings.musicVolume,
    });
  }, [
    settings.effectsVolume,
    settings.masterVolume,
    settings.musicVolume,
    settings.soundEnabled,
  ]);

  return (
    <div className="fixed inset-0 bg-gray-900 overflow-hidden">
      {/* 3D Scene */}
      <Scene />

      {/* UI Overlays */}
      {!menuOpen && <Crosshair />}
      {!requireLandscape && !menuOpen && <BottomBar />}
      {!isMobile && !requireLandscape && !menuOpen && !uiPopoverOpen && <DesktopControlsHint />}
      {!requireLandscape && !menuOpen && !uiPopoverOpen && <MenuButton />}
      {!requireLandscape && !menuOpen && !uiPopoverOpen && (
        <ConnectionPointCycleButton hideWhenPointerLocked={!isMobile} />
      )}

      {/* Mobile Controls */}
      {isMobile && !requireLandscape && !menuOpen && (
        <>
          <VirtualJoystick />
          <VirtualJoystickCamera />
        </>
      )}

      {!requireLandscape && menuOpen && <MainMenu isMobile={isMobile} />}

      {requireLandscape && <LandscapeRequiredOverlay />}
    </div>
  );
}

export default App;
