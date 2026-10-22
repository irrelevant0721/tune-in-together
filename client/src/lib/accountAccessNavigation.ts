export function getAccountAccessBackView(
  view: string,
  hasAccount: boolean,
): 'welcome' | 'methods' | 'manage' {
  if (view === 'methods') return 'welcome';
  return hasAccount ? 'manage' : 'methods';
}
