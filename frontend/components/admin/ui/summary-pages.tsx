// components/admin/ui/summary-pages.tsx
'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

// Matches the scroller's `gap-3`: every page is one scroller width plus this gap apart.
const PAGE_GAP_PX = 12;
const pageOffset = (el: HTMLElement, index: number) => index * (el.clientWidth + PAGE_GAP_PX);

// Matches the filters' collapse transition (`duration-300` in page.tsx), so
// the cards and the filters move together.
const RESIZE_MS = 300;

// Only the swipeable layout below md: changes height; the md:+ grid never does.
const canAnimateResize = () =>
  !window.matchMedia('(min-width: 768px)').matches &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Height of the top row of cards on the given page. */
const firstRowHeight = (scroller: HTMLElement, page: number) =>
  (scroller.children[page]?.firstElementChild as HTMLElement | null)?.offsetHeight ?? 0;

/** Transitions `wrapper` from `from`px to `to`px, then runs `onDone`. */
function animateHeight(wrapper: HTMLElement, timer: { current: number | undefined }, from: number, to: number, onDone: () => void) {
  window.clearTimeout(timer.current);
  wrapper.style.height = `${from}px`;
  void wrapper.offsetHeight; // commit the start height so the change transitions
  wrapper.style.height = `${to}px`;
  timer.current = window.setTimeout(onDone, RESIZE_MS);
}

/**
 * Below md: the cards split into pages of `perPage` (4 = a 2x2 grid, 2 = a
 * single row while the filters are collapsed) that swipe horizontally (scroll
 * snap), with dots marking the current one. From md: up the page wrappers
 * dissolve (`display: contents`) so every card sits in one grid, laid out by
 * `gridClassName`. The default is Remittance's: 2 columns at md:, 4 at lg:,
 * and a single column at xl:, where that page puts the cards in a side column
 * beside the table.
 *
 * Switching page size animates the height instead of jumping: a 2x2 page's
 * top row is exactly the matching one-row page, so collapsing clips the lower
 * row away first and only then regroups, and expanding regroups at one-row
 * height and then opens to reveal the second row.
 */
export function SummaryPages({
  cards,
  perPage,
  gridClassName = 'md:grid-cols-2 lg:grid-cols-4 xl:flex-1 xl:grid-cols-1 xl:auto-rows-fr xl:gap-2.5',
}: {
  cards: React.ReactNode[];
  perPage: number;
  /** md:+ grid layout classes for the cards. */
  gridClassName?: string;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const resizeTimer = useRef<number | undefined>(undefined);
  const [activePage, setActivePage] = useState(0);
  // The page size actually rendered. When shrinking it trails `perPage` until
  // the lower row is out of sight, so the cards never visibly regroup.
  const [shownPerPage, setShownPerPage] = useState(perPage);
  const pages = Array.from({ length: Math.ceil(cards.length / shownPerPage) }, (_, i) =>
    cards.slice(i * shownPerPage, (i + 1) * shownPerPage),
  );

  // Growing regroups straight away (landing on the page that holds the cards
  // that were in view); the layout effect below animates it open.
  if (perPage > shownPerPage) {
    setShownPerPage(perPage);
    setActivePage(Math.floor((activePage * shownPerPage) / perPage));
  }

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const scroller = scrollerRef.current;
    if (!wrapper || !scroller) return;
    if (perPage < shownPerPage) {
      const regroup = () => {
        setActivePage((page) => Math.floor((page * shownPerPage) / perPage));
        setShownPerPage(perPage);
      };
      if (canAnimateResize()) {
        animateHeight(wrapper, resizeTimer, wrapper.offsetHeight, firstRowHeight(scroller, activePage), regroup);
      } else {
        window.clearTimeout(resizeTimer.current);
        resizeTimer.current = window.setTimeout(regroup, 0);
      }
    } else if (wrapper.style.height) {
      // Expanded again before a collapse finished: open back up from wherever it got to.
      animateHeight(wrapper, resizeTimer, wrapper.offsetHeight, scroller.offsetHeight, () => {
        wrapper.style.height = '';
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reacts to a requested page-size change only.
  }, [perPage]);

  const previousShownPerPage = useRef(shownPerPage);
  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    const scroller = scrollerRef.current;
    if (!wrapper || !scroller) return;
    const grew = shownPerPage > previousShownPerPage.current;
    previousShownPerPage.current = shownPerPage;
    scroller.scrollLeft = pageOffset(scroller, activePage);
    if (grew && canAnimateResize()) {
      // Runs before paint, so the regrouped 2x2 page never shows at full height first.
      animateHeight(wrapper, resizeTimer, firstRowHeight(scroller, activePage), scroller.offsetHeight, () => {
        wrapper.style.height = '';
      });
    } else {
      // A collapse just regrouped into one row, which fits the clipped height exactly.
      wrapper.style.height = '';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on a regroup; following activePage would fight the user's swipe.
  }, [shownPerPage]);

  useEffect(() => () => window.clearTimeout(resizeTimer.current), []);

  const handleScroll = () => {
    const el = scrollerRef.current;
    if (!el || el.clientWidth === 0) return;
    setActivePage(Math.min(pages.length - 1, Math.round(el.scrollLeft / (el.clientWidth + PAGE_GAP_PX))));
  };

  const goToPage = (index: number) => {
    const el = scrollerRef.current;
    el?.scrollTo({ left: pageOffset(el, index), behavior: 'smooth' });
  };

  return (
    // xl: the flex chain lets the single card column stretch to the side
    // column's full height, every row sharing it equally (`auto-rows-fr`).
    <div className="xl:flex xl:flex-1 xl:flex-col">
      <div ref={wrapperRef} className="overflow-hidden transition-[height] duration-300 ease-in-out xl:flex xl:flex-1 xl:flex-col">
        <div
          ref={scrollerRef}
          onScroll={handleScroll}
          className={`scrollbar-hide flex snap-x snap-mandatory gap-3 overflow-x-auto md:grid md:snap-none md:overflow-visible ${gridClassName}`}
        >
          {pages.map((page, i) => (
            <div key={i} className="grid w-full shrink-0 snap-start grid-cols-2 gap-3 md:contents">
              {page}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-1 flex justify-center md:hidden">
        {pages.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => goToPage(i)}
            aria-label={`Show summary page ${i + 1} of ${pages.length}`}
            aria-current={activePage === i}
            className="p-1.5"
          >
            <span
              className={`block h-1.5 w-1.5 rounded-full transition-colors ${activePage === i ? 'bg-[#62A0EA] admin-light:bg-[#1A5FB4]' : 'bg-slate-600 admin-light:bg-slate-300'}`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
