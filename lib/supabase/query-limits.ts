/** Maks. broj porudžbina u admin listi (performanse). */
export const ORDER_LIST_LIMIT = 500;

/** Po stranici na admin listi (brži prvi prikaz). */
export const ORDER_LIST_INITIAL_LIMIT = 50;

/** Veličina batch-a pri „učitaj sve". */
export const ORDER_LIST_PAGE_SIZE = 200;

/** Maks. rezultata pretrage (cela baza). */
export const ORDER_SEARCH_LIMIT = 500;

export const ORDER_LIST_COLUMNS =
  'id, customer_first_name, customer_last_name, customer_email, customer_phone, address_line, city, postal_code, note, admin_notes, line_items, total_rsd, subtotal_rsd, shipping_rsd, discount_type, discount_percent, promo_code, promo_discount_percent, promo_discount_rsd, status, created_at';
