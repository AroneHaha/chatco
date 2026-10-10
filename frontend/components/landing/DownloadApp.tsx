import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Download, Smartphone } from "lucide-react";
import logo from "../../assets/logo-transparent.png";

const INSTALL_STEPS = [
  { title: "Download the APK", description: "Save the CHATCO app to your Android phone." },
  { title: "Open and install", description: "Open the downloaded file and follow the installation prompts." },
  { title: "Log in and ride", description: "Use your CHATCO account to get started." },
];

export default function DownloadApp() {
  return (
    <section id="download" aria-labelledby="download-heading" className="bg-[#F0F7FF] py-20 text-gray-900 md:py-28">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 md:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
        <div className="text-center lg:text-left">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#1A5FB4]">
            <Smartphone size={16} aria-hidden="true" /> CHATCO for Android
          </p>
          <h2 id="download-heading" className="mt-5 font-sans text-3xl font-bold leading-[1.1] tracking-tight sm:text-4xl md:text-5xl">
            Your next ride,<br />right in your pocket.
          </h2>
          <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-gray-600 md:text-lg lg:mx-0">
            Hail a jeepney, pay your fare, and follow your trip. Download CHATCO on your Android phone and take it with you.
          </p>
          <div className="mt-8">
            <button type="button" disabled className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-full bg-[#1A5FB4]/60 px-6 py-3.5 text-sm font-bold text-white">
              <Download size={18} aria-hidden="true" /> APK coming soon
            </button>
            <p className="mt-3 text-sm text-gray-500">
              The Android download will be available here soon.
            </p>
          </div>
          <Link href="/login" scroll={false} className="mt-6 inline-flex items-center gap-1.5 rounded-sm text-sm font-semibold text-[#1A5FB4] hover:text-[#164A8F] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1A5FB4]">
            Use CHATCO on the web <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>

        <div className="rounded-3xl border border-[#DAEEFF] bg-white p-6 shadow-xl shadow-[#1A5FB4]/5 md:p-8">
          <div className="flex items-center gap-3 border-b border-[#DAEEFF] pb-6">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#071A2E]">
              <Image src={logo} alt="" width={44} height={44} />
            </div>
            <div>
              <p className="font-sans text-xl font-bold tracking-tight">CHATCO</p>
              <p className="mt-1 text-sm text-gray-500">Get started on Android</p>
            </div>
          </div>
          <ol className="mt-6 space-y-6">
            {INSTALL_STEPS.map((step, i) => (
              <li key={step.title} className="flex items-start gap-4">
                <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#F0F7FF] text-sm font-bold text-[#1A5FB4]">
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-sm font-semibold">{step.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-gray-500">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
