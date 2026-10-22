/** 启动页支持键盘无鼠标进入，同时避开页面内的其他快捷键。 */
export function isStartupSplashDismissKey(key: string): boolean {
  return key === 'Enter' || key === ' ' || key === 'Spacebar';
}
