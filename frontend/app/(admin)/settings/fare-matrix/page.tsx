// app/(admin)/settings/fare-matrix/page.tsx
'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, Save, X } from 'lucide-react';
import { initialFarePoints, type FarePoint } from '@/lib/fare-matrix-data';

export default function FareMatrixPage() {
  const [farePoints, setFarePoints] = useState<FarePoint[]>(initialFarePoints.map(p => ({ ...p, subStops: p.subStops ? [...p.subStops] : undefined })));
  const [expandedPoint, setExpandedPoint] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPoint, setEditingPoint] = useState<number | null>(null);

  const [newName, setNewName] = useState('');
  const [newRegular, setNewRegular] = useState('18');
  const [newDiscounted, setNewDiscounted] = useState('14.4');
  const [newSubStops, setNewSubStops] = useState('');

  const [editName, setEditName] = useState('');
  const [editRegular, setEditRegular] = useState('');
  const [editDiscounted, setEditDiscounted] = useState('');
  const [editSubStops, setEditSubStops] = useState('');

  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleAddPoint = () => {
    if (!newName.trim()) return;
    const newPoint: FarePoint = {
      pointNumber: farePoints.length + 1,
      name: newName.trim(),
      regularFare: parseFloat(newRegular) || 18,
      discountedFare: parseFloat(newDiscounted) || 14.4,
      subStops: newSubStops.trim() ? newSubStops.split(',').map(s => s.trim()).filter(Boolean) : undefined,
    };
    setFarePoints(prev => [...prev, newPoint]);
    setNewName('');
    setNewRegular('18');
    setNewDiscounted('14.4');
    setNewSubStops('');
    setShowAddForm(false);
    setIsSaved(false);
  };

  const handleStartEdit = (pointNumber: number) => {
    const point = farePoints.find(p => p.pointNumber === pointNumber);
    if (!point) return;
    setEditName(point.name);
    setEditRegular(point.regularFare.toString());
    setEditDiscounted(point.discountedFare.toString());
    setEditSubStops(point.subStops ? point.subStops.join(', ') : '');
    setEditingPoint(pointNumber);
  };

  const handleSaveEdit = () => {
    if (!editingPoint || !editName.trim()) return;
    setFarePoints(prev => prev.map(p =>
      p.pointNumber === editingPoint
        ? {
            ...p,
            name: editName.trim(),
            regularFare: parseFloat(editRegular) || 18,
            discountedFare: parseFloat(editDiscounted) || 14.4,
            subStops: editSubStops.trim() ? editSubStops.split(',').map(s => s.trim()).filter(Boolean) : undefined,
          }
        : p
    ));
    setEditingPoint(null);
    setIsSaved(false);
  };

  const handleDelete = (pointNumber: number) => {
    if (!confirm(`Delete point #${pointNumber}? This action cannot be undone.`)) return;
    setFarePoints(prev => {
      const filtered = prev.filter(p => p.pointNumber !== pointNumber);
      return filtered.map((p, i) => ({ ...p, pointNumber: i + 1 }));
    });
    if (expandedPoint === pointNumber) setExpandedPoint(null);
    setIsSaved(false);
  };

  const inputClasses = "block w-full px-3 py-2 bg-[#0E1628] border border-[#1E2D45] rounded-md text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#62A0EA] transition-colors";

  return (
    <div className="min-h-screen pb-12 px-4 sm:px-6">
      <div className="mx-auto w-full max-w-5xl space-y-6">

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Fare Matrix Management</h1>
            <p className="text-sm text-slate-400 mt-1">{farePoints.length} point areas configured along the Calumpit–Meycauayan route.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-[#62A0EA] text-white font-medium rounded-lg hover:bg-[#4A8BD4] transition-colors active:scale-95"
          >
            {showAddForm ? <X size={18} /> : <Plus size={18} />}
            <span>{showAddForm ? 'Cancel' : 'Add Point Area'}</span>
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-6">

          {showAddForm && (
            <div className="bg-[#62A0EA]/5 border border-[#62A0EA]/30 p-4 sm:p-6 rounded-lg space-y-4">
              <h3 className="text-sm font-semibold text-white">New Point Area</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Point Name</label>
                  <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Jollibee Crossing" className={inputClasses} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Sub-Stops (comma-separated, optional)</label>
                  <input type="text" value={newSubStops} onChange={(e) => setNewSubStops(e.target.value)} placeholder="Stop A, Stop B, Stop C" className={inputClasses} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Regular Fare (₱)</label>
                  <input type="number" step="0.25" value={newRegular} onChange={(e) => setNewRegular(e.target.value)} className={inputClasses} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Discounted Fare (₱)</label>
                  <input type="number" step="0.25" value={newDiscounted} onChange={(e) => setNewDiscounted(e.target.value)} className={inputClasses} />
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddPoint}
                className="w-full sm:w-auto px-6 py-2.5 bg-[#4A8BD4] text-white text-sm font-medium rounded-lg hover:bg-[#3B7FC0] transition-colors active:scale-95"
              >
                Add Point
              </button>
            </div>
          )}

          {editingPoint !== null && (
            <div className="bg-[#62A0EA]/5 border border-[#62A0EA]/30 p-4 sm:p-6 rounded-lg space-y-4">
              <h3 className="text-sm font-semibold text-white">Edit Point #{editingPoint}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Point Name</label>
                  <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className={inputClasses} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Sub-Stops (comma-separated, optional)</label>
                  <input type="text" value={editSubStops} onChange={(e) => setEditSubStops(e.target.value)} placeholder="Stop A, Stop B" className={inputClasses} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Regular Fare (₱)</label>
                  <input type="number" step="0.25" value={editRegular} onChange={(e) => setEditRegular(e.target.value)} className={inputClasses} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Discounted Fare (₱)</label>
                  <input type="number" step="0.25" value={editDiscounted} onChange={(e) => setEditDiscounted(e.target.value)} className={inputClasses} />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="px-6 py-2.5 bg-[#4A8BD4] text-white text-sm font-medium rounded-lg hover:bg-[#3B7FC0] transition-colors active:scale-95"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditingPoint(null)}
                  className="px-6 py-2.5 bg-white/10 text-white text-sm font-medium rounded-lg hover:bg-white/20 transition-colors active:scale-95"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="bg-[#131C2E] border border-[#1E2D45] rounded-lg overflow-hidden">
            <div className="grid grid-cols-12 gap-2 px-4 py-3 text-[10px] uppercase tracking-wider text-slate-500 font-semibold border-b border-[#1E2D45] bg-[#0E1628]/50">
              <div className="col-span-1 text-center">#</div>
              <div className="col-span-5">Name</div>
              <div className="col-span-2 text-center">Regular</div>
              <div className="col-span-2 text-center">Discounted</div>
              <div className="col-span-2 text-center">Actions</div>
            </div>

            <div className="divide-y divide-[#1E2D45] max-h-[60vh] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {farePoints.map((point) => (
                <div key={point.pointNumber}>
                  <div className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-[#0E1628]/50 transition-colors">
                    <div className="col-span-1 text-center text-xs font-bold text-slate-500">{point.pointNumber}</div>
                    <div className="col-span-5 flex items-center gap-2">
                      <span className="text-sm text-slate-200 font-medium truncate">{point.name}</span>
                      {point.subStops && point.subStops.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setExpandedPoint(expandedPoint === point.pointNumber ? null : point.pointNumber)}
                          className="p-1 text-slate-500 hover:text-white transition-colors flex-shrink-0"
                        >
                          {expandedPoint === point.pointNumber ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      )}
                    </div>
                    <div className="col-span-2 text-center text-sm font-semibold text-[#62A0EA]">₱{point.regularFare.toFixed(2)}</div>
                    <div className="col-span-2 text-center text-sm font-semibold text-emerald-400">₱{point.discountedFare.toFixed(2)}</div>
                    <div className="col-span-2 flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(point.pointNumber)}
                        className="p-1.5 text-slate-500 hover:text-[#62A0EA] transition-colors"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(point.pointNumber)}
                        className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {expandedPoint === point.pointNumber && point.subStops && point.subStops.length > 0 && (
                    <div className="bg-[#0E1628] px-4 py-3 ml-6 mr-4 mb-2 rounded-md border border-[#1E2D45]">
                      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-2">Sub-Stops</p>
                      <div className="flex flex-wrap gap-2">
                        {point.subStops.map((stop, idx) => (
                          <span key={idx} className="px-2.5 py-1 rounded-md bg-[#131C2E] border border-[#1E2D45] text-xs text-slate-300">
                            {stop}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center pt-2 pb-8">
            <button
              type="submit"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-[#62A0EA] text-white font-medium rounded-lg hover:bg-[#4A8BD4] transition-colors active:scale-95"
            >
              <Save size={18} />
              <span>{isSaved ? 'Changes Saved!' : 'Save Fare Matrix'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}