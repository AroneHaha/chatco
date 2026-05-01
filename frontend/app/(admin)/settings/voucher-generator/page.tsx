// app/(admin)/settings/voucher-generator/page.tsx
'use client';

import { useState } from 'react';
import { GlassCard } from '@/components/admin/ui/glass-card';
import { Badge } from '@/components/admin/ui/badge';
import BackButton from '@/components/admin/ui/back-button';
import { Ticket, Copy, CheckCircle } from 'lucide-react';
import type { Voucher, VoucherType, VoucherStatus } from '@/app/(admin)/settings/data/settings-data';

export default function VoucherGeneratorPage() {
  const [voucherType, setVoucherType] = useState<VoucherType>('FREE_RIDE');
  const [amount, setAmount] = useState('1');
  const [quantity, setQuantity] = useState('5');
  const [generatedVouchers, setGeneratedVouchers] = useState<Voucher[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    const newVouchers: Voucher[] = [];
    for (let i = 0; i < parseInt(quantity); i++) {
      newVouchers.push({
        id: Date.now().toString() + i,
        code: `CHATCO-${voucherType.substring(0,3)}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        type: voucherType === 'FREE_RIDE' ? 'Free Ride' : `₱${amount} Credit`,
        status: 'Active' as VoucherStatus,
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
    <div className="min-h-screen pb-12 px-4 sm:px-6">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        
        {/* Left-aligned Back Button */}
        <div className="pt-2">
          <BackButton href="/settings" />
        </div>

        {/* Title */}
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Voucher Generator</h1>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Generator Form */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-24">
              <GlassCard className="p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Ticket size={20} className="text-pink-400 flex-shrink-0" />
                  <span>New Vouchers</span>
                </h2>
                <form onSubmit={handleGenerate} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Voucher Type</label>
                    <select 
                      value={voucherType} 
                      onChange={(e) => setVoucherType(e.target.value as VoucherType)} 
                      className="block w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors [color-scheme:dark]"
                    >
                      <option value="FREE_RIDE" className="bg-gray-800">Free Ride</option>
                      <option value="WALLET" className="bg-gray-800">Wallet Credit</option>
                    </select>
                  </div>

                  {voucherType === 'WALLET' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">Credit Amount (₱)</label>
                      <input 
                        type="number" 
                        value={amount} 
                        onChange={(e) => setAmount(e.target.value)} 
                        required 
                        min="1" 
                        className="block w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors" 
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Quantity to Generate</label>
                    <input 
                      type="number" 
                      value={quantity} 
                      onChange={(e) => setQuantity(e.target.value)} 
                      required 
                      min="1" 
                      max="100" 
                      className="block w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors" 
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="w-full py-3 bg-pink-500 text-white font-medium rounded-lg hover:bg-pink-600 transition-colors active:scale-95"
                  >
                    Generate Codes
                  </button>
                </form>
              </GlassCard>
            </div>
          </div>

          {/* Generated List */}
          <div className="lg:col-span-2">
            <GlassCard className="p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-white mb-4">
                Generated Codes ({generatedVouchers.length})
              </h2>
              
              {generatedVouchers.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Ticket size={48} className="mx-auto mb-3 opacity-30" />
                  <p>No vouchers generated yet.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[50vh] lg:max-h-[70vh] overflow-y-auto pr-1">
                  {generatedVouchers.map((voucher: Voucher) => (
                    <div key={voucher.id} className="flex items-center justify-between p-3 sm:p-4 bg-white/5 rounded-xl border border-white/10 gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-mono font-bold text-white tracking-wider break-all">{voucher.code}</p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <Badge variant="success">{voucher.type}</Badge>
                          <Badge variant="info">{voucher.status}</Badge>
                        </div>
                      </div>
                      <button 
                        onClick={() => copyCode(voucher.code, voucher.id)} 
                        className="p-2.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex-shrink-0 active:scale-90"
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
      </div>
    </div>
  );
}