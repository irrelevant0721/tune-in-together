/** 首次访客提示登录；明确选择游客后不再自动提示。 */
export function getInitialAccountPanelOpen(hasChosenGuest: boolean): boolean {
  return !hasChosenGuest;
}
