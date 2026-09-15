/** Okvir jedne celine u adminu: redni broj, naslov, kratko objašnjenje, pa sadržaj. */
export default function AdminCard({
  badge,
  title,
  description,
  children,
}: {
  badge?: string;
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-line bg-canvas p-4 md:p-6">
      <div className="flex items-start gap-3">
        {badge ? (
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink font-body text-[12px] tabular-nums text-canvas">
            {badge}
          </span>
        ) : null}
        <div className="min-w-0">
          <h3 className="font-display text-[19px] leading-snug text-ink">{title}</h3>
          {description ? (
            <p className="mt-1.5 max-w-[680px] font-body text-[13px] leading-relaxed text-muted">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}
