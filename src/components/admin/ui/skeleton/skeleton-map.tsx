"use client";

import { MapPin } from "lucide-react";

interface SkeletonMapProps {
  height?: string;
  label?: string;
}

export function SkeletonMap({ height = "400px", label }: SkeletonMapProps) {
  return (
    <div
      className="relative w-full rounded-xl border border-gray-200 bg-gray-100 overflow-hidden animate-pulse"
      style={{ height }}
    >
      {/* Fake map grid lines */}
      <div className="absolute inset-0 opacity-20">
        {/* Horizontal lines */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={`h-${i}`}
            className="absolute left-0 right-0 border-t border-gray-300"
            style={{ top: `${(i + 1) * 14}%` }}
          />
        ))}
        {/* Vertical lines */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={`v-${i}`}
            className="absolute top-0 bottom-0 border-l border-gray-300"
            style={{ left: `${(i + 1) * 11}%` }}
          />
        ))}
      </div>

      {/* Center icon + label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
        <MapPin className="h-8 w-8 text-gray-300" />
        {label && (
          <span className="text-xs font-medium text-gray-300">{label}</span>
        )}
      </div>
    </div>
  );
}