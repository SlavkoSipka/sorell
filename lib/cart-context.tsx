'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  getBundleFallbackPriceRsd,
  getBundleMeta,
  getBundleComponentSlugs,
} from '@/lib/bundles';
import { VARIANTS } from '@/lib/data/products';

/**
 * Verzija je deo ključa: kad se katalog promeni (npr. prelazak na pakovanja),
 * stare korpe iz localStorage-a se ne učitavaju umesto da tiho nose nepostojeće
 * proizvode.
 */
const STORAGE_KEY = 'sorelle-cart-v2';

export type CartLine = {
  /** Ključ varijante: `<slug proizvoda>--<oznaka pakovanja>`, ili slug paketa. */
  slug: string;
  /** Slug proizvoda — za link ka stranici proizvoda. */
  productSlug: string;
  /** Pakovanje, npr. „30 g". Prazno kod paketa. */
  packageLabel: string;
  name: string;
  price: string;
  image: string;
  quantity: number;
};

export type CartLineInput = {
  slug: string;
  productSlug: string;
  packageLabel: string;
  name: string;
  price: string;
  image: string;
};

type StoredShape = {
  items: CartLine[];
  promoCode: string | null;
  promoDiscountPercent: number | null;
};

type CartContextValue = {
  items: CartLine[];
  itemCount: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addItem: (p: CartLineInput) => void;
  /** Dodaje paket kao jednu stavku (uklanja pojedinačne komponente iz korpe). */
  addBundle: (bundleId: string) => void;
  removeLine: (slug: string) => void;
  setQuantity: (slug: string, quantity: number) => void;
  clearCart: () => void;
  setPromo: (code: string, discountPercent: number) => void;
  clearPromo: () => void;
  promoCode: string | null;
  promoDiscountPercent: number | null;
};

const CartContext = createContext<CartContextValue | null>(null);

const EMPTY_STORED: StoredShape = { items: [], promoCode: null, promoDiscountPercent: null };

/** Odbacuje stavke kojih više nema u katalogu (promenjen asortiman, obrisana varijanta). */
function keepKnownLines(lines: CartLine[]): CartLine[] {
  return lines.filter(
    (l) =>
      l &&
      typeof l.slug === 'string' &&
      typeof l.quantity === 'number' &&
      l.quantity > 0 &&
      (VARIANTS.has(l.slug) || getBundleMeta(l.slug) !== null),
  );
}

function parseStored(raw: string | null): StoredShape {
  if (!raw) return EMPTY_STORED;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return { ...EMPTY_STORED, items: keepKnownLines(parsed as CartLine[]) };
    }
    if (parsed && typeof parsed === 'object' && Array.isArray((parsed as StoredShape).items)) {
      const o = parsed as Partial<StoredShape>;
      return {
        items: keepKnownLines(o.items as CartLine[]),
        promoCode: typeof o.promoCode === 'string' ? o.promoCode : null,
        promoDiscountPercent:
          typeof o.promoDiscountPercent === 'number' && Number.isFinite(o.promoDiscountPercent)
            ? o.promoDiscountPercent
            : null,
      };
    }
  } catch {
    /* neispravan sadržaj u localStorage — ignoriši */
  }
  return EMPTY_STORED;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartLine[]>([]);
  const [promoCode, setPromoCodeState] = useState<string | null>(null);
  const [promoDiscountPercent, setPromoDiscountPercentState] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Jednokratno čitanje korpe iz localStorage-a posle hidratacije (na serveru ga nema).
  useEffect(() => {
    const stored = parseStored(
      typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null,
    );
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(stored.items);
    setPromoCodeState(stored.promoCode);
    setPromoDiscountPercentState(stored.promoDiscountPercent);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const payload: StoredShape = { items, promoCode, promoDiscountPercent };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [items, promoCode, promoDiscountPercent, ready]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);
  const toggleCart = useCallback(() => setIsOpen((o) => !o), []);

  const addItem = useCallback((p: CartLineInput) => {
    setItems((prev) => {
      const i = prev.findIndex((x) => x.slug === p.slug);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], quantity: next[i].quantity + 1 };
        return next;
      }
      return [...prev, { ...p, quantity: 1 }];
    });
    setIsOpen(true);
  }, []);

  const addBundle = useCallback((bundleId: string) => {
    const meta = getBundleMeta(bundleId);
    if (!meta) return;

    const componentSlugs = new Set(getBundleComponentSlugs(bundleId));
    const fallbackRsd = getBundleFallbackPriceRsd();

    setItems((prev) => {
      const rest = prev.filter((x) => !componentSlugs.has(x.slug));
      const i = rest.findIndex((x) => x.slug === bundleId);
      if (i >= 0) {
        const next = [...rest];
        next[i] = { ...next[i], quantity: next[i].quantity + 1 };
        return next;
      }
      return [
        ...rest,
        {
          slug: bundleId,
          productSlug: bundleId,
          packageLabel: '',
          name: meta.name,
          price: `${fallbackRsd}`,
          image: meta.image,
          quantity: 1,
        },
      ];
    });
    setIsOpen(true);
  }, []);

  const removeLine = useCallback((slug: string) => {
    setItems((prev) => prev.filter((x) => x.slug !== slug));
  }, []);

  const setQuantity = useCallback((slug: string, quantity: number) => {
    if (quantity < 1) {
      setItems((prev) => prev.filter((x) => x.slug !== slug));
      return;
    }
    setItems((prev) => prev.map((x) => (x.slug === slug ? { ...x, quantity } : x)));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setPromoCodeState(null);
    setPromoDiscountPercentState(null);
  }, []);

  const setPromo = useCallback((code: string, discountPercent: number) => {
    setPromoCodeState(code);
    setPromoDiscountPercentState(discountPercent);
  }, []);

  const clearPromo = useCallback(() => {
    setPromoCodeState(null);
    setPromoDiscountPercentState(null);
  }, []);

  const itemCount = useMemo(() => items.reduce((s, x) => s + x.quantity, 0), [items]);

  const value = useMemo(
    () => ({
      items, itemCount, isOpen, openCart, closeCart, toggleCart,
      addItem, addBundle, removeLine, setQuantity, clearCart,
      setPromo, clearPromo, promoCode, promoDiscountPercent,
    }),
    [
      items, itemCount, isOpen, openCart, closeCart, toggleCart,
      addItem, addBundle, removeLine, setQuantity, clearCart,
      setPromo, clearPromo, promoCode, promoDiscountPercent,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart mora biti unutar CartProvider');
  return ctx;
}
