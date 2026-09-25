import type { Metadata } from 'next';
import ScrollRevealInit from '@/components/ScrollRevealInit';
import Hero from '@/components/sections/Hero';
import HomeBanner from '@/components/sections/HomeBanner';
import BundlesSection from '@/components/sections/BundlesSection';
import SalonTeaser from '@/components/sections/SalonTeaser';
import { SEO_DEFAULT_DESCRIPTION, SEO_DEFAULT_TITLE, jsonLd } from '@/lib/seo';
import { getBusinessJsonLd } from '@/lib/seo-server';

export const metadata: Metadata = {
  title: { absolute: SEO_DEFAULT_TITLE },
  description: SEO_DEFAULT_DESCRIPTION,
  alternates: { canonical: '/' },
};

export default async function Home() {
  const salon = await getBusinessJsonLd();

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(salon) }} />
      <ScrollRevealInit />
      <Hero />
      <HomeBanner />
      <BundlesSection />
      <SalonTeaser />
    </main>
  );
}
