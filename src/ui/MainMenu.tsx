import { useEffect, useMemo, useRef, useState } from 'react';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import SaveIcon from '@mui/icons-material/Save';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import SettingsIcon from '@mui/icons-material/Settings';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import TuneIcon from '@mui/icons-material/Tune';
import HighQualityIcon from '@mui/icons-material/HighQuality';
import { useBrickStore } from '../store/useBrickStore';
import { playSfx } from '../utils/sfx';

type MenuView = 'main' | 'settings' | 'help' | 'save' | 'load';

type MainMenuProps = {
  isMobile: boolean;
};

const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

export const MainMenu = ({ isMobile }: MainMenuProps) => {
  const closeMenu = useBrickStore((state) => state.closeMenu);
  const startNewGame = useBrickStore((state) => state.startNewGame);
  const hasActiveSession = useBrickStore((state) => state.hasActiveSession);
  const currentProjectId = useBrickStore((state) => state.currentProjectId);
  const projects = useBrickStore((state) => state.projects);
  const refreshProjectsFromStorage = useBrickStore((state) => state.refreshProjectsFromStorage);
  const saveCurrentProject = useBrickStore((state) => state.saveCurrentProject);
  const saveNewProject = useBrickStore((state) => state.saveNewProject);
  const loadProject = useBrickStore((state) => state.loadProject);

  const settings = useBrickStore((state) => state.settings);
  const setSoundEnabled = useBrickStore((state) => state.setSoundEnabled);
  const setMasterVolume = useBrickStore((state) => state.setMasterVolume);
  const setEffectsVolume = useBrickStore((state) => state.setEffectsVolume);
  const setMusicVolume = useBrickStore((state) => state.setMusicVolume);
  const setJoystickMoveSensitivity = useBrickStore((state) => state.setJoystickMoveSensitivity);
  const setJoystickLookSensitivity = useBrickStore((state) => state.setJoystickLookSensitivity);
  const setQuality = useBrickStore((state) => state.setQuality);
  const setTouchControlsEnabled = useBrickStore((state) => state.setTouchControlsEnabled);
  const setMovementControlMode = useBrickStore((state) => state.setMovementControlMode);
  const setTouchToPlaceEnabled = useBrickStore((state) => state.setTouchToPlaceEnabled);

  const [view, setView] = useState<MenuView>('main');
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimeoutRef = useRef<number | null>(null);
  const [saveName, setSaveName] = useState('');
  const [projectSearch, setProjectSearch] = useState('');

  useEffect(() => {
    return () => {
      if (noticeTimeoutRef.current !== null) window.clearTimeout(noticeTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (view === 'load') refreshProjectsFromStorage();
  }, [refreshProjectsFromStorage, view]);

  const showNotice = (message: string) => {
    setNotice(message);
    if (noticeTimeoutRef.current !== null) window.clearTimeout(noticeTimeoutRef.current);
    noticeTimeoutRef.current = window.setTimeout(() => setNotice(null), 1600);
  };

  const title = useMemo(() => {
    return isMobile ? 'Studli' : 'Studli';
  }, [isMobile]);

  const isTouchCapable = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return ('ontouchstart' in window) || (navigator.maxTouchPoints ?? 0) > 0;
  }, []);

  const activeProjectName = useMemo(() => {
    if (!currentProjectId) return null;
    return projects.find((p) => p.id === currentProjectId)?.name ?? null;
  }, [currentProjectId, projects]);

  const filteredProjects = useMemo(() => {
    const query = projectSearch.trim().toLowerCase();
    const list = [...projects].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
    if (!query) return list;
    return list.filter((p) => p.name.toLowerCase().includes(query));
  }, [projectSearch, projects]);

  const formatDate = (timestamp: number) => {
    try {
      return new Date(timestamp).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const getProjectMeta = (id: string) => projects.find((p) => p.id === id) ?? null;

  const getTopColors = (projectId: string) => {
    const project = getProjectMeta(projectId);
    if (!project) return [];
    const counts = new Map<string, number>();
    for (const b of project.snapshot.placedBricks ?? []) {
      counts.set(b.color, (counts.get(b.color) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([color]) => color);
  };

  return (
    <div className="fixed inset-0 z-[70] pointer-events-auto bg-gradient-to-b from-gray-950 to-gray-900 overflow-y-auto">
      <div
        className="min-h-full w-full flex flex-col items-center justify-center"
        style={{
          paddingTop: 'max(2.5rem, env(safe-area-inset-top))',
          paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
          paddingLeft: 'max(1rem, env(safe-area-inset-left))',
          paddingRight: 'max(1rem, env(safe-area-inset-right))',
        }}
      >
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center gap-3 pb-4">
            <img
              src={`${import.meta.env.BASE_URL}brick.png`}
              alt="Studli"
              draggable={false}
              className="w-12 h-12"
            />
            <div className="text-white text-2xl font-bold tracking-wide">{title}</div>
          </div>

          {view === 'main' ? (
            <div className={hasActiveSession ? 'space-y-1.5' : 'space-y-2'}>
                  {hasActiveSession && (
                    <button
                      onClick={() => {
                        playSfx('click');
                        closeMenu();
                      }}
                      className={`w-full ${hasActiveSession ? 'h-10' : 'h-11'} rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.99] transition text-white font-semibold flex items-center justify-center gap-2`}
                    >
                      <PlayArrowIcon fontSize="small" />
                      Continue
                    </button>
                  )}

                  {hasActiveSession && (
                    <button
                      onClick={() => {
                        playSfx('click');
                        const saved = saveCurrentProject();
                        if (saved) {
                          showNotice('Saved.');
                        } else {
                          setSaveName(activeProjectName ?? '');
                          setView('save');
                        }
                      }}
                      className={`w-full ${hasActiveSession ? 'h-10' : 'h-11'} rounded-xl bg-gray-800 hover:bg-gray-700 active:scale-[0.99] transition text-white font-semibold flex items-center justify-center gap-2 border border-gray-700`}
                    >
                      <SaveIcon fontSize="small" />
                      Save
                    </button>
                  )}

                  <button
                    onClick={() => {
                      playSfx('click');
                      startNewGame();
                    }}
                    className={`w-full ${hasActiveSession ? 'h-10' : 'h-11'} rounded-xl bg-gray-800 hover:bg-gray-700 active:scale-[0.99] transition text-white font-semibold flex items-center justify-center gap-2 border border-gray-700`}
                  >
                    <AddCircleOutlineIcon fontSize="small" />
                    New Game
                  </button>

                  <button
                    onClick={() => {
                      playSfx('click');
                      setProjectSearch('');
                      setView('load');
                    }}
                    className={`w-full ${hasActiveSession ? 'h-10' : 'h-11'} rounded-xl bg-gray-800 hover:bg-gray-700 active:scale-[0.99] transition text-white font-semibold flex items-center justify-center gap-2 border border-gray-700`}
                  >
                    <FolderOpenIcon fontSize="small" />
                    Load Game
                  </button>

                  <button
                    onClick={() => {
                      playSfx('click');
                      setView('settings');
                    }}
                    className={`w-full ${hasActiveSession ? 'h-10' : 'h-11'} rounded-xl bg-gray-800 hover:bg-gray-700 active:scale-[0.99] transition text-white font-semibold flex items-center justify-center gap-2 border border-gray-700`}
                  >
                    <SettingsIcon fontSize="small" />
                    Settings
                  </button>

                  <button
                    onClick={() => {
                      playSfx('click');
                      setView('help');
                    }}
                    className={`w-full ${hasActiveSession ? 'h-10' : 'h-11'} rounded-xl bg-gray-800 hover:bg-gray-700 active:scale-[0.99] transition text-white font-semibold flex items-center justify-center gap-2 border border-gray-700`}
                  >
                    <HelpOutlineIcon fontSize="small" />
                    Help
                  </button>

                  {notice && (
                    <div className="pt-2 text-center text-xs text-gray-300">{notice}</div>
                  )}
            </div>
          ) : view === 'settings' ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-1">
                <button
                  onClick={() => {
                    playSfx('click');
                    setView('main');
                  }}
                  className="w-10 h-10 rounded-full bg-gray-800 border border-gray-700 text-white hover:bg-gray-700 active:scale-95 transition flex items-center justify-center"
                  aria-label="Back"
                  title="Back"
                >
                  <ArrowBackIcon fontSize="small" />
                </button>
                <div className="text-white font-semibold text-lg">Settings</div>
              </div>

                <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-white font-semibold flex items-center gap-2">
                    {settings.soundEnabled ? <VolumeUpIcon fontSize="small" /> : <VolumeOffIcon fontSize="small" />}
                    Sound
                  </div>
                  <button
                    onClick={() => {
                      playSfx('click');
                      setSoundEnabled(!settings.soundEnabled);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition ${
                      settings.soundEnabled
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-gray-900 border-gray-700 text-gray-200'
                    }`}
                  >
                    {settings.soundEnabled ? 'On' : 'Off'}
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-gray-200 text-sm font-medium">Master volume</div>
                    <div className="text-gray-300 text-sm tabular-nums">{formatPercent(settings.masterVolume)}</div>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(settings.masterVolume * 100)}
                    onChange={(e) => setMasterVolume(Number(e.target.value) / 100)}
                    className="w-full"
                  />
                </div>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-gray-200 text-sm font-medium">Effects volume</div>
                      <div className="text-gray-300 text-sm tabular-nums">{formatPercent(settings.effectsVolume)}</div>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round(settings.effectsVolume * 100)}
                      onChange={(e) => setEffectsVolume(Number(e.target.value) / 100)}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-gray-200 text-sm font-medium">Music volume</div>
                      <div className="text-gray-300 text-sm tabular-nums">{formatPercent(settings.musicVolume)}</div>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round(settings.musicVolume * 100)}
                      onChange={(e) => setMusicVolume(Number(e.target.value) / 100)}
                      className="w-full"
                    />
                    <div className="text-[11px] text-gray-400">Plays after the first tap/click (browser audio rules).</div>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <div className="text-gray-200 text-sm font-medium flex items-center gap-2">
                      <HighQualityIcon fontSize="small" />
                      Quality
                    </div>
                    <div className="flex items-center gap-2">
                      {(['low', 'medium', 'high'] as const).map((q) => (
                        <button
                          key={q}
                          onClick={() => {
                            playSfx('click');
                            setQuality(q);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition ${
                            settings.quality === q
                              ? 'bg-blue-600 border-blue-500 text-white'
                              : 'bg-gray-900 border-gray-700 text-gray-200 hover:bg-gray-800'
                          }`}
                          title={q}
                        >
                          {q.charAt(0).toUpperCase() + q.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="text-[11px] text-gray-400">
                    Lower quality improves performance on slower devices.
                  </div>
                </div>

                {isTouchCapable && (
                  <div className="space-y-4 pt-1">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-gray-200 text-sm font-medium flex items-center gap-2">
                          <TuneIcon fontSize="small" />
                          Touch controls
                        </div>
                        <button
                          onClick={() => {
                            playSfx('click');
                            setTouchControlsEnabled(!settings.touchControlsEnabled);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition ${
                            settings.touchControlsEnabled
                              ? 'bg-blue-600 border-blue-500 text-white'
                              : 'bg-gray-900 border-gray-700 text-gray-200'
                          }`}
                        >
                          {settings.touchControlsEnabled ? 'On' : 'Off'}
                        </button>
                      </div>
                      <div className="text-[11px] text-gray-400">
                        Shows on-screen movement/look controls.
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-gray-200 text-sm font-medium flex items-center gap-2">
                          <TuneIcon fontSize="small" />
                          Movement control
                        </div>
                        <div className="flex items-center gap-2">
                          {(['joystick', 'dpad'] as const).map((mode) => (
                            <button
                              key={mode}
                              onClick={() => {
                                playSfx('click');
                                setMovementControlMode(mode);
                              }}
                              className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition ${
                                settings.movementControlMode === mode
                                  ? 'bg-blue-600 border-blue-500 text-white'
                                  : 'bg-gray-900 border-gray-700 text-gray-200 hover:bg-gray-800'
                              }`}
                              title={mode === 'dpad' ? 'D-pad' : 'Joystick'}
                            >
                              {mode === 'dpad' ? 'D-pad' : 'Joystick'}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="text-[11px] text-gray-400">
                        D-pad can be easier for kids.
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-gray-200 text-sm font-medium flex items-center gap-2">
                          <TuneIcon fontSize="small" />
                          Touch-to-place
                        </div>
                        <button
                          onClick={() => {
                            playSfx('click');
                            setTouchToPlaceEnabled(!settings.touchToPlaceEnabled);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition ${
                            settings.touchToPlaceEnabled
                              ? 'bg-blue-600 border-blue-500 text-white'
                              : 'bg-gray-900 border-gray-700 text-gray-200'
                          }`}
                        >
                          {settings.touchToPlaceEnabled ? 'On' : 'Off'}
                        </button>
                      </div>
                      <div className="text-[11px] text-gray-400">
                        Touch and drag to move the ghost brick, then lift to place.
                      </div>
                    </div>

                    {settings.touchControlsEnabled && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="text-gray-200 text-sm font-medium flex items-center gap-2">
                              <TuneIcon fontSize="small" />
                              Move joystick sensitivity
                            </div>
                            <div className="text-gray-300 text-sm tabular-nums">
                              {settings.joystickMoveSensitivity.toFixed(1)}x
                            </div>
                          </div>
                          <input
                            type="range"
                            min={40}
                            max={200}
                            value={Math.round(settings.joystickMoveSensitivity * 100)}
                            onChange={(e) => setJoystickMoveSensitivity(Number(e.target.value) / 100)}
                            className="w-full"
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="text-gray-200 text-sm font-medium flex items-center gap-2">
                              <TuneIcon fontSize="small" />
                              Look joystick sensitivity
                            </div>
                            <div className="text-gray-300 text-sm tabular-nums">
                              {settings.joystickLookSensitivity.toFixed(1)}x
                            </div>
                          </div>
                          <input
                            type="range"
                            min={40}
                            max={200}
                            value={Math.round(settings.joystickLookSensitivity * 100)}
                            onChange={(e) => setJoystickLookSensitivity(Number(e.target.value) / 100)}
                            className="w-full"
                          />
                          <div className="text-[11px] text-gray-400">
                            Adjusts how fast the camera turns when using the right joystick.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : view === 'save' ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-1">
                <button
                  onClick={() => {
                    playSfx('click');
                    setView('main');
                  }}
                  className="w-10 h-10 rounded-full bg-gray-800 border border-gray-700 text-white hover:bg-gray-700 active:scale-95 transition flex items-center justify-center"
                  aria-label="Back"
                  title="Back"
                >
                  <ArrowBackIcon fontSize="small" />
                </button>
                <div className="text-white font-semibold text-lg">Save</div>
              </div>

              <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-4 space-y-3">
                <div className="text-gray-200 text-sm">
                  {currentProjectId ? (
                    <>
                      Current project: <span className="font-semibold text-white">{activeProjectName ?? 'Untitled'}</span>
                    </>
                  ) : (
                    'Name your project:'
                  )}
                </div>

                {!currentProjectId && (
                  <input
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    placeholder="My world"
                    className="w-full px-3 py-2 rounded-md bg-gray-950 border border-gray-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={40}
                    autoFocus
                  />
                )}

                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => {
                      playSfx('click');
                      setView('main');
                    }}
                    className="px-4 py-2 rounded-md bg-gray-900 border border-gray-700 text-gray-200 hover:bg-gray-800 active:scale-95 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      playSfx('click');
                      if (currentProjectId) {
                        const saved = saveCurrentProject();
                        showNotice(saved ? 'Saved.' : 'Nothing to save.');
                        setView('main');
                        return;
                      }
                      const id = saveNewProject(saveName || 'My world');
                      if (!id) {
                        showNotice('Enter a name.');
                        return;
                      }
                      showNotice('Saved.');
                      setView('main');
                    }}
                    className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-semibold active:scale-95 transition"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          ) : view === 'load' ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-1">
                <button
                  onClick={() => {
                    playSfx('click');
                    setView('main');
                  }}
                  className="w-10 h-10 rounded-full bg-gray-800 border border-gray-700 text-white hover:bg-gray-700 active:scale-95 transition flex items-center justify-center"
                  aria-label="Back"
                  title="Back"
                >
                  <ArrowBackIcon fontSize="small" />
                </button>
                <div className="text-white font-semibold text-lg">Load Game</div>
              </div>

              <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-4 space-y-3">
                <input
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  placeholder="Search worlds..."
                  className="w-full px-3 py-2 rounded-md bg-gray-950 border border-gray-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                {filteredProjects.length === 0 ? (
                  <div className="text-gray-300 text-sm py-6 text-center">
                    No saved projects yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {filteredProjects.map((p) => {
                      const topColors = getTopColors(p.id);
                      const brickCount = p.snapshot.placedBricks?.length ?? 0;
                      const isActive = currentProjectId === p.id;

                      return (
                        <button
                          key={p.id}
                          onClick={() => {
                            playSfx('click');
                            const ok = loadProject(p.id);
                            if (!ok) showNotice('Failed to load.');
                          }}
                          className={`w-full text-left rounded-xl border transition p-4 hover:bg-gray-800/60 active:scale-[0.995] ${
                            isActive ? 'border-blue-500 bg-blue-600/10' : 'border-gray-700 bg-gray-900/40'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-white font-semibold truncate">{p.name}</div>
                              <div className="text-[12px] text-gray-300 mt-0.5">
                                {brickCount.toLocaleString()} bricks · Last played {formatDate(p.updatedAt)}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {topColors.length > 0 ? (
                                topColors.map((c) => (
                                  <div
                                    key={c}
                                    className="w-4 h-4 rounded border border-black/30"
                                    style={{ backgroundColor: c }}
                                  />
                                ))
                              ) : (
                                <div className="w-16 h-4 rounded bg-gray-700/60" />
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-1">
                <button
                  onClick={() => {
                    playSfx('click');
                    setView('main');
                  }}
                  className="w-10 h-10 rounded-full bg-gray-800 border border-gray-700 text-white hover:bg-gray-700 active:scale-95 transition flex items-center justify-center"
                  aria-label="Back"
                  title="Back"
                >
                  <ArrowBackIcon fontSize="small" />
                </button>
                <div className="text-white font-semibold text-lg">Help</div>
              </div>

              <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-4 space-y-3">
                <div className="text-gray-200 text-sm">
                  {isMobile ? 'Touch controls:' : 'Desktop controls:'}
                </div>
                {isMobile ? (
                  <ul className="list-disc pl-5 space-y-1 text-gray-200 text-sm">
                    <li>Left joystick: move</li>
                    <li>Right joystick: look</li>
                    <li>Tap: place brick</li>
                    <li>Pinch: zoom</li>
                    <li>Menu: open/close</li>
                    <li>Anchor button: cycles which stud is the primary snap point for placement</li>
                  </ul>
                ) : (
                  <ul className="list-disc pl-5 space-y-1 text-gray-200 text-sm">
                    <li>Esc: enter/exit build mode</li>
                    <li>WASD: move</li>
                    <li>Mouse: look</li>
                    <li>Click: place</li>
                    <li>Wheel: zoom</li>
                    <li>C: cycle connection point</li>
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
