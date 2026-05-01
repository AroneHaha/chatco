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

// --- FUTURE BACKEND INTEGRATION POINT ---
// Replace everything below with:
// const response = await fetch('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) });
// const data = await response.json();
// if (!response.ok) throw new Error(data.message);
// return data;
// -----------------------------------------

export async function loginUser(payload: LoginPayload): Promise<{ user: User; redirectPath: string }> {
  // Call the real API route — the server sets the httpOnly cookie
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Login failed.");
  }

  return data;
}

export function getDashboardPath(role: UserRole): string {
  switch (role) {
    case "COMMUTER": return "/dashboard";
    case "ADMIN": return "/admin-dashboard";
    case "CONDUCTOR": return "/unit-verification"; 
    default: return "/login";
  }
}

// lib/auth.ts
// ... (keep existing code) ...

export function logoutUser() {
  // Call the real logout API route (we'll create this in Problem 3)
  fetch("/api/auth/logout", { method: "POST" }).finally(() => {
    // Clear any leftover client-side data
    if (typeof window !== "undefined") {
      localStorage.removeItem("chatco_user");
      // Clear conductor session data so they must select a unit upon next login
      localStorage.removeItem("conductor_active_shift");
      localStorage.removeItem("conductor_transactions");
      localStorage.removeItem("remittance_history");
    }
    window.location.href = "/login";
  });
}