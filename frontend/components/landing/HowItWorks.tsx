"use client";

import { useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Hand, MapPin, Wallet, type LucideIcon } from "lucide-react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export const QR = [1,1,1,0,1,1,1, 1,0,1,1,0,0,1, 1,1,1,0,1,1,1, 0,0,0,1,0,1,0, 1,1,0,0,1,0,1, 1,0,1,1,0,1,1, 1,1,1,0,1,0,1];

type Step = {
  step: string;
  title: string;
  desc: string;
  icon: LucideIcon;
};

const STEPS: Step[] = [
  {
    step: "01",
    title: "Track nearby units",
    desc: "See CHATCO jeeps on the live map before you head out. No more blind waiting by the road: you know how far the next unit is and when to start walking.",
    icon: MapPin,
  },
  {
    step: "02",
    title: "Hail your ride",
    desc: "Tap Hail Me and conductors of units within 1 km see your location on their map, so the jeep knows to stop for you.",
    icon: Hand,
  },
  {
    step: "03",
    title: "Pay cash or GCash",
    desc: "Pay the conductor in cash, or show your QR to pay with GCash. GCash rides count toward free-ride rewards automatically.",
    icon: Wallet,
  },
];

/* Empty step frame, kept at the cards' size until the step images are ready. */
function StepFrame() {
  return <div className="w-full aspect-4/3 min-h-60 overflow-hidden rounded-2xl border border-[#1E3F6E] bg-[#08203F]" />;
}

export default function HowItWorks() {
  const reduce = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);

  // Desktop scroll scene: the section pins and the steps arrive one at a time.
  // Step 1 starts alone at the center and slides into its column as step 2
  // rises in the middle; a little later step 3 joins on the right. Each rail
  // segment draws as the step it leads to appears. GSAP drives inner wrappers
  // so it never fights Framer's in-view reveal on the <li> itself.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        const section = sectionRef.current;
        const q = gsap.utils.selector(section);
        const [one, two, three] = q<HTMLElement>("[data-step]");
        const [railOne, railTwo] = q<HTMLElement>("[data-rail]");
        if (!section || !one || !two || !three || !railOne || !railTwo) return;

        // Centering step 1 = shifting it by the distance between its column and the middle one.
        const toMiddle = () => {
          const a = one.getBoundingClientRect();
          const b = two.getBoundingClientRect();
          return b.left - (a.left - Number(gsap.getProperty(one, "x")));
        };

        gsap.set([railOne, railTwo], { scaleX: 0, transformOrigin: "left center" });
        gsap
          .timeline({
            defaults: { ease: "none" },
            // Starts just past the top padding so the heading sits under the navbar with the steps in view.
            scrollTrigger: { trigger: section, start: "top+=40 top", end: "+=220%", pin: true, scrub: true, invalidateOnRefresh: true },
          })
          .fromTo(one, { x: toMiddle }, { x: 0, duration: 1 }, 0)
          .fromTo(two, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.6 }, 0.4)
          .to(railOne, { scaleX: 1, duration: 0.4 }, 0.7)
          .fromTo(three, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.6 }, 1.4)
          .to(railTwo, { scaleX: 1, duration: 0.4 }, 1.7)
          .to({}, { duration: 0.3 });
      });
    },
    { scope: sectionRef }
  );

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      aria-labelledby="how-it-works-heading"
      className="overflow-x-clip bg-[#0C2A52] py-20 text-white md:py-28"
    >
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: reduce ? 0 : 0.5 }}
          className="mx-auto max-w-2xl text-center lg:mt-16 motion-reduce:opacity-100! motion-reduce:transform-none!"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#62A0EA]">
            How It Works
          </p>
          <h2
            id="how-it-works-heading"
            className="mt-5 font-sans text-3xl font-bold leading-[1.1] tracking-tight sm:text-4xl md:text-5xl"
          >
            Three steps to smarter commuting
          </h2>
        </motion.div>

        <ol className="mt-12 grid gap-12 md:mt-16 md:grid-cols-3 md:gap-6 lg:gap-8">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.li
                key={s.step}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: reduce ? 0 : 0.5, delay: reduce ? 0 : i * 0.12 }}
                className="min-w-0 motion-reduce:opacity-100! motion-reduce:transform-none!"
              >
                <div data-step>
                  <div aria-hidden="true">
                    <StepFrame />
                  </div>
                  <div className="relative mt-7 flex h-11 items-center justify-center">
                    {i < STEPS.length - 1 && (
                      <div aria-hidden="true" className="absolute inset-y-0 left-1/2 hidden w-[calc(100%+1.5rem)] items-center md:flex lg:w-[calc(100%+2rem)]">
                        <div data-rail className="relative h-px w-full bg-white/15">
                          <motion.div
                            initial={{ scaleX: 0 }}
                            whileInView={{ scaleX: 1 }}
                            viewport={{ once: true, amount: 0.5 }}
                            transition={{ duration: reduce ? 0 : 0.8, delay: reduce ? 0 : 0.3 + i * 0.2, ease: "easeOut" }}
                            className="absolute inset-0 origin-left bg-[#62A0EA] motion-reduce:transform-none!"
                          />
                        </div>
                      </div>
                    )}
                    <span
                      aria-hidden="true"
                      className="relative z-10 grid h-11 w-11 place-items-center rounded-full border border-[#2A5185] bg-[#0C2A52] text-sm font-bold tabular-nums text-white"
                    >
                      {s.step}
                    </span>
                  </div>
                  <h3 className="mt-5 flex items-center justify-center gap-2.5 text-center font-sans text-2xl font-bold tracking-tight">
                    <Icon aria-hidden="true" size={20} className="shrink-0 text-white/50" />
                    {s.title}
                  </h3>
                  <p className="mx-auto mt-3 max-w-sm text-center text-sm leading-relaxed text-white/60 lg:text-base">
                    {s.desc}
                  </p>
                </div>
              </motion.li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
