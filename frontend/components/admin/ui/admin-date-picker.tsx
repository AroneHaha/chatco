// components/admin/ui/admin-date-picker.tsx
'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
  id?: string;
  invalid?: boolean;
  errorId?: string;
  clearLabel?: string;
  disabled?: boolean;
  /** Use the browser's top layer inside animated, scrollable dialogs. */
  popover?: boolean;
  /** Jump directly to a year and month instead of paging through every month. */
  yearNavigation?: boolean;
  /** Earliest/latest selectable day ('YYYY-MM-DD'); days outside are disabled. */
  min?: string;
  max?: string;
  /** Trigger text while no date is picked. */
  placeholder?: string;
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
  blue: { ring: 'focus:border-[#62A0EA]/50 admin-light:focus:border-[#1A5FB4]/50 focus:ring-[#62A0EA]/30 admin-light:focus:ring-[#1A5FB4]/30', solid: 'bg-[#62A0EA] admin-light:bg-[#1A5FB4] light:bg-[#1A5FB4]', text: 'text-[#62A0EA] admin-light:text-[#1A5FB4] light:text-[#1A5FB4]' },
  red: { ring: 'focus:border-red-400/50 focus:ring-red-400/30', solid: 'bg-red-400', text: 'text-red-400 admin-light:text-red-600' },
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

export function AdminDatePicker({ value, onChange, accent = 'blue', align = 'left', ariaLabel, className, triggerClassName, id, invalid, errorId, clearLabel = 'Clear date filter', disabled = false, popover = false, yearNavigation = false, min, max, placeholder = 'mm/dd/yyyy' }: AdminDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openDirection, setOpenDirection] = useState<'down' | 'up'>('down');
  const [viewMonth, setViewMonth] = useState(() => (value ? parseISODate(value) : new Date()));
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const colors = ACCENTS[accent];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      if (isOpen && popover) {
        event.preventDefault();
        event.stopPropagation();
        containerRef.current?.querySelector('button')?.focus({ preventScroll: true });
      }
      setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape, popover);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape, popover);
    };
  }, [isOpen, popover]);

  useLayoutEffect(() => {
    if (!isOpen || !popover) return;
    const panel = panelRef.current;
    if (!panel) return;
    panel.showPopover();
    const positionPanel = () => {
      const trigger = containerRef.current?.getBoundingClientRect();
      if (!trigger) return;
      const viewport = window.visualViewport;
      const viewportLeft = viewport?.offsetLeft ?? 0;
      const viewportTop = viewport?.offsetTop ?? 0;
      const viewportWidth = viewport?.width ?? window.innerWidth;
      const viewportHeight = viewport?.height ?? window.innerHeight;
      panel.style.maxWidth = `${Math.max(0, viewportWidth - 24)}px`;
      panel.style.maxHeight = `${Math.max(0, viewportHeight - 24)}px`;
      const width = panel.offsetWidth;
      const height = panel.offsetHeight;
      const below = viewportTop + viewportHeight - trigger.bottom;
      const above = trigger.top - viewportTop;
      const left = align === 'right' ? trigger.right - width : trigger.left;
      const top = below < height + 8 && above > below ? trigger.top - height - 8 : trigger.bottom + 8;
      panel.style.left = `${Math.max(viewportLeft + 12, Math.min(left, viewportLeft + viewportWidth - width - 12))}px`;
      panel.style.top = `${Math.max(viewportTop + 12, Math.min(top, viewportTop + viewportHeight - height - 12))}px`;
    };
    positionPanel();
    window.addEventListener('scroll', positionPanel, true);
    window.addEventListener('resize', positionPanel);
    window.visualViewport?.addEventListener('resize', positionPanel);
    window.visualViewport?.addEventListener('scroll', positionPanel);
    return () => {
      window.removeEventListener('scroll', positionPanel, true);
      window.removeEventListener('resize', positionPanel);
      window.visualViewport?.removeEventListener('resize', positionPanel);
      window.visualViewport?.removeEventListener('scroll', positionPanel);
      if (panel.matches(':popover-open')) panel.hidePopover();
    };
  }, [isOpen, popover, align, viewMonth]);

  // Re-checks on scroll/resize too (capture phase, since the admin shell's
  // content column — not the document — is usually the actual scroll
  // container), so the panel doesn't stay flipped the wrong way after the
  // page scrolls while it's open.
  useEffect(() => {
    if (!isOpen || popover) return;
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
  }, [isOpen, popover]);

  const openPicker = () => {
    if (disabled) return;
    setViewMonth(value ? parseISODate(value) : new Date());
    setIsOpen((open) => !open);
  };

  const selectDay = (day: Date) => {
    onChange(toISODate(day));
    setIsOpen(false);
    if (popover) containerRef.current?.querySelector('button')?.focus({ preventScroll: true });
  };

  const today = new Date();
  const selected = value ? parseISODate(value) : null;
  // ISO dates compare correctly as strings.
  const isOutOfBounds = (day: Date) => {
    const iso = toISODate(day);
    return (min !== undefined && min !== '' && iso < min) || (max !== undefined && max !== '' && iso > max);
  };

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
    : placeholder;

  return (
    <div className={`relative ${className ?? ''}`} ref={containerRef}>
      <button
        id={id}
        type="button"
        onClick={openPicker}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        data-invalid={invalid || undefined}
        aria-describedby={invalid ? errorId : undefined}
        className={`flex items-center gap-2 bg-[#0E1628] admin-light:bg-white border border-[#1E2D45] admin-light:border-[#E2E8F0] light:bg-white light:border-gray-200 rounded-md text-xs pl-8 pr-2 text-left focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 ${triggerClassName ?? 'w-40 py-1.5'} ${colors.ring} transition-colors`}
      >
        <CalendarDays size={14} className="absolute left-2.5 text-slate-500 pointer-events-none" />
        <span className={value ? 'text-slate-300 admin-light:text-slate-700 light:text-gray-900' : 'text-slate-500 light:text-gray-400'}>{displayLabel}</span>
        {value && !disabled && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onChange(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onChange(''); } }}
            aria-label={clearLabel}
            className="ml-auto text-slate-500 hover:text-white admin-light:hover:text-slate-900 light:hover:text-gray-900"
          >
            <X size={12} />
          </span>
        )}
      </button>

      {isOpen && (
        <div
          ref={panelRef}
          popover={popover ? 'manual' : undefined}
          style={popover ? { position: 'fixed', inset: 'auto', margin: 0, overflowY: 'auto' } : undefined}
          role="dialog"
          aria-label={`${ariaLabel} calendar`}
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} ${
            openDirection === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'
          } z-30 w-64 rounded-xl border border-[#1E2D45] admin-light:border-[#E2E8F0] bg-[#131C2E] admin-light:bg-white p-3 shadow-2xl shadow-black/50 light:border-gray-200 light:bg-white light:shadow-black/10`}
        >
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => setViewMonth(new Date(year, month - 1, 1))}
              aria-label="Previous month"
              className="p-1 rounded-md text-slate-400 admin-light:text-slate-500 hover:bg-[#1A2540] admin-light:hover:bg-[#EEF2F7] hover:text-white admin-light:hover:text-slate-900 light:text-gray-500 light:hover:bg-gray-100 light:hover:text-gray-900 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            {yearNavigation ? (
              <div className="flex items-center gap-2">
                <select
                  aria-label="Calendar month"
                  value={month}
                  onChange={(event) => setViewMonth(new Date(year, Number(event.target.value), 1))}
                  className="min-w-0 rounded-md border border-[#1E2D45] admin-light:border-[#E2E8F0] bg-[#0E1628] admin-light:bg-[#F1F5F9] px-1 py-1 text-xs text-white admin-light:text-slate-900 light:border-gray-200 light:bg-white light:text-gray-900 outline-none focus:border-[#62A0EA] admin-light:focus:border-[#1A5FB4]"
                >
                  {MONTH_NAMES.map((name, index) => <option key={name} value={index}>{name.slice(0, 3)}</option>)}
                </select>
                <select
                  aria-label="Calendar year"
                  value={year}
                  onChange={(event) => setViewMonth(new Date(Number(event.target.value), month, 1))}
                  className="min-w-0 rounded-md border border-[#1E2D45] admin-light:border-[#E2E8F0] bg-[#0E1628] admin-light:bg-[#F1F5F9] px-1 py-1 text-xs text-white admin-light:text-slate-900 light:border-gray-200 light:bg-white light:text-gray-900 outline-none focus:border-[#62A0EA] admin-light:focus:border-[#1A5FB4]"
                >
                  {Array.from({ length: Math.max(today.getFullYear(), year) - Math.min(1900, year) + 1 }, (_, index) => Math.max(today.getFullYear(), year) - index).map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </div>
            ) : <span className="text-sm font-semibold text-white admin-light:text-slate-900 light:text-gray-900">{MONTH_NAMES[month]} {year}</span>}
            <button
              type="button"
              onClick={() => setViewMonth(new Date(year, month + 1, 1))}
              aria-label="Next month"
              className="p-1 rounded-md text-slate-400 admin-light:text-slate-500 hover:bg-[#1A2540] admin-light:hover:bg-[#EEF2F7] hover:text-white admin-light:hover:text-slate-900 light:text-gray-500 light:hover:bg-gray-100 light:hover:text-gray-900 transition-colors"
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
              const outOfBounds = inMonth && isOutOfBounds(date);
              return (
                <button
                  key={i}
                  type="button"
                  disabled={!inMonth || outOfBounds}
                  onClick={() => selectDay(date)}
                  aria-current={isToday ? 'date' : undefined}
                  aria-label={date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  className={`mx-auto flex h-7 w-7 items-center justify-center rounded-md text-xs transition-colors ${
                    !inMonth
                      ? 'text-slate-700 cursor-default light:text-gray-300'
                      : outOfBounds
                        ? 'text-slate-600 admin-light:text-slate-400 cursor-not-allowed light:text-gray-300'
                      : isSelected
                        ? `${colors.solid} text-white font-semibold`
                        : isToday
                          ? `${colors.text} font-semibold hover:bg-[#1A2540] admin-light:hover:bg-[#EEF2F7] light:hover:bg-gray-100`
                          : 'text-slate-300 admin-light:text-slate-700 hover:bg-[#1A2540] admin-light:hover:bg-[#EEF2F7] light:text-gray-700 light:hover:bg-gray-100'
                  }`}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#1E2D45] admin-light:border-[#E2E8F0] light:border-gray-200">
            <button
              type="button"
              onClick={() => selectDay(today)}
              disabled={isOutOfBounds(today)}
              className={`text-xs font-medium ${colors.text} hover:underline disabled:cursor-not-allowed disabled:text-slate-600 admin-light:disabled:text-slate-400 disabled:no-underline`}
            >
              Today
            </button>
            {value && (
              <button
                type="button"
                onClick={() => { onChange(''); setIsOpen(false); }}
                className="text-xs font-medium text-slate-500 hover:text-white admin-light:hover:text-slate-900 light:hover:text-gray-900"
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
