import { useState, type KeyboardEvent, type RefObject } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft } from "lucide-react";
import { buildPageNumbers } from "../lib/pagination";
import { useScrollToTopOnPageChange } from "../hooks/useScrollToTopOnPageChange";
import Tooltip from "./Tooltip";

interface Props {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  showFirst?: boolean;
  showPrevNext?: boolean;
  className?: string;
  scrollRef?: RefObject<HTMLElement | null>;
}

export default function PageNumberPagination({
  page,
  totalPages,
  onPageChange,
  disabled = false,
  showFirst = true,
  showPrevNext = true,
  className = "",
  scrollRef,
}: Props) {
  useScrollToTopOnPageChange(page, scrollRef);

  const [jumpValue, setJumpValue] = useState("");

  const handleJump = () => {
    const target = parseInt(jumpValue, 10);
    if (!isNaN(target) && target >= 1 && target <= totalPages && target !== page) {
      onPageChange(target);
    }
    setJumpValue("");
  };

  const handleJumpKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleJump();
  };

  if (totalPages <= 1) return null;

  const items = buildPageNumbers(page, totalPages);

  return (
    <div className={`flex flex-nowrap items-center justify-center gap-1 ${className}`}>
      {showFirst && (
        <Tooltip content="首页">
          <button
            type="button"
            disabled={disabled || page <= 1}
            onClick={() => onPageChange(1)}
            className="flex items-center gap-0.5 rounded-lg px-2 py-1.5 text-xs text-netease-muted transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">首页</span>
          </button>
        </Tooltip>
      )}
      {showPrevNext && (
        <button
          type="button"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="flex items-center gap-0.5 rounded-lg px-2 py-1.5 text-xs text-netease-muted transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">上一页</span>
        </button>
      )}

      <div className="flex items-center gap-0.5 px-1">
        {items.map((item, index) =>
          item === "ellipsis" ? (
            <span key={`ellipsis-${index}`} className="px-1 text-xs text-netease-muted/60 select-none" aria-hidden>
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              disabled={disabled}
              onClick={() => onPageChange(item)}
              aria-current={item === page ? "page" : undefined}
              className={`min-w-[1.75rem] rounded-lg px-1.5 py-1 text-xs transition-colors ${
                item === page ? "bg-netease-red text-white font-medium" : "text-netease-muted hover:bg-white/5 hover:text-white disabled:opacity-50"
              }`}
            >
              {item}
            </button>
          ),
        )}
      </div>

      {showPrevNext && (
        <button
          type="button"
          disabled={disabled || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="flex items-center gap-0.5 rounded-lg px-2 py-1.5 text-xs text-netease-muted transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
        >
          <span className="hidden sm:inline">下一页</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      )}

      <div className="flex items-center gap-1 ml-1 text-xs text-netease-muted">
        <input
          type="text"
          inputMode="numeric"
          value={jumpValue}
          onChange={(e) => setJumpValue(e.target.value.replace(/\D/g, ""))}
          onKeyDown={handleJumpKeyDown}
          disabled={disabled}
          className="w-10 rounded border border-white/10 bg-white/5 px-1.5 py-1 text-center text-xs text-white outline-none focus:border-netease-red disabled:opacity-30"
        />
        <span className="hidden sm:inline">页</span>
        <button
          type="button"
          disabled={disabled || !jumpValue}
          onClick={handleJump}
          className="rounded px-2 py-1 text-xs text-netease-muted transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
        >
          GO
        </button>
      </div>
    </div>
  );
}
