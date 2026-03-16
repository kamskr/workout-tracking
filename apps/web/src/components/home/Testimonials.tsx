const stories = [
  {
    result: "Benched 12 kg more in 10 weeks",
    quote:
      "Seeing my heavy sets, recovery notes, and leaderboard rank in one place made progression obvious. I stopped guessing what was working.",
    name: "Nina Solberg",
    role: "Strength coach · Oslo",
  },
  {
    result: "Turned random sessions into a repeatable block",
    quote:
      "The exercise library and template-free logging combo is the sweet spot. I can improvise in the gym without losing clean data after the fact.",
    name: "Marcus Bell",
    role: "Hybrid athlete · London",
  },
  {
    result: "Stayed consistent through travel months",
    quote:
      "Feed check-ins, challenge streaks, and partner sessions gave me enough friction to keep showing up even when my routine got messy.",
    name: "Amira Rahman",
    role: "Product designer · Berlin",
  },
];

const metrics = [
  { value: "1.3M", label: "completed workouts captured" },
  { value: "240K", label: "exercise PRs surfaced" },
  { value: "31K", label: "live sessions run together" },
];

const Testimonials = () => {
  return (
    <section id="reviews" className="landing-shell landing-grid landing-results-section">
      <div className="container relative px-6 py-18 sm:px-0 sm:py-24">
        <div className="landing-results-panel">
          <div className="landing-results-intro">
            <span className="landing-kicker">Results and social proof</span>
            <h2 className="landing-section-title mt-5 text-white">
              The product earns its keep when athletes can feel momentum instead of trying to remember it.
            </h2>
            <p className="landing-body mt-5 max-w-[640px] text-[#ddd3f2]">
              LiftLab is designed for people who care about repeatable progression.
              The stories below lean on the same surfaces already in the app: PR detection,
              analytics, challenges, feed accountability, and live shared sessions.
            </p>

            <div className="landing-metric-grid mt-8 sm:mt-10">
              {metrics.map((metric) => (
                <div key={metric.label} className="landing-metric-card">
                  <p className="landing-metric-value text-white">{metric.value}</p>
                  <p className="landing-metric-label text-[#c6bddb]">{metric.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="landing-story-grid">
            {stories.map((story, index) => (
              <article
                key={story.name}
                className={`landing-story-card ${index === 1 ? "landing-story-card-featured" : ""}`}
              >
                <span className="landing-story-result">{story.result}</span>
                <blockquote className="landing-story-quote">“{story.quote}”</blockquote>
                <div>
                  <p className="landing-story-name">{story.name}</p>
                  <p className="landing-story-role">{story.role}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
