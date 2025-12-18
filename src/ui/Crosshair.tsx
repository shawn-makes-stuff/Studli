export const Crosshair = () => {
  return (
    <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-10">
      <div className="relative w-3 h-3">
        {/* Horizontal line */}
        <div className="absolute top-1/2 left-0 w-full h-px bg-white/80 shadow-[0_0_4px_rgba(0,0,0,0.8)]" />
        {/* Vertical line */}
        <div className="absolute left-1/2 top-0 h-full w-px bg-white/80 shadow-[0_0_4px_rgba(0,0,0,0.8)]" />
        {/* Center dot */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-white/80 rounded-full shadow-[0_0_4px_rgba(0,0,0,0.8)]" />
      </div>
    </div>
  );
};
