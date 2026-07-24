<?php

namespace Database\Seeders;

use App\Models\FaqItem;
use Illuminate\Database\Seeder;

/**
 * Seeds the faq_items table with the original hard-coded landing-page FAQs
 * so the DB-driven FAQ chat starts with the same content it had before.
 *
 * Idempotent: skips entirely if any FAQ already exists, so it never clobbers
 * items an admin has added or edited via /settings/faq-management.
 */
class FaqSeeder extends Seeder
{
    public function run(): void
    {
        if (FaqItem::query()->exists()) {
            return;
        }

        $byCategory = [
            'getting-started' => [
                ['How do I create a CHATCO account?', 'Super easy! Sign up with your email or phone, pick "Commuter," and you\'re in. You\'ll get your QR code right away — no ID needed. Welcome aboard!'],
                ['What is my CHATCO QR code for?', 'It\'s your digital boarding pass! Show it to the conductor, they scan it, and your fare is processed through GCash. No cash, no card — just your phone!'],
                ['Is CHATCO free to use?', 'Yep, totally free! You only pay when you ride — fares go directly through GCash. No subscriptions, no hidden fees, no wallet to maintain!'],
                ['Where does CHATCO operate?', 'We\'re currently on the Calumpit–Meycauayan route in Bulacan with 34 official stop points. More routes coming soon!'],
            ],
            'payments' => [
                ['How do I pay for my ride?', 'When you ride, show your QR code to the conductor. They scan it, select your fare based on your pickup and drop-off points, and you pay directly through GCash. No need to load a wallet beforehand!'],
                ['How is my fare calculated?', 'Fares are based on official CHATCO point areas, not GPS distance. The route has 34 predefined stops, each with a set fare. Your fare depends on which point area you board from and where you get off. The conductor selects the nearest official point for computation.'],
                ['Do I need a GCash account?', 'Yes, for cashless payments you\'ll need a GCash account. When the conductor scans your QR, you\'ll receive a GCash payment prompt to confirm. You can also pay with cash directly to the conductor.'],
                ['What happens if my ride is interrupted?', 'If your trip is interrupted (e.g., engine breakdown), report the issue directly to the conductor or contact our support team. We\'ll work with you to resolve the situation as quickly as possible.'],
            ],
            'riding' => [
                ['How do I hail a jeepney?', 'Open the map, tap Hail, and your location goes out to nearby conductors. When a CHATCO jeep is within 1km of your location, it appears on your map and you\'ll get a sound notification!'],
                ['Why can\'t I see all jeeps on the map?', 'We only show CHATCO jeeps within 1km of your location to reduce map clutter, save bandwidth, and keep the app running smoothly. When a jeep approaches, you\'ll see it appear and hear a notification sound.'],
                ['How do I pay when I ride?', 'Two options! Show your QR code to the conductor — they scan it and fare is paid via GCash. Or pay with cash directly. Either way, the fare is the same based on the official point area rates.'],
                ['Can I share my ride with someone?', 'Yep! Tap Share My Ride to send a live tracking link to family or friends. They\'ll see your location even without the app.'],
            ],
            'safety' => [
                ['What is the SOS button?', 'It\'s your emergency alert! Press it and your live location + ride details go straight to our admin team and your emergency contacts. Only use for real emergencies though!'],
                ['I left something on the jeepney. What do I do?', 'Don\'t panic! Go to Lost & Found and report the item with date, time, and route. Conductors and admins can match it with found items on their end.'],
                ['Is my personal data safe?', 'Absolutely! We use encrypted connections and secure storage through PayMongo for payments. Your QR code only has a unique ID — no personal info or payment details are exposed when scanned.'],
                ['How do I report a concern?', 'Head to Feedback in the app! Rate your ride, report issues, or suggest improvements. Every report is reviewed by our team — your voice counts!'],
            ],
            'rewards' => [
                ['How does the loyalty program work?', 'Every ride earns you points! The more you ride, the more you earn. Unlock perks like discounted fares, priority hailing, and exclusive vouchers.'],
                ['How do I check my rewards?', 'Check Rewards in the app! You\'ll see your points, available perks, and active vouchers for your next ride.'],
                ['Do points expire?', 'Nope! Your points are yours forever. No expiration, no pressure!'],
            ],
        ];

        foreach ($byCategory as $category => $items) {
            foreach ($items as $order => [$question, $answer]) {
                FaqItem::create([
                    'question'      => $question,
                    'answer'        => $answer,
                    'category'      => $category,
                    'display_order' => $order,
                    'is_active'     => true,
                ]);
            }
        }
    }
}
