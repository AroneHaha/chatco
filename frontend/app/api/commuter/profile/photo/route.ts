import { NextRequest } from "next/server";
import { proxyToLaravel, API_V1 } from "@/lib/commuter/server/proxy";

export async function POST(request: NextRequest) {
  return proxyToLaravel(request, `${API_V1}/commuter/profile/photo`, {
    method: "POST",
    body: await request.formData(),
  });
}
