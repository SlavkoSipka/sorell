import type { Metadata } from 'next';
import PorudzbinaClient from './PorudzbinaClient';
import { isTransferAvailable } from '@/lib/payment';
import { getPayee } from '@/lib/payment-server';

export const metadata: Metadata = {
  title: 'Porudžbina',
  description: 'Podaci za dostavu i slanje porudžbine.',
  alternates: { canonical: '/porudzbina' },
  robots: { index: false, follow: true },
};

export default async function PorudzbinaPage() {
  // Uplata na račun se nudi samo kad je u adminu uključena i račun ispravan.
  const payee = await getPayee();
  return <PorudzbinaClient transferAvailable={isTransferAvailable(payee)} />;
}
