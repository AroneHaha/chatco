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
        <Clock size={20} className="text-blue-400" />
        <span>Account History Log</span>
      </h2>
      
      {logs.length === 0 ? (
        <p className="text-gray-400 text-sm">No history recorded for this user.</p>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
          {logs.map((log) => (
            <div key={log.id} className="flex items-start space-x-3 p-3 bg-white/5 rounded-lg border border-white/10">
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">{log.action}</p>
                <p className="text-xs text-gray-400 mt-1">{log.details}</p>
              </div>
              <span className="text-xs text-gray-500 whitespace-nowrap">{log.date}</span>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}