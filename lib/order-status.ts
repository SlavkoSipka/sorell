/** Vrednosti u koloni `orders.status` — plaćanje je pouzećem. */
export const ORDER_STATUSES = [
  'poruceno',
  'kontaktiran',
  'poslato',
  'placeno',
  'odbijeno',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  poruceno: 'Poručeno',
  kontaktiran: 'Kontaktiran',
  poslato: 'Poslato',
  placeno: 'Plaćeno',
  odbijeno: 'Odbijeno',
};

export function formatOrderStatusLabel(status: string): string {
  if ((ORDER_STATUSES as readonly string[]).includes(status)) {
    return ORDER_STATUS_LABELS[status as OrderStatus];
  }
  return status;
}

/** Za href="tel:…" — uklanja razmake i tipične separatore. */
export function telHref(phone: string): string {
  const t = phone.trim();
  if (!t) return '#';
  const compact = t.replace(/[\s ()/.-]/g, '');
  if (!compact) return '#';
  return `tel:${compact}`;
}
