import BundleCard from '@/components/ui/BundleCard';
import { bundles } from '@/lib/data/products';
import { getBundleComponentSlugs } from '@/lib/bundles';
import { getProductOverrides } from '@/lib/products-server';

export default async function BundlesSection() {
  // Klijent još nije definisao pakete — bez njih se sekcija ne renderuje
  // (i nema potrebe da se ide u bazu).
  if (bundles.length === 0) return null;

  // Paket nestaje sa sajta ako je bilo koji proizvod iz njega isključen u adminu.
  const { inactiveSlugs: inactive } = await getProductOverrides();
  const list = bundles.filter((b) =>
    getBundleComponentSlugs(b.slug).every((slug) => !inactive.has(slug)),
  );

  if (list.length === 0) return null;

  return (
    <section id="paketi" className="border-b border-line">
      <div className="mx-auto max-w-[1200px] px-5 py-14 md:px-8 md:py-20">
        <h2 className="font-display text-[28px] text-ink md:text-[34px]">Paketi</h2>
        <p className="mt-2 max-w-[520px] font-body text-[14px] leading-relaxed text-ink-soft">
          Proizvodi koji idu zajedno — po nižoj ceni nego pojedinačno.
        </p>

        <div className="mt-8 flex flex-col gap-5 md:mt-12">
          {list.map((bundle) => (
            <BundleCard key={bundle.slug} bundle={bundle} />
          ))}
        </div>
      </div>
    </section>
  );
}
