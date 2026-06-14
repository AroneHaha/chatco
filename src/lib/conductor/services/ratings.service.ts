// src/lib/conductor/services/ratings.service.ts

export interface ConductorRating {
  ratingId: string;
  shiftId: string;
  commuterName: string;
  stars: number;
  comment: string;
  timestamp: number;
}
