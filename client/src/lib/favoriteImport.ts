export interface FavoriteImportStats {
  imported: number;
  dropped: number;
}

export function mergeFavoriteImportStats(
  current: FavoriteImportStats,
  result: Partial<FavoriteImportStats> | null | undefined,
): FavoriteImportStats {
  return {
    imported: current.imported + Math.max(0, Number(result?.imported) || 0),
    dropped: current.dropped + Math.max(0, Number(result?.dropped) || 0),
  };
}
