import type { Metadata } from 'next';
import ScrollRevealInit from '@/components/ScrollRevealInit';
import Hero from '@/components/sections/Hero';
import BrandStatement from '@/components/sections/BrandStatement';
import ProductsGrid from '@/components/sections/ProductsGrid';
import BundlesSection from '@/components/sections/BundlesSection';
import SalonTeaser from '@/components/sections/SalonTeaser';
import { SITE } from '@/lib/site-config';

export const metadata: Metadata = {
  title: { absolute: `${SITE.brandName} — ${SITE.tagline}` },
  description: SITE.description,
  alternates: { canonical: '/' },
};

export default function Home() {
  return (
    <main>
      <ScrollRevealInit />
      <Hero />
      <BrandStatement />
      <ProductsGrid
        title="Izdvojeno iz ponude"
        intro="Gradivni gelovi, rubber base i završni sjajevi — HEMA Free, Di-HEMA Free i TPO Free."
        limit={8}
        featuredOnly
        showAllLink
      />
      <BundlesSection />
      <SalonTeaser />
    </main>
  );
}
