// components/admin/vehicles/personnel-table.tsx
"use client";

import { useState } from "react";
import { DataTable } from "@/components/admin/ui/data-table";
import { TablePagination } from "@/components/admin/ui/table-pagination";
import { SearchBar } from "@/components/admin/ui/search-bar";
import { ChevronDown, Edit, Eye, IdCard, Star, Trash, Plus, UserPlus } from "lucide-react";
import { formatLogDate } from "@/lib/utils/format";
import type { PageMeta, Personnel, PersonnelRoleFilter, PersonnelStatusFilter } from "@/app/(admin)/vehicles/data/vehicles-data";
import { DriverDetailModal } from "@/components/admin/vehicles/driver-detail-modal";
import { ConductorDetailModal } from "@/components/admin/vehicles/conductor-detail-modal";
import { FeedbackModal, type FeedbackModalStaff } from "@/components/admin/users/feedback-modal";
import { SkeletonTable } from "@/components/admin/ui/skeleton";
import { RowActionsMenu } from "@/components/admin/ui/row-actions-menu";
import { UserAvatar } from "@/components/admin/ui/user-avatar";

interface PersonnelTableProps {
  personnel: Personnel[];
  searchQuery: string;
  roleFilter: PersonnelRoleFilter;
  statusFilter: PersonnelStatusFilter;
  page: PageMeta;
  onPageChange: (page: number) => void;
  onSearchChange: (value: string) => void;
  onRoleFilterChange: (role: PersonnelRoleFilter) => void;
  onStatusFilterChange: (status: PersonnelStatusFilter) => void;
  onAddDriver: () => void;
  onCreateConductor: () => void;
  onEdit: (personnel: Personnel) => void;
  onDelete: (personnel: Personnel) => void;
  /** Called after an action in a detail modal changed the record (e.g. a
   *  conductor was disabled), so the list can show the new status. */
  onPersonnelChanged?: () => void;
  isLoading?: boolean;
  // Kept for backwards compatibility — no longer used by the new detail modals
  // (they fetch their own data from the API). Will be removed in a future cleanup.
  driverProfiles?: Record<string, import("@/app/(admin)/vehicles/data/vehicles-data").DriverProfile>;
  driverRatings?: Record<string, import("@/app/(admin)/vehicles/data/vehicles-data").DriverRating[]>;
}

export function PersonnelTable({
  personnel,
  searchQuery,
  roleFilter,
  statusFilter,
  page,
  onPageChange,
  onSearchChange,
  onRoleFilterChange,
  onStatusFilterChange,
  onAddDriver,
  onCreateConductor,
  onEdit,
  onDelete,
  onPersonnelChanged,
  isLoading = false,
}: PersonnelTableProps) {
  const [selectedDriver, setSelectedDriver] = useState<Personnel | null>(null);
  const [selectedConductor, setSelectedConductor] = useState<Personnel | null>(null);
  const [feedbackStaff, setFeedbackStaff] = useState<FeedbackModalStaff | null>(null);

  // The detail modals hold the conductor's Reset Credentials / Disable
  // Account actions. Row double-click still opens them; the explicit button
  // below makes them reachable without knowing about the double-click.
  const openDetails = (p: Personnel) => {
    if (p.status === "TERMINATED" || p.status === "RESIGNED") return;
    if (p.role === "Driver") {
      setSelectedDriver(p);
    } else if (p.role === "Conductor") {
      setSelectedConductor(p);
    }
  };

  const columns = [
    {
      key: "name",
      label: "Personnel",
      cellClassName: "min-w-0",
      render: (value: string, row: Personnel) => (
        <div className="flex items-center gap-3 min-w-0">
          <UserAvatar src={row.profilePic} alt={`Profile photo of ${value}`} className="h-9 w-9" iconClassName="h-4 w-4" sizes="36px" />
          <p className="min-w-0 truncate font-medium text-white admin-light:text-slate-900">{value}</p>
        </div>
      ),
    },
    {
      key: "role",
      label: "Role",
      // Role is a category, not an alert, so it's a quiet dot + label (same
      // treatment as the vehicle table's "Operating"). The dot keeps the
      // blue/amber distinction between drivers and conductors.
      render: (value: string) => {
        const isDriver = value === "Driver";
        return (
          <span className="inline-flex items-center gap-2 text-sm text-slate-300 admin-light:text-slate-700">
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${isDriver ? "bg-[#62A0EA] admin-light:bg-[#1A5FB4]" : "bg-amber-400"}`}
            />
            {value}
          </span>
        );
      },
    },
    { key: "contact", label: "Contact", cellClassName: "truncate" },
    {
      key: "birthday",
      label: "Birthdate",
      cellClassName: "truncate",
      // Local midnight so a date-only value never shifts a day across timezones.
      render: (value: string | null) =>
        value ? formatLogDate(`${value}T00:00:00`) : <span className="text-slate-500">Not recorded</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (_: unknown, row: Personnel) => {
        const isActive = row.status === "ACTIVE";
        return (
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                isActive ? "bg-emerald-400" : row.status === "TERMINATED" ? "bg-red-400" : row.status === "RESIGNED" ? "bg-amber-400" : "bg-slate-600"
              }`}
            />
            <span className={`text-xs font-medium ${isActive ? "text-slate-300 admin-light:text-slate-700" : "text-slate-500"}`}>
              {isActive ? "Active" : row.status === "TERMINATED" ? "Terminated" : row.status === "RESIGNED" ? "Resigned" : "Deactivated"}
            </span>
          </span>
        );
      },
    },
    {
      key: "actions",
      label: "Actions",
      align: "center" as const,
      headerClassName: "w-20",
      cellClassName: "w-20",
      render: (_: unknown, row: Personnel) => row.status === "TERMINATED" || row.status === "RESIGNED" ? (
        <span className="text-xs text-slate-500">Archived</span>
      ) : (
        <RowActionsMenu
          label={`Actions for ${row.name}`}
          menuWidth={200}
          actions={[
            { label: "View Details", icon: Eye, onSelect: () => openDetails(row) },
            {
              label: "Ratings & Feedback",
              icon: Star,
              onSelect: () => setFeedbackStaff({
                id: row.id,
                role: row.role === "Driver" ? "DRIVER" : "CONDUCTOR",
                name: row.name,
              }),
            },
            { label: "Edit", icon: Edit, onSelect: () => onEdit(row) },
            { label: "Remove", icon: Trash, onSelect: () => onDelete(row), tone: "danger" },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 rounded-lg border border-[#1E2D45] admin-light:border-[#E2E8F0] bg-[#111A2B] admin-light:bg-white p-3 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
        <div className="flex shrink-0 flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <SearchBar
              placeholder="Search personnel..."
              value={searchQuery}
              onChange={onSearchChange}
              className="min-w-0 w-full sm:w-56"
            />
            <select
              value={roleFilter}
              onChange={(event) => onRoleFilterChange(event.target.value as PersonnelRoleFilter)}
              aria-label="Filter personnel by role"
              className="h-10 rounded-lg border border-[#1E2D45] admin-light:border-[#E2E8F0] bg-[#0E1628] admin-light:bg-white px-3 text-sm text-slate-200 admin-light:text-slate-700 outline-none transition-colors focus:border-[#62A0EA]/50 admin-light:focus:border-[#1A5FB4]/50 focus:ring-1 focus:ring-[#62A0EA]/30 admin-light:focus:ring-[#1A5FB4]/30"
            >
              <option value="all">All personnel</option>
              <option value="driver">Drivers</option>
              <option value="conductor">Conductors</option>
            </select>
            <select
              value={statusFilter}
              onChange={(event) => onStatusFilterChange(event.target.value as PersonnelStatusFilter)}
              aria-label="Filter personnel by status"
              className="h-10 rounded-lg border border-[#1E2D45] bg-[#0E1628] px-3 text-sm text-slate-200 outline-none transition-colors [color-scheme:dark] focus:border-[#62A0EA]/50 focus:ring-1 focus:ring-[#62A0EA]/30 admin-light:border-[#E2E8F0] admin-light:bg-white admin-light:text-slate-700 admin-light:[color-scheme:light] admin-light:focus:border-[#1A5FB4]/50 admin-light:focus:ring-[#1A5FB4]/30"
            >
              <option value="all">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="TERMINATED">Terminated</option>
              <option value="RESIGNED">Resigned</option>
            </select>
          </div>
          {/* One "Add Personnel" menu instead of a button per role, same
              pattern as User Management's "Register". Each item opens the
              modal its old button did. */}
          <div className="flex sm:items-center [&>button]:w-full sm:[&>button]:w-44">
            <RowActionsMenu
              label="Add personnel"
              menuWidth={232}
              trigger={{
                content: (
                  <>
                    <Plus size={18} aria-hidden="true" />
                    <span>Add Personnel</span>
                    <ChevronDown size={16} aria-hidden="true" />
                  </>
                ),
                className: (isOpen) => `flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#4A8BD4] admin-light:hover:bg-[#164A8F] [&>svg:last-child]:transition-transform ${isOpen ? 'bg-[#4A8BD4] admin-light:bg-[#164A8F] [&>svg:last-child]:rotate-180' : 'bg-[#62A0EA] admin-light:bg-[#1A5FB4]'}`,
              }}
              actions={[
                { label: 'Add driver', hint: 'Driver record and license', icon: IdCard, onSelect: onAddDriver },
                { label: 'Add conductor', hint: 'Conductor with an app login', icon: UserPlus, onSelect: onCreateConductor },
              ]}
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden rounded-lg">
          {isLoading ? (
            <SkeletonTable rows={8} columns={4} />
          ) : (
            <DataTable
              data={personnel}
              columns={columns}
              searchQuery=""
              emptyMessage="No personnel records found."
              height="100%"
              stickyHeader
              allowHorizontalScroll={false}
              tableClassName="table-fixed"
              onRowDoubleClick={(item) => openDetails(item as Personnel)}
            />
          )}
        </div>

        <div className="shrink-0">
          <TablePagination
            currentPage={page.currentPage}
            totalPages={page.totalPages}
            from={page.from}
            to={page.to}
            total={page.total}
            label="personnel"
            onPageChange={onPageChange}
          />
        </div>
      </div>

      {/* Driver Detail Modal — opens on double-click of a Driver row */}
      <DriverDetailModal
        driver={selectedDriver}
        onClose={() => setSelectedDriver(null)}
      />

      {/* Conductor Detail Modal — opens on double-click of a Conductor row */}
      <ConductorDetailModal
        conductor={selectedConductor}
        onClose={() => setSelectedConductor(null)}
        onChanged={onPersonnelChanged}
      />

      {/* Commuter ratings + comments for this driver/conductor */}
      <FeedbackModal
        isOpen={feedbackStaff !== null}
        onClose={() => setFeedbackStaff(null)}
        staff={feedbackStaff}
      />
    </>
  );
}
