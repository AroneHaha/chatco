"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface BackButtonProps {
  href?: string;
  label?: string;
  className?: string;
  onClick?: () => void;
}

export default function BackButton({
  href,
  label = "Go Back",
  className = "",
  onClick,
}: BackButtonProps) {
  const router = useRouter();

  const inner = (
    <>
      <ArrowLeft className="w-4 h-4" />
      <span>{label}</span>
    </>
  );

  const base = `inline-flex items-center gap-2 text-sm font-medium text-white/60 hover:text-white transition-colors ${className}`;

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={base}>
        {inner}
      </button>
    );
  }

  if (href) {
    return (
      <Link href={href} className={base}>
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" onClick={() => router.back()} className={base}>
      {inner}
    </button>
  );
}