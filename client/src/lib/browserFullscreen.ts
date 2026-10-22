type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
  webkitRequestFullScreen?: () => Promise<void> | void;
};

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
  webkitCancelFullScreen?: () => Promise<void> | void;
};

export function getFullscreenElement(): Element | null {
  const doc = document as FullscreenDocument;
  return document.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

export function isDocumentFullscreen(): boolean {
  return Boolean(getFullscreenElement());
}

export async function requestElementFullscreen(el: HTMLElement): Promise<void> {
  const target = el as FullscreenElement;
  const request =
    target.requestFullscreen?.bind(target) ??
    target.webkitRequestFullscreen?.bind(target) ??
    target.webkitRequestFullScreen?.bind(target);
  if (!request) return;
  await Promise.resolve(request());
}

export async function exitDocumentFullscreen(): Promise<void> {
  if (!isDocumentFullscreen()) return;
  const doc = document as FullscreenDocument;
  const exit =
    document.exitFullscreen?.bind(document) ??
    doc.webkitExitFullscreen?.bind(document) ??
    doc.webkitCancelFullScreen?.bind(document);
  if (!exit) return;
  await Promise.resolve(exit());
}

export function subscribeFullscreenChange(onChange: () => void): () => void {
  document.addEventListener('fullscreenchange', onChange);
  document.addEventListener('webkitfullscreenchange', onChange);
  return () => {
    document.removeEventListener('fullscreenchange', onChange);
    document.removeEventListener('webkitfullscreenchange', onChange);
  };
}
