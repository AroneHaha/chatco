// components/admin/ui/admin-date-picker.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface AdminDatePickerProps {
  value: string; // 'YYYY-MM-DD', or '' for no filter
  onChange: (value: string) => void;
  /** Matches the accent color already used per section (SOS = blue, Overspeeding = red). */
  accent?: 'blue' | 'red';
  /** Which edge of the trigger the popover hangs from — 'right' for triggers near the right edge of the viewport. */
  align?: 'left' | 'right';
  ariaLabel: string;
  className?: string;
  /** Overrides the trigger button's size (width/height) classes — defaults to the original `w-40 py-1.5` sizing. */
  triggerClassName?: string;
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const pad = (n: number) => String(n).padStart(2, '0');
const toISODate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseISODate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

type Accent = { ring: string; solid: string; text: string };
const ACCENTS: Record<'blue' | 'red', Accent> = {
  blue: { ring: 'focus:border-[#62A0EA]/50 focus:ring-[#62A0EA]/30', solid: 'bg-[#62A0EA]', text: 'text-[#62A0EA]' },
  red: { ring: 'focus:border-red-400/50 focus:ring-red-400/30', solid: 'bg-red-400', text: 'text-red-400' },
};

/**
 * A small custom calendar dropdown standing in for the browser's native
 * `<input type="date">` popup, which can't be restyled to match the admin
 * design system (rounded-xl panel, Poppins, tonal-ladder surfaces, accent
 * color). Single-date selection only — no range, no native platform quirks.
 */
// Header + weekday row + up to 6 day rows + footer, roughly — used only to
// decide open direction before the panel itself has rendered/measured.
const PANEL_HEIGHT_ESTIMATE = 336;

export function AdminDatePicker({ value, onChange, accent = 'blue', align = 'left', ariaLabel, className, triggerClassName }: AdminDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openDirection, setOpenDirection] = useState<'down' | 'up'>('down');
  const [viewMonth, setViewMonth] = useState(() => (value ? parseISODate(value) : new Date()));
  const containerRef = useRef<HTMLDivElement>(null);
  const colors = ACCENTS[accent];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  // Re-checks on scroll/resize too (capture phase, since the admin shell's
  // content column — not the document — is usually the actual scroll
  // container), so the panel doesn't stay flipped the wrong way after the
  // page scrolls while it's open.
  useEffect(() => {
    if (!isOpen) return;
    const updateDirection = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      setOpenDirection(spaceBelow < PANEL_HEIGHT_ESTIMATE && spaceAbove > spaceBelow ? 'up' : 'down');
    };
    updateDirection();
    window.addEventListener('scroll', updateDirection, true);
    window.addEventListener('resize', updateDirection);
    return () => {
      window.removeEventListener('scroll', updateDirection, true);
      window.removeEventListener('resize', updateDirection);
    };
  }, [isOpen]);

  const openPicker = () => {
    setViewMonth(value ? parseISODate(value) : new Date());
    setIsOpen((open) => !open);
  };

  const selectDay = (day: Date) => {
    onChange(toISODate(day));
    setIsOpen(false);
  };

  const today = new Date();
  const selected = value ? parseISODate(value) : null;

  // Build a 6-row grid: leading days from the previous month (disabled, for
  // alignment only), the active month's days, trailing days from the next
  // month to fill the last row.
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

  const cells: { date: Date; inMonth: boolean }[] = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNumber = i - firstWeekday + 1;
    if (dayNumber < 1) {
      cells.push({ date: new Date(year, month - 1, daysInPrevMonth + dayNumber), inMonth: false });
    } else if (dayNumber > daysInMonth) {
      cells.push({ date: new Date(year, month + 1, dayNumber - daysInMonth), inMonth: false });
    } else {
      cells.push({ date: new Date(year, month, dayNumber), inMonth: true });
    }
  }

  const displayLabel = selected
    ? selected.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'mm/dd/yyyy';

  return (
    <div className={`relative ${className ?? ''}`} ref={containerRef}>
      <button
        type="button"
        onClick={openPicker}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        className={`flex items-center gap-2 bg-[#0E1628] border border-[#1E2D45] rounded-md text-xs pl-8 pr-2 text-left focus:outline-none ${triggerClassName ?? 'w-40 py-1.5'} ${colors.ring} transition-colors`}
      >
        <CalendarDays size={14} className="absolute left-2.5 text-slate-500 pointer-events-none" />
        <span className={value ? 'text-slate-300' : 'text-slate-500'}>{displayLabel}</span>
        {value && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onChange(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onChange(''); } }}
            aria-label="Clear date filter"
            className="ml-auto text-slate-500 hover:text-white"
          >
            <X size={12} />
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label={`${ariaLabel} calendar`}
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} ${
            openDirection === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'
          } z-30 w-64 rounded-xl border border-[#1E2D45] bg-[#131C2E] p-3 shadow-2xl shadow-black/50`}
        >
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => setViewMonth(new Date(year, month - 1, 1))}
              aria-label="Previous month"
              className="p-1 rounded-md text-slate-400 hover:bg-[#1A2540] hover:text-white transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-semibold text-white">{MONTH_NAMES[month]} {year}</span>
            <button
              type="button"
              onClick={() => setViewMonth(new Date(year, month + 1, 1))}
              aria-label="Next month"
              className="p-1 rounded-md text-slate-400 hover:bg-[#1A2540] hover:text-white transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-y-1 mb-1">
            {WEEKDAYS.map((day) => (
              <span key={day} className="text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500">{day}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-1">
            {cells.map(({ date, inMonth }, i) => {
              const isSelected = selected !== null && isSameDay(date, selected);
              const isToday = isSameDay(date, today);
              return (
                <button
                  key={i}
                  type="button"
                  disabled={!inMonth}
                  onClick={() => selectDay(date)}
                  aria-current={isToday ? 'date' : undefined}
                  aria-label={date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  className={`mx-auto flex h-7 w-7 items-center justify-center rounded-md text-xs transition-colors ${
                    !inMonth
                      ? 'text-slate-700 cursor-default'
                      : isSelected
                        ? `${colors.solid} text-white font-semibold`
                        : isToday
                          ? `${colors.text} font-semibold hover:bg-[#1A2540]`
                          : 'text-slate-300 hover:bg-[#1A2540]'
                  }`}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#1E2D45]">
            <button
              type="button"
              onClick={() => selectDay(today)}
              className={`text-xs font-medium ${colors.text} hover:underline`}
            >
              Today
            </button>
            {value && (
              <button
                type="button"
                onClick={() => { onChange(''); setIsOpen(false); }}
                className="text-xs font-medium text-slate-500 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
