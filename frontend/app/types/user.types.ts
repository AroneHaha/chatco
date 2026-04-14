export interface User {
  id: string;
  firstName: string;
  surname: string;
  commuterType: "Regular" | "Student" | "Senior Citizen" | "PWD";
  balance: number;
}