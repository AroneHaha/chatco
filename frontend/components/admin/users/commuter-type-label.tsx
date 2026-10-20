import { Tag, UserRound } from 'lucide-react';

/**
 * Type column cell for commuter rows (Active and Pending tabs): a muted icon
 * plus the fare type. Regular gets the person icon; the discounted types
 * (Student, Senior Citizen, PWD) share the tag icon.
 */
export function CommuterTypeLabel({ type }: { type: string }) {
  const Icon = type === 'Regular' ? UserRound : Tag;
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-slate-300 admin-light:text-slate-700">
      <Icon size={14} className="shrink-0 text-slate-500" aria-hidden="true" />
      {type}
    </span>
  );
}
