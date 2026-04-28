// lib/auth.ts
export type UserRole = "COMMUTER" | "ADMIN" | "CONDUCTOR";

export interface User {
  id: string;
  email: string;
  role: UserRole;
}

export interface LoginPayload {
  email: string; // Can be email or username
  password: string;
}

// --- MOCK DATABASE ---
const MOCK_USERS = [
  { id: "u_1", email: "commuter@gmail.com", username: "commuter", password: "commuter", role: "COMMUTER" as UserRole },
  { id: "a_1", email: "admin@chatco.com", username: "admin", password: "admin", role: "ADMIN" as UserRole },
  { id: "c_1", email: "conductor@chatco.com", username: "conductor", password: "conductor", role: "CONDUCTOR" as UserRole },
];

export async function loginUser(payload: LoginPayload): Promise<{ user: User; redirectPath: string }> {
  // --- FUTURE BACKEND INTEGRATION POINT ---
  // Replace everything below with:
  // const response = await fetch('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) });
  // const data = await response.json();
  // if (!response.ok) throw new Error(data.message);
  // return data;
  // -----------------------------------------

  // Simulate network latency
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Find user by email OR username, and match password
  const user = MOCK_USERS.find(
    u => (u.email === payload.email || u.username === payload.email) && u.password === payload.password
  );

  if (!user) {
    throw new Error("Invalid credentials. Please try again.");
  }

  // Strip password before storing/returning
  const { password, username, ...safeUser } = user;

  // Save to localStorage so the dashboard knows the user is logged in
  if (typeof window !== "undefined") {
    localStorage.setItem("chatco_user", JSON.stringify(safeUser));
  }

  return {
    user: safeUser,
    redirectPath: getDashboardPath(user.role)
  };
}

export function getDashboardPath(role: UserRole): string {
  switch (role) {
    case "COMMUTER": return "/dashboard";
    case "ADMIN": return "/admin-dashboard";
    case "CONDUCTOR": return "/unit-verification"; // <-- Confirmed correct path!
    default: return "/login";
  }
}

// lib/auth.ts
// ... (keep existing code) ...

export function logoutUser() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("chatco_user");
    // Clear conductor session data so they must select a unit upon next login
    localStorage.removeItem("conductor_active_shift"); 
    localStorage.removeItem("conductor_transactions");
    localStorage.removeItem("remittance_history");
  }
  window.location.href = "/login";
}