import type { Metadata } from "next";
import LegalPage from "@/components/landing/LegalPage";
import { REGISTRATION_TERMS } from "@/lib/legal/registration-policies";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The guidelines for commuter registration, account verification, rides, payments, rewards, and responsible use of CHATCO.",
};

export default function TermsOfServicePage() {
  return <LegalPage kind="terms" description="The guidelines for commuter registration, account verification, rides, payments, rewards, and responsible use of CHATCO." sections={REGISTRATION_TERMS} />;
}
