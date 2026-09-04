export default function WhyDelala() {
  return (
    <section className="section-pad border-t border-line bg-bg-raised py-24 md:py-36">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <p className="eyebrow reveal-item">Why Delala</p>
          <h2 className="display reveal-item mt-4 text-[clamp(2.4rem,5.5vw,4.25rem)] text-ink">
            Less distance between{" "}
            <span className="italic text-ink-soft">people and places.</span>
          </h2>
        </div>

        <div className="mt-16 grid gap-6 lg:mt-24 lg:grid-cols-2">
          <article className="reveal-item border border-line bg-bg p-8 md:p-12">
            <p className="eyebrow">Traditional</p>
            <div className="mt-10 flex flex-wrap items-center gap-3 text-ink-soft md:gap-4">
              <span className="display text-3xl text-ink md:text-4xl">Owner</span>
              <span className="text-ink-muted">→</span>
              <span className="display text-3xl italic text-ink-muted md:text-4xl">
                Broker
              </span>
              <span className="text-ink-muted">→</span>
              <span className="display text-3xl text-ink md:text-4xl">
                Customer
              </span>
            </div>
            <p className="mt-10 max-w-md text-sm font-light leading-relaxed text-ink-muted md:text-base">
              Another layer in the middle. Filtered messages. Second-hand details.
            </p>
          </article>

          <article className="reveal-item border border-accent/40 bg-bg p-8 md:p-12">
            <p className="eyebrow text-accent">Delala</p>
            <div className="mt-10 flex flex-wrap items-center gap-3 text-ink md:gap-4">
              <span className="display text-3xl md:text-4xl">Owner</span>
              <span className="text-accent">→</span>
              <span className="display text-3xl italic text-accent md:text-4xl">
                Delala
              </span>
              <span className="text-accent">→</span>
              <span className="display text-3xl md:text-4xl">Customer</span>
            </div>
            <p className="mt-10 max-w-md text-sm font-light leading-relaxed text-ink-soft md:text-base">
              Delala is where you meet — not another gatekeeper. Direct connection,
              clearer discovery, less friction.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
