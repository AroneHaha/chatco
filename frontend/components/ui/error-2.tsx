"use client";

import Link from "next/link";
import { type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export interface ActionItem {
  label: string;
  icon: ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: "default" | "secondary" | "outline";
}

export interface RecoveryLink {
  title: string;
  description: string;
  icon: ReactNode;
}

export interface MissingStateProps {
  badge?: string;
  title: string;
  description: string;
  actions?: ActionItem[];
  links?: RecoveryLink[];
}

function RecoveryCard({ title, description, icon }: RecoveryLink) {
  return (
    <Card className="rounded-xl border-white/10 bg-white/5 py-5 text-white shadow-none">
      <div className="flex items-start gap-4 px-5">
        <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#62A0EA]/10 text-[#8DBCF4]">
          {icon}
        </div>
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          <p className="text-sm leading-relaxed text-white/60">{description}</p>
        </div>
      </div>
    </Card>
  );
}

function ActionButton({ label, icon, href, onClick, variant = "default" }: ActionItem) {
  const className = `min-h-12 rounded-lg px-5 text-sm font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#8DBCF4] focus-visible:ring-0 ${
    variant === "default"
      ? "bg-[#62A0EA] text-[#071A2E] hover:bg-[#8DBCF4]"
      : "border border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10"
  }`;
  const content = <>{icon}<span>{label}</span></>;

  if (href) {
    return (
      <Button asChild variant={variant} className={className}>
        <Link href={href}>{content}</Link>
      </Button>
    );
  }

  return (
    <Button type="button" variant={variant} onClick={onClick} className={className}>
      {content}
    </Button>
  );
}

export function MissingState({
  badge = "404",
  title,
  description,
  actions = [],
  links = [],
}: MissingStateProps) {
  return (
    <section className="relative flex w-full items-center justify-center bg-[#0B2037] px-5 py-12 text-white sm:px-6 sm:py-16">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-10">
        <div className="space-y-8">
          <div className="space-y-5 text-center">
            <p className="text-5xl font-bold leading-none tracking-tight text-[#62A0EA] sm:text-6xl">
              {badge}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {title}
            </h1>
            <p className="mx-auto max-w-md text-base leading-7 text-white/65">
              {description}
            </p>
          </div>
          <div className="flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
            {actions.map((action) => <ActionButton key={action.label} {...action} />)}
          </div>
        </div>
        <div className="grid gap-4">
          {links.map((link) => <RecoveryCard key={link.title} {...link} />)}
        </div>
      </div>
    </section>
  );
}

export default MissingState;
