export function getDisplayUpdateNotes(notes: string[]): string[] {
  return notes.length > 0 ? notes : ['体验优化与问题修复'];
}
