import type { Metadata } from "next";
import LegalPage, { type LegalSection } from "@/components/landing/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Learn about account, ride, location, and payment information when using CHATCO.",
};

const sections: LegalSection[] = [
  {
    id: "account-information",
    title: "Your account information",
    paragraphs: [
      "CHATCO uses the information you provide when creating and using your account, such as your name, email address, and profile details. This information helps identify your account and connect your rides, receipts, and rewards to you.",
      "Information you submit through feedback, support requests, or lost-and-found reports helps the team respond to your concern.",
    ],
  },
  {
    id: "ride-and-location",
    title: "Ride and location information",
    paragraphs: [
      "Ride information can include your pickup and drop-off points, fare, payment status, and ride history. Location features use location access to help find nearby jeepneys and send pickup requests.",
      "Share My Ride lets someone with your sharing link follow the ride. Share that link only with people you trust. Emergency features can include your location when you request assistance.",
    ],
  },
  {
    id: "payments-and-rewards",
    title: "Payments, receipts, and rewards",
    paragraphs: [
      "CHATCO keeps transaction and receipt information so you can check your fare, payment status, and ride records. GCash payments are completed through the payment provider, whose own privacy terms also apply.",
      "GCash payments through your account count toward free ride rewards automatically. If you pay in cash, scanning the QR on your physical receipt from your signed-in account links that paid ride to your reward progress.",
    ],
  },
  {
    id: "service-information",
    title: "Information used to run the service",
    paragraphs: [
      "The service uses session and device information to keep you signed in and support account access. Information needed to process payments, deliver ride features, and resolve reports may be handled by the services and personnel supporting those features.",
      "Avoid including passwords, payment credentials, or unrelated personal information in feedback and public reports.",
    ],
  },
  {
    id: "your-choices",
    title: "Your choices and questions",
    paragraphs: [
      "You can manage location and notification permissions through your browser or device settings. Turning off a permission can limit features that depend on it.",
      "For questions about your information, account corrections, or an account deletion request, contact CHATCO using the details below. Include enough information to identify your account, but never send your password.",
    ],
  },
];

export default function PrivacyPolicyPage() {
  return <LegalPage kind="privacy" description="A clear look at the information connected to your account and rides, and the choices you have when using CHATCO." sections={sections} />;
}
