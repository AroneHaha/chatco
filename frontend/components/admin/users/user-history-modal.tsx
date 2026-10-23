// components/admin/users/user-history-modal.tsx
import { Modal } from '@/components/admin/ui/modal';
import { Clock } from 'lucide-react';
import type { HistoryLog } from '@/app/(admin)/users/data/users-data';

interface UserHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: HistoryLog[];
}

export function UserHistoryModal({ isOpen, onClose, logs }: UserHistoryModalProps) {
  return (
    <Modal adminThemed isOpen={isOpen} onClose={onClose}>
      <h2 className="text-xl font-bold text-white admin-light:text-slate-900 mb-4 flex items-center space-x-2">
        <Clock size={20} className="text-[#62A0EA] admin-light:text-[#1A5FB4]" />
        <span>Account History Log</span>
      </h2>
      
      {logs.length === 0 ? (
        <p className="text-slate-400 admin-light:text-slate-500 text-sm">No history recorded for this user.</p>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
          {logs.map((log) => (
            <div key={log.id} className="flex items-start space-x-3 p-3 bg-[#0E1628] admin-light:bg-[#F8FAFC] rounded-md border border-[#1E2D45] admin-light:border-[#E2E8F0]">
              <div className="flex-1">
                <p className="text-sm font-semibold text-white admin-light:text-slate-900">{log.action}</p>
                <p className="text-xs text-slate-400 admin-light:text-slate-500 mt-1">{log.details}</p>
              </div>
              <span className="text-xs text-slate-500 whitespace-nowrap">{log.date}</span>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}