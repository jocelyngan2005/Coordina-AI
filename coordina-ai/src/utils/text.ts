/**
 * Derives initials from a full name string.
 * e.g. "Alex Chen" → "AC", "Jordan" → "J"
 */
export function deriveInitials(name: string, maxChars = 2): string {
  return name
    .split(' ')
    .filter((w) => w.length > 0)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, maxChars);
}
