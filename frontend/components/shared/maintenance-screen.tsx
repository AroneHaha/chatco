import Image from "next/image";
import logo from "../../assets/logo-transparent.png";

/**
 * Full-screen "we're down for maintenance" takeover, shown to logged-in
 * commuters and conductors when an admin enables Maintenance Mode
 * (/settings/app-configuration), via the client-side MaintenanceGate.
 *
 * The public landing page is NOT gated — visitors see the normal marketing
 * site. Admins aren't gated either, so they can turn maintenance back off.
 */
export default function MaintenanceScreen({ message }: { message: string }) {
  return (
    <main className="min-h-screen h-full relative hero-bg overflow-hidden flex flex-col items-center justify-center px-6 text-center">
      {/* Background glows */}
      <div className="absolute top-1/4 -left-32 w-[500px] h-[500px] bg-[#1A5FB4]/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-[#3584E4]/15 rounded-full blur-[100px]" />
      <div className="absolute top-0 right-1/4 w-64 h-64 bg-[#62A0EA]/10 rounded-full blur-[80px]" />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 flex flex-col items-center max-w-lg">
        {/* Logo */}
        <div className="inline-flex items-center gap-4 mb-10">
          <Image src={logo} alt="CHATCO" width={64} height={64} priority />
          <span className="text-3xl font-extrabold text-white">CHATCO</span>
        </div>

        {/* Wrench / maintenance icon */}
        <div className="w-20 h-20 rounded-2xl bg-[#1A5FB4]/20 border border-[#62A0EA]/20 flex items-center justify-center mb-8">
          <svg className="w-10 h-10 text-[#62A0EA]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.106-1.858a2.652 2.652 0 0 1 3.75-3.75l-1.06 1.06 1.06 1.06a2.652 2.652 0 0 1-3.75 3.75m0 0-2.496 3.03"
            />
          </svg>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight">
          We&apos;ll be right{" "}
          <span className="text-[#62A0EA]">back</span>
        </h1>

        <p className="mt-6 text-white/60 text-base sm:text-lg leading-relaxed">
          {message}
        </p>
      </div>
    </main>
  );
}
