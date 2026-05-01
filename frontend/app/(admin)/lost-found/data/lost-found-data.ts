// app/(admin)/lost-found/data/lost-found-data.ts

// --- Types ---

export type ItemCategory = 'ACCESSORY' | 'BAG' | 'WALLET' | 'GADGET' | 'CLOTHING' | 'DOCUMENT' | 'OTHER';

export type ItemStatus = 'Unmatched' | 'Claimed' | 'Released' | 'Returned' | 'Rejected';

export type ClaimStatus = 'Pending' | 'Approved' | 'Rejected' | 'Released' | 'Returned';

export interface LostFoundItem {
  id: string;
  itemName: string;
  description: string;
  imageUrl: string;
  plateNumber: string;
  driverName: string;
  conductorName: string;
  estimatedTimeLost: string;
  category: ItemCategory;
  datePosted: string;
  reporterName: string;
  status: ItemStatus;
  claimedBy: string | null;
}

export interface Claim {
  id: number;
  itemId: string;
  claimantName: string;
  claimantContact: string;
  claimantEmail?: string;
  claimDate: string;
  status: ClaimStatus;
}

export interface HistoryEvent {
  id: string;
  itemId: string;
  action: string;
  details: string;
  timestamp: string;
}

// --- Category lists ---

export const itemCategories: { value: ItemCategory; label: string }[] = [
  { value: 'ACCESSORY', label: 'Accessories' },
  { value: 'BAG', label: 'Bags' },
  { value: 'WALLET', label: 'Wallets' },
  { value: 'GADGET', label: 'Gadgets' },
  { value: 'CLOTHING', label: 'Clothing' },
  { value: 'DOCUMENT', label: 'Documents' },
  { value: 'OTHER', label: 'Other' },
];

export const itemCategoriesWithAll: { value: ItemCategory | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All Items' },
  ...itemCategories,
];

// --- Data (replace with API calls when backend is ready) ---

export const initialLostFoundItems: LostFoundItem[] = [
  { id: "lf_001", itemName: "Black Leather Wallet", description: "Found under the seat near the back door.", imageUrl: "https://placehold.co/400x300/0A1E33/62A0EA?text=Wallet", plateNumber: "ABC 1234", driverName: "Juan Dela Cruz", conductorName: "Pedro Penduko", estimatedTimeLost: "Around 8:00 AM", category: "WALLET", datePosted: "2026-04-06T10:00:00Z", reporterName: "Admin", status: "Unmatched", claimedBy: null },
  { id: "lf_002", itemName: "Red Jansport Backpack", description: "Left on the luggage rack.", imageUrl: "https://placehold.co/400x300/0A1E33/62A0EA?text=Backpack", plateNumber: "XYZ 5678", driverName: "Mario Speedwagon", conductorName: "Luigi Mansion", estimatedTimeLost: "Around 5:30 PM", category: "BAG", datePosted: "2026-04-06T08:00:00Z", reporterName: "Admin", status: "Claimed", claimedBy: "Jane Smith" },
  { id: "lf_003", itemName: "iPhone 15 Pro Max", description: "Found on the floor near the entrance.", imageUrl: "https://placehold.co/400x300/0A1E33/62A0EA?text=iPhone", plateNumber: "DEF 9012", driverName: "Crisostomo Ibarra", conductorName: "Sisa Doe", estimatedTimeLost: "Around 7:15 AM", category: "GADGET", datePosted: "2026-04-06T09:00:00Z", reporterName: "Conductor Sisa", status: "Unmatched", claimedBy: null },
  { id: "lf_004", itemName: "Blue Umbrella", description: "Generic blue folding umbrella left on the seat.", imageUrl: "https://placehold.co/400x300/0A1E33/62A0EA?text=Umbrella", plateNumber: "ABC 1234", driverName: "Juan Dela Cruz", conductorName: "Pedro Penduko", estimatedTimeLost: "Around 2:00 PM", category: "ACCESSORY", datePosted: "2026-04-05T14:00:00Z", reporterName: "Admin", status: "Unmatched", claimedBy: null },
  { id: "lf_005", itemName: "Official TOR", description: "Sealed envelope from PUP.", imageUrl: "https://placehold.co/400x300/0A1E33/62A0EA?text=Document", plateNumber: "GHI 3456", driverName: "Jose Rizal", conductorName: "Andres Bonifacio", estimatedTimeLost: "Around 9:00 AM", category: "DOCUMENT", datePosted: "2026-04-05T10:00:00Z", reporterName: "Admin", status: "Unmatched", claimedBy: null },
  { id: "lf_006", itemName: "Samsung Galaxy Buds", description: "White case, found under passenger seat.", imageUrl: "https://placehold.co/400x300/0A1E33/62A0EA?text=Earbuds", plateNumber: "JKL 7890", driverName: "Apolinario Mabini", conductorName: "Antonio Luna", estimatedTimeLost: "Morning", category: "GADGET", datePosted: "2026-04-05T08:00:00Z", reporterName: "Admin", status: "Unmatched", claimedBy: null },
  { id: "lf_007", itemName: "Gray Hoodie", description: "Left on the handrail near the door.", imageUrl: "https://placehold.co/400x300/0A1E33/62A0EA?text=Hoodie", plateNumber: "MNO 1122", driverName: "Emilio Aguinaldo", conductorName: "Manuel Quezon", estimatedTimeLost: "Evening", category: "CLOTHING", datePosted: "2026-04-04T18:00:00Z", reporterName: "Admin", status: "Unmatched", claimedBy: null },
  { id: "lf_008", itemName: "Laptop Charger", description: "Lenovo charger found near the driver area.", imageUrl: "https://placehold.co/400x300/0A1E33/62A0EA?text=Charger", plateNumber: "PQR 3344", driverName: "Juan Dela Cruz", conductorName: "Pedro Penduko", estimatedTimeLost: "Afternoon", category: "ACCESSORY", datePosted: "2026-04-04T15:00:00Z", reporterName: "Admin", status: "Unmatched", claimedBy: null },
  { id: "lf_009", itemName: "Prescription Glasses", description: "Black frame, found on the floor.", imageUrl: "https://placehold.co/400x300/0A1E33/62A0EA?text=Glasses", plateNumber: "STU 5566", driverName: "Mario Speedwagon", conductorName: "Luigi Mansion", estimatedTimeLost: "Around 10:00 AM", category: "ACCESSORY", datePosted: "2026-04-04T09:00:00Z", reporterName: "Admin", status: "Unmatched", claimedBy: null },
  { id: "lf_010", itemName: "ADT I.D.", description: "Unidentified ID found inside the jeep.", imageUrl: "https://placehold.co/400x300/0A1E33/62A0EA?text=ID", plateNumber: "VWX 7788", driverName: "Crisostomo Ibarra", conductorName: "Sisa Doe", estimatedTimeLost: "Morning", category: "DOCUMENT", datePosted: "2026-04-03T11:00:00Z", reporterName: "Admin", status: "Unmatched", claimedBy: null },
  { id: "lf_011", itemName: "Reusable Water Bottle", description: "Steel bottle with stickers.", imageUrl: "https://placehold.co/400x300/0A1E33/62A0EA?text=Bottle", plateNumber: "YZA 9900", driverName: "Jose Rizal", conductorName: "Andres Bonifacio", estimatedTimeLost: "Afternoon", category: "OTHER", datePosted: "2026-04-03T14:00:00Z", reporterName: "Admin", status: "Unmatched", claimedBy: null },
  { id: "lf_012", itemName: "Canvas Tote Bag", description: "White tote bag with minimal dirt.", imageUrl: "https://placehold.co/400x300/0A1E33/62A0EA?text=Tote", plateNumber: "BCD 1122", driverName: "Apolinario Mabini", conductorName: "Antonio Luna", estimatedTimeLost: "Around 6:00 PM", category: "BAG", datePosted: "2026-04-03T17:00:00Z", reporterName: "Admin", status: "Unmatched", claimedBy: null },
  { id: "lf_013", itemName: "Power Bank", description: "Black 10,000 mAh power bank.", imageUrl: "https://placehold.co/400x300/0A1E33/62A0EA?text=PowerBank", plateNumber: "EFG 3344", driverName: "Emilio Aguinaldo", conductorName: "Manuel Quezon", estimatedTimeLost: "Morning", category: "GADGET", datePosted: "2026-04-02T08:00:00Z", reporterName: "Admin", status: "Unmatched", claimedBy: null },
  { id: "lf_014", itemName: "Neck Pillow", description: "Gray memory foam neck pillow.", imageUrl: "https://placehold.co/400x300/0A1E33/62A0EA?text=Pillow", plateNumber: "HIJ 5566", driverName: "Juan Dela Cruz", conductorName: "Pedro Penduko", estimatedTimeLost: "Around 4:00 PM", category: "OTHER", datePosted: "2026-04-02T16:00:00Z", reporterName: "Admin", status: "Unmatched", claimedBy: null },
  { id: "lf_015", itemName: "Brown Purse", description: "Small leather purse with coin compartment.", imageUrl: "https://placehold.co/400x300/0A1E33/62A0EA?text=Purse", plateNumber: "KLM 7788", driverName: "Mario Speedwagon", conductorName: "Luigi Mansion", estimatedTimeLost: "Afternoon", category: "WALLET", datePosted: "2026-04-02T13:00:00Z", reporterName: "Admin", status: "Unmatched", claimedBy: null },
  { id: "lf_016", itemName: "Smart Watch", description: "Found near the entrance, screen locked.", imageUrl: "https://placehold.co/400x300/0A1E33/62A0EA?text=Watch", plateNumber: "NOP 9900", driverName: "Crisostomo Ibarra", conductorName: "Sisa Doe", estimatedTimeLost: "Around 1:00 PM", category: "GADGET", datePosted: "2026-04-01T12:00:00Z", reporterName: "Admin", status: "Unmatched", claimedBy: null },
  { id: "lf_017", itemName: "Ball Cap", description: "Black cap with no logo.", imageUrl: "https://placehold.co/400x300/0A1E33/62A0EA?text=Cap", plateNumber: "QRS 1122", driverName: "Jose Rizal", conductorName: "Andres Bonifacio", estimatedTimeLost: "Morning", category: "CLOTHING", datePosted: "2026-04-01T09:00:00Z", reporterName: "Admin", status: "Unmatched", claimedBy: null },
  { id: "lf_018", itemName: "Kids Lunchbox", description: "Blue lunchbox with superhero print.", imageUrl: "https://placehold.co/400x300/0A1E33/62A0EA?text=Lunchbox", plateNumber: "TUV 3344", driverName: "Apolinario Mabini", conductorName: "Antonio Luna", estimatedTimeLost: "Around 11:00 AM", category: "OTHER", datePosted: "2026-03-31T11:00:00Z", reporterName: "Admin", status: "Unmatched", claimedBy: null },
  { id: "lf_019", itemName: "Textbook", description: "Engineering textbook, no name written.", imageUrl: "https://placehold.co/400x300/0A1E33/62A0EA?text=Book", plateNumber: "WXY 5566", driverName: "Emilio Aguinaldo", conductorName: "Manuel Quezon", estimatedTimeLost: "Afternoon", category: "DOCUMENT", datePosted: "2026-03-31T15:00:00Z", reporterName: "Admin", status: "Unmatched", claimedBy: null },
  { id: "lf_020", itemName: "Yellow Sling Bag", description: "Small yellow bag left on the floor.", imageUrl: "https://placehold.co/400x300/0A1E33/62A0EA?text=SlingBag", plateNumber: "ZAB 7788", driverName: "Juan Dela Cruz", conductorName: "Pedro Penduko", estimatedTimeLost: "Evening", category: "BAG", datePosted: "2026-03-30T18:00:00Z", reporterName: "Admin", status: "Unmatched", claimedBy: null },
];

export const initialClaims: Claim[] = [
  { id: 1, itemId: "lf_001", claimantName: "John Doe", claimantContact: "0917-123-4567", claimDate: "2026-04-07 09:00 AM", status: "Pending" },
  { id: 2, itemId: "lf_002", claimantName: "Jane Smith", claimantContact: "0918-234-5678", claimDate: "2026-04-06 10:30 AM", status: "Approved" },
  { id: 3, itemId: "lf_003", claimantName: "Fake Claimant", claimantContact: "0920-456-7890", claimDate: "2026-04-06 11:00 AM", status: "Rejected" },
];

export const initialHistoryLog: HistoryEvent[] = [
  { id: "H-001", itemId: "lf_001", action: "Reported", details: 'Item "Black Leather Wallet" reported by Admin.', timestamp: "2026-04-06 10:00 AM" },
  { id: "H-002", itemId: "lf_001", action: "Claim Submitted", details: "John Doe submitted a claim with proof of ownership.", timestamp: "2026-04-07 09:00 AM" },
  { id: "H-003", itemId: "lf_002", action: "Claim Approved", details: 'Claim for "Red Jansport Backpack" approved for Jane Smith.', timestamp: "2026-04-06 10:35 AM" },
  { id: "H-004", itemId: "lf_003", action: "Claim Rejected", details: "Claim by Fake Claimant was rejected due to mismatched proof.", timestamp: "2026-04-06 11:15 AM" },
];