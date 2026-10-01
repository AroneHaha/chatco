// components/admin/ui/row-actions-menu.tsx
'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type SyntheticEvent } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal, type LucideIcon } from 'lucide-react';

export interface RowAction {
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  /** 'danger' renders the item red and puts a divider above it. */
  tone?: 'default' | 'danger';
}

interface RowActionsMenuProps {
  actions: RowAction[];
  /** Accessible name for the trigger, e.g. "Actions for ABC-123". */
  label: string;
}

const MENU_WIDTH = 176;
const GAP = 4;

/**
 * Three-dot row menu for admin tables.
 *
 * The menu is portalled to <body> with fixed positioning because DataTable
 * scrolls inside an overflow container that would clip an absolutely
 * positioned dropdown on the last rows. It opens below the trigger, or above
 * it when there isn't room, and closes on outside click, Esc, scroll or
 * resize (a fixed menu would otherwise drift away from its row).
 *
 * React bubbles events from a portal through the component tree, so every
 * click/double-click inside is stopped here — otherwise choosing an item
 * would also fire the row's onDoubleClick (open details).
 */
export function RowActionsMenu({ actions, label }: RowActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const close = useCallback((restoreFocus: boolean) => {
    setIsOpen(false);
    setPosition(null);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  // Measure after the menu renders so its real height decides up vs down.
  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current || !menuRef.current) return;
    const trigger = triggerRef.current.getBoundingClientRect();
    const menuHeight = menuRef.current.offsetHeight;
    const fitsBelow = trigger.bottom + GAP + menuHeight <= window.innerHeight;
    setPosition({
      top: fitsBelow ? trigger.bottom + GAP : Math.max(GAP, trigger.top - GAP - menuHeight),
      left: Math.max(GAP, Math.min(trigger.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - GAP)),
    });
  }, [isOpen]);

  // Focus the first item once positioned, for keyboard users.
  useEffect(() => {
    if (position) menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
  }, [position]);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      close(false);
    };
    const onViewportChange = () => close(false);
    document.addEventListener('mousedown', onPointerDown);
    window.addEventListener('resize', onViewportChange);
    // Capture phase: DataTable scrolls in its own container, not the window.
    window.addEventListener('scroll', onViewportChange, true);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('resize', onViewportChange);
      window.removeEventListener('scroll', onViewportChange, true);
    };
  }, [isOpen, close]);

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? []);
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    const focusAt = (i: number) => items[(i + items.length) % items.length]?.focus();

    if (event.key === 'Escape') { event.preventDefault(); close(true); }
    else if (event.key === 'Tab') close(false);
    else if (event.key === 'ArrowDown') { event.preventDefault(); focusAt(index + 1); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); focusAt(index - 1); }
    else if (event.key === 'Home') { event.preventDefault(); focusAt(0); }
    else if (event.key === 'End') { event.preventDefault(); focusAt(items.length - 1); }
  };

  const stop = (event: SyntheticEvent) => event.stopPropagation();

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={(event) => { event.stopPropagation(); if (isOpen) close(false); else setIsOpen(true); }}
        onDoubleClick={stop}
        aria-label={label}
        title="Actions"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        className={`rounded-md p-1.5 transition-colors ${
          isOpen ? 'bg-[#1A2540] text-white' : 'text-slate-400 hover:bg-[#1A2540] hover:text-white'
        }`}
      >
        <MoreHorizontal size={16} />
      </button>

      {isOpen && createPortal(
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKeyDown}
          onClick={stop}
          onDoubleClick={stop}
          onMouseDown={stop}
          style={{
            width: MENU_WIDTH,
            top: position?.top ?? 0,
            left: position?.left ?? 0,
            // Hidden for the one frame before it has been measured and placed.
            visibility: position ? 'visible' : 'hidden',
          }}
          className="fixed z-50 rounded-lg border border-[#1E2D45] bg-[#111A2B] p-1 shadow-[0_12px_32px_rgba(0,0,0,0.45)]"
        >
          {actions.map((action) => {
            const isDanger = action.tone === 'danger';
            return (
              <div key={action.label}>
                {isDanger && <div role="separator" className="my-1 h-px bg-[#1E2D45]" />}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => { close(false); action.onSelect(); }}
                  className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors focus:outline-none ${
                    isDanger
                      ? 'text-red-400 hover:bg-red-400/10 focus:bg-red-400/10'
                      : 'text-slate-200 hover:bg-[#172238] focus:bg-[#172238]'
                  }`}
                >
                  <action.icon size={15} aria-hidden="true" className={isDanger ? 'text-red-400' : 'text-slate-400'} />
                  {action.label}
                </button>
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
}
