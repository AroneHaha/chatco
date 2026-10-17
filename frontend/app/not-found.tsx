"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, BusFront, House, LayoutDashboard, LoaderCircle, MapPin } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { MissingState } from "@/components/ui/error-2";
import { getRoleDashboard } from "@/types/user";
import logo from "@/assets/logo-transparent.png";

export default function NotFound() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const dashboard = getRoleDashboard(user?.role);
  const returnHref = dashboard ?? "/";

  if (isLoading) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#071A2E] font-sans text-white" role="status" aria-live="polite">
        <div className="flex items-center gap-3 text-sm text-white/65">
          <LoaderCircle size={18} className="animate-spin text-[#62A0EA]" aria-hidden="true" />
          <span>Checking your session…</span>
        </div>
      </main>
    );
  }

  const missingContent = (
    <MissingState
      badge="404"
      title="Let’s get you back on route."
      description="We couldn’t find this CHATCO page. It may have moved, or the address may be incorrect."
      actions={[
        {
          label: dashboard ? "Back to dashboard" : "Back to home",
          icon: dashboard ? <LayoutDashboard aria-hidden="true" /> : <House aria-hidden="true" />,
          href: returnHref,
        },
        {
          label: "Go back",
          icon: <ArrowLeft aria-hidden="true" />,
          variant: "outline",
          onClick: () => {
            if (window.history.length > 1) router.back();
            else router.replace(returnHref);
          },
        },
      ]}
      links={[
        {
          title: "Check the address",
          description: "Look for a typo or an extra character in the URL, then try again.",
          icon: <MapPin size={20} aria-hidden="true" />,
        },
        {
          title: dashboard ? "Continue from your dashboard" : "Start from CHATCO home",
          description: dashboard
            ? "Return to your dashboard to access your usual CHATCO tools."
            : "Head home to explore jeepney tracking, fares, and ride rewards.",
          icon: <BusFront size={20} aria-hidden="true" />,
        },
      ]}
    />
  );

  return (
    <div className="flex min-h-dvh flex-col bg-[#071A2E] font-sans text-white">
      {!dashboard ? (
        <>
          <Navbar onHomePage={false} />
          <div className="h-16 shrink-0" aria-hidden="true" />
        </>
      ) : (
        <header className="border-b border-white/10">
          <div className="mx-auto flex h-20 max-w-7xl items-center px-5 md:px-8">
            <Link
              href={returnHref}
              aria-label={dashboard ? "CHATCO dashboard" : "CHATCO home"}
              className="flex items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#62A0EA]"
            >
              <Image src={logo} alt="" width={40} height={40} className="h-auto" />
              <span className="text-lg font-bold tracking-tight">CHATCO</span>
            </Link>
          </div>
        </header>
      )}

      <main className="flex flex-1 items-center">{missingContent}</main>
      {!dashboard && <Footer />}
    </div>
  );
}
