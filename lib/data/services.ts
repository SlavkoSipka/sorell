/**
 * Cenovnik usluga u salonu — placeholder.
 * Zameni nazive, trajanje i cene; grupe se prikazuju redom.
 */
export type Service = {
  name: string;
  /** Trajanje u minutima. */
  duration: number;
  priceRsd: number;
  description?: string;
};

export type ServiceGroup = {
  slug: string;
  title: string;
  intro: string;
  services: Service[];
};

export const serviceGroups: ServiceGroup[] = [
  {
    slug: 'nega-lica',
    title: 'Nega lica',
    intro: 'Placeholder tekst o tretmanima lica koje radite u salonu.',
    services: [
      { name: 'Osnovni tretman lica', duration: 45, priceRsd: 2500, description: 'Kratak opis tretmana.' },
      { name: 'Dubinsko čišćenje', duration: 60, priceRsd: 3500, description: 'Kratak opis tretmana.' },
      { name: 'Hidratantni tretman', duration: 60, priceRsd: 3800 },
      { name: 'Anti-age tretman', duration: 75, priceRsd: 4500 },
    ],
  },
  {
    slug: 'tretmani-tela',
    title: 'Tretmani tela',
    intro: 'Placeholder tekst o tretmanima tela.',
    services: [
      { name: 'Relax masaža (30 min)', duration: 30, priceRsd: 2200 },
      { name: 'Relax masaža (60 min)', duration: 60, priceRsd: 3600 },
      { name: 'Piling tela', duration: 45, priceRsd: 2800 },
    ],
  },
  {
    slug: 'depilacija',
    title: 'Depilacija',
    intro: 'Placeholder tekst o depilaciji.',
    services: [
      { name: 'Potkolenice', duration: 20, priceRsd: 1200 },
      { name: 'Cele noge', duration: 40, priceRsd: 2000 },
      { name: 'Pazuh', duration: 15, priceRsd: 800 },
    ],
  },
];
