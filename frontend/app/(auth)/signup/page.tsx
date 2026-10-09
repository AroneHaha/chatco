import type { Metadata } from "next";
import Home from "@/app/page";

export const metadata: Metadata = { title: "Create your account" };

export default function SignupPage() {
  return <Home />;
}
