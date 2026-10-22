export function planAccountSocketRefresh({
  socketActive,
  maintainRoomSession,
}: {
  socketActive: boolean;
  maintainRoomSession: boolean;
}): { reconnectSocket: boolean; rejoinRoom: boolean } {
  return {
    reconnectSocket: socketActive,
    rejoinRoom: maintainRoomSession,
  };
}
