// components/admin/users/registration-requests-table.tsx
import { GlassCard } from '@/components/admin/ui/glass-card';
import { Badge } from '@/components/admin/ui/badge';
import { Eye } from 'lucide-react';

interface RegistrationRequestsTableProps {
  requests: any[];
  onSelectRequest: (request: any) => void;
}

export function RegistrationRequestsTable({ requests, onSelectRequest }: RegistrationRequestsTableProps) {
  return (
    <GlassCard className="p-4">
      <div className="space-y-4">
        {requests.length === 0 ? (
          <p className="text-center text-gray-400 py-8">No pending registration requests.</p>
        ) : (
          requests.map((req) => (
            <button 
              key={req.id} 
              onClick={() => onSelectRequest(req)}
              className="w-full text-left flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10 gap-4 hover:bg-white/10 transition-colors group"
            >
              <div className="flex items-center space-x-4">
                <img src={req.idImageUrl} alt="ID" className="w-12 h-12 rounded-md object-cover border border-white/20" />
                <div>
                  <p className="text-white font-medium group-hover:text-blue-400 transition-colors">{req.name}</p>
                  <p className="text-sm text-gray-400">{req.email} • {req.phoneNumber}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="info">{req.commuterType}</Badge>
                    <Badge variant="warning">Pending Verification</Badge>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 text-gray-400 group-hover:text-white transition-colors">
                <Eye size={18} />
                <span className="text-sm font-medium">Review Details</span>
              </div>
            </button>
          ))
        )}
      </div>
    </GlassCard>
  );
}