// lib/fare-matrix-data.ts
// Re-export barrel — canonical source moved to lib/shared/fare/fare-matrix-data.ts
// Update imports to: @/lib/shared/fare/fare-matrix-data

export {
  initialFarePoints,
  getFareByPoints,
  FARE_MATRIX,
  FARE_CONFIG,
  getPointByNumber,
  getPointByCode,
  getFareBetween,
  type FarePoint,
  type FareResult,
  type PointArea,
} from "@/lib/shared/fare/fare-matrix-data";
