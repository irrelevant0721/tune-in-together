import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { immersiveGlassModal, immersiveGlassScrim } from '../../lib/immersiveGlass';

interface Props {
  open: boolean;
  onKeepBackground: () => void;
  onSwitchCoverBg: () => void;
  onCancel: () => void;
}

/** 退出沉浸：是否保留当前动态背景 */
export default function ImmersiveExitModal({
  open,
  onKeepBackground,
  onSwitchCoverBg,
  onCancel,
}: Props) {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        className={`absolute inset-0 ${immersiveGlassScrim}`}
        onClick={onCancel}
        aria-label="关闭"
      />
      <div
        className={`relative w-full max-w-sm rounded-[22px] p-6 shadow-2xl ${immersiveGlassModal}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="immersive-exit-title"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="immersive-exit-title" className="text-lg font-semibold text-white">
            退出沉浸模式
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="关闭"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-6 text-sm leading-relaxed text-white/75">
          是否保留当前动态背景？选择「是」将保留现有背景；选择「否」将切换为封面背景。
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <button
            type="button"
            onClick={onSwitchCoverBg}
            className="mineradio-glass-btn rounded-xl px-4 py-2.5 text-sm text-white/82 transition-colors hover:text-white whitespace-nowrap"
          >
            否，切回封面
          </button>
          <button
            type="button"
            onClick={onKeepBackground}
            className="mineradio-glass-btn rounded-xl border border-[rgba(0,245,212,0.24)] bg-[rgba(0,245,212,0.12)] px-4 py-2.5 text-sm font-medium text-[#eafffb] transition-colors hover:bg-[rgba(0,245,212,0.18)] whitespace-nowrap"
          >
            是，保留背景
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
