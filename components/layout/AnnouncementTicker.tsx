import { SITE } from '@/lib/site-config';

/**
 * Traka sa porukama na vrhu. Poruke se menjaju u lib/site-config.ts,
 * a boje iz admin panela (Podešavanja → Boje zaglavlja).
 */
export default function AnnouncementTicker() {
  const messages = SITE.announcements;
  if (messages.length === 0) return null;

  const row = (duplicate = false) => (
    <div
      className={`flex shrink-0 items-center gap-10 pr-10 ${duplicate ? 'announcement-marquee-duplicate' : ''}`}
      aria-hidden={duplicate}
    >
      {messages.map((m, i) => (
        <span
          key={`${m}-${i}`}
          className="whitespace-nowrap font-body text-[11px] uppercase tracking-[0.18em]"
        >
          {m}
        </span>
      ))}
    </div>
  );

  return (
    <div className="overflow-hidden border-b border-[color:var(--ticker-border)] bg-[color:var(--ticker-bg)] py-2 text-[color:var(--ticker-text)]">
      <div className="announcement-marquee-track flex">
        {row()}
        {row(true)}
      </div>
    </div>
  );
}
