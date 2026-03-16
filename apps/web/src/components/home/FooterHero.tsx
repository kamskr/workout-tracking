import Link from "next/link";

const FooterHero = () => {
  return (
    <section className="landing-shell landing-grid">
      <div className="container px-6 pb-20 pt-4 sm:px-0 sm:pb-24 sm:pt-10">
        <div className="landing-cta-panel">
          <div className="max-w-[720px]">
            <span className="landing-kicker">Final call to action</span>
            <h2 className="landing-section-title mt-5 text-[#120d23]">
              Start logging with enough clarity to know when your training is actually moving.
            </h2>
            <p className="landing-body mt-5 max-w-[620px] text-[#4e4465]">
              Join with a free account, log your next workout, and step into the same feed,
              analytics, leaderboards, and challenges that power the rest of the product.
            </p>
          </div>

          <div className="landing-cta-actions">
            <Link href="/sign-up" className="landing-button landing-button-primary">
              Create your account
            </Link>
            <Link href="/feed" className="landing-button landing-button-secondary">
              See community momentum
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FooterHero;
