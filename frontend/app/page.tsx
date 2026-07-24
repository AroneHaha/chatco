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

export default function Home() {
  return (
    <main>
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
