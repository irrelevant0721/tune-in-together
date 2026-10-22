type GalaxyAudioModule = typeof import('../components/galaxy/lib/galaxyAudio');

let galaxyAudioPromise: Promise<GalaxyAudioModule> | null = null;

function isGalaxyAudioLoaded(): boolean {
  return Boolean(
    (globalThis as typeof globalThis & { __openmusicGalaxyAudioLoaded?: boolean })
      .__openmusicGalaxyAudioLoaded,
  );
}

function loadGalaxyAudio(): Promise<GalaxyAudioModule> {
  galaxyAudioPromise = galaxyAudioPromise ?? import('../components/galaxy/lib/galaxyAudio');
  return galaxyAudioPromise;
}

export function ensureGalaxyAudioOutputIfLoaded(): void {
  if (!isGalaxyAudioLoaded()) return;
  void loadGalaxyAudio().then((module) => {
    module.ensureGalaxyAudioOutput();
  });
}

export function resetGalaxyAudioWireIfLoaded(): void {
  if (!isGalaxyAudioLoaded()) return;
  void loadGalaxyAudio().then((module) => {
    module.resetGalaxyAudioWire();
  });
}
