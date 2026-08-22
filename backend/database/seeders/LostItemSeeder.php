<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\Claim;
use App\Models\CommuterProfile;
use App\Models\LostItem;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * Dev/demo data — 30 lost items spanning every admin tab (Unmatched, Claim
 * Review, To Be Released, History, Expired) so the Lost & Found grid has
 * something realistic to look at. Not part of the default DatabaseSeeder
 * chain — run standalone: `php artisan db:seed --class=LostItemSeeder`.
 *
 * Status distribution (30 total, mirrors LostItemService's real lifecycle):
 *   14 AVAILABLE  — no claims yet
 *    6 CLAIMED    — one PENDING claim each
 *    4 APPROVED   — one APPROVED claim, awaiting release ("To Be Released")
 *    4 CLOSED     — released + closed (History tab)
 *    2 EXPIRED
 *
 * A few APPROVED/CLOSED items also carry an auto-rejected sibling claim,
 * matching approveClaim()'s real "other pending claims get rejected" behaviour.
 */
class LostItemSeeder extends Seeder
{
    private const DRIVER_NAMES = [
        'Pedro Santos', 'Ricardo Cruz', 'Antonio Garcia', 'Manuel Reyes', 'Roberto Flores',
        'Eduardo Lim', 'Fernando Torres', 'Jose Mendoza', 'Ramon Villanueva', 'Carlos Dela Rosa',
    ];

    private const CONDUCTOR_NAMES = ['Juan Dela Cruz', 'Maria Reyes'];

    private const TIME_RANGES = [
        '6:30 AM - 7:00 AM', '7:15 AM - 7:45 AM', '8:00 AM - 8:30 AM', '9:10 AM - 9:40 AM',
        '11:00 AM - 11:30 AM', '12:15 PM - 12:45 PM', '1:30 PM - 2:00 PM', '3:00 PM - 3:30 PM',
        '4:45 PM - 5:15 PM', '5:50 PM - 6:20 PM', '6:52 AM - 6:52 PM', '7:40 PM - 8:10 PM',
    ];

    /** @var array<int, array{name:string,description:string,category:string}> */
    private const ITEMS = [
        ['name' => 'Black Leather Wallet', 'description' => 'Bifold wallet with a few cards and some cash inside.', 'category' => 'WALLET'],
        ['name' => 'iPhone 13, Blue', 'description' => 'Left on the seat near the back door, cracked screen protector.', 'category' => 'GADGET'],
        ['name' => 'Blue Backpack', 'description' => 'Jansport backpack with a keychain charm on the zipper.', 'category' => 'BAG'],
        ['name' => 'Silver Necklace', 'description' => 'Thin chain necklace found under the middle row seat.', 'category' => 'ACCESSORY'],
        ['name' => 'School ID Card', 'description' => 'Laminated ID, appears to be from a nearby high school.', 'category' => 'DOCUMENT'],
        ['name' => 'Red Windbreaker Jacket', 'description' => 'Size medium, left folded on the last row seat.', 'category' => 'CLOTHING'],
        ['name' => 'Bluetooth Earphones', 'description' => 'White wireless earbuds in a charging case, no name tag.', 'category' => 'GADGET'],
        ['name' => 'Ray-Ban Style Sunglasses', 'description' => 'Black frame, found tucked in the seat pocket.', 'category' => 'ACCESSORY'],
        ['name' => 'Black Umbrella', 'description' => 'Foldable umbrella, slightly wet when found.', 'category' => 'OTHER'],
        ['name' => 'Laptop Charger', 'description' => 'Grey charger brick with a coiled cable, brand unclear.', 'category' => 'GADGET'],
        ['name' => 'Brown Sling Bag', 'description' => 'Small canvas sling bag, empty except for a pen.', 'category' => 'BAG'],
        ['name' => 'Philippine Passport', 'description' => 'Maroon passport found wedged between the seats.', 'category' => 'DOCUMENT'],
        ['name' => 'Casio Wristwatch', 'description' => 'Digital watch with a black rubber strap.', 'category' => 'ACCESSORY'],
        ['name' => 'Power Bank, 10000mAh', 'description' => 'White power bank, partially charged, no cable.', 'category' => 'GADGET'],
        ['name' => 'Grey Hoodie', 'description' => 'Plain grey pullover hoodie, left on an aisle seat.', 'category' => 'CLOTHING'],
        ['name' => 'Car Key with Keychain', 'description' => 'Single key with a rubber duck keychain attached.', 'category' => 'OTHER'],
        ['name' => 'Reading Glasses', 'description' => 'Black-framed prescription glasses in a soft pouch.', 'category' => 'ACCESSORY'],
        ['name' => 'Stainless Tumbler', 'description' => 'Blue insulated tumbler, half full of water.', 'category' => 'OTHER'],
        ['name' => 'Pocket Planner Notebook', 'description' => 'Small notebook with handwritten notes and a pen clipped on.', 'category' => 'DOCUMENT'],
        ['name' => 'Baseball Cap, Navy', 'description' => 'Plain navy cap, no logo, left on the overhead rail.', 'category' => 'CLOTHING'],
        ['name' => 'Earbuds Case', 'description' => 'Empty earbuds charging case, USB-C port.', 'category' => 'GADGET'],
        ['name' => 'Coin Purse', 'description' => 'Small zippered coin purse with a few coins inside.', 'category' => 'WALLET'],
        ['name' => 'Face Mask Pouch', 'description' => 'Fabric pouch with a couple of unused face masks.', 'category' => 'OTHER'],
        ['name' => 'Student Uniform Polo', 'description' => 'White polo with a school patch, folded in a bag.', 'category' => 'CLOTHING'],
        ['name' => 'USB Flash Drive', 'description' => '32GB flash drive, black, no visible label.', 'category' => 'GADGET'],
        ['name' => 'Rosary Bracelet', 'description' => 'Wooden bead rosary bracelet found on the floor.', 'category' => 'ACCESSORY'],
        ['name' => 'Grocery Tote Bag', 'description' => 'Reusable tote bag with a few grocery items inside.', 'category' => 'BAG'],
        ['name' => 'Barangay ID', 'description' => 'Barangay clearance ID card in a plastic sleeve.', 'category' => 'DOCUMENT'],
        ['name' => 'Toy Action Figure', 'description' => "Small plastic action figure, likely a child's toy.", 'category' => 'OTHER'],
        ['name' => 'Digital Camera', 'description' => 'Compact point-and-shoot camera with a wrist strap.', 'category' => 'GADGET'],
    ];

    public function run(): void
    {
        $admin = User::where('role', UserRole::ADMIN)->first();
        if (! $admin) {
            $this->command?->warn('LostItemSeeder: no ADMIN user found — skipping.');
            return;
        }

        $vehicles = Vehicle::all();
        $claimants = CommuterProfile::limit(10)->get();

        $adminName = $admin->adminProfile
            ? trim("{$admin->adminProfile->first_name} {$admin->adminProfile->last_name}")
            : 'System Admin';

        // 14 AVAILABLE, 6 CLAIMED, 4 APPROVED, 4 CLOSED, 2 EXPIRED = 30.
        $statusPlan = array_merge(
            array_fill(0, 14, 'AVAILABLE'),
            array_fill(0, 6, 'CLAIMED'),
            array_fill(0, 4, 'APPROVED'),
            array_fill(0, 4, 'CLOSED'),
            array_fill(0, 2, 'EXPIRED'),
        );

        $claimantCursor = 0;

        foreach (self::ITEMS as $i => $spec) {
            $status = $statusPlan[$i];
            $vehicle = $vehicles->isEmpty() ? null : $vehicles[$i % $vehicles->count()];
            $daysAgo = $status === 'EXPIRED' ? 35 + ($i * 2) : $i + 1;
            $createdAt = now()->subDays($daysAgo)->subHours($i);

            $item = new LostItem([
                'item_name' => $spec['name'],
                'description' => $spec['description'],
                'plate_number' => $vehicle?->plate_number,
                'driver_name' => self::DRIVER_NAMES[$i % count(self::DRIVER_NAMES)],
                'conductor_name' => self::CONDUCTOR_NAMES[$i % count(self::CONDUCTOR_NAMES)],
                'vehicle_id' => $vehicle?->id,
                'estimated_time_lost' => self::TIME_RANGES[$i % count(self::TIME_RANGES)],
                'category' => $spec['category'],
                'reported_by_id' => $admin->id,
                'reported_by_role' => $admin->role->value,
                'reporter_name' => $adminName,
                'status' => $status === 'EXPIRED' ? 'AVAILABLE' : $status,
            ]);
            $item->id = (string) Str::uuid();
            $item->timestamps = false;
            $item->created_at = $createdAt;
            $item->updated_at = $createdAt;
            $item->save();

            if ($status === 'EXPIRED') {
                $item->timestamps = false;
                $item->status = 'EXPIRED';
                $item->expired_at = now()->subDays($i);
                $item->updated_at = now()->subDays($i);
                $item->save();
                continue;
            }

            if ($status === 'AVAILABLE') {
                continue;
            }

            // CLAIMED / APPROVED / CLOSED all start with one claim.
            $claimant = $claimants->isEmpty() ? null : $claimants[$claimantCursor % $claimants->count()];
            $useAccount = $claimantCursor % 3 !== 0; // mix real accounts + walk-ins
            $claimantCursor++;

            $claimCreatedAt = $createdAt->copy()->addHours(3);
            $claim = new Claim([
                'item_id' => $item->id,
                'claimant_id' => $useAccount ? $claimant?->id : null,
                'claimant_name' => $useAccount && $claimant ? "{$claimant->first_name} {$claimant->surname}" : 'Walk-in Claimant '.($i + 1),
                'claimant_contact' => $useAccount && $claimant ? $claimant->contact_number : '+639170001234',
                'claimant_email' => $useAccount && $claimant ? $claimant->email : null,
                'status' => 'PENDING',
                'proof' => 'I can describe the exact contents and where I was sitting when I lost it.',
            ]);
            $claim->id = (string) Str::uuid();
            $claim->timestamps = false;
            $claim->created_at = $claimCreatedAt;
            $claim->updated_at = $claimCreatedAt;
            $claim->save();

            if ($status === 'CLAIMED') {
                continue;
            }

            // APPROVED / CLOSED: review the claim.
            $reviewedAt = $claimCreatedAt->copy()->addDay();
            $claim->timestamps = false;
            $claim->status = $status === 'APPROVED' ? 'APPROVED' : 'RELEASED';
            $claim->reviewed_by = $admin->id;
            $claim->reviewed_at = $reviewedAt;
            $claim->approved_at = $reviewedAt;
            if ($status === 'CLOSED') {
                $claim->released_at = $reviewedAt->copy()->addHours(2);
            }
            $claim->updated_at = $reviewedAt;
            $claim->save();

            // A couple of APPROVED/CLOSED items also get an auto-rejected
            // sibling claim, matching approveClaim()'s real side-effect.
            if ($i % 4 === 0) {
                $siblingClaimant = $claimants->isEmpty() ? null : $claimants[($claimantCursor) % $claimants->count()];
                $claimantCursor++;
                $sibling = new Claim([
                    'item_id' => $item->id,
                    'claimant_id' => null,
                    'claimant_name' => $siblingClaimant ? "{$siblingClaimant->first_name} {$siblingClaimant->surname}" : 'Walk-in Claimant '.($i + 100),
                    'claimant_contact' => '+639170009999',
                    'claimant_email' => null,
                    'status' => 'REJECTED',
                    'proof' => 'I think this might be mine, it looks similar to what I lost.',
                ]);
                $sibling->id = (string) Str::uuid();
                $sibling->timestamps = false;
                $sibling->created_at = $claimCreatedAt->copy()->addHours(1);
                $sibling->reviewed_by = $admin->id;
                $sibling->reviewed_at = $reviewedAt;
                $sibling->rejected_at = $reviewedAt;
                $sibling->rejection_reason = 'Another claim was approved';
                $sibling->updated_at = $reviewedAt;
                $sibling->save();
            }

            $item->timestamps = false;
            if ($status === 'APPROVED') {
                $item->status = 'APPROVED';
            } else {
                $item->status = 'CLOSED';
                $item->released_to = $useAccount ? $claimant?->id : null;
                $item->released_at = $claim->released_at;
                $item->closed_by = $admin->id;
                $item->closed_at = $claim->released_at;
            }
            $item->updated_at = $reviewedAt;
            $item->save();
        }

        $this->command?->info('LostItemSeeder: seeded 30 lost items (14 Unmatched, 6 Claimed, 4 To Be Released, 4 History, 2 Expired).');
    }
}
