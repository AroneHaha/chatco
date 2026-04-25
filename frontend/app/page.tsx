import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import TrustBar from "@/components/landing/TrustBar";
import HowItWorks from "@/components/landing/HowItWorks";
import CommuterFeatures from "@/components/landing/CommuterFeatures";
import HeatmapShowcase from "@/components/landing/HeatmapShowcase";
import SafetySupport from "@/components/landing/SafetySupport";
import LoyaltyPerks from "@/components/landing/LoyaltyPerks";
import FinalCTA from "@/components/landing/FinalCTA";
import Footer from "@/components/landing/Footer";

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <TrustBar />
      <HowItWorks />
      <CommuterFeatures />
      <SafetySupport />
      <LoyaltyPerks />
      <HeatmapShowcase />
      <FinalCTA />
      <Footer />
    </main>
  );
}