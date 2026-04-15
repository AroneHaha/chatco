// components/admin/ui/badge.tsx
import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant: 'success' | 'warning' | 'danger' | 'info';
}

export function Badge({ children, variant }: BadgeProps) {
  const colors = {
    success: 'bg-green-500/20 text-green-400 border border-green-500/30',
    warning: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    danger: 'bg-red-500/20 text-red-400 border border-red-500/30',
    info: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  };
  return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colors[variant]}`}>{children}</span>;
}