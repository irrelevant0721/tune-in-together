import { useEffect, useState } from 'react';
import {
  getSongPreviewState,
  subscribeSongPreview,
  type SongPreviewState,
} from '../lib/songPreviewPlayer';

/** 订阅全局试听播放器状态（搜索结果试听共用） */
export function useSongPreviewState(): SongPreviewState {
  const [state, setState] = useState<SongPreviewState>(getSongPreviewState);

  useEffect(() => {
    setState(getSongPreviewState());
    return subscribeSongPreview(() => setState(getSongPreviewState()));
  }, []);

  return state;
}
