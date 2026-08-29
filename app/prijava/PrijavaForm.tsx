'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getSupabaseBrowserClient, isSupabaseBrowserConfigured } from '@/lib/supabase/client';
import { SITE } from '@/lib/site-config';

/**
 * Poruka koja kaže šta je stvarno pošlo naopako — inače se svaki neuspeh vidi
 * kao „pogrešna lozinka", pa se sat vremena traži greška na pogrešnom mestu.
 */
function loginErrorMessage(err: { message?: string; code?: string } | null): string {
  const raw = `${err?.code ?? ''} ${err?.message ?? ''}`.toLowerCase();
  if (raw.includes('not confirmed') || raw.includes('email_not_confirmed')) {
    return 'Email naloga nije potvrđen. U Supabase-u: Authentication → Users → otvori korisnika → Confirm email.';
  }
  if (raw.includes('invalid api key') || raw.includes('no api key')) {
    return 'Supabase ključ nije ispravan. Proveri NEXT_PUBLIC_SUPABASE_ANON_KEY u .env.local i restartuj server.';
  }
  if (raw.includes('failed to fetch') || raw.includes('networkerror')) {
    return 'Nema veze sa bazom. Proveri NEXT_PUBLIC_SUPABASE_URL u .env.local.';
  }
  return 'Pogrešan email ili lozinka.';
}

/** Dozvoljeno je samo preusmerenje unutar /admin. */
function safeNextAfterLogin(nextParam: string | null): string {
  const fallback = '/admin';
  if (!nextParam || !nextParam.startsWith('/admin')) return fallback;
  if (nextParam.includes('//') || nextParam.includes('..')) return fallback;
  return nextParam;
}

export default function PrijavaForm() {
  const searchParams = useSearchParams();
  const nextParam = searchParams.get('next');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isSupabaseBrowserConfigured()) {
      setError(
        'Sajt nije povezan sa bazom. Popuni NEXT_PUBLIC_SUPABASE_URL i NEXT_PUBLIC_SUPABASE_ANON_KEY u .env.local i restartuj server.',
      );
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError('Prijava trenutno nije dostupna.');
      return;
    }

    setLoading(true);
    const { data: authData, error: signErr } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signErr || !authData.user) {
      setLoading(false);
      setError(loginErrorMessage(signErr));
      return;
    }

    const { data: adminRow, error: adminErr } = await supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', authData.user.id)
      .maybeSingle();

    if (adminRow) {
      window.location.assign(safeNextAfterLogin(nextParam));
      return;
    }

    await supabase.auth.signOut();
    setLoading(false);
    setError(
      adminErr
        ? 'Provera prava nije uspela — da li je pokrenut supabase/setup.sql? (tabela `admins`)'
        : 'Nalog postoji, ali nema pristup panelu. Dodaj ga u tabelu `admins` (uputstvo u README).',
    );
  };

  const input =
    'w-full rounded-card border border-line-strong bg-canvas px-4 py-3 font-body text-[14px] text-ink placeholder:text-muted focus:border-ink focus:outline-none transition-colors disabled:opacity-60';

  return (
    <main className="flex min-h-[65vh] flex-col justify-center px-5 py-16 md:px-8">
      <div className="mx-auto w-full max-w-[380px]">
        <p className="text-center font-body text-[10px] uppercase tracking-[0.2em] text-muted">
          {SITE.brandName}
        </p>
        <h1 className="mt-3 text-center font-display text-[28px] text-ink">Prijava</h1>
        <p className="mt-3 text-center font-body text-[13px] leading-relaxed text-muted">
          Pristup admin panelu.
        </p>

        <form onSubmit={handleSubmit} className="mt-9 space-y-4">
          <div>
            <label htmlFor="login-email" className="mb-2 block font-body text-[11px] uppercase tracking-[0.14em] text-ink">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className={input}
              placeholder="tvoj@email.com"
            />
          </div>
          <div>
            <label htmlFor="login-password" className="mb-2 block font-body text-[11px] uppercase tracking-[0.14em] text-ink">
              Lozinka
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className={input}
            />
          </div>

          {error ? (
            <p className="font-body text-[13px] text-danger" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-card border border-ink bg-ink py-3 font-body text-[11px] uppercase tracking-[0.14em] text-canvas transition-colors hover:bg-canvas hover:text-ink disabled:pointer-events-none disabled:opacity-50"
          >
            {loading ? 'Prijava…' : 'Prijavi se'}
          </button>
        </form>

        <p className="mt-10 text-center">
          <Link href="/" className="font-body text-[12px] text-muted underline underline-offset-4 hover:text-ink">
            Nazad na početnu
          </Link>
        </p>
      </div>
    </main>
  );
}
