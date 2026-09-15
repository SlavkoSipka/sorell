import { redirect } from 'next/navigation';

/** Stara adresa. Podešavanja su razdvojena po karticama, pa vodi na popuste. */
export default function AdminPodesavanjaPage() {
  redirect('/admin/popusti');
}
