import React from "react";
import Logo from "../common/Logo";
import Menu from "../common/Menu";

const menuItems = [
  {
    title: "Home",
    url: "/",
  },
  {
    title: "Features",
    url: "#Benefits",
  },
  {
    title: "Results",
    url: "#reviews",
  },
  {
    title: "Start Tracking",
    url: "/sign-up",
  },
];

const Footer = () => {
  return (
    <footer className="landing-footer-wrap">
      <div className="container hidden py-12 sm:block">
        <div className="flex flex-wrap items-center justify-between gap-6 border-b border-white/10 pb-6 md:flex-nowrap">
          <Logo />
          <Menu menuItems={menuItems} />
        </div>
        <div className="flex flex-col justify-between gap-6 pt-8 md:flex-row md:items-end">
          <div>
            <h3 className="landing-footer-title">Train with structure. Recover with signal. Show up again tomorrow.</h3>
            <p className="landing-footer-copy mt-3 max-w-[620px]">
              LiftLab keeps workouts, progress, and community in one place so your next training decision is grounded in what actually happened.
            </p>
          </div>
          <p className="landing-footer-meta">© 2026 LiftLab. Built for athletes chasing consistency.</p>
        </div>
      </div>

      <div className="container px-6 pb-10 pt-7 sm:hidden">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-5">
            <Logo />
            <h3 className="landing-footer-title text-base">
              Train with structure. Recover with signal. Show up again tomorrow.
            </h3>
            <p className="landing-footer-copy text-sm">
              Log workouts, watch your progress move, and stay connected to the people pushing with you.
            </p>
          </div>
          <div className="w-full">
            <Menu menuItems={menuItems} />
          </div>
          <p className="landing-footer-meta text-sm">
            © 2026 LiftLab. Built for athletes chasing consistency.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
