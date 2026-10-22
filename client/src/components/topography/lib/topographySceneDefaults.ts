/**
 * Mineradio sonic-topography 的世界锚定：168 单位的地形整体缩进主场景，
 * 相机沿用星河那台，所以推拉会同时作用在地形、歌词和歌单架上。
 * 数值取自 deriveGroundLayoutSettings 的中位档（range/lower/depth = 50）。
 */
export const TOPOGRAPHY_WORLD_SCALE = 0.132;
export const TOPOGRAPHY_WORLD_Y = -5.75;
export const TOPOGRAPHY_WORLD_Z = -6.95;

/** 场景雾按同一比例收缩，否则缩小后的地形会整片糊掉 */
export const TOPOGRAPHY_FOG_NEAR = 30 * TOPOGRAPHY_WORLD_SCALE;
export const TOPOGRAPHY_FOG_FAR = 95 * TOPOGRAPHY_WORLD_SCALE;
