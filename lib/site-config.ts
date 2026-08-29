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
    /** Ubaci „embed" link sa Google Maps → Share → Embed a map. */
    mapEmbedUrl: '',
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
  /** Traka na vrhu sajta. Prazan niz = traka se ne prikazuje. */
  announcements: [
    'HEMA Free · Di-HEMA Free · TPO Free',
    'Besplatna dostava iznad 7.000 RSD',
    'Plaćanje pouzećem',
  ],
};
