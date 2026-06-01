// Centralizes class-name joining so UI components stay readable without adding a dependency yet.
export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
