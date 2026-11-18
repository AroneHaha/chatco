import type { ReactNode } from "react";
import { LandingThemeProvider } from "@/contexts/commuter-theme-context";
import { LANDING_THEME_KEY } from "@/lib/theme/landing-theme-key";

// Runs while the HTML is parsed, so a light-mode visitor never sees the dark page first.
const applySavedTheme = `try{if(localStorage.getItem(${JSON.stringify(LANDING_THEME_KEY)})==="light")document.documentElement.dataset.theme="light"}catch(e){}`;

/** Public-site appearance: the landing page, its auth modals and the policy pages. */
export default function LandingTheme({ children }: { children: ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: applySavedTheme }} />
      <LandingThemeProvider>{children}</LandingThemeProvider>
    </>
  );
}
