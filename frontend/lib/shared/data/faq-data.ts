export interface FAQItem {
  question: string;
  answer: string;
}

export interface FAQCategory {
  id: string;
  label: string;
  emoji: string;
  items: FAQItem[];
}

/** Category metadata (label + emoji) keyed by slug. */
export interface FAQCategoryMeta {
  id: string;
  label: string;
  emoji: string;
}

/**
 * Canonical category list — the single source of truth for the slug → label +
 * emoji mapping used by BOTH the admin FAQ form and the landing FAQ chat.
 * The `id` values MUST match the backend `FaqItem::CATEGORIES` keys.
 */
export const FAQ_CATEGORIES: FAQCategoryMeta[] = [
  { id: "getting-started", label: "Getting Started", emoji: "🚀" },
  { id: "payments", label: "Payments & GCash", emoji: "💰" },
  { id: "riding", label: "Riding & Tracking", emoji: "🚐" },
  { id: "safety", label: "Safety & Support", emoji: "🛡️" },
  { id: "rewards", label: "Rewards & Loyalty", emoji: "🎁" },
];

/** Shape of a FAQ item returned by the public GET /api/faqs endpoint. */
export interface ApiFaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  display_order: number;
}

/**
 * Offline fallback for the landing FAQ chat, shown only until /api/faqs
 * responds. Mirrors backend FaqSeeder (and migration
 * 2026_11_09_000001_refresh_landing_faqs) word for word.
 */
const FALLBACK_ITEMS: Record<string, FAQItem[]> = {
  "getting-started": [
    {
      question: "How do I create an E-CHATCO account?",
      answer:
        "Tap Sign up and complete four short steps: your personal details and commuter type (Regular, Student, Senior Citizen, or PWD), your contact number and a photo of your valid ID, the 6-digit code we email you, and your username and password. An admin then reviews your ID before your account is activated.",
    },
    {
      question: "Why is my account still pending?",
      answer:
        "Every new account waits for an admin to check your valid ID and commuter type. You can sign in once it is approved. If it is not approved, you can register again with the correct details and ID.",
    },
    {
      question: "Is E-CHATCO free to use?",
      answer: "Yes. Creating an account and using the app cost nothing. You only pay your regular fare, by GCash or in cash.",
    },
    {
      question: "What time is the first trip and last trip?",
      answer: "The first trip starts at 4:10 AM on weekdays and 5:00 AM on weekends. Trips run until 9:00 PM every day.",
    },
  ],
  payments: [
    {
      question: "How do I pay with GCash?",
      answer:
        "Tell the conductor where you are getting off and they will show a payment QR on their device. Tap Pay with GCash on your Home screen, scan that QR, check the amount, and confirm to finish on GCash's secure page.",
    },
    {
      question: "How is my fare calculated?",
      answer:
        "Fares follow the 34 official CHATCO stop points, not GPS distance. Your fare depends on where you board and where you get off, and it is the same whether you pay by GCash or in cash. Open the fare calculator in the app to check a fare before you ride.",
    },
    {
      question: "Do I need a GCash account?",
      answer: "Only to pay cashless. You can always pay the conductor in cash at the same fare.",
    },
    {
      question: "What if my GCash payment doesn't go through?",
      answer:
        "Nothing is charged until you confirm on GCash. If the payment fails or the QR expires, tap Try again and ask the conductor for a new QR, or pay in cash instead. Payment History shows the final status of each payment.",
    },
    {
      question: "How do I get a Student, Senior Citizen, or PWD discount?",
      answer:
        "Choose your commuter type when you sign up and upload the matching ID. Already registered as Regular? Apply from your Profile. Once an admin approves it, the discount is applied to your fare automatically. Students renew their discount once a year.",
    },
  ],
  riding: [
    {
      question: "How do I hail a jeepney?",
      answer:
        "Press and hold Hold to Hail on the map. Your pickup point is sent to the nearest on-duty CHATCO jeep within 1 km of you, and the hail stays active for 3 minutes. You need to be near the route, and the jeep cannot be on break.",
    },
    {
      question: "Why can't I see all jeeps on the map?",
      answer:
        "The map only shows CHATCO jeeps within 1 km of you, so it stays clear and shows the units you can actually catch, along with about how long each one will take to reach you.",
    },
    {
      question: "Can I pay for my companions?",
      answer:
        "Yes. Tell the conductor how many are riding with you. They add your companions to one payment QR, and you pay the group total in a single GCash payment. Each passenger's Student, Senior Citizen, or PWD discount still applies.",
    },
    {
      question: "Can I share my ride with someone?",
      answer:
        "Yes. Tap Share Ride on your Home screen to create a live location link for family or friends. They can follow your trip in any browser without the app. The link stays live for 30 minutes, and you can stop sharing anytime.",
    },
    {
      question: "How do I know which way a jeep is going?",
      answer:
        "Each jeep on the map points in its direction of travel, toward Calumpit or Meycauayan, so you can tell whether it is coming your way before you hail.",
    },
  ],
  safety: [
    {
      question: "Is the jeepney's speed monitored?",
      answer:
        "Yes. Every unit's speed is tracked live, and any trip over the speed limit is recorded for the operator's admins to review.",
    },
    {
      question: "I left something on the jeepney. What do I do?",
      answer:
        "Open Lost & Found to browse items conductors have turned in, with photos, the jeep's plate number, and when it was found. If one is yours, claim it and add proof of ownership. You can bookmark items and follow your claim's status. Unclaimed items stay listed for 30 days.",
    },
    {
      question: "Is my personal data safe?",
      answer:
        "Yes. GCash payments are completed on GCash's own secure page through PayMongo, so E-CHATCO never sees your GCash PIN. Your ID photo is only used to review your registration and discount.",
    },
    {
      question: "How do I give feedback about my ride?",
      answer:
        "Tap Feedback and scan the QR code inside the jeepney to rate the driver and conductor for that trip and leave a comment. For anything else, reach us through the Contact section on this page.",
    },
  ],
  rewards: [
    {
      question: "How does the loyalty program work?",
      answer:
        "Every 10 paid rides earns you a free-ride voucher, and the count starts over so you can keep earning. GCash rides count automatically. For cash rides, open Rewards and scan the QR on your paper receipt.",
    },
    {
      question: "How do I check my rewards?",
      answer:
        "Open Rewards to see how many rides you have counted toward your next voucher and the vouchers you can use. You will also get a notification when a new voucher is ready.",
    },
    {
      question: "Do vouchers expire?",
      answer:
        "Yes. A free-ride voucher is valid for 3 days after you earn it, and each voucher shows its expiry date. When you pay, the app offers your voucher automatically.",
    },
  ],
};

export const faqCategories: FAQCategory[] = FAQ_CATEGORIES.map((category) => ({
  ...category,
  items: FALLBACK_ITEMS[category.id] ?? [],
}));
