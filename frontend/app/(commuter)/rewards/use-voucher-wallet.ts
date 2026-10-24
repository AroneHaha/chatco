// app/(commuter)/rewards/use-voucher-wallet.ts
//
// Infinite-scroll state for the voucher wallet's Available / Used / Expired
// tabs. Each tab keeps its own loaded pages and cursor, so switching tabs
// doesn't refetch what was already loaded. `resetKey` changes whenever the
// commuter's set of usable vouchers changes (a voucher earned, used or
// expired); every tab is then reloaded from the first page.

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchWalletPage } from "@/lib/commuter/services/voucher-wallet.service";
import type { VoucherTab, WalletVoucher } from "./types";

interface TabPages {
  items: WalletVoucher[];
  nextCursor: string | null;
  /** The first page has arrived (or failed); until then the tab shows a skeleton. */
  loaded: boolean;
  loadingMore: boolean;
  error: string | null;
}

const EMPTY: TabPages = { items: [], nextCursor: null, loaded: false, loadingMore: false, error: null };
const EMPTY_TABS: Record<VoucherTab, TabPages> = { available: EMPTY, used: EMPTY, expired: EMPTY };

export function useVoucherWallet(tab: VoucherTab, resetKey: string) {
  const [tabs, setTabs] = useState(EMPTY_TABS);
  // Reset during render (not in an effect) so the stale list is never painted.
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (resetKey !== prevResetKey) {
    setPrevResetKey(resetKey);
    setTabs(EMPTY_TABS);
  }

  // Bumped on reset so a response for the old list can't land in the new one.
  const generationRef = useRef(0);
  const inFlightRef = useRef<Partial<Record<VoucherTab, AbortController>>>({});
  useEffect(() => {
    generationRef.current += 1;
    Object.values(inFlightRef.current).forEach((controller) => controller?.abort());
    inFlightRef.current = {};
  }, [resetKey]);
  useEffect(() => () => Object.values(inFlightRef.current).forEach((controller) => controller?.abort()), []);

  const load = useCallback(async (target: VoucherTab, cursor: string | null) => {
    if (inFlightRef.current[target]) return;
    const controller = new AbortController();
    inFlightRef.current[target] = controller;
    const generation = generationRef.current;
    if (cursor) setTabs((prev) => ({ ...prev, [target]: { ...prev[target], loadingMore: true, error: null } }));

    try {
      const page = await fetchWalletPage(target, cursor, controller.signal);
      if (generation !== generationRef.current) return;
      setTabs((prev) => {
        const current = prev[target];
        // Keyset pages can't overlap, but a voucher whose status changed
        // between pages must not render twice.
        const known = new Set(current.items.map((item) => item.id));
        return {
          ...prev,
          [target]: {
            items: cursor ? [...current.items, ...page.vouchers.filter((item) => !known.has(item.id))] : page.vouchers,
            nextCursor: page.nextCursor,
            loaded: true,
            loadingMore: false,
            error: null,
          },
        };
      });
    } catch (error) {
      if (controller.signal.aborted || generation !== generationRef.current) return;
      const message = error instanceof Error ? error.message : "Unable to load your vouchers.";
      setTabs((prev) => ({ ...prev, [target]: { ...prev[target], loaded: true, loadingMore: false, error: message } }));
    } finally {
      if (inFlightRef.current[target] === controller) delete inFlightRef.current[target];
    }
  }, []);

  const current = tabs[tab];

  // First page of the visible tab, on first view and after a reset.
  useEffect(() => {
    if (!current.loaded) void load(tab, null);
  }, [tab, current.loaded, load]);

  const loadMore = useCallback(() => {
    if (current.nextCursor && !current.loadingMore && !current.error) void load(tab, current.nextCursor);
  }, [tab, current.nextCursor, current.loadingMore, current.error, load]);

  /** Retry whatever failed: the first page, or the next one. */
  const retry = useCallback(() => {
    if (current.items.length === 0) {
      setTabs((prev) => ({ ...prev, [tab]: EMPTY }));
    } else if (current.nextCursor) {
      void load(tab, current.nextCursor);
    }
  }, [tab, current.items.length, current.nextCursor, load]);

  return {
    items: current.items,
    isLoading: !current.loaded,
    isLoadingMore: current.loadingMore,
    hasMore: current.nextCursor !== null,
    error: current.error,
    loadMore,
    retry,
  };
}
