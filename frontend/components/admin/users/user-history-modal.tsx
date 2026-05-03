// components/admin/users/user-history-modal.tsx
import { Modal } from '@/components/admin/ui/modal';
import { Clock } from 'lucide-react';

interface UserHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: { id: string; date: string; action: string; details: string }[];
}

export function UserHistoryModal({ isOpen, onClose, logs }: UserHistoryModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
        <Clock size={20} className="text-sky-400" />
        <span>Account History Log</span>
      </h2>
      
      {logs.length === 0 ? (
        <p className="text-slate-400 text-sm">No history recorded for this user.</p>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
          {logs.map((log) => (
            <div key={log.id} className="flex items-start space-x-3 p-3 bg-[#0E1628] rounded-md border border-[#1E2D45]">
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">{log.action}</p>
                <p className="text-xs text-slate-400 mt-1">{log.details}</p>
              </div>
              <span className="text-xs text-slate-500 whitespace-nowrap">{log.date}</span>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}