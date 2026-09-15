import Link from 'next/link';

/** Naslov kartice u adminu i jedna rečenica o tome šta se na njoj menja. */
export default function AdminPageHeader({
  title,
  description,
  siteHref,
}: {
  title: string;
  description: React.ReactNode;
  /** Stranica sajta na kojoj se izmene vide. */
  siteHref?: string;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 md:mb-8 md:flex-row md:items-end md:justify-between md:gap-8">
      <div>
        <h2 className="font-display text-[22px] text-ink md:text-[26px]">{title}</h2>
        <p className="mt-2 max-w-[720px] font-body text-[14px] leading-relaxed text-muted">
          {description}
        </p>
      </div>
      {siteHref ? (
        <Link
          href={siteHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[40px] shrink-0 items-center self-start rounded-card border border-line-strong px-4 font-body text-[12px] uppercase tracking-[0.1em] text-ink transition-colors hover:border-ink md:self-auto"
        >
          Pogledaj na sajtu ↗
        </Link>
      ) : null}
    </div>
  );
}
