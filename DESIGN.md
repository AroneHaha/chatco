---
name: CHATCO
description: The digital nervous system for a real jeepney route — live tracking, cashless fares, and safety, made to feel like a transit control room.
colors:
  navy-deep: "#071A2E"
  primary: "#1A5FB4"
  primary-hover: "#164A8F"
  primary-light: "#62A0EA"
  primary-lighter: "#99C1F1"
  accent-signal: "#FF6D3A"
  accent-signal-hover: "#E55A2B"
  info-sky: "#38BDF8"
  success: "#22C55E"
  warning: "#F59E0B"
  danger: "#EF4444"
  admin-bg: "#0B1120"
  admin-surface: "#131C2E"
  admin-surface-raised: "#1A2540"
  admin-sidebar: "#0D1424"
  admin-border: "#1E2D45"
  admin-border-subtle: "#162033"
  admin-text-primary: "#F1F5F9"
  admin-text-secondary: "#94A3B8"
  admin-text-muted: "#64748B"
  neutral-white: "#FFFFFF"
  neutral-ink: "#111827"
  neutral-body: "#6B7280"
  neutral-tint-bg: "#F0F7FF"
  neutral-tint-border: "#DAEEFF"
  neutral-field-bg: "#F8FAFC"
typography:
  display:
    fontFamily: "Erode, Georgia, serif"
    fontSize: "clamp(2.5rem, 6vw, 6rem)"
    fontWeight: 500
    lineHeight: 0.98
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Erode, Georgia, serif"
    fontSize: "clamp(1.5rem, 4vw, 3rem)"
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Poppins, system-ui, -apple-system, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.4
  body:
    fontFamily: "Poppins, system-ui, -apple-system, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  body-editorial:
    fontFamily: "General Sans, system-ui, -apple-system, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Poppins, system-ui, -apple-system, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    letterSpacing: "0.1em"
  micro:
    fontFamily: "Poppins, system-ui, -apple-system, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 600
    letterSpacing: "0.05em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  full: "9999px"
spacing:
  xs: "8px"
  sm: "16px"
  md: "24px"
  lg: "32px"
  xl: "48px"
  2xl: "80px"
  3xl: "112px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral-white}"
    rounded: "{rounded.full}"
    padding: "16px 32px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-ghost-dark:
    backgroundColor: "transparent"
    textColor: "{colors.neutral-white}"
    rounded: "{rounded.full}"
    padding: "16px 32px"
  card-public:
    backgroundColor: "{colors.neutral-white}"
    rounded: "{rounded.xl}"
    padding: "24px"
  card-admin:
    backgroundColor: "{colors.admin-surface}"
    textColor: "{colors.admin-text-primary}"
    rounded: "{rounded.md}"
    padding: "16px"
  nav-link-admin-active:
    backgroundColor: "{colors.primary-light}"
    textColor: "{colors.primary-light}"
    rounded: "{rounded.sm}"
    padding: "10px 12px"
---

# Design System: CHATCO

## Overview

**Creative North Star: "The Transit Control Room"**

CHATCO is what it feels like when a real jeepney route gets a nervous system: a live map, a payment rail, and a safety net, all reporting to the same place. The visual language borrows from a control room, not a consumer app — deep navy stands in for night and for "the system is watching," and CHATCO Blue is the pulse that says something is live: a tracked vehicle, a paid fare, a signal sent. Where the product needs warmth instead of authority — the one moment a commuter is stranded and waving for a ride — the system breaks its own rule on purpose with a single orange accent. That's the whole palette's job: navy holds the weight, blue means "tracked and working," orange means "a human needs something now."

The system runs two registers, not one, and the split is deliberate rather than an inconsistency to fix. The public site and commuter-facing screens are in Persuade/Operate mode for a first-time or occasional visitor — soft, rounded, glowing at the edges, because trust has to be earned before a stranger hands over GCash. Admin and conductor are Operate mode for someone who already trusts the system and uses it for a full shift — flatter, tighter-cornered, denser, because at that point the job is scanning a screen fast, not being persuaded by it.

**Key Characteristics:**
- Navy-and-blue control-room palette with a single orange accent reserved for urgent, human moments.
- Two type systems, real weight everywhere (no faux-800 extra-bold anywhere it isn't actually loaded): Poppins for the app shell, an Erode/General Sans editorial pairing for the public landing page — see Typography.
- Public/commuter surfaces (app-shell cards, badges, buttons): soft glow elevation, pill-and-2xl-radius shapes, generous whitespace.
- The landing Hero is a deliberate exception to that: no cards, no glow, no illustration — an editorial composition of type, a hairline rule, and negative space directly on the navy field, closer to a mobility publication's opening spread than a product screenshot.
- Admin/conductor surfaces: flat, bordered, tightly-radiused, dense — depth from panel-tone layering, not shadow.
- One orange accent color, one job: signaling a human waiting for help (Pick Me Up), never used decoratively.

## Colors

The palette reads as three navy-to-blue steps doing double duty as both brand color and status color ("tracked," "working," "safe"), plus one warm accent held in reserve for exactly one job.

### Primary
- **CHATCO Blue** (`#1A5FB4`): the brand's one true accent on public/commuter surfaces — primary buttons, links, active states, icon fills. Hover state is **Blue, Deepened** (`#164A8F`).
- **Sky Blue** (`#62A0EA`): the same role, restated for dark surfaces — admin's primary accent, and the lighter end of the hero gradient text/glow. Reads as "brighter" because it sits on navy, not because it means something different.
- **Pale Sky** (`#99C1F1`): gradient partner to Sky Blue only — never used as a solid fill, only as the light end of a two-stop gradient (Manifesto's count-up stat numbers). The Hero headline's accent phrase now uses solid Sky Blue instead of this gradient, matching the landing page's editorial direction of solid color over gradient for emphasis.

### Secondary
- **Deep Navy** (`#071A2E`): the "control room at night" surface — hero, Manifesto/editorial bands, phone-mockup chrome. This is a distinct token from the admin background, not a lighter/darker step of it; the two are visually related but never interchanged.
- **Signal Orange** (`#FF6D3A`, hover `#E55A2B`): reserved exclusively for the "Pick Me Up" hail signal and anything with the same urgency (a commuter visibly waiting, needing attention now). **The One Warm Color Rule.** If a new screen wants orange for anything other than "a person needs help right now," it's the wrong color — reach for blue or a status color instead.

### Tertiary
- **Info Sky** (`#38BDF8`): admin-only informational accent — links and info states inside the admin shell, distinct from Sky Blue's role as the primary brand color there.

### Neutral
- **Ink** (`#111827`): public-site body text on white.
- **Slate Body** (`#6B7280`): public-site secondary/paragraph text (Tailwind gray-500 register).
- **Tint Blue** (`#F0F7FF`) / **Tint Border** (`#DAEEFF`): the pale-blue "info card" surface used for Safety & Support cards and the TrustBar strip — a way to give a section weight without leaving white/navy.
- **Field Gray** (`#F8FAFC`): form input backgrounds on light surfaces.
- **Admin Ink** (`#F1F5F9`): primary text on all dark admin/conductor surfaces.
- **Admin Slate** (`#94A3B8`) / **Admin Muted** (`#64748B`): secondary and tertiary text on dark surfaces.
- **Admin Bg** (`#0B1120`), **Admin Surface** (`#131C2E`), **Admin Surface Raised** (`#1A2540`), **Admin Sidebar** (`#0D1424`): the dark-mode tonal ladder — background → card → raised card → nav rail, each one step lighter, doing the depth work shadows do on the public site.
- **Admin Border** (`#1E2D45`) / **Admin Border Subtle** (`#162033`): the hairlines that separate panels in the flat admin world.

### Status
- **Success** (`#22C55E`), **Warning** (`#F59E0B`), **Danger** (`#EF4444`): admin/conductor status colors, always at low-opacity fill with a matching border and full-opacity text (see Badge in Components) — never a solid fill.

### Named Rules
**The Two Registers Rule.** Public/commuter = warm-toward-white, glowing, pill-shaped. Admin/conductor = navy-toward-black, flat, tight-cornered. A component migrating between the two worlds must re-skin, not just recolor.

**Lost & Found exception.** The commuter Lost & Found screen (`app/(commuter)/lost-and-found/`) is a deliberate, scoped carve-out from the Two Registers Rule: it follows the admin register's shape language — bordered tonal-ladder panels (`#0E1628` fields/tabs on the `#071A2E` header) instead of glow-filled ones, `rounded-xl` modals instead of `rounded-2xl`, flat translucent-fill active/selected states instead of solid-fill glow — because the same items and claims are viewed by both a commuter and an admin, and the two views benefited from reading as the same object rather than two different visual products. Primary brand color stays commuter's own CHATCO Blue (`#1A5FB4`), not admin's Sky Blue — the carve-out is shape/depth/panel language, not a full register swap. Do not extend this exception to other commuter screens without the same cross-role rationale; it's an intentional, narrow exception, not a precedent for merging the two registers generally.

## Typography

Two type systems now, split along the same line as the Modes framework: the **app shell** (admin, conductor, commuter — Operate mode, task-focused, already-trusted users) stays on Poppins. The **public landing page** (`app/page.tsx` and `components/landing/*` — Persuade mode, a first-time visitor deciding whether to trust CHATCO) runs its own editorial pairing. Neither font loads into the other's territory: the landing fonts are scoped via CSS variables on the landing page's own `<main>`, not the global `<body>`.

### App shell: Poppins

**Display / Body Font:** Poppins (with system-ui, -apple-system fallback) — one family for the whole authenticated app, no secondary typeface.

**Character:** Rounded-geometric and confident without being playful — Poppins at 600–700 reads as "in control," which is the point. The font is only loaded at weights 400/500/600/700; nothing here is a true 800. Where the code requests `font-extrabold`, the browser renders the nearest loaded weight (700) — treat 700 as the actual heaviest weight, not 800, when specifying new type in admin/conductor/commuter screens.

#### Hierarchy
- **Title** (700, 18px, 1.4): card and component headings (feature card titles, modal titles).
- **Body** (400, 16px, 1.6): paragraph copy. On dark navy surfaces, body text drops to white at 40–60% opacity rather than a separate gray token — legibility comes from opacity steps, not a second color.
- **Label** (600, 12px, 0.1em tracking, uppercase): eyebrows and section kickers, admin nav-group headers.
- **Micro** (600, 10px, 0.05em tracking): the system's most common text step by raw usage count (300+ call sites) — status pills, timestamps ("now", "3 min"), inline badge/chip text, and fine-print helper captions under form fields. Weight and case flex by context, but the 10px size itself is a real, deliberate step below Label, not a one-off.

### Landing page: the editorial pairing

**Display Font:** Erode (self-hosted Fontshare serif) — headlines only (Hero H1, every section H2, HowItWorks' per-step H3s). Weight 500 (medium): the face is only loaded at 400/500/600/700, and a serif display reads more confident at size than at heavy weight — let scale carry the authority, not boldness.
**Body Font:** General Sans (self-hosted Fontshare grotesk) — everything else on the landing page: paragraph copy, nav, buttons, labels, captions. Applied once as the landing `<main>`'s base font-family; individual components don't need to set it.

**Character:** A classic editorial pairing — think a considered mobility/transit publication (Monocle-adjacent), not a SaaS marketing site. The serif carries weight and intent at headline scale; the grotesk stays quiet and legible everywhere else. This is a deliberate register shift from the app shell's single-family Poppins system, justified by Persuade vs. Operate: a first-time visitor is being persuaded, not completing a task.

#### Hierarchy
- **Display** (Erode 500, responsive `text-5xl` → `text-8xl`, capped at 6rem at the largest step, 0.98 line-height): the Hero H1 only.
- **Headline** (Erode 500, `text-3xl` → `text-5xl` depending on section): every other landing section's H2/H3, e.g. "Every jeepney ride, made smarter…", HowItWorks' per-step titles.
- **Body** (General Sans 400, 16–18px, relaxed leading): paragraph copy, inherited from `<main>`.
- **Label / Micro**: unchanged in size and role from the app-shell scale above (10px/12px), just rendered in General Sans instead of Poppins since they inherit the landing page's base font.

### Named Rules
**The Opacity-Not-Palette Rule.** On navy/dark surfaces, secondary and tertiary text is white at a lower opacity (`text-white/60`, `/50`, `/40`), not a separately-chosen gray. This keeps every dark surface tonally coherent without maintaining a parallel gray scale.
**The Two Typefaces, Two Modes Rule.** Poppins never appears on the public landing page and the Erode/General Sans pairing never appears in the authenticated app. If a component moves between the two contexts, its font must switch with it — there is no shared default to fall back on.

## Layout

Public site: a single `max-w-7xl` (1280px) container with `px-5 md:px-8` gutters for full sections, including the docked navbar, which now shares the page's own container width rather than narrowing to a floating capsule; centered copy blocks clamp to `max-w-2xl`–`max-w-4xl` so paragraphs never over-extend. Vertical rhythm runs in two section sizes — standard sections use `py-20 md:py-28` (80px → 112px), editorial hero-scale sections like Manifesto run heavier at `py-24 md:py-32` (96px → 128px). The Hero itself is its own case: full `100vh` on `lg:` and up (a docked-nav, full-bleed composition, not a padded section), falling back to ordinary top/bottom padding below `lg:` where it behaves like a normal stacked block. Feature grids step from 1 column on mobile to 2–3 on `sm:`, using Tailwind's default breakpoints (640/768/1024px).

Admin/conductor: a fixed 256px (`w-64`) left sidebar plus a fluid content column on desktop; below `768px` the sidebar collapses to a bottom tab bar with a "More" overflow and a fixed top-right notification bell, and the content column becomes the sole scroll container (not the document) so sticky page headers stay pinned correctly. Content padding is `p-6 lg:p-8` desktop, `p-4 md:p-6 lg:p-8` mobile with bottom clearance for the tab bar.

## Elevation & Depth

Two different depth systems, matched to the Two Registers Rule above.

**Public/commuter (glow elevation):** shadows are colored, not neutral — `shadow-xl shadow-[#1A5FB4]/30` on primary buttons, `shadow-2xl shadow-black/10` on floating cards and the navbar pill, ambient blurred color blobs (`blur-[150px]` at low opacity) behind hero content. Cards lift on hover (`hover:-translate-y-1`) paired with a soft brand-colored glow — elevation here is partly emotional, signaling "this is alive and trustworthy," not just spatial stacking.

**Admin/conductor (flat, layered-tone elevation):** no glow shadows. Depth comes from a tonal ladder of backgrounds (`admin-bg` → `admin-surface` → `admin-surface-raised`) plus 1px borders (`admin-border`, `admin-border-subtle`) — a panel reads as "above" another panel because it's a lighter navy with a visible edge, not because it casts a shadow. The one exception is modals, which sit on `shadow-2xl` over a `bg-black/50` overlay, because a modal must read as interrupting the flat plane behind it.

### Shadow Vocabulary
- **Button glow** (`shadow-xl shadow-[#1A5FB4]/30`, hover `shadow-2xl shadow-[#1A5FB4]/40`): primary CTAs on public surfaces.
- **Card float** (`shadow-2xl shadow-black/10`): floating cards, navbar-when-scrolled, the FAQ chat panel.
- **Modal overlay** (`shadow-2xl` panel over `bg-black/50` scrim): the one shadow admin/conductor surfaces use, because a modal has to break the flat plane.

### Named Rules
**The No-Glow-In-Admin Rule.** Admin and conductor screens never use a colored/glow shadow — if a new admin component wants elevation, give it a border and a lighter background tone instead, per the confirmed split between the two registers.

## Shapes

Public/commuter runs soft and pill-forward: `rounded-full` for every nav link, primary button, and badge; `rounded-2xl` (16px) for cards and the FAQ chat panel. The Hero is a deliberate exception to "cards": no boxed chrome at all, just typography and negative space directly on the navy field — see Overview and Elevation. Admin/conductor runs tighter and more utilitarian: `rounded-md` (6px) for sidebar nav items and interactive rows, `rounded-lg` (8px) for metric cards and small panels, `rounded-xl` (12px) for modals and larger panels — never a full pill except on true status badges. This is the same Two Registers split expressed in geometry: soft and rounded where the goal is to feel welcoming, tighter and more structured where the goal is to feel efficient.

## Components

### Buttons
- **Shape:** `rounded-full` on every public surface (12–16px vertical padding, generous horizontal); admin action buttons use `rounded-md`/`rounded-lg` to match the tighter admin shape language.
- **Primary:** CHATCO Blue background, white text, `px-8 py-4` on hero-scale CTAs, glow shadow (see Elevation) that deepens on hover alongside a background shift to Blue, Deepened.
- **Ghost/Secondary (on navy):** transparent background, white text, `1px` white/20% border, hover fills to white/5%.
- **On light surfaces:** gray-100 background, gray-700 text, hover to gray-200 — used for "Back" / secondary actions, never for anything that competes with the primary blue CTA on the same screen.

### Badges
- **Style:** pill (`rounded-full`), low-opacity status-color background (`/20`) with a matching `/30` border and full-opacity status-color text. Five variants: success (green), warning (yellow/amber), danger (red), info (blue), neutral (slate) — neutral is also the deliberate fallback for any status value the UI doesn't recognize, never defaulted to success/green.

### Cards / Containers
- **Public:** white background, `1px` gray-100 border, `rounded-2xl`, `p-6` internal padding, lift + brand-glow on hover.
- **Admin:** `admin-surface` background, `1px admin-border`, `rounded-lg` (metric cards) or `rounded-xl` (larger panels), `p-4`–`p-6` internal padding, flat at rest.
- **Glass variant** (conductor/admin over imagery or gradient): `backdrop-blur-md`, white/10% background, white/20% border — used sparingly where a panel sits over a map or photo rather than a flat admin background.

### Inputs / Fields
- **Public:** `Field Gray` (`#F8FAFC`) background, gray-200 border, `rounded-xl`, focus ring in CHATCO Blue at 20% opacity with the border shifting to full-opacity blue.
- **Admin:** dark field background matched to the surrounding surface tone, `admin-border`, focus follows the same blue-ring pattern adapted to dark mode.
- **Error state:** border and background shift toward the red/danger status color; error copy in red-500, always attached directly under the field, never a separate summary-only banner.

### Navigation
- **Public navbar:** a docked instrument bar, not a floating pill — full-width, always Deep Navy, always light text. It doesn't chameleon to match whatever scrolls beneath it; only its opacity, blur strength, and a bottom hairline change (~40px of scroll: `bg-[#071A2E]/20` → `/90`, blur and shadow strengthen). **The Docked, Not Floating Rule.** The nav is chrome, not a page element — it stays visually constant regardless of scroll position or section background, the way an instrument panel doesn't repaint itself to match the view outside. Nav links borrow the admin sidebar's small dot-indicator device on hover (a shared "one system" thread between the two registers, not a register merge — the nav stays pill/soft everywhere else). Mobile collapses to a hamburger-triggered dark card (`#0B1120`), not a light one, matching the bar above it.
- **Admin sidebar:** fixed 256px dark rail, grouped into Operations / Management / System with uppercase 10px label kickers; the active link gets a `Sky Blue`-at-10%-opacity background, full-opacity Sky Blue text, and a small solid dot — inactive links get an invisible dot of the same size so the row never shifts width on activation.
- **Admin mobile:** bottom tab bar with a "More" overflow sheet, plus a fixed top-right notification bell that the sidebar absorbs on desktop.

### FAQ Chat Bubble (signature component)
A floating bottom-right chat affordance on the public site that opens into a scripted Q&A panel (category pills → question list → canned answer), styled like a real chat thread (right-aligned blue bubbles for the user's tap, left-aligned gray bubbles for the answer) even though it's not a live agent. It's the one place the public site borrows a messaging-app pattern rather than a marketing-site pattern, and it should stay visually distinct from any future *real* support-chat feature so users don't confuse the two.

## Do's and Don'ts

### Do:
- **Do** keep Signal Orange (`#FF6D3A`) reserved for "a person is waiting and needs help" — currently only the Pick Me Up flow. Adding it anywhere else dilutes the one signal it's supposed to send.
- **Do** use opacity steps on white text for secondary/tertiary hierarchy on dark surfaces (the Opacity-Not-Palette Rule), not a second gray token.
- **Do** treat 700 as Poppins' real maximum weight in this system — never spec 800/900 expecting it to render; load the weight first if a screen genuinely needs it.
- **Do** give admin/conductor depth through the bg → surface → surface-raised tone ladder and borders, matching the No-Glow-In-Admin Rule.
- **Do** default unrecognized status values to the neutral/slate badge, never to success-green (see Badge component note).

### Don't:
- **Don't** mix registers on one screen — a public-facing marketing section should never suddenly adopt admin's flat/tight-corner language, and an admin panel should never pick up a public-style glow shadow.
- **Don't** reintroduce a language-selection picker or multi-language marketing claim; the product is English-only by product decision (see PRODUCT.md), not a design gap to fill.
- **Don't** use Deep Navy (`#071A2E`) and the admin background tones (`#0B1120` etc.) interchangeably — they're related but distinct tokens for distinct surfaces (public hero vs. admin shell).
- **Don't** apply a colored glow shadow inside the admin or conductor shell; use a border + lighter surface tone instead.
