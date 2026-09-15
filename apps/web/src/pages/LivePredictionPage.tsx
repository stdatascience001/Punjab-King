import React, { useState, useEffect, useMemo } from 'react';
import { ShiftDto, UserSession } from '@pb/types';
import { apiRequest } from '../api/client.js';
import { ArrowLeft } from 'lucide-react';

interface LivePredictionPageProps {
  shifts: ShiftDto[];
  user?: UserSession | null;
  onNavigate?: (page: string) => void;
  isDeclareMode?: boolean;
}

interface PredictionData {
  shiftId: number;
  shiftName: string;
  totalCollected: number;
  numberPreview: Array<{ number: string; liability: number; profitLoss: number }>;
  parties: Array<{ partyId: number; partyName: string; agentId: number | null; sale: number; pnl: number }>;
  agentGroups: Array<{ agentName: string; sale: number }>;
}

interface DeclarationHistoryItem {
  id: number;
  shiftId: number;
  winningNumber: string;
  declaredAt: string;
}

const formatDateOnly = (dateVal?: string) => {
  if (!dateVal) return '-';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return dateVal;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}-${month}-${d.getFullYear()}`;
};

export const LivePredictionPage: React.FC<LivePredictionPageProps> = ({ shifts, onNavigate, isDeclareMode = false }) => {
  const availableShifts = useMemo(() => {
    if (!isDeclareMode) return shifts;
    const declared = shifts.filter(s => !!s.declaredNumber || s.status === 'DECLARED' || s.status === 'AUDITED');
    return declared.length > 0 ? declared : shifts;
  }, [shifts, isDeclareMode]);

  const [shiftId, setShiftId] = useState<string>('');
  const [data, setData] = useState<PredictionData | null>(null);
  const [focusNumber, setFocusNumber] = useState('');
  const [declareInput, setDeclareInput] = useState('');
  const [history, setHistory] = useState<DeclarationHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!shiftId && availableShifts.length > 0) setShiftId(String(availableShifts[0].id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableShifts]);

  const selectedShift = shifts.find(s => String(s.id) === shiftId);

  const fetchPrediction = async (id: string, number?: string) => {
    if (!id) return;
    setLoading(true);
    try {
      const params = number ? `?number=${number}` : '';
      const res = await apiRequest<PredictionData>(`/jantri/${id}/prediction${params}`);
      if (res.data) setData(res.data);
    } catch (err) {
      console.warn('Failed to load prediction data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (id: string) => {
    if (!id) return;
    try {
      const res = await apiRequest<DeclarationHistoryItem[]>(`/declarations/summary?shiftId=${id}`);
      if (res.data) setHistory(res.data.slice(0, 30));
    } catch (err) {
      console.warn('Failed to load declaration history:', err);
    }
  };

  useEffect(() => {
    if (shiftId) {
      fetchPrediction(shiftId, focusNumber || undefined);
      fetchHistory(shiftId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shiftId]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPrediction(shiftId, focusNumber || undefined);
  };

  const focusPreview = data?.numberPreview.find(n => n.number === (focusNumber || '').padStart(2, '0'));

  const handleDeclare = async () => {
    if (!shiftId || !declareInput.trim()) return;
    if (!window.confirm(`Declare winning number "${declareInput}" for ${selectedShift?.name}?`)) return;
    try {
      await apiRequest(`/declarations/${shiftId}`, {
        method: 'POST',
        body: JSON.stringify({ winningNumber: declareInput.trim() }),
      });
      alert('Result declared successfully.');
      setDeclareInput('');
      fetchHistory(shiftId);
      fetchPrediction(shiftId, focusNumber || undefined);
    } catch (err: any) {
      alert(err.message || 'Failed to declare result');
    }
  };

  const handleUnDeclare = async (declarationId: number) => {
    if (!window.confirm('Undo this declaration?')) return;
    try {
      await apiRequest(`/declarations/${shiftId}/reverse`, {
        method: 'POST',
        body: JSON.stringify({ declarationId }),
      });
      fetchHistory(shiftId);
      fetchPrediction(shiftId, focusNumber || undefined);
    } catch (err: any) {
      alert(err.message || 'Failed to reverse declaration');
    }
  };

  const isCurrentCycleRow = (row: DeclarationHistoryItem) => {
    if (!selectedShift) return false;
    return row.declaredAt.slice(0, 10) === selectedShift.openDate;
  };

  return (
    <div className="min-h-full bg-[#eaedf2] p-2.5 sm:p-3 flex flex-col justify-between text-slate-800 select-none font-sans text-xs">
      <div className="bg-white rounded-md shadow-sm border border-slate-300 overflow-hidden flex flex-col flex-1">
        <form onSubmit={handleSearch} className="p-2 sm:p-2.5 flex flex-wrap items-center gap-2.5 border-b border-slate-200 bg-white">
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('dashboard')}
            className="p-1 text-slate-800 hover:bg-slate-100 rounded transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="font-bold text-sm text-slate-900 tracking-tight mr-1">
            {isDeclareMode ? 'Declare Prediction' : 'Live Prediction'}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-600 font-medium text-xs">Shift</span>
            <select
              value={shiftId}
              onChange={(e) => setShiftId(e.target.value)}
              className="px-3 py-1 bg-[#fef08a] border border-amber-300 rounded text-xs font-bold text-slate-900 uppercase focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer min-w-32 shadow-xs"
            >
              {availableShifts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-600 font-medium text-xs">Number</span>
            <input
              type="text"
              maxLength={2}
              value={focusNumber}
              onChange={(e) => setFocusNumber(e.target.value.replace(/\D/g, ''))}
              placeholder="00-99"
              className="w-16 px-2 py-1 bg-white border border-slate-300 rounded text-xs font-bold text-center"
            />
          </div>
          <button type="submit" className="px-4 py-1 bg-[#00897b] hover:bg-[#00796b] active:bg-[#00695c] text-white font-bold text-xs rounded shadow-xs transition-colors">
            Search
          </button>
        </form>

        <div className="flex-1 flex overflow-hidden">
          {/* LEFT: Result 30 Days */}
          <div className="w-56 flex flex-col border-r border-slate-300 overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#152847] text-white font-bold text-[10px]">
                  <th className="py-2 px-2 border-r border-[#223b63] text-center">Result<br />30 Days</th>
                  <th className="py-2 px-2 border-r border-[#223b63] text-right">Sale</th>
                  <th className="py-2 px-2 text-right">Amt</th>
                </tr>
              </thead>
            </table>
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <tbody className="divide-y divide-slate-100">
                  {history.map(h => {
                    const p = data?.numberPreview.find(n => n.number === h.winningNumber.padStart(2, '0'));
                    return (
                      <tr key={h.id} className="hover:bg-slate-50">
                        <td className="py-1.5 px-2 text-center font-mono font-bold text-slate-800 border-r border-slate-200">{h.winningNumber}</td>
                        <td className="py-1.5 px-2 text-right font-mono text-slate-700 border-r border-slate-200">{p ? p.liability.toLocaleString('en-IN') : 0}</td>
                        <td className="py-1.5 px-2 text-right font-mono text-slate-700">{p ? p.profitLoss.toLocaleString('en-IN') : 0}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* MIDDLE: Party breakdown */}
          <div className="flex-1 flex flex-col overflow-hidden border-r border-slate-300">
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#152847] text-white font-bold text-[11px]">
                    <th className="py-2 px-2 border-r border-[#223b63] w-10 text-center">Sr</th>
                    <th className="py-2 px-2 border-r border-[#223b63]">Party</th>
                    <th className="py-2 px-2 border-r border-[#223b63] text-right">Sale</th>
                    <th className="py-2 px-2 text-right">P&amp;L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={4} className="py-8 text-center text-slate-400">Loading...</td></tr>
                  ) : !data || data.parties.length === 0 ? (
                    <tr><td colSpan={4} className="py-8 text-center text-slate-400">No active parties this cycle.</td></tr>
                  ) : (
                    data.parties.map((p, idx) => (
                      <tr key={p.partyId} className="hover:bg-slate-50">
                        <td className="py-1.5 px-2 text-center font-mono text-slate-600 border-r border-slate-200">{idx + 1}.</td>
                        <td className="py-1.5 px-2 font-bold text-slate-900 uppercase border-r border-slate-200">{p.partyName}</td>
                        <td className="py-1.5 px-2 text-right font-mono text-slate-800 border-r border-slate-200">{p.sale.toLocaleString('en-IN')}</td>
                        <td className={`py-1.5 px-2 text-right font-mono font-bold ${p.pnl >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {p.pnl.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="bg-[#152847] text-white text-xs font-bold py-2 px-3 flex items-center justify-between">
              <span>Number: {focusNumber || '-'} | Loss: {focusPreview ? focusPreview.liability.toLocaleString('en-IN') : 0}</span>
              <button
                type="button"
                onClick={() => onNavigate && onNavigate('jantri')}
                className="px-3 py-1 bg-[#00897b] hover:bg-[#00796b] text-white font-bold text-[10px] rounded shadow-xs"
              >
                Jantri
              </button>
            </div>
          </div>

          {/* RIGHT: Declare box + history + agent groups */}
          <div className="w-80 flex flex-col overflow-hidden">
            <div className="p-2.5 border-b border-slate-200 flex items-center gap-2">
              <input
                type="text"
                maxLength={2}
                value={declareInput}
                onChange={(e) => setDeclareInput(e.target.value.replace(/\D/g, ''))}
                placeholder="Number"
                className="flex-1 px-2 py-1.5 bg-white border border-slate-300 rounded text-xs font-bold text-center"
              />
              <button
                type="button"
                onClick={handleDeclare}
                className="px-4 py-1.5 bg-[#1662c6] hover:bg-[#1354ab] text-white font-bold text-xs rounded shadow-xs"
              >
                Declare
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0">
                  <tr className="bg-[#1e3a63] text-white font-bold text-[10px]">
                    <th className="py-1.5 px-2 border-r border-[#2b4c7e]">Result</th>
                    <th className="py-1.5 px-2 border-r border-[#2b4c7e] text-center">Action</th>
                    <th className="py-1.5 px-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.map(h => (
                    <tr key={h.id} className="hover:bg-slate-50">
                      <td className="py-1.5 px-2 border-r border-slate-200">
                        <div className="font-mono font-bold text-slate-900">{h.winningNumber}</div>
                        <div className="text-[10px] text-slate-500">{formatDateOnly(h.declaredAt)}</div>
                      </td>
                      <td className="py-1.5 px-1 text-center border-r border-slate-200">
                        <button
                          type="button"
                          disabled={!isCurrentCycleRow(h)}
                          title={!isCurrentCycleRow(h) ? 'ReDeclare only supported for the current cycle' : ''}
                          className="px-2 py-0.5 bg-[#1662c6] hover:bg-[#1354ab] disabled:opacity-40 disabled:cursor-not-allowed text-white text-[10px] font-bold rounded"
                        >
                          ReDeclare
                        </button>
                      </td>
                      <td className="py-1.5 px-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleUnDeclare(h.id)}
                          className="px-2 py-0.5 bg-[#dc2626] hover:bg-[#b91c1c] text-white text-[10px] font-bold rounded"
                        >
                          UnDeclare
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {data && data.agentGroups.length > 0 && (
              <div className="border-t border-slate-200 max-h-48 overflow-y-auto">
                <div className="bg-[#152847] text-white text-[10px] font-bold py-1.5 px-2">Agent Groups</div>
                <table className="w-full text-left text-xs border-collapse">
                  <tbody className="divide-y divide-slate-100">
                    {data.agentGroups.map(a => (
                      <tr key={a.agentName}>
                        <td className="py-1 px-2 font-bold text-slate-800 uppercase text-[11px]">{a.agentName}</td>
                        <td className="py-1 px-2 text-right font-mono text-slate-600 text-[11px]">{a.sale.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
