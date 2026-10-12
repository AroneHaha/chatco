import type { Metadata } from "next";
import LegalPage from "@/components/landing/LegalPage";
import { PRIVACY_SECTIONS } from "@/lib/legal/registration-policies";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How CHATCO uses your registration details, identification, agreements, ride records, and device permissions.",
};

export default function PrivacyPolicyPage() {
  return <LegalPage kind="privacy" description="How CHATCO uses your registration details, identification, agreements, ride records, and device permissions." sections={PRIVACY_SECTIONS} />;
}
