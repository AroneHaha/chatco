export interface DriverData {
  id: string;
  name: string;
  plateNumber: string;
  conductorName: string;
  route: string;
}

export interface FeedbackPayload {
  driverId: string;
  rating: number;
  tags: string[];
  comment: string;
}