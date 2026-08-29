export const SHIPPING_RSD = 450;
export const SHIPPING_CARRIER = 'Kurirska služba';

/** Prag za besplatnu dostavu. */
export const FREE_SHIPPING_THRESHOLD_RSD = 7000;

export const FREE_SHIPPING_THRESHOLD_LABEL =
  'Besplatna dostava za sve porudžbine iznad 7.000 RSD';

export const PICKUP_LABEL = 'Moguće lično preuzimanje u salonu.';

/** Poštarina za dati iznos proizvoda (posle popusta). 0 = besplatna iznad praga. */
export function shippingForProductsTotalRsd(productsTotalRsd: number): number {
  return productsTotalRsd >= FREE_SHIPPING_THRESHOLD_RSD ? 0 : SHIPPING_RSD;
}

export function isFreeShipping(productsTotalRsd: number): boolean {
  return shippingForProductsTotalRsd(productsTotalRsd) === 0;
}
