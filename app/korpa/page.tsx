import type { Metadata } from 'next';
import KorpaClient from './KorpaClient';

export const metadata: Metadata = {
  title: 'Korpa',
  description: 'Pregled korpe.',
  alternates: { canonical: '/korpa' },
  robots: { index: false, follow: true },
};

export default function KorpaPage() {
  return <KorpaClient />;
}
