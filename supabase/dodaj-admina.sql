-- ═══════════════════════════════════════════════════════════════════
-- Davanje pristupa admin panelu
--
-- Nalog napravljen u Authentication → Users može da se prijavi na Supabase,
-- ali panel traži i red u tabeli `admins`. Bez njega prijava vrati poruku
-- „Nalog postoji, ali nema pristup panelu."
--
-- Kako: Supabase → SQL Editor → nalepi ovo → zameni email → Run.
-- ═══════════════════════════════════════════════════════════════════

-- 1) Ko sve postoji i ko ima pristup panelu.
SELECT
  u.email,
  u.email_confirmed_at IS NOT NULL AS email_potvrdjen,
  a.user_id IS NOT NULL           AS ima_pristup_panelu
FROM auth.users u
LEFT JOIN public.admins a ON a.user_id = u.id
ORDER BY u.created_at;

-- 2) Daj pristup panelu — zameni email pravim.
INSERT INTO public.admins (user_id)
SELECT id FROM auth.users WHERE email = 'promeni@mene.rs'
ON CONFLICT (user_id) DO NOTHING;

-- 3) Ako u koraku 1 piše email_potvrdjen = false, prijava neće proći.
--    Potvrdi ga ovde (ili u Authentication → Users → korisnik → Confirm email).
-- UPDATE auth.users
-- SET email_confirmed_at = now()
-- WHERE email = 'promeni@mene.rs' AND email_confirmed_at IS NULL;

-- 4) Oduzimanje pristupa (nalog ostaje, panel više ne radi).
-- DELETE FROM public.admins
-- WHERE user_id = (SELECT id FROM auth.users WHERE email = 'promeni@mene.rs');
