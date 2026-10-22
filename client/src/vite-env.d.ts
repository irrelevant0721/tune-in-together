/// <reference types="vite/client" />

declare const __APP_BUILD_ID__: string;
declare const __APP_VERSION_NOTES__: string[];

interface DocumentPictureInPicture {
  requestWindow(options?: { width?: number; height?: number }): Promise<Window>;
}

interface Window {
  documentPictureInPicture?: DocumentPictureInPicture;
}
