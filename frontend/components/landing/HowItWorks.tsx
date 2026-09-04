const steps = [
  {
    number: "01",
    title: "Discover",
    copy: "Browse by neighbourhood, type, and sale or rent. See the space before you reach out.",
  },
  {
    number: "02",
    title: "Connect",
    copy: "When something fits, contact the owner directly. No broker chain.",
  },
  {
    number: "03",
    title: "Move forward",
    copy: "Visit, negotiate, and decide on your terms. Delala gets you to the conversation.",
  },
];

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="section-pad border-t border-line bg-bg-raised py-24 md:py-36"
    >
      <div className="mx-auto max-w-7xl">
        <div>
          <p className="eyebrow reveal-item">How it works</p>
          <h2 className="display reveal-item mt-4 max-w-[14ch] text-[clamp(2.4rem,5.5vw,4.25rem)] text-ink">
            Three steps.{" "}
            <span className="italic text-ink-soft">No theatre.</span>
          </h2>
        </div>

        <div className="mt-16 md:mt-24">
          {steps.map((step, index) => (
            <div
              key={step.number}
              className={`reveal-item grid gap-6 border-t border-line py-10 md:grid-cols-12 md:gap-8 md:py-14 ${
                index === steps.length - 1 ? "border-b" : ""
              }`}
            >
              <div className="md:col-span-2">
                <span className="display text-4xl text-accent md:text-5xl">
                  {step.number}
                </span>
              </div>
              <div className="md:col-span-3">
                <h3 className="display text-3xl text-ink md:text-4xl">
                  {step.title}
                </h3>
              </div>
              <div className="md:col-span-6 md:col-start-7">
                <p className="max-w-xl text-base font-light leading-relaxed text-ink-soft md:text-lg">
                  {step.copy}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
