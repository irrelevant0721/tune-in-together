import { useEffect, type RefObject } from 'react';

/** 翻页后将滚动容器回到顶部，便于从第一项开始浏览 */
export function useScrollToTopOnPageChange(
  page: number,
  scrollRef?: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    scrollRef?.current?.scrollTo({ top: 0, behavior: 'auto' });
  }, [page, scrollRef]);
}
