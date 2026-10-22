import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Search } from 'lucide-react';
import { fetchStickerSearchEnabled, searchStickers } from '../api/stickerSearch';
import Tooltip from './Tooltip';
import MusicLoading from './MusicLoading';

const GRID_ROWS = 3;
const STICKER_MAX_HEIGHT = '3.5rem';
const STICKER_HOVER_DELAY_MS = 300;
const STICKER_PREVIEW_MAX_HEIGHT = '7rem';
const STICKER_PREVIEW_MAX_WIDTH = '8.5rem';
const GRID_GAP = '0.375rem';
const GRID_HEIGHT = `calc(${GRID_ROWS} * ${STICKER_MAX_HEIGHT} + ${GRID_ROWS - 1} * ${GRID_GAP})`;
/** 面板内容区固定高度（含搜索栏、错误槽、网格、分页槽），供外层容器对齐 */
export const STICKER_SEARCH_PANEL_HEIGHT = `calc(3.125rem + 1.625rem + ${GRID_HEIGHT} + 2.375rem)`;
/** 含 ChatPanel p-2 内边距的外层弹层高度 */
export const STICKER_SEARCH_PICKER_HEIGHT = `calc(${STICKER_SEARCH_PANEL_HEIGHT} + 1rem)`;

interface Props {
  disabled?: boolean;
  onPick: (imageUrl: string) => void | Promise<void>;
  onBack: () => void;
}

export default function StickerSearchPanel({ disabled = false, onPick, onBack }: Props) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [query, setQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [page, setPage] = useState(1);
  const [maxPage, setMaxPage] = useState(1);
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sendingUrl, setSendingUrl] = useState<string | null>(null);

  useEffect(() => {
    void fetchStickerSearchEnabled().then(setEnabled);
  }, []);

  const runSearch = useCallback(async (words: string, nextPage: number) => {
    const trimmed = words.trim();
    if (!trimmed) {
      setError('请输入搜索关键词');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const result = await searchStickers(trimmed, nextPage);
      setActiveQuery(trimmed);
      setPage(result.page);
      setMaxPage(result.maxPage);
      setImages(result.images);
      if (result.images.length === 0) {
        setError('没有找到相关图片');
      }
    } catch (err) {
      setImages([]);
      setError(err instanceof Error ? err.message : '搜索失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = () => {
    void runSearch(query, 1);
  };

  const handlePick = async (imageUrl: string) => {
    if (disabled || sendingUrl) return;
    setSendingUrl(imageUrl);
    setError('');
    try {
      await onPick(imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送失败');
    } finally {
      setSendingUrl(null);
    }
  };

  if (enabled === false) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="mb-2 flex flex-shrink-0 items-center gap-2 px-1">
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg p-1 text-netease-muted transition-colors hover:bg-white/10 hover:text-white"
            aria-label="返回表情"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-[11px] text-netease-muted">表情包搜索</span>
        </div>
        <p className="px-2 py-6 text-center text-xs text-netease-muted">未配置表情包搜索</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: STICKER_SEARCH_PANEL_HEIGHT }}>
      <div className="mb-1.5 flex flex-shrink-0 items-center gap-2 px-1">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg p-1 text-netease-muted transition-colors hover:bg-white/10 hover:text-white"
          aria-label="返回表情"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-xl border border-netease-border/60 bg-netease-dark/80 px-2.5 py-2">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleSearch();
              }
            }}
            placeholder="搜索表情包"
            disabled={disabled || loading}
            className="min-h-[1.75rem] min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-netease-muted/70 outline-none"
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={disabled || loading || !query.trim()}
            className="rounded-lg p-1 text-netease-muted transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
            aria-label="搜索"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="mb-1.5 flex h-5 flex-shrink-0 items-center justify-center px-2">
        {error ? (
          <p className="text-center text-[11px] text-red-300/90">{error}</p>
        ) : null}
      </div>

      <div
        className="relative grid flex-shrink-0 grid-cols-5 gap-1.5 px-0.5"
        style={{
          height: GRID_HEIGHT,
          gridTemplateRows: `repeat(${GRID_ROWS}, ${STICKER_MAX_HEIGHT})`,
        }}
      >
        {images.map((imageUrl) => (
          <Tooltip
            key={imageUrl}
            side="top"
            delay={STICKER_HOVER_DELAY_MS}
            disabled={disabled || Boolean(sendingUrl)}
            content={(
              <img
                src={imageUrl}
                alt="表情包预览"
                className="mx-auto block rounded-lg object-contain"
                style={{ maxHeight: STICKER_PREVIEW_MAX_HEIGHT, maxWidth: STICKER_PREVIEW_MAX_WIDTH }}
              />
            )}
          >
            <button
              type="button"
              disabled={disabled || Boolean(sendingUrl)}
              onClick={() => void handlePick(imageUrl)}
              className="relative flex h-full min-h-0 w-full items-center justify-center rounded-lg bg-white/5 transition-colors hover:bg-white/10 disabled:opacity-50"
              aria-label="发送表情包"
            >
              <img
                src={imageUrl}
                alt=""
                loading="lazy"
                className="block max-h-full w-auto max-w-full rounded-lg object-contain"
              />
              {sendingUrl === imageUrl && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/45">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                </span>
              )}
            </button>
          </Tooltip>
        ))}
        {(loading && images.length === 0) || (!loading && images.length === 0 && !error) ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            {loading ? (
              <MusicLoading label="正在搜索表情" compact />
            ) : (
              <p className="text-center text-xs text-netease-muted">输入关键词开始搜索</p>
            )}
          </div>
        ) : null}
      </div>

      <div className="mt-1.5 flex h-8 flex-shrink-0 items-center justify-between px-1">
        {activeQuery && maxPage > 1 ? (
          <>
            <button
              type="button"
              disabled={disabled || loading || page <= 1}
              onClick={() => void runSearch(activeQuery, page - 1)}
              className="inline-flex items-center gap-0.5 rounded-lg px-2 py-1 text-[11px] text-netease-muted transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              上一页
            </button>
            <span className="text-[11px] tabular-nums text-netease-muted/80">
              {page} / {maxPage}
            </span>
            <button
              type="button"
              disabled={disabled || loading || page >= maxPage}
              onClick={() => void runSearch(activeQuery, page + 1)}
              className="inline-flex items-center gap-0.5 rounded-lg px-2 py-1 text-[11px] text-netease-muted transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
            >
              下一页
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
