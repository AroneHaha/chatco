"use client";

import Image from "next/image";
import { useAuth } from "@/contexts/auth-context";
import logo from "@/assets/logo-transparent.png";

const focus = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#62A0EA]";

/**
 * The landing navbar's docked bar, cut down for the Set New Password page. No
 * section links, account links or home link: a session that still has to set
 * its password is redirected back here from the landing page, so those would
 * all be dead ends. Sign out is the only way off the page.
 */
export default function SetPasswordHeader() {
  const { logout } = useAuth();

  return (
    <header className="border-b border-white/10 bg-[#071A2E]">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8">
        <div className="flex items-center gap-3">
          <Image src={logo} alt="" width={40} height={40} className="rounded-lg" priority />
          <span className="text-lg font-bold tracking-tight text-white">CHATCO</span>
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className={`inline-flex cursor-pointer items-center whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white ${focus}`}
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
