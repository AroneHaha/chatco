// components/admin/ui/search-bar.tsx
import { Search } from 'lucide-react';

interface SearchBarProps {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function SearchBar({ placeholder, value, onChange, className }: SearchBarProps) {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className="h-4 w-4 text-slate-500" />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full pl-10 pr-3 py-2 bg-[#0E1628] admin-light:bg-white border border-[#1E2D45] admin-light:border-[#E2E8F0] rounded-lg text-sm text-slate-200 admin-light:text-slate-700 placeholder-slate-500 admin-light:placeholder-slate-400 focus:outline-none focus:border-[#62A0EA]/50 admin-light:focus:border-[#1A5FB4]/50 focus:ring-1 focus:ring-[#62A0EA]/30 admin-light:focus:ring-[#1A5FB4]/30 transition-colors"
        placeholder={placeholder}
      />
    </div>
  );
}
