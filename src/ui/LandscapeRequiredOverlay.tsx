export const LandscapeRequiredOverlay = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/95 text-white p-6">
      <div className="max-w-sm text-center">
        <div className="text-2xl font-semibold mb-2">Rotate to Landscape</div>
        <div className="text-sm text-gray-300">
          For very small screens, Studli requires landscape mode. Please rotate your device to continue.
        </div>
      </div>
    </div>
  );
};

