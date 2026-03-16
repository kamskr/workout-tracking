import Link from "next/link";

const stats = [
  { value: "4.8M", label: "sets logged this quarter" },
  { value: "92%", label: "members training 3× per week" },
  { value: "18 min", label: "average time saved per session" },
];

const focusPills = [
  "Strength blocks",
  "Recovery pacing",
  "PR tracking",
  "Live partner sessions",
];

const Hero = () => {
  return (
    <section className="landing-shell landing-grid landing-hero overflow-hidden">
      <div className="landing-orb landing-orb-left" aria-hidden="true" />
      <div className="landing-orb landing-orb-right" aria-hidden="true" />

      <div className="container relative px-6 pb-18 pt-10 sm:px-0 sm:pb-24 sm:pt-14">
        <div className="landing-hero-layout">
          <div className="max-w-[700px]">
            <span className="landing-kicker">Workout tracker for serious consistency</span>
            <h1 className="landing-display mt-5 text-[#140f26]">
              Build a stronger training rhythm without losing the feeling of the gym.
            </h1>
            <p className="landing-body mt-6 max-w-[640px] text-[#433a59] sm:mt-8">
              LiftLab brings workout logging, exercise discovery, live partner
              sessions, and competitive accountability into one premium flow so
              every session feels measured, visible, and worth repeating.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:mt-10 sm:flex-row">
              <Link href="/sign-up" className="landing-button landing-button-primary">
                Start tracking free
              </Link>
              <Link href="/workouts" className="landing-button landing-button-secondary">
                Explore the workout flow
              </Link>
            </div>

            <div className="mt-7 flex flex-wrap gap-3 sm:mt-8">
              {focusPills.map((pill) => (
                <span key={pill} className="landing-chip">
                  {pill}
                </span>
              ))}
            </div>
          </div>

          <div className="landing-device-cluster" aria-label="Workout product highlights">
            <div className="landing-device landing-device-main">
              <div className="landing-device-top">
                <span className="landing-device-eyebrow">Today&apos;s focus</span>
                <span className="landing-device-dot" />
              </div>
              <div className="landing-device-card landing-device-card-strong">
                <div>
                  <p className="landing-micro-label">Push session</p>
                  <h2 className="landing-card-title">Upper body intensity block</h2>
                </div>
                <p className="landing-card-copy">
                  Bench, incline press, and weighted dips paced with automatic
                  rest timing and set-level RPE notes.
                </p>
                <div className="landing-progress-track" aria-hidden="true">
                  <span className="landing-progress-fill landing-progress-fill-strong" />
                </div>
                <div className="landing-data-row">
                  <div>
                    <p className="landing-metric-value">68 min</p>
                    <p className="landing-metric-label">planned duration</p>
                  </div>
                  <div>
                    <p className="landing-metric-value">+12%</p>
                    <p className="landing-metric-label">weekly volume</p>
                  </div>
                </div>
              </div>

              <div className="landing-hero-mini-grid">
                <div className="landing-device-card">
                  <p className="landing-micro-label">Live session</p>
                  <p className="landing-card-copy">
                    Partner connected. Shared rest timer is synced for the next set.
                  </p>
                </div>
                <div className="landing-device-card">
                  <p className="landing-micro-label">Leaderboard rank</p>
                  <p className="landing-card-copy">Top 7% in all-time bench E1RM.</p>
                </div>
              </div>
            </div>

            <div className="landing-device landing-device-side">
              <div className="landing-device-card landing-device-card-highlight">
                <p className="landing-micro-label">Readiness signal</p>
                <p className="landing-card-title">You&apos;re fresh enough to push again.</p>
                <p className="landing-card-copy">
                  Recovery trend and recent load point toward a strong heavy day.
                </p>
              </div>

              <div className="landing-device-card landing-device-card-dark">
                <p className="landing-micro-label">Momentum</p>
                <div className="space-y-3">
                  {stats.map((stat) => (
                    <div key={stat.label} className="landing-stat-line">
                      <span>{stat.value}</span>
                      <small>{stat.label}</small>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
