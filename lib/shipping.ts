// lib/shipping.ts
//
// Single source of truth for the delivery fee.
// The server uses this to calculate what is actually charged; the checkout
// page imports the same value so the displayed fee always matches.
//
// If you later add rules (per province, free shipping over a threshold, etc.),
// change them here only.

export const DELIVERY_FEE = 5;

export function getShippingFee(): number {
  return DELIVERY_FEE;
}