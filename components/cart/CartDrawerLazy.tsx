'use client';

import dynamic from 'next/dynamic';
import { useCart } from '@/lib/cart-context';

/** Drawer se učitava tek kad korisnik prvi put otvori korpu. */
const CartDrawer = dynamic(() => import('@/components/cart/CartDrawer'), { ssr: false });

export default function CartDrawerLazy() {
  const { isOpen, itemCount } = useCart();
  if (!isOpen && itemCount === 0) return null;
  return <CartDrawer />;
}
