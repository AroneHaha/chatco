// app/(admin)/settings/voucher-generator/page.tsx
'use client';

import { useState } from 'react';
import { GlassCard } from '@/components/admin/ui/glass-card';
import { Badge } from '@/components/admin/ui/badge';
import { Ticket, Copy, CheckCircle } from 'lucide-react';

// Fix: Added explicit interface for TypeScript
interface Voucher {
  id: string;
  code: string;
  type: string;
  status: string;
}

export default function VoucherGeneratorPage() {
  const [voucherType, setVoucherType] = useState('FREE_RIDE');
  const [amount, setAmount] = useState('1');
  const [quantity, setQuantity] = useState('5');
  const [generatedVouchers, setGeneratedVouchers] = useState<Voucher[]>([]); // Fix: Typed state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    const newVouchers: Voucher[] = []; // Fix: Typed array
    for (let i = 0; i < parseInt(quantity); i++) {
      newVouchers.push({
        id: Date.now().toString() + i,
        code: `CHATCO-${voucherType.substring(0,3)}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        type: voucherType === 'FREE_RIDE' ? 'Free Ride' : `₱${amount} Credit`,
        status: 'Active',
      });
    }
    setGeneratedVouchers(prev => [...newVouchers, ...prev]);
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <>
      <h1 className="text-3xl font-bold text-white mb-6">Voucher Generator</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Generator Form */}
        <div className="lg:col-span-1">
          <GlassCard className="p-6 sticky top-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
              <Ticket size={20} className="text-pink-400" />
              <span>New Vouchers</span>
            </h2>
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Voucher Type</label>
                <select value={voucherType} onChange={(e) => setVoucherType(e.target.value)} className="block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white focus:outline-none focus:ring-blue-500 [color-scheme:dark]">
                  <option value="FREE_RIDE" className="bg-gray-800">Free Ride</option>
                  <option value="WALLET" className="bg-gray-800">Wallet Credit</option>
                </select>
              </div>

              {voucherType === 'WALLET' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Credit Amount (₱)</label>
                  <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required min="1" className="block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white focus:outline-none focus:ring-blue-500" />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Quantity to Generate</label>
                <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} required min="1" max="100" className="block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white focus:outline-none focus:ring-blue-500" />
              </div>

              <button type="submit" className="w-full py-2.5 bg-pink-500 text-white font-medium rounded-lg hover:bg-pink-600 transition-colors">
                Generate Codes
              </button>
            </form>
          </GlassCard>
        </div>

        {/* Generated List */}
        <div className="lg:col-span-2">
          <GlassCard className="p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Generated Codes ({generatedVouchers.length})</h2>
            
            {generatedVouchers.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Ticket size={48} className="mx-auto mb-3 opacity-30" />
                <p>No vouchers generated yet.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
                {generatedVouchers.map((voucher) => (
                  <div key={voucher.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex items-center space-x-4">
                      <div>
                        <p className="text-sm font-mono font-bold text-white tracking-wider">{voucher.code}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="success">{voucher.type}</Badge>
                          <Badge variant="info">{voucher.status}</Badge>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => copyCode(voucher.code, voucher.id)} 
                      className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                      title="Copy Code"
                    >
                      {copiedId === voucher.id ? <CheckCircle size={18} className="text-green-400" /> : <Copy size={18} />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </>
  );
}