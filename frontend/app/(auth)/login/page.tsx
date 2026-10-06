import type { Metadata } from "next";
import Home from "@/app/page";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return <Home />;
}
