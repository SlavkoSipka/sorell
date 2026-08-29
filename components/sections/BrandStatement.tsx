/** Tvrdnje su preuzete iz tabele proizvoda — ništa nije dodato preko toga. */
const points = [
  {
    title: 'HEMA Free · Di-HEMA Free · TPO Free',
    text: 'Ista formulacija kroz ceo asortiman — od gradivnih gelova do završnih sjajeva.',
  },
  {
    title: 'Usklađeno sa propisima EU',
    text: 'Svi proizvodi su usklađeni sa važećim propisima EU za kozmetičke proizvode.',
  },
  {
    title: 'Za početnike i profesionalce',
    text: 'Samonivelišuće teksture za rad na šablonima, dual tipsama i No File tehniku.',
  },
];

export default function BrandStatement() {
  return (
    <section className="border-b border-line">
      <div className="mx-auto max-w-[1200px] px-5 py-14 md:px-8 md:py-20">
        <p
          className="mx-auto max-w-[720px] text-center font-display text-[24px] leading-[1.4] text-ink md:text-[32px]"
          data-reveal="true"
        >
          Profesionalne formule za izlivanje, ojačavanje i korekcije noktiju — u pakovanjima koja
          prate način na koji radiš.
        </p>

        <div className="mt-12 grid gap-8 md:grid-cols-3 md:gap-12">
          {points.map((p, i) => (
            <div key={p.title} data-reveal="true" data-reveal-delay={i * 100}>
              <p className="font-body text-[10px] uppercase tracking-[0.18em] text-muted">
                0{i + 1}
              </p>
              <h3 className="mt-2 font-display text-[19px] text-ink">{p.title}</h3>
              <p className="mt-2 font-body text-[13px] leading-relaxed text-ink-soft">{p.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
