import type { Metadata } from 'next';
import ScrollRevealInit from '@/components/ScrollRevealInit';
import Hero from '@/components/sections/Hero';
import HomeBanner from '@/components/sections/HomeBanner';
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
      <HomeBanner />
      <BundlesSection />
      <SalonTeaser />
    </main>
  );
}
