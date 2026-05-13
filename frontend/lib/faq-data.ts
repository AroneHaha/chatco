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

export const faqCategories: FAQCategory[] = [
  {
    id: "getting-started",
    label: "Getting Started",
    emoji: "🚀",
    items: [
      {
        question: "How do I create a CHATCO account?",
        answer:
          "Super easy! Sign up with your email or phone, pick \"Commuter,\" and you're in. You'll get your QR code right away — no ID needed. Welcome aboard!",
      },
      {
        question: "What is my CHATCO QR code for?",
        answer:
          "It's your digital boarding pass! Show it to the conductor, they scan it, and your fare is processed through GCash. No cash, no card — just your phone!",
      },
      {
        question: "Is CHATCO free to use?",
        answer:
          "Yep, totally free! You only pay when you ride — fares go directly through GCash. No subscriptions, no hidden fees, no wallet to maintain!",
      },
      {
        question: "Where does CHATCO operate?",
        answer:
          "We're currently on the Calumpit–Meycauayan route in Bulacan with 34 official stop points. More routes coming soon!",
      },
    ],
  },
  {
    id: "payments",
    label: "Payments & GCash",
    emoji: "💰",
    items: [
      {
        question: "How do I pay for my ride?",
        answer:
          "When you ride, show your QR code to the conductor. They scan it, select your fare based on your pickup and drop-off points, and you pay directly through GCash. No need to load a wallet beforehand!",
      },
      {
        question: "How is my fare calculated?",
        answer:
          "Fares are based on official CHATCO point areas, not GPS distance. The route has 34 predefined stops, each with a set fare. Your fare depends on which point area you board from and where you get off. The conductor selects the nearest official point for computation.",
      },
      {
        question: "Do I need a GCash account?",
        answer:
          "Yes, for cashless payments you'll need a GCash account. When the conductor scans your QR, you'll receive a GCash payment prompt to confirm. You can also pay with cash directly to the conductor.",
      },
      {
        question: "What happens if my ride is interrupted?",
        answer:
          "If your trip is interrupted (e.g., engine breakdown), report the issue directly to the conductor or contact our support team. We'll work with you to resolve the situation as quickly as possible.",
      },
    ],
  },
  {
    id: "riding",
    label: "Riding & Tracking",
    emoji: "🚐",
    items: [
      {
        question: "How do I hail a jeepney?",
        answer:
          "Open the map, tap Hail, and your location goes out to nearby conductors. When a CHATCO jeep is within 1km of your location, it appears on your map and you'll get a sound notification!",
      },
      {
        question: "Why can't I see all jeeps on the map?",
        answer:
          "We only show CHATCO jeeps within 1km of your location to reduce map clutter, save bandwidth, and keep the app running smoothly. When a jeep approaches, you'll see it appear and hear a notification sound.",
      },
      {
        question: "How do I pay when I ride?",
        answer:
          "Two options! Show your QR code to the conductor — they scan it and fare is paid via GCash. Or pay with cash directly. Either way, the fare is the same based on the official point area rates.",
      },
      {
        question: "Can I share my ride with someone?",
        answer:
          "Yep! Tap Share My Ride to send a live tracking link to family or friends. They'll see your location even without the app.",
      },
    ],
  },
  {
    id: "safety",
    label: "Safety & Support",
    emoji: "🛡️",
    items: [
      {
        question: "What is the SOS button?",
        answer:
          "It's your emergency alert! Press it and your live location + ride details go straight to our admin team and your emergency contacts. Only use for real emergencies though!",
      },
      {
        question: "I left something on the jeepney. What do I do?",
        answer:
          "Don't panic! Go to Lost & Found and report the item with date, time, and route. Conductors and admins can match it with found items on their end.",
      },
      {
        question: "Is my personal data safe?",
        answer:
          "Absolutely! We use encrypted connections and secure storage through PayMongo for payments. Your QR code only has a unique ID — no personal info or payment details are exposed when scanned.",
      },
      {
        question: "How do I report a concern?",
        answer:
          "Head to Feedback in the app! Rate your ride, report issues, or suggest improvements. Every report is reviewed by our team — your voice counts!",
      },
    ],
  },
  {
    id: "rewards",
    label: "Rewards & Loyalty",
    emoji: "🎁",
    items: [
      {
        question: "How does the loyalty program work?",
        answer:
          "Every ride earns you points! The more you ride, the more you earn. Unlock perks like discounted fares, priority hailing, and exclusive vouchers.",
      },
      {
        question: "How do I check my rewards?",
        answer:
          "Check Rewards in the app! You'll see your points, available perks, and active vouchers for your next ride.",
      },
      {
        question: "Do points expire?",
        answer:
          "Nope! Your points are yours forever. No expiration, no pressure!",
      },
    ],
  },
];
