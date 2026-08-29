import { SITE } from '@/lib/site-config';

/** Traka sa porukama na vrhu. Poruke se menjaju u lib/site-config.ts. */
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
          className="whitespace-nowrap font-body text-[10px] uppercase tracking-[0.18em] text-ink-soft"
        >
          {m}
        </span>
      ))}
    </div>
  );

  return (
    <div className="overflow-hidden border-b border-line bg-surface py-2">
      <div className="announcement-marquee-track flex">
        {row()}
        {row(true)}
      </div>
    </div>
  );
}
