import { Suspense } from 'react';
import type { Metadata } from 'next';
import PrijavaForm from './PrijavaForm';

export const metadata: Metadata = {
  title: 'Prijava',
  description: 'Prijava na admin panel.',
  robots: { index: false, follow: false },
};

export default function PrijavaPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[50vh] items-center justify-center px-5">
          <p className="font-body text-[14px] text-muted">Učitavanje…</p>
        </main>
      }
    >
      <PrijavaForm />
    </Suspense>
  );
}
