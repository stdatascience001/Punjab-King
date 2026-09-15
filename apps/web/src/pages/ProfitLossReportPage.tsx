import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client.js';

const PAGE_TITLE = 'Profit & Loss Report';
const DEFAULT_FROM_TODAY = false;

interface DeclarationSummaryItem {
  id: number;
  shiftId: number;
  shiftName: string;
  winningNumber: string;
  totalCollected: number;
  totalPayout: number;
  netProfitLoss: number;
  declaredAt: string;
}

const todayInputDate = () => new Date().toISOString().slice(0, 10);

export const ProfitLossReportPage: React.FC = () => {
  const [list, setList] = useState<DeclarationSummaryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState(DEFAULT_FROM_TODAY ? todayInputDate() : '');
  const [toDate, setToDate] = useState(todayInputDate());

  const fetchList = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.append('fromDate', fromDate);
      if (toDate) params.append('toDate', toDate);
      const res = await apiRequest<DeclarationSummaryItem[]>(`/declarations/summary?${params.toString()}`);
      if (res.data) setList(res.data);
    } catch (err) {
      console.warn('Failed to load declaration summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDate]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchList();
  };

  const handleExportExcel = () => {
    if (list.length === 0) {
      alert('No records available to export.');
      return;
    }
    const csvContent = 'data:text/csv;charset=utf-8,' +
      ['Date,Shift,Winning Number,Total Collected,Total Payout,Net P&L'].concat(
        list.map(r => `${r.declaredAt.slice(0, 10)},"${r.shiftName}",${r.winningNumber},${r.totalCollected},${r.totalPayout},${r.netProfitLoss}`)
      ).join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `${PAGE_TITLE.toLowerCase().replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalCollected = list.reduce((s, r) => s + r.totalCollected, 0);
  const totalPayout = list.reduce((s, r) => s + r.totalPayout, 0);
  const totalPnl = list.reduce((s, r) => s + r.netProfitLoss, 0);

  return (
    <div className="min-h-full bg-[#eaedf2] p-2.5 sm:p-3 flex flex-col justify-between text-slate-800 select-none font-sans text-xs">
      <div className="bg-white rounded-md shadow-sm border border-slate-300 overflow-hidden flex flex-col flex-1">
        <form onSubmit={handleSearch} className="p-2 sm:p-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-bold text-sm text-slate-900 tracking-tight mr-2">{PAGE_TITLE}</span>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="px-2 py-1 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-800" />
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="px-2 py-1 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-800" />
            <button type="submit" className="px-5 py-1 bg-[#00897b] hover:bg-[#00796b] active:bg-[#00695c] text-white font-bold text-xs rounded shadow-xs transition-colors">
              Search
            </button>
          </div>
          <button type="button" onClick={handleExportExcel} className="px-4 py-1 bg-[#15803d] hover:bg-[#166534] active:bg-[#14532d] text-white font-bold text-xs rounded shadow-xs transition-colors">
            Excel
          </button>
        </form>

        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#152847] text-white font-bold text-[11px] whitespace-nowrap">
                <th className="py-2.5 px-3 border-r border-[#223b63] w-12 text-center">Sr</th>
                <th className="py-2.5 px-4 border-r border-[#223b63]">Date</th>
                <th className="py-2.5 px-4 border-r border-[#223b63]">Shift</th>
                <th className="py-2.5 px-4 border-r border-[#223b63] text-center">Winning No.</th>
                <th className="py-2.5 px-4 border-r border-[#223b63] text-right">Total Collected</th>
                <th className="py-2.5 px-4 border-r border-[#223b63] text-right">Total Payout</th>
                <th className="py-2.5 px-4 text-right">Net P&amp;L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-sans text-xs whitespace-nowrap">
              {loading ? (
                <tr><td colSpan={7} className="py-14 text-center text-slate-400 font-medium">Loading...</td></tr>
              ) : list.length === 0 ? (
                <tr><td colSpan={7} className="py-14 text-center text-slate-400 font-medium">No declarations found for this filter.</td></tr>
              ) : (
                list.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2 px-3 text-center font-mono text-slate-600 border-r border-slate-200">{idx + 1}</td>
                    <td className="py-2 px-4 font-mono text-slate-600 border-r border-slate-200">{r.declaredAt.slice(0, 10)}</td>
                    <td className="py-2 px-4 font-bold text-slate-900 uppercase border-r border-slate-200">{r.shiftName}</td>
                    <td className="py-2 px-4 text-center font-mono font-bold text-pink-700 border-r border-slate-200">{r.winningNumber}</td>
                    <td className="py-2 px-4 text-right font-mono text-slate-900 border-r border-slate-200">{r.totalCollected.toLocaleString('en-IN')}</td>
                    <td className="py-2 px-4 text-right font-mono text-rose-700 border-r border-slate-200">{r.totalPayout.toLocaleString('en-IN')}</td>
                    <td className={`py-2 px-4 text-right font-mono font-bold ${r.netProfitLoss >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
                      {r.netProfitLoss.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {list.length > 0 && (
              <tfoot>
                <tr className="bg-[#152847] text-white font-bold text-[11px]">
                  <td className="py-2 px-3 text-center border-r border-[#223b63]">{list.length}</td>
                  <td className="py-2 px-4 border-r border-[#223b63]" colSpan={3}>Total</td>
                  <td className="py-2 px-4 text-right font-mono border-r border-[#223b63]">{totalCollected.toLocaleString('en-IN')}</td>
                  <td className="py-2 px-4 text-right font-mono border-r border-[#223b63]">{totalPayout.toLocaleString('en-IN')}</td>
                  <td className="py-2 px-4 text-right font-mono">{totalPnl.toLocaleString('en-IN')}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
