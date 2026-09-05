export default function Intro() {
  return (
    <section id="about" className="section-pad border-t border-line bg-bg py-24 md:py-36">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-4">
          <p className="eyebrow reveal-item">What is Delala?</p>
          <h2 className="display reveal-item mt-5 max-w-[8ch] text-[clamp(2.6rem,6vw,4.75rem)] text-ink">
            Property,
            <span className="italic text-ink-soft"> person to person.</span>
          </h2>
        </div>

        <div className="lg:col-span-7 lg:col-start-6">
          <p className="reveal-item max-w-2xl text-[1.2rem] font-light leading-[1.7] text-ink-soft md:text-[1.45rem]">
            Delala is an Ethiopian marketplace for homes, apartments, offices,
            and shops. Browse listings, reach owners directly, and decide what
            happens next, without the traditional middleman.
          </p>
        </div>
      </div>
    </section>
  );
}
