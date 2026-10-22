import { useMemo } from 'react';
import { X } from 'lucide-react';
import type { RoomUser } from '../types';
import type { ChatRoomSlice } from '../lib/chatRoomSlice';

interface Props {
  slice: ChatRoomSlice;
  myUserId: string;
  muteSaving: boolean;
  onClose: () => void;
  onToggleMuteAll: () => void;
  onToggleUserMute: (user: RoomUser) => void;
}

export default function ChatMutePicker({
  slice,
  myUserId,
  muteSaving,
  onClose,
  onToggleMuteAll,
  onToggleUserMute,
}: Props) {
  const mutedSet = useMemo(() => new Set(slice.mutedUserIds || []), [slice.mutedUserIds]);

  const orderedMuteUsers = useMemo(
    () => slice.users
      .filter((user) => user.id !== myUserId)
      .sort((a, b) => a.joinedAt - b.joinedAt),
    [slice.users, myUserId],
  );

  return (
    <>
      <div className="mb-3 flex flex-shrink-0 items-center justify-between px-1">
        <h2 className="text-base font-semibold text-white">禁言管理</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-white/40 hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-0.5">
        <button
          type="button"
          disabled={muteSaving}
          onClick={onToggleMuteAll}
          className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors disabled:opacity-50 ${slice.muteAll ? 'bg-amber-400/15 text-amber-300' : 'text-white/90 hover:bg-white/10'}`}
        >
          <span className="font-medium">全体禁言</span>
          <span className="text-xs text-netease-muted">{slice.muteAll ? '点击解禁' : '点击禁言'}</span>
        </button>
        {orderedMuteUsers.map((user) => {
          const isMuted = mutedSet.has(user.id);
          return (
            <button
              key={user.id}
              type="button"
              disabled={muteSaving}
              onClick={() => onToggleUserMute(user)}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors disabled:opacity-40 ${isMuted ? 'bg-amber-400/15 text-amber-300' : 'text-white/90 hover:bg-white/10'}`}
            >
              <span className="min-w-0 truncate">{user.nickname}</span>
              <span className="ml-2 flex-shrink-0 text-xs text-netease-muted">
                {isMuted ? '点击解禁' : '点击禁言'}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
