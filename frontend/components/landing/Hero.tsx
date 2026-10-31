// components/landing/Hero.tsx
"use client";

import { useRef, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";
import { ArrowRight } from "lucide-react";
import heroFleet from "../../assets/landing-hero.png";

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

// lg+ scrim geometry in px, not %, so the solid navy always ends just past the
// copy column whatever the screen width, and wide screens show more fleet.
const SOLID = 550; // solid navy up to here
const FADE = 860; // then a soft edge that is clear by SOLID + FADE

export default function Hero() {
  const heroRef = useRef<HTMLElement>(null);

  // Desktop scroll scene: the hero pins, the scrim sweeps right over the photo
  // while the copy reflows to center-aligned (each line and block slides to the
  // hero's center line, staggered), then the field shifts to How It Works'
  // #0C2A52, the copy fades, and the hero fades out over that section, which
  // is pulled up one screen to sit underneath — no empty screen between them.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        const hero = heroRef.current;
        const q = gsap.utils.selector(hero);
        const [sweep] = q<HTMLElement>("[data-hero-sweep]");
        const [grid] = q<HTMLElement>("[data-hero-grid]");
        const [tint] = q<HTMLElement>("[data-hero-tint]");
        const [copy] = q<HTMLElement>("[data-hero-copy]");
        const [title] = q<HTMLElement>("[data-hero-title]");
        const [lead] = q<HTMLElement>("[data-hero-lead]");
        const [divider, actions, route] = q<HTMLElement>("[data-hero-block]");
        const next = hero?.nextElementSibling;
        if (!hero || !sweep || !grid || !tint || !copy || !title || !lead || !divider || !actions || !route || !next) return;

        // Reverted by matchMedia when the scene is off, so mobile / reduced motion keep normal flow.
        gsap.set(next, { marginTop: "-100vh" });

        // autoSplit re-splits (and rebuilds the scene) after font load or resize, so line breaks stay true.
        SplitText.create([title, lead], {
          type: "lines",
          autoSplit: true,
          onSplit(self) {
            // Line wrappers are full-width blocks; fit-content makes each hug its text so centering uses the visible width.
            const lines = self.lines as HTMLElement[];
            gsap.set(lines, { width: "fit-content" });
            const items = [
              ...lines.filter((l) => title.contains(l)),
              divider,
              ...lines.filter((l) => lead.contains(l)),
              actions,
              route,
            ];
            // Subtracting the item's current x gives its resting spot, so a mid-scroll refresh still measures true.
            const toCenter = (el: HTMLElement) => () => {
              const r = el.getBoundingClientRect();
              const h = hero.getBoundingClientRect();
              return h.left + h.width / 2 - (r.left - Number(gsap.getProperty(el, "x"))) - r.width / 2;
            };

            const tl = gsap
              .timeline({
                defaults: { ease: "none" },
                // refreshPriority: this pin is rebuilt on re-split, after later sections' triggers exist; it must
                // still be measured first so their start positions include its pin spacing.
                scrollTrigger: { trigger: hero, start: "top top", end: "+=150%", pin: true, scrub: true, invalidateOnRefresh: true, refreshPriority: 1 },
              })
              .fromTo(sweep, { x: () => SOLID + FADE - sweep.offsetWidth }, { x: 0, duration: 1 }, 0)
              .fromTo(grid, { "--grid-edge": `${SOLID}px` }, { "--grid-edge": () => `${hero.offsetWidth}px`, duration: 1 }, 0);
            items.forEach((el, i) => tl.to(el, { x: toCenter(el), duration: 0.8 }, (i / (items.length - 1)) * 0.2));
            tl.to(tint, { opacity: 1, duration: 0.3 }, 1)
              .to(copy, { opacity: 0, y: -24, duration: 0.3 }, 1)
              // autoAlpha also sets visibility:hidden, so the spent hero never blocks clicks on the section beneath.
              .to(hero, { autoAlpha: 0, duration: 0.2 }, 1.3);
            return tl;
          },
        });
      });
    },
    { scope: heroRef }
  );

  return (
    <header ref={heroRef} className="relative z-10 overflow-hidden bg-[#071A2E] font-sans pt-24 pb-10 sm:pt-32 sm:pb-20 lg:pt-0 lg:pb-0 lg:min-h-screen lg:flex lg:items-center">
      {/* The real CHATCO fleet, full bleed. A navy scrim keeps the copy on solid
          navy: flat over the whole photo below lg, fading out to the right on lg+
          so the units show beside the headline. The scrim runs under the docked
          Navbar too, so the bar's translucent fill continues the same fade with
          no seam at its bottom edge. */}
      <Image
        src={heroFleet}
        alt=""
        fill
        priority
        placeholder="blur"
        sizes="100vw"
        className="object-cover object-center"
      />
      <div aria-hidden className="absolute inset-0 bg-[#071A2E]/85 lg:hidden" />
      {/* lg+ scrim: a panel wider than the hero by the fade length, parked so its
          solid part ends at SOLID. The scroll scene slides it right to cover the photo. */}
      <div
        aria-hidden
        data-hero-sweep
        className="hidden lg:block absolute inset-y-0 left-0 pointer-events-none"
        style={{
          width: `calc(100% + ${FADE}px)`,
          transform: `translateX(calc(-100% + ${SOLID + FADE}px))`,
          background: `linear-gradient(to right, #071A2E 0, #071A2E calc(100% - ${FADE}px), rgba(7,26,46,0.92) calc(100% - 720px), rgba(7,26,46,0.7) calc(100% - 540px), rgba(7,26,46,0.35) calc(100% - 300px), rgba(7,26,46,0) 100%)`,
        }}
      />
      {/* Faint structural grid on the navy side only; on lg+ it fades out at --grid-edge, which follows the sweep. */}
      <div
        aria-hidden
        data-hero-grid
        className="absolute inset-0 opacity-[0.03] pointer-events-none lg:mask-[linear-gradient(to_right,black_0,black_var(--grid-edge),transparent_calc(var(--grid-edge)+450px))]"
        style={{ "--grid-edge": `${SOLID}px`, backgroundImage: "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)", backgroundSize: "64px 64px" } as CSSProperties}
      />
      {/* How It Works' field colour, faded in at the end of the scroll scene. */}
      <div aria-hidden data-hero-tint className="hidden lg:block absolute inset-0 bg-[#0C2A52] opacity-0 pointer-events-none" />

      {/* Below lg, the Navbar's container; on lg+ the copy pins to a fixed left gutter instead of the centered container. */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-5 md:px-8 lg:max-w-none lg:px-28 xl:px-52 lg:pt-20">
        <div data-hero-copy className="lg:max-w-xl">
          <motion.div
            className="w-full max-w-md mx-auto text-center sm:max-w-xl lg:max-w-none lg:mx-0 lg:text-left"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#62A0EA] lg:hidden">
              Built for your daily commute
            </p>
            <h1 data-hero-title className="font-sans font-bold text-white leading-[1.1] lg:leading-[1.02] tracking-[-0.035em] text-[clamp(2rem,9vw,3rem)] sm:text-6xl lg:text-5xl xl:text-[64px]">
              Know where <br />
              your jeep is. <br />
              <span className="text-[#62A0EA]">Pay cashless.</span>
            </h1>

            <div data-hero-block className="hidden lg:block mt-11 h-px w-24 bg-white/15" />

            <p data-hero-lead className="mt-5 mx-auto max-w-md text-sm sm:text-base lg:mx-0 lg:mt-8 lg:text-lg text-white/60 leading-[1.7]">
              Experience seamless commuting with real-time tracking, cashless QR payments, and smart safety features—all in your pocket.
            </p>

            <div data-hero-block className="mt-7 grid grid-cols-1 gap-3 sm:flex sm:items-center sm:justify-center lg:w-fit lg:justify-start lg:mt-9 lg:gap-8 shrink-0">
              <Link
                href="/signup" scroll={false}
                className="inline-flex items-center justify-center min-h-12 px-6 py-3 rounded-xl text-sm font-semibold whitespace-nowrap sm:px-8 lg:min-h-0 lg:py-4 lg:rounded-full lg:text-base bg-[#1A5FB4] text-white hover:bg-[#164A8F] transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#62A0EA]"
              >
                Create Account
              </Link>
              <a
                href="#features"
                className="group inline-flex items-center justify-center gap-2 min-h-12 px-6 py-3 rounded-xl border border-[#1E2D45] bg-[#0B1120] text-sm font-medium whitespace-nowrap lg:min-h-0 lg:p-0 lg:rounded-none lg:border-0 lg:bg-transparent lg:text-base text-white/70 hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#62A0EA]"
              >
                Learn more
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </a>
            </div>

            {/* The real, confirmed pilot corridor (PRODUCT.md). */}
            <div data-hero-block className="mt-7 pt-6 border-t border-white/10 flex flex-wrap items-center justify-center gap-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40 lg:w-fit lg:mt-16 lg:pt-0 lg:border-0 lg:justify-start lg:text-xs lg:tracking-[0.2em]">
              <span>Calumpit</span>
              <span className="w-8 h-px bg-white/20" />
              <span>Meycauayan</span>
              <span className="hidden sm:inline text-white/25">— Bulacan, Philippines</span>
            </div>
          </motion.div>
        </div>
      </div>
    </header>
  );
}
