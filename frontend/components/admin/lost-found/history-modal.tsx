// components/admin/lost-found/history-modal.tsx
'use client';

import { Modal } from '@/components/admin/ui/modal';
import { Clock, User, CheckCircle, XCircle, RotateCcw } from 'lucide-react';
import type { HistoryEvent } from '@/app/(admin)/lost-found/data/lost-found-data';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  history: HistoryEvent[];
}

export function HistoryModal({ isOpen, onClose, itemId, history }: HistoryModalProps) {
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'Reported': return <User size={16} className="text-[#62A0EA]" />;
      case 'Claimed': return <RotateCcw size={16} className="text-amber-400" />;
      case 'Claim Submitted': return <User size={16} className="text-[#62A0EA]/70" />;
      case 'Claim Approved': return <CheckCircle size={16} className="text-sky-400" />;
      case 'Claim Rejected': return <XCircle size={16} className="text-red-400" />;
      case 'Claim Released': return <CheckCircle size={16} className="text-sky-400" />;
      case 'Claim Returned': return <RotateCcw size={16} className="text-[#62A0EA]" />;
      case 'Released': return <CheckCircle size={16} className="text-sky-400" />;
      case 'Returned': return <RotateCcw size={16} className="text-[#62A0EA]" />;
      case 'Rejected': return <XCircle size={16} className="text-red-400" />;
      default: return <Clock size={16} className="text-slate-500" />;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg sm:text-xl font-bold text-white">History for Item {itemId}</h2>
        <span className="text-sm text-slate-500">{history.length} event(s)</span>
      </div>

      <div className="relative max-h-96 overflow-y-auto">
        <div className="space-y-4">
          {history.map((event: HistoryEvent) => (
            <div key={event.id} className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-1">
                {getActionIcon(event.action)}
              </div>
              <div className="flex-1 bg-[#0E1628] rounded-md border border-[#1E2D45] p-3">
                <p className="text-white font-medium">{event.action}</p>
                <p className="text-xs text-slate-400 mt-1">{event.details}</p>
                <p className="text-xs text-slate-500 mt-2 flex items-center">
                  <Clock size={12} className="mr-1" />
                  {event.timestamp}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
