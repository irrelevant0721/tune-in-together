import { getStoredSongResultPageSize } from '../lib/songResultPagination';

export const RESULT_BODY_HEIGHT = 'min(52vh, 480px)';

const SHIMMER_ROW_CAP = 6;

interface Props {
  count?: number;
  fillHeight?: boolean;
  showPaginationFooter?: boolean;
}

function PaginationSkeleton() {
  return (
    <div className="mt-auto flex-shrink-0 space-y-2 overflow-visible border-t border-netease-border/40 bg-netease-bg/90 pt-3">
      <div className="flex items-center justify-between gap-2">
        <div className="h-7 w-24 rounded-lg skeleton-shimmer" />
        <div className="h-4 w-20 rounded skeleton-shimmer" />
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="h-7 w-28 rounded-lg skeleton-shimmer" />
        <div className="h-7 w-16 rounded-lg skeleton-shimmer" />
        <div className="h-7 w-20 rounded-lg skeleton-shimmer" />
      </div>
    </div>
  );
}

export default function SearchSkeleton({
  count = getStoredSongResultPageSize(),
  fillHeight = false,
  showPaginationFooter = true,
}: Props) {
  return (
    <div
      className={`flex min-h-0 flex-col ${fillHeight ? 'h-full' : ''}`}
      style={fillHeight ? undefined : { height: RESULT_BODY_HEIGHT }}
    >
      <div className="min-h-0 flex-1 space-y-2 overflow-hidden">
        {Array.from({ length: count }, (_, i) => {
          const shimmer = i < SHIMMER_ROW_CAP;
          const blockCls = shimmer ? 'skeleton-shimmer' : 'bg-white/5';
          return (
          <div
            key={i}
            className="flex items-center gap-3 rounded-xl p-3"
            style={shimmer ? { animationDelay: `${i * 60}ms` } : undefined}
          >
            <div className={`h-12 w-12 flex-shrink-0 rounded-lg ${blockCls}`} />
            <div className="min-w-0 flex-1 space-y-2.5">
              <div
                className={`h-3.5 rounded-md ${blockCls}`}
                style={{ width: `${55 + (i % 3) * 12}%` }}
              />
              <div
                className={`h-3 rounded-md ${blockCls}`}
                style={{ width: `${35 + (i % 2) * 15}%` }}
              />
            </div>
            <div className={`h-5 w-10 flex-shrink-0 rounded-full ${blockCls}`} />
          </div>
          );
        })}
      </div>
      {showPaginationFooter && <PaginationSkeleton />}
    </div>
  );
}
