import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import Manifesto from "@/components/landing/Manifesto";
import CommuterFeatures from "@/components/landing/CommuterFeatures";
import DownloadApp from "@/components/landing/DownloadApp";
import Contact from "@/components/landing/Contact";
import FinalCTA from "@/components/landing/FinalCTA";
import Footer from "@/components/landing/Footer";
import FAQChatBubble from "@/components/landing/FAQChatBubble";
import SmoothScroll from "@/components/landing/SmoothScroll";
import Reveal from "@/components/landing/Reveal";
import LandingTheme from "@/components/landing/LandingTheme";

// Keep the landing page mounted while the parallel auth slot opens and closes.
export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <LandingTheme>
      <main className="font-sans overflow-x-clip">
        {/* Lenis + GSAP smooth-scroll layer (landing only; respects reduced motion) */}
        <SmoothScroll />
        <Navbar />
        <Hero />
        <HowItWorks />
        <CommuterFeatures />
        <Manifesto />
        <DownloadApp />
        <Contact />
        <Reveal>
          <FinalCTA />
        </Reveal>
        <Footer />
        <FAQChatBubble />
      </main>
      {children}
    </LandingTheme>
  );
}
