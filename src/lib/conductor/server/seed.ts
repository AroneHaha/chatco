import type { ConductorDriver, ConductorHailRequest, ConductorUnit } from "@/lib/conductor/types";
import type { ConductorRating } from "@/lib/conductor/services/ratings.service";

export const SEED_UNITS: ConductorUnit[] = [
  {
    id: "unit-1",
    unitNumber: "DEF-5678",
    plateNumber: "DEF-5678",
    route: "Meycauayan–Calumpit",
    status: "available",
  },
  {
    id: "unit-2",
    unitNumber: "GHI-9012",
    plateNumber: "GHI-9012",
    route: "Meycauayan–Calumpit",
    status: "maintenance",
  },
  {
    id: "unit-3",
    unitNumber: "JKL-3456",
    plateNumber: "JKL-3456",
    route: "Meycauayan–Calumpit",
    status: "maintenance",
  },
  {
    id: "unit-4",
    unitNumber: "ABC-1234",
    plateNumber: "ABC-1234",
    route: "Meycauayan–Calumpit",
    status: "available",
  },
];

export const SEED_DRIVERS: ConductorDriver[] = [
  { id: "drv-1", name: "Boy Pick-Up Dela Cruz", status: "available" },
  { id: "drv-3", name: "Tikboy Saksakan", status: "available" },
  { id: "drv-5", name: "Dodong Bullet", status: "available" },
  { id: "drv-7", name: "Mang Juan Tamad", status: "available" },
  { id: "drv-9", name: "Jepoy Pogi", status: "available" },
  { id: "drv-11", name: "Cardo Dalisay", status: "available" },
];

export const SEED_HAILS: ConductorHailRequest[] = [
  {
    id: "hail-1",
    commuterName: "Maria Santos",
    latitude: 14.901323759501945,
    longitude: 120.7719224852731,
    label: "Near SM Marilao",
    etaMinutes: 4,
  },
  {
    id: "hail-2",
    commuterName: "Juan Reyes",
    latitude: 14.874990764897628,
    longitude: 120.79618423260841,
    label: "Bocaue crossing",
    etaMinutes: 7,
  },
  {
    id: "hail-3",
    commuterName: "Ana Cruz",
    latitude: 14.828232464378223,
    longitude: 120.88095495481001,
    label: "Malolos terminal",
    etaMinutes: 11,
  },
];

const MOCK_NAMES = [
  "Maria Santos",
  "Juan Reyes",
  "Ana Cruz",
  "Pedro Lim",
  "Rosa Garcia",
  "Carlos Mendoza",
  "Elena Torres",
  "Miguel Ramos",
];

const MOCK_COMMENTS = [
  "Very polite and helpful!",
  "Smooth ride, thank you.",
  "Driver was careful and friendly.",
  "On time and professional.",
  "Clean jeepney, good service.",
  "",
  "Could improve boarding process.",
  "Great conductor, very accommodating.",
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function createRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Deterministic sample ratings per shift — replace with DB query when backend exists. */
export function buildSeedRatings(shiftId: string): ConductorRating[] {
  const rng = createRng(hashString(shiftId) + 300);
  const count = 4 + Math.floor(rng() * 5);
  const ratings: ConductorRating[] = [];
  const usedNames = new Set<number>();

  for (let i = 0; i < count; i++) {
    let nameIdx: number;
    do {
      nameIdx = Math.floor(rng() * MOCK_NAMES.length);
    } while (usedNames.has(nameIdx) && usedNames.size < MOCK_NAMES.length);
    usedNames.add(nameIdx);

    const score = Math.max(1, Math.min(5, Math.round(rng() * 4 + 1)));
    const targetRole: "DRIVER" | "CONDUCTOR" = rng() > 0.45 ? "DRIVER" : "CONDUCTOR";

    ratings.push({
      ratingId: `RTG-${shiftId}-${i}`,
      commuterId: `comm-${i}`,
      commuterName: MOCK_NAMES[nameIdx],
      shiftId,
      targetRole,
      targetId: targetRole === "DRIVER" ? "drv-active" : "cond-active",
      score,
      comment:
        score >= 4 && rng() > 0.3
          ? MOCK_COMMENTS[Math.floor(rng() * MOCK_COMMENTS.length)]
          : score <= 2
            ? "Needs improvement."
            : "",
      createdAt: new Date(Date.now() - i * 3600000).toISOString(),
    });
  }

  return ratings;
}
