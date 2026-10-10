import type { Metadata } from "next";
import LegalPage, { type LegalSection } from "@/components/landing/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Read the guidelines for using your CHATCO account, ride features, payments, and rewards.",
};

const sections: LegalSection[] = [
  {
    id: "using-chatco",
    title: "Using CHATCO",
    paragraphs: [
      "CHATCO helps commuters find nearby jeepneys, request pickup, pay fares, keep ride records, and access ride safety features. Use the service responsibly and follow the instructions shown for each feature.",
      "Features depend on route coverage, participating vehicles, connectivity, and service availability. The Android app is coming soon; you can use CHATCO on the web while its download is unavailable.",
    ],
  },
  {
    id: "your-account",
    title: "Your account",
    paragraphs: [
      "Provide accurate account information and keep your sign-in details private. Use your own account for payments, receipt claims, and rewards.",
      "Do not impersonate another person, share someone else's private information, or attempt to access accounts or parts of the service without permission. Contact CHATCO if you believe your account has been misused.",
    ],
  },
  {
    id: "rides-and-fares",
    title: "Rides and fares",
    paragraphs: [
      "Check your pickup point, destination, and displayed fare before confirming a ride or payment. Nearby vehicle locations and pickup requests help you plan, but do not guarantee that a vehicle will be available or arrive at a particular time.",
      "Keep your receipt or transaction reference if you need help with a fare or payment. Raise an incorrect charge or ride concern through the support and feedback options.",
    ],
  },
  {
    id: "payments",
    title: "Payments",
    paragraphs: [
      "Complete GCash payments using the payment flow linked to your CHATCO account. Payment processing also follows the payment provider's terms. Check the final payment status before assuming a transaction is complete.",
      "For cash payments, keep the physical receipt issued for your ride. A receipt QR can be scanned from your account to record the eligible ride for rewards.",
    ],
  },
  {
    id: "ride-rewards",
    title: "Free ride rewards",
    paragraphs: [
      "Complete 10 eligible paid rides to earn a free ride voucher. GCash payments through your account count automatically. Cash payments count after you sign in and scan the QR on your physical receipt.",
      "Claim only receipts for rides you paid for. Check the voucher details in your account for its validity and redemption conditions before using it.",
    ],
  },
  {
    id: "safety-and-conduct",
    title: "Safety and responsible use",
    paragraphs: [
      "Use pickup requests, ride sharing, reports, and emergency features for their intended purposes. Do not submit false reports, misuse SOS, or interfere with other commuters' access to the service.",
      "Share ride links only with trusted people. If there is immediate danger, contact local emergency services directly; an in-app alert does not guarantee an emergency response.",
    ],
  },
];

export default function TermsOfServicePage() {
  return <LegalPage kind="terms" description="The everyday guidelines for your account, fares, payments, and free ride rewards — so you know what to expect when riding with CHATCO." sections={sections} />;
}
