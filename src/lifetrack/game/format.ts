const groupFormatter = new Intl.NumberFormat('en-MY', { maximumFractionDigits: 0 });

export type SignMode = 'auto' | 'always' | 'never';

/** Formats an integer Ringgit amount, e.g. RM2,500, −RM300 or +RM1,000. */
export function formatRM(amount: number, sign: SignMode = 'auto'): string {
  const body = `RM${groupFormatter.format(Math.abs(Math.round(amount)))}`;
  if (amount < 0 && sign !== 'never') return `\u2212${body}`;
  if (amount > 0 && sign === 'always') return `+${body}`;
  return body;
}

export function joinWithAnd(parts: readonly string[]): string {
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}
