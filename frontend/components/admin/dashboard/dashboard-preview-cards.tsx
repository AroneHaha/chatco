import Link from "next/link";
import { useEffect, useRef } from "react";
import { ArrowUpRight, ImageIcon, UserRound } from "lucide-react";
import { formatDateTime } from "@/lib/utils/format";
import { getActivityLogCategoryLabel } from "@/lib/shared/services/activity-log.service";
import type { VehicleItem, RecentClaim, UserItem, NotificationItem, ActivityLogItem, DashboardActivityFeed } from "@/app/(admin)/admin-dashboard/data/dashboard-data";

function formatCategory(category: string): string {
  return category.toLowerCase().split("_").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

function claimStatusLabel(status: string): string {
  switch (status.toUpperCase()) {
    case "PENDING": return "Awaiting follow-up";
    case "APPROVED": return "Approved for pickup";
    case "REJECTED": return "Claim rejected";
    default: return "Claim update";
  }
}

function claimStatusTextClass(status: string): string {
  switch (status.toUpperCase()) {
    case "PENDING": return "text-amber-300 admin-light:text-amber-700";
    case "APPROVED": return "text-emerald-300 admin-light:text-emerald-700";
    case "REJECTED": return "text-red-300 admin-light:text-red-700";
    default: return "text-white/50 admin-light:text-slate-500";
  }
}

function claimStatusDotClass(status: string): string {
  switch (status.toUpperCase()) {
    case "PENDING": return "bg-amber-300 admin-light:bg-amber-500";
    case "APPROVED": return "bg-emerald-300 admin-light:bg-emerald-500";
    case "REJECTED": return "bg-red-300 admin-light:bg-red-500";
    default: return "bg-white/40 admin-light:bg-slate-400";
  }
}

function itemStatusLabel(status: string): string {
  switch (status.toUpperCase()) {
    case "AVAILABLE": return "Reported";
    case "CLAIMED": return "Claimed";
    case "APPROVED": return "Approved";
    case "RELEASED": return "Returned";
    case "CLOSED": return "Closed";
    case "EXPIRED": return "Expired";
    default: return "Status unavailable";
  }
}

// Opens the notification's detail in the Updates Center (and marks it read).
function notificationHref(id: string): string {
  return `/announcements?updateId=${encodeURIComponent(id)}`;
}

// Time for today's notifications, date for anything older (Philippine time).
function formatNotificationTime(iso: string): string {
  if (!iso) return "";
  const stamp = formatDateTime(iso, "Asia/Manila");
  return stamp.date === formatDateTime(new Date().toISOString(), "Asia/Manila").date ? stamp.time : stamp.date;
}

interface DashboardPreviewCardsProps {
  activeVehicles: string;
  recentVehicles: VehicleItem[];
  recentClaims: RecentClaim[];
  recentUsers: UserItem[];
  recentNotifications: NotificationItem[];
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

export function DashboardPreviewCards({ activeVehicles, recentVehicles, recentClaims, recentUsers, recentNotifications, recentActivityLogs, activityFeed }: DashboardPreviewCardsProps) {
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
  const [latestNotification, ...olderNotifications] = recentNotifications;
  // These are previews of three recent accounts/items, not system-wide totals.
  const roleCounts = Array.from(new Set(recentUsers.map((user) => user.role))).map((role) => ({
    role, count: recentUsers.filter((user) => user.role === role).length,
  }));
  const [featuredClaim, ...otherClaims] = recentClaims;

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
                          <span className={`min-w-0 break-words ${index === 0 ? "text-[#62A0EA] admin-light:text-[#1A5FB4]" : "text-white/45 admin-light:text-slate-500"}`}>{getActivityLogCategoryLabel(log.category)}</span>
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
        <section aria-label="Recent notifications" className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-[#1E2D45] admin-light:border-[#E2E8F0] bg-[#131C2E] admin-light:bg-white md:col-span-2 xl:col-span-5">
          <PreviewHeader title="Notifications" href="/announcements?tab=notifications" />
          {latestNotification ? (
            <div className="flex flex-1 flex-col px-5 pb-4">
              <Link href={notificationHref(latestNotification.id)} className="group -mx-2 mt-3 block rounded-md px-2 py-3 transition-colors hover:bg-[#1A2540]/60 admin-light:hover:bg-[#F8FAFC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#62A0EA] admin-light:focus-visible:outline-[#1A5FB4]">
                <div className="flex items-baseline justify-between gap-3 text-[10px]">
                  <span className="font-medium uppercase tracking-wider text-white/40 admin-light:text-slate-500">Latest</span>
                  <time dateTime={latestNotification.createdAt} className="tabular-nums text-white/45 admin-light:text-slate-500">{formatNotificationTime(latestNotification.createdAt)}</time>
                </div>
                <p className={`mt-2 line-clamp-2 break-words text-lg leading-7 tracking-tight ${latestNotification.isRead ? "font-medium text-white/80 admin-light:text-slate-700" : "font-semibold text-white admin-light:text-slate-900"}`} title={latestNotification.title}>{latestNotification.title}</p>
                {latestNotification.message && <p className="mt-1.5 line-clamp-2 break-words text-xs leading-5 text-white/55 admin-light:text-slate-600">{latestNotification.message}</p>}
                <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
                  <span className="text-white/45 admin-light:text-slate-500">{formatCategory(latestNotification.type)}</span>
                  <span className={latestNotification.isRead ? "text-white/35 admin-light:text-slate-400" : "text-[#62A0EA] admin-light:text-[#1A5FB4]"}>{latestNotification.isRead ? "Read" : "Unread"}</span>
                </p>
              </Link>
              {olderNotifications.length > 0 && (
                <ul className="mt-2 divide-y divide-[#1E2D45] admin-light:divide-[#E2E8F0] border-t border-[#1E2D45] admin-light:border-[#E2E8F0]">
                  {olderNotifications.map((notification) => (
                    <li key={notification.id}>
                      <Link href={notificationHref(notification.id)} className="-mx-2 grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 rounded-md px-2 py-2.5 transition-colors hover:bg-[#1A2540]/60 admin-light:hover:bg-[#F8FAFC] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#62A0EA] admin-light:focus-visible:outline-[#1A5FB4]">
                        <span className="min-w-0">
                          <span className={`block truncate text-xs leading-5 ${notification.isRead ? "text-white/65 admin-light:text-slate-600" : "font-medium text-white/90 admin-light:text-slate-900"}`} title={notification.title}>
                            {!notification.isRead && <span className="sr-only">Unread: </span>}{notification.title}
                          </span>
                          <span className="mt-0.5 block truncate text-[10px] text-white/40 admin-light:text-slate-500">{formatCategory(notification.type)}</span>
                        </span>
                        <span className="flex items-center gap-2 text-[10px] tabular-nums text-white/45 admin-light:text-slate-500">
                          {!notification.isRead && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#62A0EA] admin-light:bg-[#1A5FB4]" />}
                          <time dateTime={notification.createdAt}>{formatNotificationTime(notification.createdAt)}</time>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : <p className="px-5 py-6 text-xs text-white/45 admin-light:text-slate-500">No notifications yet.</p>}
        </section>

        <section aria-label="Recent lost and found claims" className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-[#1E2D45] admin-light:border-[#E2E8F0] bg-[#131C2E] admin-light:bg-white xl:col-span-4">
          <PreviewHeader title="Lost & Found" href="/lost-found" />
          {featuredClaim ? (
            <div className="flex flex-1 flex-col px-5 pb-5">
              <div className="grid grid-cols-[minmax(0,1fr)_6rem] items-center gap-4 py-5">
                <div className="min-w-0">
                  <p className={`text-[10px] font-medium uppercase tracking-wider ${claimStatusTextClass(featuredClaim.status)}`}>{claimStatusLabel(featuredClaim.status)}</p>
                  <p className="mt-3 line-clamp-3 break-words text-base font-medium leading-6 text-white/90 admin-light:text-slate-800" title={featuredClaim.item}>{featuredClaim.item}</p>
                  <p className="mt-3 truncate text-[11px] text-[#8CB9F0] admin-light:text-[#1A5FB4]" title={`Claimant: ${featuredClaim.claimant}`}>Claimant: {featuredClaim.claimant}</p>
                  <p className="mt-1 text-[10px] text-white/50 admin-light:text-slate-500">{itemStatusLabel(featuredClaim.itemStatus)}</p>
                  <p className="mt-1 text-[10px] text-white/40 admin-light:text-slate-500">{formatNotificationTime(featuredClaim.createdAt)}</p>
                </div>
                <div className="flex aspect-square w-24 items-center justify-center overflow-hidden rounded-md border border-[#1E2D45] admin-light:border-[#E2E8F0] bg-[#0B1628] admin-light:bg-[#F1F5F9]">
                  {featuredClaim.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={featuredClaim.imageUrl} alt={`Photo of ${featuredClaim.item}`} className="h-full w-full object-cover" />
                  ) : <ImageIcon className="h-6 w-6 text-white/25 admin-light:text-slate-400" aria-hidden="true" />}
                </div>
              </div>
              {otherClaims.length > 0 && (
                <ul className="mt-1 space-y-3 border-t border-[#1E2D45] admin-light:border-[#E2E8F0] pt-4">
                  {otherClaims.map((claim) => (
                    <li key={claim.id} className="flex items-start gap-2">
                      <span aria-hidden="true" className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${claimStatusDotClass(claim.status)}`} />
                      <div className="min-w-0">
                        <p className="line-clamp-1 break-words text-xs leading-5 text-white/75 admin-light:text-slate-700" title={claim.item}>{claim.item}</p>
                        <p className="mt-0.5 truncate text-[10px] text-white/45 admin-light:text-slate-500" title={`Claimant: ${claim.claimant}`}>{claim.claimant} <span aria-hidden="true">·</span> <span className={claimStatusTextClass(claim.status)}>{claimStatusLabel(claim.status)}</span></p>
                      </div>
                      <time className="ml-auto shrink-0 pt-0.5 text-[10px] tabular-nums text-white/35 admin-light:text-slate-400">{formatNotificationTime(claim.createdAt)}</time>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : <p className="px-5 py-6 text-xs text-white/45 admin-light:text-slate-500">No recent claims.</p>}
        </section>

        <section aria-label="Recent users" className="min-w-0 overflow-hidden rounded-lg border border-[#1E2D45] admin-light:border-[#E2E8F0] bg-[#131C2E] admin-light:bg-white xl:col-span-3">
          <PreviewHeader title="Users" href="/users" />
          {recentUsers.length > 0 ? (
            <div className="px-5 pb-5">
              <div className="mt-5 flex items-end justify-between gap-3 border-b border-[#1E2D45] admin-light:border-[#E2E8F0] pb-4">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-white/40 admin-light:text-slate-500">Newest accounts</p>
                  <p className="mt-1 flex items-baseline gap-2">
                    <span className="text-3xl font-semibold leading-none text-white/95 admin-light:text-slate-900 tabular-nums">{recentUsers.length.toString().padStart(2, "0")}</span>
                    <span className="text-[11px] text-white/50 admin-light:text-slate-500">recently joined</span>
                  </p>
                </div>
                <div className="flex max-w-[48%] flex-wrap justify-end gap-x-2 gap-y-1" aria-label="Roles in recent accounts">
                  {roleCounts.map(({ role, count }) => (
                    <span key={role} className="text-[10px] text-white/50 admin-light:text-slate-500">{count} {role}{count === 1 ? "" : "s"}</span>
                  ))}
                </div>
              </div>
              <ul className="divide-y divide-[#1E2D45] admin-light:divide-[#E2E8F0]">
                {recentUsers.map((user, index) => (
                  <li key={`${user.name}-${user.createdAt}-${index}`} className="flex min-w-0 items-center gap-3 py-3">
                    <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#2A3A55] bg-[#1A2540] text-white/45 admin-light:border-[#D7E0EB] admin-light:bg-[#F1F5F9] admin-light:text-slate-400">
                      <UserRound className="h-[18px] w-[18px]" aria-hidden="true" />
                      {user.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={user.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" onError={(event) => event.currentTarget.remove()} />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-white/90 admin-light:text-slate-800" title={user.name}>{user.name}</p>
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
