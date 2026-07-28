import { NextRequest } from "next/server";
import { proxyToLaravel, API_V1 } from "@/lib/commuter/server/proxy";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return proxyToLaravel(
    request,
    `${API_V1}/admin/lost-items/${encodeURIComponent(id)}/claims/manual`,
    {
      method: "POST",
      body: await request.text(),
    },
  );
}
