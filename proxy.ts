import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Next.js 16: nekadašnji `middleware.ts`.
 * Štiti /admin i preusmerava već prijavljenog admina sa /prijava na panel.
 */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  let user: { id: string } | null = null;
  let isAdminUser = false;

  try {
    const {
      data: { user: u },
    } = await supabase.auth.getUser();
    user = u ?? null;

    if (user) {
      const { data } = await supabase
        .from('admins')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();
      isAdminUser = Boolean(data);
    }
  } catch (err) {
    console.error('[proxy] Provera prijave nije uspela:', err);
    user = null;
    isAdminUser = false;
  }

  const pathname = request.nextUrl.pathname;
  const search = request.nextUrl.search ?? '';

  const isPrijava = pathname === '/prijava' || pathname.startsWith('/prijava/');

  if (isPrijava && user) {
    const nextParam = request.nextUrl.searchParams.get('next');
    if (isAdminUser) {
      const dest = nextParam && nextParam.startsWith('/admin') ? nextParam : '/admin';
      return NextResponse.redirect(new URL(dest, request.url));
    }
    return NextResponse.redirect(new URL('/', request.url));
  }

  const isAdminArea = pathname === '/admin' || pathname.startsWith('/admin/');

  if (isAdminArea) {
    if (!user) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/prijava';
      redirectUrl.search = '';
      redirectUrl.searchParams.set('next', pathname + search);
      return NextResponse.redirect(redirectUrl);
    }

    if (!isAdminUser) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/prijava', '/prijava/:path*', '/admin', '/admin/:path*'],
};
