// components/admin/users/registration-requests-table.tsx
'use client';

import { GlassCard } from '@/components/admin/ui/glass-card';
import { Badge } from '@/components/admin/ui/badge';
import { Eye } from 'lucide-react';
import type { PendingRequest } from '@/app/(admin)/users/data/users-data';
import type { RegistrationPagination } from '@/lib/admin/services/registration.service';

interface RegistrationRequestsTableProps {
  requests: PendingRequest[];
  onSelectRequest: (request: PendingRequest) => void;
  pagination: RegistrationPagination | null;
  onPageChange: (page: number) => void;
}

export function RegistrationRequestsTable({ requests, onSelectRequest, pagination, onPageChange }: RegistrationRequestsTableProps) {
  return (
    <GlassCard className="p-4">
      <div className="space-y-4">
        {requests.length === 0 ? (
          <p className="text-center text-slate-400 py-8">No pending registration requests.</p>
        ) : (
          requests.map((req) => (
            <button 
              key={req.id} 
              onClick={() => onSelectRequest(req)}
              className="w-full text-left flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-[#0E1628] rounded-md border border-[#1E2D45] gap-4 hover:bg-[#1A2540] transition-colors group"
            >
              <div className="flex items-center space-x-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={req.idImageUrl} alt="ID" className="w-12 h-12 rounded-md object-cover border border-[#1E2D45]" />
                <div>
                  <p className="text-white font-medium group-hover:text-sky-400 transition-colors">{req.name}</p>
                  <p className="text-sm text-slate-400">{req.email} • {req.phoneNumber}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="info">{req.commuterType}</Badge>
                    <Badge variant="warning">Pending Verification</Badge>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 text-slate-400 group-hover:text-white transition-colors">
                <Eye size={18} />
                <span className="text-sm font-medium">Review Details</span>
              </div>
            </button>
          ))
        )}
      </div>
      {pagination && pagination.lastPage > 1 && (
        <div className="mt-4 flex items-center justify-between border-t border-[#1E2D45] pt-4 text-xs text-slate-500">
          <span>Showing {pagination.from ?? 0}-{pagination.to ?? 0} of {pagination.total}</span>
          <div className="flex items-center gap-2">
            <button onClick={() => onPageChange(pagination.currentPage - 1)} disabled={pagination.currentPage === 1} className="rounded-md border border-[#1E2D45] px-3 py-1.5 disabled:opacity-30">Previous</button>
            <span>{pagination.currentPage} / {pagination.lastPage}</span>
            <button onClick={() => onPageChange(pagination.currentPage + 1)} disabled={pagination.currentPage === pagination.lastPage} className="rounded-md border border-[#1E2D45] px-3 py-1.5 disabled:opacity-30">Next</button>
          </div>
        </div>
      )}
    </GlassCard>
  );
}
