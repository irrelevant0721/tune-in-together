import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import WechatFileHelperCollector from './WechatFileHelperCollector';
import {
  deleteUserSticker,
  describeStickerSendIssue,
  formatStickerSize,
  getStickerBlobUrl,
  getStickerDataUrlForSend,
  importUserStickerFiles,
  listUserStickersSync,
  localStickerImageKey,
  MAX_STICKER_BYTES,
  pruneInvalidUserStickers,
  subscribeUserStickers,
  type UserSticker,
} from '../lib/userStickerStore';

const STICKER_FILE_ACCEPT = 'image/gif,image/png,image/jpeg,image/jpg,image/webp';

interface Props {
  disabled?: boolean;
  onSendSticker: (imageUrl: string, imageKey: string) => Promise<void>;
}

export default function UserStickerPanel({ disabled = false, onSendSticker }: Props) {
  const [stickers, setStickers] = useState<UserSticker[]>(() => listUserStickersSync());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [thumbUrls, setThumbUrls] = useState<Record<string, string>>({});
  const [brokenIds, setBrokenIds] = useState<Set<string>>(() => new Set());
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [collectorOpen, setCollectorOpen] = useState(false);
  const thumbObjectUrlsRef = useRef<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => subscribeUserStickers(setStickers), []);

  useEffect(() => {
    void pruneInvalidUserStickers();
  }, []);

  useEffect(() => {
    let cancelled = false;
    thumbObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    thumbObjectUrlsRef.current = [];

    const loadThumbs = async () => {
      const next: Record<string, string> = {};
      const created: string[] = [];
      for (const sticker of stickers) {
        const url = await getStickerBlobUrl(sticker.id);
        if (url) {
          next[sticker.id] = url;
          created.push(url);
        }
      }
      if (cancelled) {
        created.forEach((url) => URL.revokeObjectURL(url));
        return;
      }
      thumbObjectUrlsRef.current = created;
      setBrokenIds(new Set());
      setThumbUrls(next);
    };

    void loadThumbs();
    return () => {
      cancelled = true;
      thumbObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      thumbObjectUrlsRef.current = [];
    };
  }, [stickers]);

  const handleSend = useCallback(async (sticker: UserSticker) => {
    if (disabled || sendingId) return;
    setSendingId(sticker.id);
    setError('');
    try {
      const dataUrl = await getStickerDataUrlForSend(sticker.id);
      if (!dataUrl) {
        const issue = await describeStickerSendIssue(sticker.id);
        throw new Error(issue || '表情无法发送');
      }
      await onSendSticker(dataUrl, localStickerImageKey(sticker.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送失败');
    } finally {
      setSendingId(null);
    }
  }, [disabled, onSendSticker, sendingId]);

  const handleDelete = useCallback(async (stickerId: string) => {
    setLoading(true);
    setError('');
    try {
      await deleteUserSticker(stickerId);
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFileImport = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length || disabled || loading) return;

    setLoading(true);
    setError('');
    try {
      const oversized = files.filter((file) => file.size > MAX_STICKER_BYTES);
      const validFiles = files.filter((file) => file.size > 0 && file.size <= MAX_STICKER_BYTES);
      const result = await importUserStickerFiles(validFiles);

      const messages: string[] = [];
      if (result.imported > 0) {
        messages.push(`已导入 ${result.imported} 个表情`);
      }
      if (result.skipped > 0) {
        messages.push(`${result.skipped} 个已存在，已跳过`);
      }
      if (result.rejected > 0) {
        messages.push(`${result.rejected} 个文件无效或格式不支持`);
      }
      if (oversized.length > 0) {
        messages.push(`${oversized.length} 个超过 ${formatStickerSize(MAX_STICKER_BYTES)} 限制`);
      }
      if (messages.length > 0) {
        setError(messages.join('；'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '导入失败');
    } finally {
      setLoading(false);
    }
  }, [disabled, loading]);

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="mb-2 flex flex-shrink-0 items-center gap-2 px-1">
          <button
            type="button"
            disabled={disabled || loading}
            onClick={() => setCollectorOpen(true)}
            className="rounded-lg border border-sky-400/30 bg-sky-400/10 px-2 py-1 text-[11px] text-sky-200 transition-colors hover:bg-sky-400/20 disabled:opacity-50"
          >
            微信导入
          </button>
          <button
            type="button"
            disabled={disabled || loading}
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 text-[11px] text-emerald-200 transition-colors hover:bg-emerald-400/20 disabled:opacity-50"
          >
            文件导入
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={STICKER_FILE_ACCEPT}
            multiple
            className="hidden"
            onChange={(event) => { void handleFileImport(event); }}
          />
        </div>

        {error && (
          <p className="mb-2 flex-shrink-0 px-1 text-[11px] text-amber-300">{error}</p>
        )}

        {stickers.length === 0 ? (
          <div className="flex flex-1 items-center justify-center px-3 text-center text-xs text-netease-muted">
            暂无表情。可微信导入或文件导入添加。
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-4 gap-1 overflow-y-auto overscroll-contain px-0.5 sm:grid-cols-5">
            {stickers.map((sticker) => (
              <div key={sticker.id} className="group relative">
                <button
                  type="button"
                  disabled={disabled || loading || sendingId === sticker.id}
                  onClick={() => { void handleSend(sticker); }}
                  className="flex h-16 w-full items-center justify-center rounded-lg border border-white/5 bg-white/5 p-1 transition-colors hover:bg-white/10 disabled:opacity-50"
                >
                  {thumbUrls[sticker.id] && !brokenIds.has(sticker.id) ? (
                    <img
                      src={thumbUrls[sticker.id]}
                      alt={sticker.name}
                      className="max-h-14 max-w-full object-contain"
                      onError={() => {
                        setBrokenIds((prev) => new Set(prev).add(sticker.id));
                      }}
                    />
                  ) : brokenIds.has(sticker.id) ? (
                    <span className="px-1 text-center text-[10px] leading-tight text-amber-300">无效</span>
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin text-netease-muted" />
                  )}
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => { void handleDelete(sticker.id); }}
                  className="absolute right-0.5 top-0.5 hidden rounded bg-black/60 p-0.5 text-white/80 group-hover:block"
                  aria-label="删除表情"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <WechatFileHelperCollector
        open={collectorOpen}
        onClose={() => setCollectorOpen(false)}
      />
    </>
  );
}
