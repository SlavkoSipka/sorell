import { fillPlaceholders, parseLegal, splitBold, type LegalValues } from '@/lib/legal';

/** Jedan red teksta sa podebljanim delovima. */
function Red({ t }: { t: string }) {
  return (
    <>
      {splitBold(t).map((part, i) =>
        part.bold ? (
          <strong key={i} className="font-semibold text-ink">
            {part.text}
          </strong>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  );
}

/**
 * Crta pravni tekst iz jednostavnog formata (vidi lib/legal.ts).
 * Sve ide kao običan tekst — HTML iz admina se nikad ne ubacuje u stranicu.
 */
export default function LegalDocument({
  text,
  values,
  compact = false,
}: {
  text: string;
  values: LegalValues;
  /** Uži prikaz za pregled u adminu. */
  compact?: boolean;
}) {
  const blocks = parseLegal(fillPlaceholders(text, values));

  return (
    <div className="font-body text-[15px] leading-relaxed text-ink-soft">
      {blocks.map((b, i) => {
        if (b.type === 'naslov') {
          return (
            <h2
              key={i}
              className={`${compact ? 'mt-6 text-[18px]' : 'mt-9 text-[20px] md:text-[22px]'} font-display text-ink first:mt-0`}
            >
              {b.text}
            </h2>
          );
        }
        if (b.type === 'spisak') {
          return (
            <ul key={i} className="ml-5 mt-3 list-disc space-y-2">
              {b.items.map((item, j) => (
                <li key={j}>
                  <Red t={item} />
                </li>
              ))}
            </ul>
          );
        }
        // Mesta za dopunu ostaju vidljivo drugačija dok se ne popune.
        const zaDopunu = b.text.startsWith('[') && b.text.endsWith(']');
        return (
          <p key={i} className={`mt-3 ${zaDopunu ? 'text-muted' : ''}`}>
            <Red t={b.text} />
          </p>
        );
      })}
    </div>
  );
}
