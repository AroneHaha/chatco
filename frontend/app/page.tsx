import localFont from "next/font/local";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import TrustBar from "@/components/landing/TrustBar";
import HowItWorks from "@/components/landing/HowItWorks";
import Manifesto from "@/components/landing/Manifesto";
import CommuterFeatures from "@/components/landing/CommuterFeatures";
import HeatmapShowcase from "@/components/landing/HeatmapShowcase";
import SafetySupport from "@/components/landing/SafetySupport";
import LoyaltyPerks from "@/components/landing/LoyaltyPerks";
import FinalCTA from "@/components/landing/FinalCTA";
import Footer from "@/components/landing/Footer";
import FAQChatBubble from "@/components/landing/FAQChatBubble";
import SmoothScroll from "@/components/landing/SmoothScroll";
import Reveal from "@/components/landing/Reveal";

// Editorial pairing for the public landing page only — self-hosted Fontshare
// faces, not loaded anywhere else in the app (admin/conductor/commuter stay
// on Poppins; see DESIGN.md's Typography section).
const erode = localFont({
  src: [
    { path: "../assets/fonts/erode/erode-400.woff2", weight: "400", style: "normal" },
    { path: "../assets/fonts/erode/erode-500.woff2", weight: "500", style: "normal" },
    { path: "../assets/fonts/erode/erode-600.woff2", weight: "600", style: "normal" },
    { path: "../assets/fonts/erode/erode-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-erode",
  display: "swap",
});

const generalSans = localFont({
  src: [
    { path: "../assets/fonts/general-sans/general-sans-400.woff2", weight: "400", style: "normal" },
    { path: "../assets/fonts/general-sans/general-sans-500.woff2", weight: "500", style: "normal" },
    { path: "../assets/fonts/general-sans/general-sans-600.woff2", weight: "600", style: "normal" },
    { path: "../assets/fonts/general-sans/general-sans-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-general-sans",
  display: "swap",
});

export default function Home() {
  return (
    <main className={`${erode.variable} ${generalSans.variable} font-editorial-sans`}>
      {/* Lenis + GSAP smooth-scroll layer (landing only; respects reduced motion) */}
      <SmoothScroll />
      <Navbar />
      <Hero />
      <TrustBar />
      <HowItWorks />
      <CommuterFeatures />
      <Manifesto />
      <Reveal>
        <SafetySupport />
      </Reveal>
      <LoyaltyPerks />
      <HeatmapShowcase />
      <Reveal>
        <FinalCTA />
      </Reveal>
      <Footer />
      <FAQChatBubble />
    </main>
  );
}
