import Link from "next/link";

const features = [
  {
    eyebrow: "Log with intent",
    title: "Capture every set the way lifters actually train.",
    description:
      "Record weight, reps, RPE, tempo, notes, and rest timing without turning your session into admin work.",
    bullets: ["Set-by-set detail", "Auto rest timer", "Template-free workout flow"],
  },
  {
    eyebrow: "Discover the right movement",
    title: "Browse exercises by goal, equipment, and muscle focus.",
    description:
      "The exercise library is structured for fast decisions before the session and confident swaps during it.",
    bullets: ["Curated exercise database", "Primary muscle filters", "In-session exercise add"],
  },
  {
    eyebrow: "Know what is working",
    title: "See progress with analytics that turn volume into signal.",
    description:
      "Track estimated maxes, session volume, weekly trends, and body-region load so your next block starts from evidence.",
    bullets: ["Progress charts", "Muscle heatmaps", "Personal records"],
  },
  {
    eyebrow: "Train with people",
    title: "Bring the gym&apos;s social energy into your planning loop.",
    description:
      "Follow training partners, compete on leaderboards, join challenges, and run live shared sessions with synced timers.",
    bullets: ["Activity feed", "Challenges + rankings", "Shared live sessions"],
  },
];

const capabilityBands = [
  "Workouts",
  "Exercises",
  "Analytics",
  "Feed",
  "Leaderboards",
  "Challenges",
  "Live Sessions",
];

const Benefits = () => {
  return (
    <section id="Benefits" className="landing-shell landing-grid">
      <div className="container relative px-6 py-18 sm:px-0 sm:py-24">
        <div className="landing-section-header">
          <span className="landing-kicker">Feature highlights</span>
          <h2 className="landing-section-title text-[#140f26]">
            Built to connect disciplined logging with visible progress and real accountability.
          </h2>
          <p className="landing-body max-w-[760px] text-[#4e4465]">
            This is not a generic habit tracker with a fitness skin. Every surface is
            centered on training decisions: what to lift, how hard to push, what changed,
            and who you are chasing.
          </p>
        </div>

        <div className="landing-feature-grid mt-10 sm:mt-14">
          {features.map((feature, index) => (
            <article
              key={feature.title}
              className={`landing-feature-card ${index === 0 ? "landing-feature-card-large" : ""}`}
            >
              <span className="landing-micro-label">{feature.eyebrow}</span>
              <h3 className="landing-card-title mt-4 text-[#181129]">{feature.title}</h3>
              <p className="landing-card-copy mt-4 text-[#51476a]">{feature.description}</p>
              <ul className="mt-6 space-y-3">
                {feature.bullets.map((bullet) => (
                  <li key={bullet} className="landing-list-item">
                    <span className="landing-list-marker" aria-hidden="true" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="landing-capability-band mt-10 sm:mt-12">
          <div>
            <span className="landing-micro-label">Inside the product</span>
            <p className="landing-card-copy mt-3 max-w-[560px] text-[#f4ecff]">
              The public page maps directly to the app behind auth — no placeholder tours,
              no fake feature list, just the real product surfaces people already use.
            </p>
          </div>
          <div className="landing-band-chips">
            {capabilityBands.map((band) => (
              <span key={band} className="landing-band-chip">
                {band}
              </span>
            ))}
          </div>
          <Link href="/exercises" className="landing-inline-link">
            Browse the exercise library
          </Link>
        </div>
      </div>
    </section>
  );
};

export default Benefits;
