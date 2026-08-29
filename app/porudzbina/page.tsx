import type { Metadata } from 'next';
import PorudzbinaClient from './PorudzbinaClient';

export const metadata: Metadata = {
  title: 'Porudžbina',
  description: 'Podaci za dostavu i slanje porudžbine.',
  alternates: { canonical: '/porudzbina' },
  robots: { index: false, follow: true },
};

export default function PorudzbinaPage() {
  return <PorudzbinaClient />;
}
