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
      case 'Reported': return <User size={16} className="text-blue-400" />;
      case 'Claimed': return <RotateCcw size={16} className="text-yellow-400" />;
      case 'Claim Submitted': return <User size={16} className="text-blue-300" />;
      case 'Claim Approved': return <CheckCircle size={16} className="text-green-400" />;
      case 'Claim Rejected': return <XCircle size={16} className="text-red-400" />;
      case 'Claim Released': return <CheckCircle size={16} className="text-green-400" />;
      case 'Claim Returned': return <RotateCcw size={16} className="text-blue-400" />;
      case 'Released': return <CheckCircle size={16} className="text-green-400" />;
      case 'Returned': return <RotateCcw size={16} className="text-blue-400" />;
      case 'Rejected': return <XCircle size={16} className="text-red-400" />;
      default: return <Clock size={16} className="text-gray-400" />;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">History for Item {itemId}</h2>
        <span className="text-sm text-gray-400">{history.length} event(s)</span>
      </div>

      <div className="relative max-h-96 overflow-y-auto">
        <div className="space-y-4">
          {history.map((event: HistoryEvent) => (
            <div key={event.id} className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-1">
                {getActionIcon(event.action)}
              </div>
              <div className="flex-1 bg-white/5 rounded-lg p-3">
                <p className="text-white font-medium">{event.action}</p>
                <p className="text-xs text-gray-300 mt-1">{event.details}</p>
                <p className="text-xs text-gray-500 mt-2 flex items-center">
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