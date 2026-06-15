import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL || "http://localhost:8000";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("chatco_session")?.value;

    if (!token) {
      return NextResponse.json(
        { message: "Unauthenticated." },
        { status: 401 }
      );
    }

    const res = await fetch(`${API_URL}/api/user`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { message: "Unauthenticated." },
        { status: 401 }
      );
    }

    const data = await res.json();
    return NextResponse.json(data.data);
  } catch {
    return NextResponse.json(
      { message: "Unauthenticated." },
      { status: 401 }
    );
  }
}