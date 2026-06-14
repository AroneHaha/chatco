---
Task ID: 3.1
Agent: subagent
Task: Extract shared UI components

Work Log:
- Analyzed existing components: admin/ui/modal.tsx, admin/ui/sign-out-modal.tsx, ui/badge.tsx, ui/glass-card.tsx, ui/metric-card.tsx, ui/status-badge.tsx, ui/modal.tsx, conductor/modals/history-log-modal.tsx
- Noted that the previous agent (3.1-main) had already created shared components in src/components/ui/ but the task requires them in src/components/shared/ with enhanced Modal variant support
- Created src/components/shared/Modal.tsx with `variant` prop ("admin" | "conductor" | "default") instead of just `theme: "dark" | "light"`, supporting both admin (bg-[#1A2540], border-[#2A3A55]) and conductor (bg-[#0F2135], border-white/[0.08]) color schemes
- Created src/components/shared/Badge.tsx with all Chatco-specific variants (success/warning/danger/info/neutral) plus capacity status support
- Created src/components/shared/GlassCard.tsx with dark/light theme support and frosted-glass styling
- Created src/components/shared/MetricCard.tsx with icon + value + label + trend indicator, theme-aware
- Created src/components/shared/ConfirmDialog.tsx as a generic confirm/cancel dialog with configurable icon, title, description, confirmVariant ("danger" | "primary"), modalVariant, and button labels
- Created src/components/shared/index.ts barrel re-export
- Updated admin/ui/modal.tsx to re-export from shared with `variant="admin"` as default
- Refactored admin/ui/sign-out-modal.tsx to use shared ConfirmDialog instead of inline Modal + custom UI
- Verified no TypeScript compilation errors for new/modified files
- Confirmed lint only shows pre-existing errors (generate-erd-doc.js, map.tsx warnings)

Stage Summary:
- All 6 shared components created in src/components/shared/: Modal, Badge, GlassCard, MetricCard, ConfirmDialog, index.ts
- Admin modal.tsx updated to re-export from shared with admin default
- Admin sign-out-modal.tsx refactored to use ConfirmDialog
- Modal supports 3 variants: "admin" (default), "conductor", "default"
- ConfirmDialog is generic and reusable for both admin and conductor confirm dialogs
- No new lint errors introduced
