import { useCallback, useEffect, useRef, useState } from 'react';

interface Props {
  coverUrl: string;
  onPick: (hex: string) => void;
  onClose: () => void;
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

export default function CoverColorPickerPopover({ coverUrl, onPick, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [swatches, setSwatches] = useState<string[]>([]);
  const [preview, setPreview] = useState('#ffffff');

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const size = 180;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const scale = Math.max(size / img.width, size / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      const colors: string[] = [];
      const pts = [
        [0.2, 0.2], [0.5, 0.2], [0.8, 0.2],
        [0.2, 0.5], [0.5, 0.5], [0.8, 0.5],
        [0.2, 0.8], [0.5, 0.8], [0.8, 0.8],
      ];
      for (const [ux, uy] of pts) {
        const d = ctx.getImageData(Math.floor(ux * size), Math.floor(uy * size), 1, 1).data;
        colors.push(rgbToHex(d[0], d[1], d[2]));
      }
      setSwatches([...new Set(colors)]);
      setPreview(colors[4]);
    };
    img.src = coverUrl;
  }, [coverUrl]);

  const pickFromCanvas = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = Math.floor(((e.clientX - rect.left) / rect.width) * canvas.width);
      const y = Math.floor(((e.clientY - rect.top) / rect.height) * canvas.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const d = ctx.getImageData(x, y, 1, 1).data;
      const hex = rgbToHex(d[0], d[1], d[2]);
      setPreview(hex);
      onPick(hex);
    },
    [onPick],
  );

  return (
    <div className="cover-color-pop show" role="dialog" aria-label="封面取色">
      <div className="cover-color-head">
        <span>Cover Picker</span>
        <button type="button" className="cover-color-close" onClick={onClose} aria-label="关闭">
          ×
        </button>
      </div>
      <div className="cover-color-body">
        <canvas
          ref={canvasRef}
          className="cover-color-art"
          onClick={pickFromCanvas}
          title="点击封面取色"
        />
        <div className="cover-color-side">
          <div className="cover-color-preview" style={{ background: preview }} />
          <div className="cover-color-hint">点击专辑封面任意位置取色，或使用推荐色。</div>
          <div className="cover-color-swatches">
            {swatches.map((c) => (
              <button
                key={c}
                type="button"
                className="cover-color-swatch"
                style={{ background: c }}
                onClick={() => onPick(c)}
                title={c}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
