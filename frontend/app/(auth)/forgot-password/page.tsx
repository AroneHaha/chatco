import type { Metadata } from "next";
import Home from "@/app/page";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return <Home />;
}
