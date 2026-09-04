/**
 * Jedno mesto za sve podatke o brendu i lokalu.
 * Ovo su placeholderi — zameni ih pravim podacima.
 */
type SiteConfig = {
  brandName: string;
  tagline: string;
  description: string;
  logoSrc: string;
  salon: {
    name: string;
    addressLine: string;
    city: string;
    phone: string;
    email: string;
    mapEmbedUrl: string;
    hours: { day: string; time: string }[];
  };
  social: { instagram: string; facebook: string; tiktok: string };
  announcements: string[];
  /** Google Analytics 4 — prazno gasi merenje. Vidi components/Analytics.tsx. */
  googleAnalyticsId: string;
};

export const SITE: SiteConfig = {
  brandName: 'Sorelle',
  /** Kratak opis — koristi se u <meta description> i u footeru. */
  tagline: 'Profesionalna nega noktiju',
  description:
    'Sorelle — profesionalni gradivni gelovi, rubber base i završni sjajevi. HEMA Free, Di-HEMA Free i TPO Free, usklađeno sa važećim propisima EU za kozmetičke proizvode.',
  /** Logo: ostavi prazno za tekstualni logo, ili npr. '/logo.svg'. */
  logoSrc: '',
  salon: {
    name: 'Kozmetički salon',
    addressLine: 'Ulica i broj',
    city: '11000 Beograd',
    phone: '+381 60 000 0000',
    email: 'info@primer.rs',
    /** „Embed" link sa Google Maps → Share → Embed a map. */
    mapEmbedUrl:
      'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2838.2510811512307!2d20.19723397752215!3d44.65322158717989!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x475a14668fe8cac9%3A0x85582a8ff93df2f3!2z0JLQvtGY0LLQvtC00LUg0JzQuNGI0LjRm9CwIDE2NtCSLCDQntCx0YDQtdC90L7QstCw0YY!5e0!3m2!1ssr!2srs!4v1788528329825!5m2!1ssr!2srs',
    hours: [
      { day: 'Ponedeljak – Petak', time: '09:00 – 20:00' },
      { day: 'Subota', time: '09:00 – 15:00' },
      { day: 'Nedelja', time: 'Ne radimo' },
    ],
  },
  social: {
    instagram: '',
    facebook: '',
    tiktok: '',
  },
  googleAnalyticsId: 'G-LH9C0N00ZH',
  /** Traka na vrhu sajta. Prazan niz = traka se ne prikazuje. */
  announcements: [
    'HEMA Free · Di-HEMA Free · TPO Free',
    'Besplatna dostava iznad 7.000 RSD',
    'Plaćanje pouzećem',
  ],
};
