// components/admin/layout/admin-layout-skeleton.tsx
'use client';

import { SkeletonCard } from '@/components/admin/ui/skeleton';

export function SidebarSkeleton() {
  return (
    <div className="w-64 bg-[#0D1424] border-r border-[#1E2D45] flex flex-col animate-pulse">
      {/* Logo area */}
      <div className="p-5 flex items-center gap-3">
        <div className="w-9 h-9 rounded bg-gray-700" />
        <div className="space-y-2">
          <div className="h-4 w-20 rounded bg-gray-700" />
          <div className="h-2 w-14 rounded bg-gray-700" />
        </div>
      </div>
      {/* Nav groups */}
      <div className="flex-1 px-3 space-y-6 pt-2">
        <SkeletonCard count={3} height="36px" />
        <SkeletonCard count={3} height="36px" />
        <SkeletonCard count={2} height="36px" />
      </div>
      {/* Bottom */}
      <div className="px-3 pb-5 border-t border-[#1E2D45] pt-3">
        <SkeletonCard count={1} height="36px" />
      </div>
    </div>
  );
}

export function ContentSkeleton() {
  return (
    <div className="flex-1 p-6 lg:p-8 space-y-6 animate-pulse">
      <SkeletonCard count={1} height="32px" />
      <SkeletonCard count={3} height="100px" />
    </div>
  );
}

export function MobileSkeleton() {
  return (
    <div className="min-h-screen bg-[#0B1120] flex flex-col">
      <div className="flex-1 p-4 space-y-4 animate-pulse">
        <SkeletonCard count={2} height="80px" />
      </div>
      {/* Bottom nav bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0D1424]/95 border-t border-[#1E2D45] h-16 flex justify-around items-center animate-pulse">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className="w-5 h-5 rounded bg-gray-700" />
            <div className="w-8 h-2 rounded bg-gray-700" />
          </div>
        ))}
      </div>
    </div>
  );
}
