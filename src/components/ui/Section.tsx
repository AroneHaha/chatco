"use client";
import { useInView } from "@/hooks/useInView";

export default function Section({
  id,
  children,
  className = "",
  dark = false,
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
  dark?: boolean;
}) {
  const { ref, visible } = useInView();
  return (
    <section
      id={id}
      ref={ref}
      className={`py-20 md:py-28 transition-all duration-700 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      } ${dark ? "bg-[#071A2E] text-white" : "bg-white text-gray-900"} ${className}`}
    >
      <div className="max-w-7xl mx-auto px-5 md:px-8">{children}</div>
    </section>
  );
}