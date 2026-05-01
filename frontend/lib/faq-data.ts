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
          "Super easy! Sign up with your email or phone, pick \"Commuter,\" and you're in. You'll get your QR code right away — no ID needed. Welcome aboard! 🎉",
      },
      {
        question: "What is my CHATCO QR code for?",
        answer:
          "It's your digital boarding pass! Show it to the conductor, they scan it, and your fare is processed. No cash, no card — just your phone!",
      },
      {
        question: "Is CHATCO free to use?",
        answer:
          "Yep, totally free! You only load money into your wallet when you're ready to ride. No subscriptions, no hidden fees!",
      },
      {
        question: "Where does CHATCO operate?",
        answer:
          "We're currently on the Calumpit–Meycauayan route in Bulacan. More routes coming soon! 🚌",
      },
    ],
  },
  {
    id: "payments",
    label: "Payments & Wallet",
    emoji: "💰",
    items: [
      {
        question: "How do I load my wallet?",
        answer:
          "Go to Wallet → Top Up! Load via GCash, Maya, bank transfer, or over-the-counter at partner terminals. Minimum is just ₱50!",
      },
      {
        question: "How is my fare calculated?",
        answer:
          "It's based on distance — from your pick-up to drop-off point along the route. The app auto-computes it when you board, so no math needed!",
      },
      {
        question: "What happens if my balance is insufficient?",
        answer:
          "You'll get a heads-up before boarding so you can top up right away. Conductors will also see a low-balance flag — no awkward moments!",
      },
      {
        question: "Can I get a refund?",
        answer:
          "Of course! Report it through Feedback and our team will review it. Refunds are credited back to your wallet within 24–48 hours. We've got your back!",
      },
    ],
  },
  {
    id: "riding",
    label: "Riding & Tracking",
    emoji: "🚌",
    items: [
      {
        question: "How do I hail a jeepney?",
        answer:
          "Open the map, tap Hail, and your location goes out to nearby conductors. When one accepts, you'll see them approach in real-time! 😄",
      },
      {
        question: "Can I see where the jeepney is?",
        answer:
          "Absolutely! Once accepted, their live location shows up on your map. No more guessing if they're 2 or 20 minutes away.",
      },
      {
        question: "How do I pay when I ride?",
        answer:
          "Two options! Show your QR code to the conductor — they scan it and fare is auto-deducted. Or use Pay Fare in the app to pay yourself by picking your stops. Whatever's easier for you!",
      },
      {
        question: "Can I share my ride with someone?",
        answer:
          "Yep! Tap Share My Ride to send a live tracking link to family or friends. They'll see your location even without the app. 💙",
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
          "Absolutely! We use encrypted connections and secure storage. Your QR code only has a unique ID — no personal info is exposed when scanned. 🔒",
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
          "Every ride earns you points! The more you ride, the more you earn. Unlock perks like discounted fares, priority hailing, and exclusive vouchers. 🎁",
      },
      {
        question: "How do I check my rewards?",
        answer:
          "Check Rewards in the app! You'll see your points, available perks, and active vouchers for your next ride.",
      },
      {
        question: "Do points expire?",
        answer:
          "Nope! Your points are yours forever. No expiration, no pressure! 🙌",
      },
    ],
  },
];