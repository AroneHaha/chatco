import SignupModal from "@/components/auth/signup-modal";
import { parseMaintenanceRoles } from "@/lib/maintenance";

type SystemStatusResponse = {
  data?: {
    maintenance_mode?: boolean;
    maintenance_roles?: unknown;
    maintenance_message?: string;
  };
};

export default async function SignupPage({ standalone = false }: { standalone?: boolean }) {
  let initialMaintenanceMessage: string | null = null;

  try {
    const apiUrl = process.env.API_URL || "http://localhost:8000";
    const response = await fetch(`${apiUrl}/api/v1/system-status`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const status = (await response.json()) as SystemStatusResponse;

    if (
      response.ok &&
      status.data?.maintenance_mode === true &&
      parseMaintenanceRoles(status.data.maintenance_roles).includes("COMMUTER")
    ) {
      initialMaintenanceMessage =
        status.data.maintenance_message?.trim() ||
        "CHATCO is currently undergoing scheduled maintenance. Please try signing up again later.";
    }
  } catch {
    // Keep sign-up available if the status service can't be reached.
  }

  return <SignupModal standalone={standalone} initialMaintenanceMessage={initialMaintenanceMessage} />;
}
