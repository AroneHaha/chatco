import Link from "next/link";
import { useEffect, useRef } from "react";
import { ArrowUpRight } from "lucide-react";
import { formatDateTime } from "@/lib/utils/format";
import type { VehicleItem, LostFoundItem, UserItem, AnnouncementItem, ActivityLogItem, DashboardActivityFeed } from "@/app/(admin)/admin-dashboard/data/dashboard-data";

function formatCategory(category: string): string {
  return category.toLowerCase().split("_").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

interface DashboardPreviewCardsProps {
  activeVehicles: string;
  recentVehicles: VehicleItem[];
  recentLostFound: LostFoundItem[];
  recentUsers: UserItem[];
  recentAnnouncements: AnnouncementItem[];
  recentActivityLogs: ActivityLogItem[];
  activityFeed: DashboardActivityFeed;
}

function PreviewHeader({ title, href, detail }: { title: string; href: string; detail?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 pt-5">
      <h3 className="text-sm font-semibold text-white admin-light:text-slate-900">{title}{detail && <span className="ml-2 text-[10px] font-normal text-white/45 admin-light:text-slate-500">{detail}</span>}</h3>
      <Link href={href} aria-label={`View all ${title.toLowerCase()}`} className="flex shrink-0 items-center gap-1 text-[11px] text-[#62A0EA] admin-light:text-[#1A5FB4] transition-colors hover:text-[#99C1F1] admin-light:hover:text-[#164A8F] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#62A0EA] admin-light:focus-visible:outline-[#1A5FB4]">
        View all <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
    </div>
  );
}

export function DashboardPreviewCards({ activeVehicles, recentVehicles, recentLostFound, recentUsers, recentAnnouncements, recentActivityLogs, activityFeed }: DashboardPreviewCardsProps) {
  const activityScrollRef = useRef<HTMLDivElement>(null);
  const { isLoading: isLoadingActivity, hasMore: hasMoreActivity, error: activityError, loadMore: loadMoreActivity } = activityFeed;
  useEffect(() => {
    const list = activityScrollRef.current;
    if (!list || !hasMoreActivity || isLoadingActivity || activityError) return;
    // A short page or a larger viewport can leave no scrollbar. Fetch enough
    // to fill the pane, rather than making further pages unreachable.
    const fillPane = () => {
      if (list.clientHeight > 0 && list.scrollHeight <= list.clientHeight + 1) void loadMoreActivity();
    };
    fillPane();
    const observer = new ResizeObserver(fillPane);
    observer.observe(list);
    return () => observer.disconnect();
  }, [recentActivityLogs, hasMoreActivity, isLoadingActivity, activityError, loadMoreActivity]);
  const [latestAnnouncement, ...olderAnnouncements] = recentAnnouncements;
  // These are previews of three recent accounts/items, not system-wide totals.
  const roleCounts = Array.from(new Set(recentUsers.map((user) => user.role))).map((role) => ({
    role, count: recentUsers.filter((user) => user.role === role).length,
  }));
  const featuredItemIndex = Math.max(0, recentLostFound.findIndex((item) => item.status !== "Returned"));
  const featuredItem = recentLostFound[featuredItemIndex];
  const otherItems = recentLostFound.filter((_, index) => index !== featuredItemIndex);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <section aria-label="Recent vehicles" className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-[#1E2D45] admin-light:border-[#E2E8F0] bg-[#131C2E] admin-light:bg-white lg:col-span-5">
          <PreviewHeader title="Vehicles" href="/vehicles" />
          <div className="flex flex-1 flex-col px-5 pb-5">
            <div className="flex flex-wrap items-end justify-between gap-4 py-6">
              <div>
                <p className="text-5xl font-semibold leading-none tracking-tight text-white admin-light:text-slate-900 tabular-nums">{activeVehicles}</p>
                <p className="mt-2 text-xs text-white/60 admin-light:text-slate-600">Active vehicles across the fleet</p>
              </div>
              <Link href="/monitoring" className="flex items-center gap-1 text-xs text-[#62A0EA] admin-light:text-[#1A5FB4] hover:text-[#99C1F1] admin-light:hover:text-[#164A8F] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#62A0EA] admin-light:focus-visible:outline-[#1A5FB4]">
                Open tracking <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
            <div className="mt-auto border-t border-[#1E2D45] admin-light:border-[#E2E8F0] pt-4">
              <p className="mb-3 text-[10px] font-medium uppercase tracking-wider text-white/40 admin-light:text-slate-500">Recent vehicles</p>
              {recentVehicles.length === 0 ? <p className="text-xs text-white/45 admin-light:text-slate-500">No recent vehicles.</p> : (
                <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {recentVehicles.map((vehicle, index) => (
                    <li key={`${vehicle.unit}-${index}`} className="min-w-0 border-l-2 border-[#2A3A55] admin-light:border-[#CBD5E1] pl-3">
                      <p className="truncate text-sm font-semibold text-white/90 admin-light:text-slate-800" title={vehicle.unit}>{vehicle.unit}</p>
                      <p className="mt-1 truncate text-[11px] text-white/45 admin-light:text-slate-500" title={vehicle.driver}>{vehicle.driver}</p>
                      <p className={`mt-2 text-[11px] ${vehicle.status === "Active" ? "text-[#62A0EA] admin-light:text-[#1A5FB4]" : "text-amber-300 admin-light:text-amber-700"}`}>{vehicle.status}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        <section aria-label="Recent activity logs" className="min-h-0 min-w-0 overflow-hidden rounded-lg border border-[#1E2D45] admin-light:border-[#E2E8F0] bg-[#131C2E] admin-light:bg-white lg:relative lg:col-span-7">
          {/* Let Vehicles set the desktop row height; the timeline fills that
              space and scrolls rather than stretching both cards. */}
          <div className="flex min-h-0 flex-col lg:absolute lg:inset-0">
            <PreviewHeader title="Activity Logs" href="/activity-logs" detail="Today" />
            <div ref={activityScrollRef} role="region" aria-label="Recent activity timeline" aria-busy={isLoadingActivity} tabIndex={0} onScroll={(event) => {
              const list = event.currentTarget;
              if (hasMoreActivity && !isLoadingActivity && !activityError && list.scrollHeight - list.scrollTop - list.clientHeight <= 48) void loadMoreActivity();
            }} className="scrollbar-themed min-h-0 max-h-80 overflow-y-auto overscroll-contain px-5 py-4 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#62A0EA] admin-light:focus-visible:outline-[#1A5FB4] lg:max-h-none lg:flex-1">
              <ol className="space-y-2">
                {recentActivityLogs.map((log, index) => {
                  const timestamp = formatDateTime(log.createdAt, "Asia/Manila");
                  return (
                    <li key={log.id} className={`relative grid grid-cols-1 gap-x-5 gap-y-2 overflow-hidden rounded-md py-2 pl-6 pr-3 sm:grid-cols-[minmax(0,1fr)_9rem] ${index === 0 ? "bg-[#62A0EA]/10 admin-light:bg-[#1A5FB4]/10" : index % 2 === 1 ? "bg-[#1A2540]/45 admin-light:bg-[#F1F5F9]" : ""}`}>
                      {index < recentActivityLogs.length - 1 && <span aria-hidden="true" className="absolute top-6 bottom-2 left-[11px] border-l border-dashed border-[#40516D] admin-light:border-[#CBD5E1]" />}
                      <span aria-hidden="true" className={`absolute top-4 left-[7px] h-[9px] w-[9px] rounded-full border ${index === 0 ? "border-[#62A0EA] admin-light:border-[#1A5FB4] bg-[#62A0EA] admin-light:bg-[#1A5FB4]" : "border-[#64748B] admin-light:border-[#94A3B8] bg-[#131C2E] admin-light:bg-white"}`} />
                      <p className={`min-w-0 break-words text-sm leading-6 ${index === 0 ? "font-medium text-white admin-light:text-slate-900" : "text-white/85 admin-light:text-slate-800"}`}>{log.description}</p>
                      <div className="min-w-0 text-xs leading-5 sm:border-l sm:border-[#2A3A55] admin-light:sm:border-[#CBD5E1] sm:pl-3 sm:text-right">
                        <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 sm:justify-end">
                          <span className={`min-w-0 break-words ${index === 0 ? "text-[#62A0EA] admin-light:text-[#1A5FB4]" : "text-white/45 admin-light:text-slate-500"}`}>{formatCategory(log.category)}</span>
                          <time dateTime={log.createdAt} title={`${timestamp.full} (Philippine time)`} className={`whitespace-nowrap tabular-nums ${index === 0 ? "font-medium text-[#62A0EA] admin-light:text-[#1A5FB4]" : "text-white/60 admin-light:text-slate-600"}`}>{timestamp.time}</time>
                        </p>
                        <p className="mt-1 break-words text-white/60 admin-light:text-slate-600">{log.by}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
              {isLoadingActivity && <p role="status" className="mt-3 text-sm text-white/45 admin-light:text-slate-500">Loading activity…</p>}
              {activityError && <div role="alert" className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                <p className="text-white/60 admin-light:text-slate-600">{activityError}</p>
                <button type="button" onClick={() => void loadMoreActivity()} className="text-[#62A0EA] admin-light:text-[#1A5FB4] hover:text-[#99C1F1] admin-light:hover:text-[#164A8F] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#62A0EA] admin-light:focus-visible:outline-[#1A5FB4]">Try again</button>
              </div>}
              {!isLoadingActivity && !activityError && recentActivityLogs.length === 0 && <p className="text-sm text-white/45 admin-light:text-slate-500">No activity today.</p>}
              {!isLoadingActivity && !activityError && !hasMoreActivity && recentActivityLogs.length > 0 && <p className="mt-4 text-xs text-white/35 admin-light:text-slate-400">No more activity today.</p>}
            </div>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
        <section aria-label="Recent announcements" className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-[#1E2D45] admin-light:border-[#E2E8F0] bg-[#131C2E] admin-light:bg-white md:col-span-2 xl:col-span-5">
          <PreviewHeader title="Announcements" href="/announcements" />
          {latestAnnouncement ? (
            <div className="flex flex-1 flex-col px-5 pb-5">
              <div className="py-5">
                <p className="text-[10px] font-medium uppercase tracking-wider text-white/40 admin-light:text-slate-500">Latest announcement</p>
                <p className="mt-3 line-clamp-3 break-words text-lg font-medium leading-7 tracking-tight text-white/90 admin-light:text-slate-800" title={latestAnnouncement.title}>{latestAnnouncement.title}</p>
                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
                  <span className="text-white/45 admin-light:text-slate-500">{formatCategory(latestAnnouncement.type)}</span>
                  <span className={latestAnnouncement.status === "Active" ? "text-[#62A0EA] admin-light:text-[#1A5FB4]" : "text-white/35 admin-light:text-slate-400"}>{latestAnnouncement.status}</span>
                </div>
              </div>
              {olderAnnouncements.length > 0 && (
                <div className="mt-auto border-t border-[#1E2D45] admin-light:border-[#E2E8F0] pt-3">
                  <p className="text-[10px] text-white/40 admin-light:text-slate-500">Also recent</p>
                  <ul className="mt-2 space-y-2">
                    {olderAnnouncements.map((announcement, index) => (
                      <li key={`${announcement.title}-${index}`} className="flex items-start justify-between gap-3 text-[11px] leading-5">
                        <span className="min-w-0 line-clamp-2 break-words text-white/65 admin-light:text-slate-600" title={announcement.title}>{announcement.title}</span>
                        <span className={`shrink-0 ${announcement.status === "Active" ? "text-[#62A0EA] admin-light:text-[#1A5FB4]" : "text-white/35 admin-light:text-slate-400"}`}>{announcement.status}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : <p className="px-5 py-6 text-xs text-white/45 admin-light:text-slate-500">No recent announcements.</p>}
        </section>

        <section aria-label="Recent lost and found items" className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-[#1E2D45] admin-light:border-[#E2E8F0] bg-[#131C2E] admin-light:bg-white xl:col-span-4">
          <PreviewHeader title="Lost & Found" href="/lost-found" />
          {featuredItem ? (
            <div className="flex flex-1 flex-col px-5 pb-5">
              <div className="py-5">
                <p className={`text-[10px] font-medium uppercase tracking-wider ${featuredItem.status === "Returned" ? "text-white/40 admin-light:text-slate-500" : "text-amber-300 admin-light:text-amber-700"}`}>{featuredItem.status === "Returned" ? "Recently returned" : "Awaiting follow-up"}</p>
                <p className="mt-3 line-clamp-3 break-words text-base font-medium leading-6 text-white/90 admin-light:text-slate-800" title={featuredItem.item}>{featuredItem.item}</p>
                <p className="mt-3 text-[11px] text-white/50 admin-light:text-slate-500">{featuredItem.status}</p>
              </div>
              {otherItems.length > 0 && (
                <ul className="mt-auto space-y-3 border-t border-[#1E2D45] admin-light:border-[#E2E8F0] pt-4">
                  {otherItems.map((item, index) => (
                    <li key={`${item.item}-${index}`} className="flex items-start gap-2">
                      <span aria-hidden="true" className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${item.status === "Returned" ? "bg-[#62A0EA] admin-light:bg-[#1A5FB4]" : "bg-amber-300 admin-light:bg-amber-500"}`} />
                      <div className="min-w-0">
                        <p className="line-clamp-2 break-words text-xs leading-5 text-white/75 admin-light:text-slate-700" title={item.item}>{item.item}</p>
                        <p className="mt-0.5 text-[10px] text-white/40 admin-light:text-slate-500">{item.status}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : <p className="px-5 py-6 text-xs text-white/45 admin-light:text-slate-500">No recent lost items.</p>}
        </section>

        <section aria-label="Recent users" className="min-w-0 overflow-hidden rounded-lg border border-[#1E2D45] admin-light:border-[#E2E8F0] bg-[#131C2E] admin-light:bg-white xl:col-span-3">
          <PreviewHeader title="Users" href="/users" />
          {recentUsers.length > 0 ? (
            <div className="px-5 pb-5">
              <p className="mt-5 text-[10px] font-medium uppercase tracking-wider text-white/40 admin-light:text-slate-500">Recently joined</p>
              <dl className="my-4 grid grid-cols-3 gap-2" aria-label="Roles of recent accounts">
                {roleCounts.map(({ role, count }) => (
                  <div key={role} className="min-w-0">
                    <dd className="text-2xl font-semibold text-white/90 admin-light:text-slate-800 tabular-nums">{count}</dd>
                    <dt className="mt-1 break-words text-[10px] text-white/45 admin-light:text-slate-500">{role}</dt>
                  </div>
                ))}
              </dl>
              <ul className="space-y-3 border-t border-[#1E2D45] admin-light:border-[#E2E8F0] pt-4">
                {recentUsers.map((user, index) => (
                  <li key={`${user.name}-${index}`} className="flex min-w-0 items-center gap-3">
                    <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#1A2540] admin-light:bg-[#EEF2F7] text-[10px] font-medium text-white/60 admin-light:text-slate-600">{user.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span>
                    <div className="min-w-0">
                      <p className="truncate text-xs text-white/85 admin-light:text-slate-800" title={user.name}>{user.name}</p>
                      <p className="mt-0.5 text-[10px] text-white/40 admin-light:text-slate-500">{user.role} <span aria-hidden="true">·</span> {user.status}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : <p className="px-5 py-6 text-xs text-white/45 admin-light:text-slate-500">No recent users.</p>}
        </section>
      </div>
    </div>
  );
}
