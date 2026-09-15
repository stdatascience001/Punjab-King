import React, { useState, useEffect, useMemo } from 'react';
import { ShiftDto, LedgerDto } from '@pb/types';
import { apiRequest } from '../api/client.js';

interface CollectionPageProps {
  shifts: ShiftDto[];
  activeShift: ShiftDto | null;
  declareModeOnly?: boolean;
}

export const CollectionPage: React.FC<CollectionPageProps> = ({ shifts, activeShift, declareModeOnly = false }) => {
  const availableShifts = useMemo(() => {
    if (!declareModeOnly) return shifts;
    const declared = shifts.filter(s => !!s.declaredNumber || s.status === 'DECLARED' || s.status === 'AUDITED');
    return declared.length > 0 ? declared : shifts;
  }, [shifts]);

  const [shiftId, setShiftId] = useState<number | ''>(activeShift?.id || availableShifts[0]?.id || '');
  const [parties, setParties] = useState<LedgerDto[]>([]);
  const [partySearch, setPartySearch] = useState('');
  const [addedParties, setAddedParties] = useState<LedgerDto[]>([]);
  const [amounts, setAmounts] = useState<Record<number, string>>({});

  // Reference-only toggles from the live screenshot — no defined calculation spec exists
  // for these in this system yet, so they're kept as inert UI state rather than faking logic.
  const [commission, setCommission] = useState(false);
  const [hissa, setHissa] = useState(false);
  const [dibba, setDibba] = useState(false);
  const [akhMix, setAkhMix] = useState(false);
  const [amtLess, setAmtLess] = useState('');
  const [lessPercent, setLessPercent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchParties = async () => {
    try {
      const res = await apiRequest<LedgerDto[]>('/ledgers');
      if (res.data) setParties(res.data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchParties();
  }, []);

  const filteredPartyOptions = useMemo(() => {
    if (!partySearch.trim()) return [];
    const term = partySearch.trim().toLowerCase();
    return parties.filter(p => p.partyName.toLowerCase().includes(term) && !addedParties.some(a => a.id === p.id));
  }, [parties, partySearch, addedParties]);

  const handleAddParty = (p?: LedgerDto) => {
    const target = p || parties.find(x => x.partyName.toLowerCase() === partySearch.trim().toLowerCase());
    if (!target || addedParties.some(a => a.id === target.id)) return;
    setAddedParties(prev => [...prev, target]);
    setPartySearch('');
  };

  const handleClearList = () => {
    setAddedParties([]);
    setAmounts({});
  };

  const handleAmountChange = (num: number, val: string) => {
    setAmounts(prev => ({ ...prev, [num]: val }));
  };

  const adjustedAmount = (raw: number) => {
    let amt = raw;
    const flatLess = parseFloat(amtLess);
    if (!isNaN(flatLess) && flatLess > 0) amt = Math.max(0, amt - flatLess);
    const pctLess = parseFloat(lessPercent);
    if (!isNaN(pctLess) && pctLess > 0) amt = amt * (1 - pctLess / 100);
    return amt;
  };

  const gridTotal = useMemo(() => {
    let sum = 0;
    for (let i = 1; i <= 100; i++) {
      const raw = parseFloat(amounts[i] || '0');
      if (raw > 0) sum += adjustedAmount(raw);
    }
    return sum;
  }, [amounts, amtLess, lessPercent]);

  const getRowTotal = (r: number) => {
    let sum = 0;
    for (let c = 1; c <= 10; c++) {
      const raw = parseFloat(amounts[r * 10 + c] || '0');
      if (raw > 0) sum += adjustedAmount(raw);
    }
    return sum;
  };

  const getColTotal = (col: number) => {
    let sum = 0;
    for (let r = 0; r < 10; r++) {
      const raw = parseFloat(amounts[r * 10 + col] || '0');
      if (raw > 0) sum += adjustedAmount(raw);
    }
    return sum;
  };

  const handleSubmit = async () => {
    if (!shiftId) {
      alert('Please select a shift.');
      return;
    }
    if (addedParties.length === 0) {
      alert('Please add at least one party.');
      return;
    }

    const entries = [];
    for (let i = 1; i <= 100; i++) {
      const raw = parseFloat(amounts[i] || '0');
      if (raw > 0) {
        const n = i < 100 ? String(i).padStart(2, '0') : '00';
        entries.push({ entryType: 'DARA' as const, numberValue: n, amount: adjustedAmount(raw) });
      }
    }
    if (entries.length === 0) {
      alert('Please enter at least one amount in the grid.');
      return;
    }

    setSubmitting(true);
    try {
      for (const party of addedParties) {
        await apiRequest('/transactions', {
          method: 'POST',
          body: JSON.stringify({ shiftId, partyId: party.id, entries }),
        });
      }
      alert(`Collection submitted for ${addedParties.length} part${addedParties.length > 1 ? 'ies' : 'y'}.`);
      handleClearList();
    } catch (err: any) {
      alert(err.message || 'Failed to submit collection');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-full bg-[#eaedf2] p-2.5 sm:p-3 flex flex-col justify-between text-slate-800 select-none font-sans text-xs">
      <div className="bg-white rounded-md shadow-sm border border-slate-300 overflow-hidden flex flex-col flex-1">
        <div className="p-2 sm:p-2.5 flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white">
          <span className="font-bold text-sm text-slate-900 tracking-tight mr-1">
            {declareModeOnly ? 'Declare Collection' : 'Collection'}
          </span>

          <select
            value={shiftId}
            onChange={(e) => setShiftId(parseInt(e.target.value, 10))}
            className="px-3 py-1 bg-[#fef08a] border border-amber-300 rounded text-xs font-bold text-slate-900 uppercase focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer min-w-32 shadow-xs"
          >
            {availableShifts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={commission} onChange={(e) => setCommission(e.target.checked)} />
            <span className="text-slate-600 font-medium">Commission</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={hissa} onChange={(e) => setHissa(e.target.checked)} />
            <span className="text-slate-600 font-medium">Hissa</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={dibba} onChange={(e) => setDibba(e.target.checked)} />
            <span className="text-slate-600 font-medium">Dibba</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={akhMix} onChange={(e) => setAkhMix(e.target.checked)} />
            <span className="text-slate-600 font-medium">Akh-Mix</span>
          </label>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-600 font-medium">Amt-Less</span>
            <input type="number" value={amtLess} onChange={(e) => setAmtLess(e.target.value)} className="w-20 px-2 py-1 bg-white border border-slate-300 rounded text-xs" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-600 font-medium">Less-%</span>
            <input type="number" value={lessPercent} onChange={(e) => setLessPercent(e.target.value)} className="w-16 px-2 py-1 bg-white border border-slate-300 rounded text-xs" />
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="ml-auto px-5 py-1.5 bg-[#1662c6] hover:bg-[#1354ab] active:bg-[#0f4691] text-white font-bold text-xs rounded shadow-xs transition-colors disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="w-64 flex flex-col border-r border-slate-300 p-2 gap-2">
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={partySearch}
                  onChange={(e) => setPartySearch(e.target.value)}
                  placeholder="PARTY NAME"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs uppercase focus:outline-none focus:border-blue-500"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddParty(); } }}
                />
                {filteredPartyOptions.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-300 shadow-xl rounded z-50 max-h-40 overflow-y-auto">
                    {filteredPartyOptions.slice(0, 8).map(p => (
                      <div
                        key={p.id}
                        onMouseDown={() => handleAddParty(p)}
                        className="px-3 py-1.5 text-xs uppercase cursor-pointer hover:bg-amber-50 font-semibold text-slate-800"
                      >
                        {p.partyName}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleAddParty()}
                className="px-3 py-1.5 bg-[#00897b] hover:bg-[#00796b] text-white font-bold text-xs rounded shadow-xs"
              >
                ADD
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded">
              {addedParties.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">No parties added yet.</div>
              ) : (
                addedParties.map(p => (
                  <div key={p.id} className="px-3 py-1.5 text-xs font-bold uppercase text-slate-800 flex items-center justify-between">
                    <span>{p.partyName}</span>
                    <button
                      type="button"
                      onClick={() => setAddedParties(prev => prev.filter(a => a.id !== p.id))}
                      className="text-rose-500 hover:text-rose-700 font-bold"
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>

            <button
              type="button"
              onClick={handleClearList}
              className="w-full py-1.5 bg-[#dc2626] hover:bg-[#b91c1c] text-white font-bold text-xs rounded shadow-xs"
            >
              Clear Ledgers list
            </button>
          </div>

          <div className="flex-1 overflow-auto p-2">
            <table className="w-full border-collapse text-xs font-mono select-none table-fixed">
              <thead className="bg-[#152847] text-white">
                <tr>
                  {Array.from({ length: 10 }, (_, i) => (
                    <th key={i + 1} className="py-1.5 sm:py-2 text-center text-xs font-bold border border-[#2b446f] w-[9.09%]">{i + 1}</th>
                  ))}
                  <th className="py-1.5 sm:py-2 text-center text-xs font-bold border border-[#2b446f] w-[9.09%]">Total</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 10 }, (_, r) => (
                  <tr key={r}>
                    {Array.from({ length: 10 }, (_, c) => {
                      const num = r * 10 + (c + 1);
                      return (
                        <td key={num} className="relative h-8 sm:h-9 bg-white border border-slate-300 text-right px-1 align-middle">
                          <span className="absolute top-0.5 left-0.5 text-[9px] font-bold px-1 rounded-xs bg-[#fef9c3] text-[#854d0e] leading-tight select-none">
                            {num}
                          </span>
                          <input
                            type="number"
                            value={amounts[num] || ''}
                            onChange={(e) => handleAmountChange(num, e.target.value)}
                            className="w-full h-full text-right bg-transparent outline-none font-bold text-slate-900"
                          />
                        </td>
                      );
                    })}
                    <td className="text-center font-bold text-slate-900 bg-white border border-slate-300 font-mono">
                      {getRowTotal(r).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
                <tr className="bg-[#152847] text-white font-bold font-mono text-center">
                  {Array.from({ length: 10 }, (_, c) => (
                    <td key={c + 1} className="py-1.5 sm:py-2 border border-[#2b446f]">{getColTotal(c + 1).toLocaleString('en-IN')}</td>
                  ))}
                  <td className="py-1.5 sm:py-2 border border-[#2b446f]">{gridTotal.toLocaleString('en-IN')}</td>
                </tr>
                <tr className="bg-[#152847] text-white font-bold">
                  {Array.from({ length: 9 }, (_, i) => (
                    <td key={i} className="py-1.5 sm:py-2 text-center border border-[#2b446f]">-</td>
                  ))}
                  <td className="py-1.5 sm:py-2 text-center border border-[#2b446f] whitespace-nowrap">Grand Total</td>
                  <td className="py-1.5 sm:py-2 text-center border border-[#2b446f] font-mono">{gridTotal.toLocaleString('en-IN')}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
