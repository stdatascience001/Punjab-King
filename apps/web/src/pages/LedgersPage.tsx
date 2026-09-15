import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client.js';
import { Send, X } from 'lucide-react';

interface LedgerItem {
  id: number;
  partyName: string;
  realName?: string;
  userName?: string;
  groupName?: string;
  agentId?: number;
  agentName?: string;
  telegram?: string;
  mobile?: string;
  daraRate: number;
  akharRate: number;
  commissionRate: number;
  hissaPercentage: number;
  betLimit: number;
  capping: number;
  hasLimit: boolean;
  vapsiTpr: string;
  isLocked: boolean;
  isRisky: boolean;
  updatedBy: string;
  updatedAt: string;
  deletedAt?: string | null;
}

interface AgentOption {
  id: number;
  agentName: string;
}

interface LedgerDetail extends LedgerItem {
  distributorId?: number | null;
  retailerId?: number | null;
  refLedgerId?: number | null;
  hpLedgerId?: number | null;
  distributorName?: string | null;
  retailerName?: string | null;
  refLedgerName?: string | null;
  hpLedgerName?: string | null;
  address?: string;
  grantor?: string;
  dealing?: string;
  rebate?: number;
  dibba?: boolean;
  dAmt?: number;
}

const UPDATE_TABS = ['Info', 'Re-Name', 'Re-Config', 'Linked', 'Password', 'Account'] as const;
type UpdateTab = typeof UPDATE_TABS[number];

const GROUPS = [
  'Company',
  'Distributor',
  'Fanter',
  'Cash Agent',
  'Direct Expense',
  'Indirect Expense',
  'Profit & Loss',
];

const formatDateTime = (dateStr?: string) => {
  if (!dateStr) return '01-07-2026 05:13 PM';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '01-07-2026 05:13 PM';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strHours = String(hours).padStart(2, '0');

  return `${day}-${month}-${year} ${strHours}:${minutes} ${ampm}`;
};

export const LedgersPage: React.FC = () => {
  const [ledgers, setLedgers] = useState<LedgerItem[]>([]);
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Filters matching pbmax1.com
  const [searchTerm, setSearchTerm] = useState('');
  const [cashAgentFilter, setCashAgentFilter] = useState('-- ALL --');
  const [agentFilter, setAgentFilter] = useState('-- ALL --');
  const [cappingFilter, setCappingFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('Active');
  const [selectedRowId, setSelectedRowId] = useState<number | null>(null);

  // Modal Form State (matching screenshots 3, 4, 5)
  const [partyName, setPartyName] = useState('');
  const [realName, setRealName] = useState('');
  const [userName, setUserName] = useState('');
  const [groupName, setGroupName] = useState('Fanter');
  const [distributor, setDistributor] = useState('');
  const [daraRate, setDaraRate] = useState('90');
  const [daraComm, setDaraComm] = useState('');
  const [akharRate, setAkharRate] = useState('9');
  const [akharComm, setAkharComm] = useState('');
  const [tpComm, setTpComm] = useState('NO');
  const [rebate, setRebate] = useState('10');
  const [tpR, setTpR] = useState('NO');
  const [hissa, setHissa] = useState('NO');
  const [limitType, setLimitType] = useState('Yes');
  const [agentName, setAgentName] = useState('');
  const [refLedger, setRefLedger] = useState('');
  const [grantor, setGrantor] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [vapsiTpr, setVapsiTpr] = useState('10 | NO');
  const [capping, setCapping] = useState(0);
  const [isRisky, setIsRisky] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  // Ledger Update popup state (Action button) — separate from the Add (F2) modal above.
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateTab, setUpdateTab] = useState<UpdateTab>('Info');
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateSaving, setUpdateSaving] = useState(false);
  const [updateLedgerDetail, setUpdateLedgerDetail] = useState<LedgerDetail | null>(null);
  const [updDistributorId, setUpdDistributorId] = useState<number | ''>('');
  const [updRetailerId, setUpdRetailerId] = useState<number | ''>('');
  const [upd3rdPartyComm, setUpd3rdPartyComm] = useState('-');
  const [upd3rdPartyRebate, setUpd3rdPartyRebate] = useState('-');
  const [updHissa, setUpdHissa] = useState('-');
  const [updDaraRate, setUpdDaraRate] = useState('100');
  const [updAkharRate, setUpdAkharRate] = useState('10');
  const [updRebate, setUpdRebate] = useState('0');
  const [updHasLimit, setUpdHasLimit] = useState<'Yes' | 'No'>('Yes');
  const [updDibba, setUpdDibba] = useState<'YES' | 'NO'>('NO');
  const [updDAmt, setUpdDAmt] = useState('0');
  const [updAgentName, setUpdAgentName] = useState('');
  const [updHpLedgerId, setUpdHpLedgerId] = useState<number | ''>('');
  const [updRefLedgerId, setUpdRefLedgerId] = useState<number | ''>('');
  const [updRealName, setUpdRealName] = useState('');
  const [updGrantor, setUpdGrantor] = useState('');
  const [updDealing, setUpdDealing] = useState('DAILY');
  const [updMobile, setUpdMobile] = useState('');
  const [updAddress, setUpdAddress] = useState('');

  const fetchLedgers = async () => {
    setLoading(true);
    try {
      const url = statusFilter === 'Deleted' ? '/ledgers?status=Deleted' : '/ledgers';
      const res = await apiRequest<LedgerItem[]>(url);
      if (res.data) {
        setLedgers(res.data);
      }
    } catch (err) {
      console.warn('Failed to load ledgers:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      const res = await apiRequest<AgentOption[]>('/agents');
      if (res.data) {
        setAgents(res.data);
      }
    } catch (err) {
      console.warn('Failed to load agents:', err);
    }
  };

  useEffect(() => {
    fetchLedgers();
    fetchAgents();
  }, [statusFilter]);

  // Keyboard shortcuts: F2 opens Add modal, F5 reloads, Escape closes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        setShowModal(true);
      }
      if (e.key === 'F5') {
        e.preventDefault();
        fetchLedgers();
      }
      if (e.key === 'Escape' && showModal) {
        e.preventDefault();
        setShowModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showModal]);

  const resetForm = () => {
    setPartyName('');
    setRealName('');
    setUserName('');
    setGroupName('Fanter');
    setDistributor('');
    setDaraRate('90');
    setDaraComm('');
    setAkharRate('9');
    setAkharComm('');
    setTpComm('NO');
    setRebate('10');
    setTpR('NO');
    setHissa('NO');
    setLimitType('Yes');
    setAgentName('');
    setRefLedger('');
    setGrantor('');
    setMobile('');
    setAddress('');
    setVapsiTpr('10 | NO');
    setCapping(0);
    setIsRisky(false);
    setIsLocked(false);
  };

  const handleCreateLedger = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyName.trim()) return;

    try {
      const daraNum = parseFloat(daraRate.toString().split('/')[0]) || 90;
      const akharNum = parseFloat(akharRate.toString().split('/')[0]) || 9;
      const commNum = parseFloat(daraComm.toString()) || 0;

      await apiRequest('/ledgers', {
        method: 'POST',
        body: JSON.stringify({
          partyName: partyName.trim().toUpperCase(),
          realName: realName.trim() || undefined,
          userName: userName || Math.floor(10000000 + Math.random() * 90000000).toString(),
          groupName,
          agentName: agentName.trim() || undefined,
          mobile: mobile.trim() || undefined,
          address: address.trim() || undefined,
          grantor: grantor.trim() || undefined,
          refLedger: refLedger.trim() || undefined,
          daraRate: daraNum,
          akharRate: akharNum,
          commissionRate: commNum,
          hasLimit: limitType === 'Yes',
          vapsiTpr,
          capping,
          isRisky,
          isLocked,
        }),
      });

      setShowModal(false);
      resetForm();
      fetchLedgers();
    } catch (err: any) {
      alert(err.message || 'Failed to create ledger');
    }
  };

  const handleToggleLock = async (l: LedgerItem) => {
    try {
      await apiRequest(`/ledgers/${l.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isLocked: !l.isLocked }),
      });
      fetchLedgers();
    } catch (err: any) {
      alert(err.message || 'Failed to update ledger lock status');
    }
  };

  // "Action" button -> Ledger Update popup (Info tab fully wired; Re-Name/Re-Config/Linked/
  // Password/Account have no reference screenshot yet, so they render as placeholder tabs
  // rather than fabricated fields).
  const handleOpenUpdateModal = async (l: LedgerItem) => {
    setUpdateTab('Info');
    setShowUpdateModal(true);
    setUpdateLoading(true);
    try {
      const res = await apiRequest<LedgerDetail>(`/ledgers/${l.id}`);
      if (res.data) {
        const d = res.data;
        setUpdateLedgerDetail(d);
        setUpdDistributorId(d.distributorId || '');
        setUpdRetailerId(d.retailerId || '');
        setUpd3rdPartyComm('-');
        setUpd3rdPartyRebate('-');
        setUpdHissa('-');
        setUpdDaraRate(String(d.daraRate ?? 100));
        setUpdAkharRate(String(d.akharRate ?? 10));
        setUpdRebate(String(d.rebate ?? 0));
        setUpdHasLimit(d.hasLimit ? 'Yes' : 'No');
        setUpdDibba(d.dibba ? 'YES' : 'NO');
        setUpdDAmt(String(d.dAmt ?? 0));
        setUpdAgentName(d.agentName || '');
        setUpdHpLedgerId(d.hpLedgerId || '');
        setUpdRefLedgerId(d.refLedgerId || '');
        setUpdRealName(d.realName || '');
        setUpdGrantor(d.grantor || '');
        setUpdDealing(d.dealing || 'DAILY');
        setUpdMobile(d.mobile || '');
        setUpdAddress(d.address || '');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to load ledger detail');
      setShowUpdateModal(false);
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleSaveUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateLedgerDetail) return;
    setUpdateSaving(true);
    try {
      let agentId: number | null = updateLedgerDetail.agentId ?? null;
      const cleanAgentName = updAgentName.trim().toUpperCase();
      if (cleanAgentName) {
        const matched = agents.find(a => a.agentName.toUpperCase() === cleanAgentName);
        agentId = matched ? matched.id : agentId;
      } else {
        agentId = null;
      }

      await apiRequest(`/ledgers/${updateLedgerDetail.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          distributorId: updDistributorId || null,
          retailerId: updRetailerId || null,
          daraRate: parseFloat(updDaraRate) || 0,
          akharRate: parseFloat(updAkharRate) || 0,
          rebate: parseFloat(updRebate) || 0,
          hasLimit: updHasLimit === 'Yes',
          dibba: updDibba === 'YES',
          dAmt: parseFloat(updDAmt) || 0,
          agentId,
          hpLedgerId: updHpLedgerId || null,
          refLedgerId: updRefLedgerId || null,
          realName: updRealName.trim() || undefined,
          grantor: updGrantor.trim(),
          dealing: updDealing,
          mobile: updMobile.trim() || undefined,
          address: updAddress.trim(),
        }),
      });
      setShowUpdateModal(false);
      fetchLedgers();
    } catch (err: any) {
      alert(err.message || 'Failed to update ledger');
    } finally {
      setUpdateSaving(false);
    }
  };

  // Dynamic filter logic matching pbmax1.com controls
  const filteredLedgers = ledgers.filter(l => {
    const searchLower = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !searchLower ||
      l.partyName.toLowerCase().includes(searchLower) ||
      (l.userName && l.userName.includes(searchLower)) ||
      (l.agentName && l.agentName.toLowerCase().includes(searchLower)) ||
      (l.realName && l.realName.toLowerCase().includes(searchLower));

    const matchesCashAgent =
      cashAgentFilter === '-- ALL --' ||
      (cashAgentFilter === 'Cash Agent' && l.groupName === 'Cash Agent');

    const matchesAgent =
      agentFilter === '-- ALL --' ||
      !agentFilter ||
      (l.agentName && l.agentName.toLowerCase() === agentFilter.toLowerCase());

    const matchesCapping =
      cappingFilter === 'ALL' ||
      (cappingFilter === '0' && l.capping === 0) ||
      (cappingFilter === '1000+' && l.capping > 0);

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'Active' && !l.isLocked) ||
      (statusFilter === 'Hidden' && l.isLocked) ||
      (statusFilter === 'Deleted' && !!l.deletedAt);

    return matchesSearch && matchesCashAgent && matchesAgent && matchesCapping && matchesStatus;
  });

  return (
    <div className="min-h-full bg-[#eaedf2] p-3 sm:p-4 flex flex-col justify-between text-slate-800 select-none">
      {/* Outer Card */}
      <div className="bg-white rounded-md shadow-sm border border-slate-300 overflow-hidden">
        {/* Subheader Controls & Filters matching pbmax1.com */}
        <div className="p-2.5 sm:p-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="font-bold text-sm text-slate-900 tracking-tight mr-1">Ledger</span>

            {/* Search Input */}
            <div className="flex items-center gap-2">
              <span className="text-slate-600 font-semibold text-xs">Search</span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="SEARCH PARTY..."
                className="w-40 sm:w-56 px-2.5 py-1 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-blue-500 uppercase"
              />
            </div>

            {/* Cash Agent Filter */}
            <div className="flex items-center gap-2">
              <span className="text-slate-600 font-semibold text-xs">Cash Agent</span>
              <select
                value={cashAgentFilter}
                onChange={(e) => setCashAgentFilter(e.target.value)}
                className="px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-800 font-medium focus:outline-none focus:border-blue-500"
              >
                <option value="-- ALL --">-- ALL --</option>
                <option value="Cash Agent">Cash Agent</option>
              </select>
            </div>

            {/* Agent Filter */}
            <div className="flex items-center gap-2">
              <span className="text-slate-600 font-semibold text-xs">Agent</span>
              <select
                value={agentFilter}
                onChange={(e) => setAgentFilter(e.target.value)}
                className="min-w-28 px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-800 font-medium focus:outline-none focus:border-blue-500"
              >
                <option value="-- ALL --">-- ALL --</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.agentName}>
                    {a.agentName}
                  </option>
                ))}
              </select>
            </div>

            {/* Capping Filter */}
            <div className="flex items-center gap-2">
              <span className="text-slate-600 font-semibold text-xs">Capping</span>
              <select
                value={cappingFilter}
                onChange={(e) => setCappingFilter(e.target.value)}
                className="px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-800 font-medium focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">ALL</option>
                <option value="0">0</option>
                <option value="1000+">1000+</option>
              </select>
            </div>
          </div>

          {/* Add (F2) Button */}
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="px-5 py-1.5 bg-[#1662c6] hover:bg-[#1354ab] active:bg-[#0f4691] text-white font-bold text-xs rounded shadow-xs transition-colors flex items-center justify-center gap-1.5 shrink-0"
          >
            <span>Add (F2)</span>
          </button>
        </div>

        {/* Main Ledgers Table matching pbmax1.com */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#152847] text-white font-bold text-[11px] whitespace-nowrap">
                <th className="py-2 px-2.5 border-r border-[#223b63] text-center w-12">Sr</th>
                <th className="py-2 px-2.5 border-r border-[#223b63] text-center w-14">Telegram</th>
                <th className="py-2 px-3.5 border-r border-[#223b63]">Party Name</th>
                <th className="py-2 px-3 border-r border-[#223b63] text-center">UserName</th>
                <th className="py-2 px-3 border-r border-[#223b63]">Group</th>
                <th className="py-2 px-3 border-r border-[#223b63]">Agent</th>
                <th className="py-2 px-2.5 border-r border-[#223b63] text-center">Dara</th>
                <th className="py-2 px-2.5 border-r border-[#223b63] text-center">Akhar</th>
                <th className="py-2 px-2.5 border-r border-[#223b63] text-center">Limit</th>
                <th className="py-2 px-2.5 border-r border-[#223b63] text-center">Vapsi | TPR</th>
                <th className="py-2 px-2.5 border-r border-[#223b63] text-center">Capping</th>
                <th className="py-2 px-2.5 border-r border-[#223b63] text-center">Risky</th>
                <th className="py-2 px-2.5 border-r border-[#223b63] text-center">Locked</th>
                <th className="py-2 px-3.5 border-r border-[#223b63] text-center">Updated</th>
                <th className="py-2 px-2.5 text-center w-20">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-sans text-xs whitespace-nowrap">
              {filteredLedgers.length === 0 ? (
                <tr>
                  <td colSpan={15} className="py-8 text-center text-slate-400">
                    No ledgers found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredLedgers.map((l, idx) => {
                  const isSelected = selectedRowId === l.id;

                  return (
                    <tr
                      key={l.id}
                      onClick={() => setSelectedRowId(l.id)}
                      className={`transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50/80 text-slate-900'
                          : 'hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      {/* Sr */}
                      <td className="py-1.5 px-2.5 text-center font-mono border-r border-slate-200 text-slate-600">
                        {idx + 1}
                      </td>

                      {/* Telegram */}
                      <td className="py-1.5 px-2.5 text-center border-r border-slate-200 text-sky-600">
                        <Send className="h-3.5 w-3.5 mx-auto opacity-90 cursor-pointer hover:scale-110 transition-transform" />
                      </td>

                      {/* Party Name */}
                      <td className="py-1.5 px-3.5 font-bold uppercase tracking-tight border-r border-slate-200 text-slate-900">
                        {l.partyName}
                      </td>

                      {/* UserName */}
                      <td className="py-1.5 px-3 text-center font-mono border-r border-slate-200 text-slate-600">
                        {l.userName || '00154263'}
                      </td>

                      {/* Group */}
                      <td className="py-1.5 px-3 font-medium border-r border-slate-200 text-slate-700">
                        {l.groupName || 'Fanter'}
                      </td>

                      {/* Agent */}
                      <td className="py-1.5 px-3 font-medium uppercase border-r border-slate-200 text-slate-700">
                        {l.agentName || '-NA-'}
                      </td>

                      {/* Dara */}
                      <td className="py-1.5 px-2.5 text-center font-mono border-r border-slate-200 text-slate-800">
                        {l.daraRate === 100 ? '100/0' : `${l.daraRate}/10`}
                      </td>

                      {/* Akhar */}
                      <td className="py-1.5 px-2.5 text-center font-mono border-r border-slate-200 text-slate-800">
                        {l.akharRate === 10 ? '10/0' : `${l.akharRate}/10`}
                      </td>

                      {/* Limit */}
                      <td className="py-1.5 px-2.5 text-center border-r border-slate-200">
                        <span
                          className={`inline-block min-w-10 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            l.hasLimit
                              ? 'bg-[#00897b] text-white'
                              : 'bg-[#d32f2f] text-white'
                          }`}
                        >
                          {l.hasLimit ? 'YES' : 'No'}
                        </span>
                      </td>

                      {/* Vapsi | TPR */}
                      <td className="py-1.5 px-2.5 text-center font-mono border-r border-slate-200 text-slate-700">
                        {l.vapsiTpr}
                      </td>

                      {/* Capping */}
                      <td className="py-1.5 px-2.5 text-center font-mono border-r border-slate-200 text-slate-700">
                        {l.capping}
                      </td>

                      {/* Risky */}
                      <td className="py-1.5 px-2.5 text-center border-r border-slate-200">
                        <span
                          className={`inline-block min-w-10 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            l.isRisky
                              ? 'bg-[#d32f2f] text-white'
                              : 'bg-[#00897b] text-white'
                          }`}
                        >
                          {l.isRisky ? 'YES' : 'NO'}
                        </span>
                      </td>

                      {/* Locked */}
                      <td className="py-1.5 px-2.5 text-center border-r border-slate-200">
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleLock(l);
                          }}
                          className={`inline-block min-w-12 px-2 py-0.5 rounded text-[10px] font-bold uppercase cursor-pointer transition-transform active:scale-95 ${
                            l.isLocked
                              ? 'bg-[#d32f2f] text-white'
                              : 'bg-[#00897b] text-white'
                          }`}
                        >
                          {l.isLocked ? 'LOCKED' : 'NO'}
                        </span>
                      </td>

                      {/* Updated */}
                      <td className="py-1 px-3.5 text-center border-r border-slate-200 text-[10px]">
                        <div className="font-semibold text-rose-600 tracking-wider">
                          {l.updatedBy || 'A100'}
                        </div>
                        <div className="text-[9px] text-slate-500 font-mono">
                          {formatDateTime(l.updatedAt)}
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-1.5 px-2.5 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenUpdateModal(l);
                          }}
                          className="px-2.5 py-1 bg-[#1662c6] hover:bg-[#1354ab] text-white rounded text-[10px] font-bold shadow-xs transition-colors"
                        >
                          Action
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Table Footer matching pbmax1.com */}
            <tfoot>
              <tr className="bg-[#152847] text-white font-bold text-[11px] whitespace-nowrap">
                <th className="py-2 px-2.5 border-r border-[#223b63] text-center font-mono">
                  {3241}
                </th>
                <th className="py-2 px-2.5 border-r border-[#223b63] text-center">Telegram</th>
                <th className="py-2 px-3.5 border-r border-[#223b63]">Party Name</th>
                <th className="py-2 px-3 border-r border-[#223b63] text-center">UserName</th>
                <th className="py-2 px-3 border-r border-[#223b63]">Group</th>
                <th className="py-2 px-3 border-r border-[#223b63]">Agent</th>
                <th className="py-2 px-2.5 border-r border-[#223b63] text-center">Dara</th>
                <th className="py-2 px-2.5 border-r border-[#223b63] text-center">Akhar</th>
                <th className="py-2 px-2.5 border-r border-[#223b63] text-center">Limit</th>
                <th className="py-2 px-2.5 border-r border-[#223b63] text-center">Vapsi | TPR</th>
                <th className="py-2 px-2.5 border-r border-[#223b63] text-center">Capping</th>
                <th className="py-2 px-2.5 border-r border-[#223b63] text-center">Risky</th>
                <th className="py-2 px-2.5 border-r border-[#223b63] text-center">Locked</th>
                <th className="py-2 px-3.5 border-r border-[#223b63] text-center">Updated</th>
                <th className="py-2 px-2.5 text-center">Action</th>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Bottom Help & Status Bar matching pbmax1.com */}
        <div className="p-2.5 bg-[#f8fafc] border-t border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-600">
          <div className="text-slate-500 hover:text-slate-700 cursor-pointer">Need Help?</div>
          <div className="font-mono text-slate-500 tracking-wider">[ F5 = ReLoad Ledgers ]</div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1 bg-[#fef08a] border border-amber-300 rounded text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-400"
            >
              <option value="Active">Active</option>
              <option value="Hidden">Hidden</option>
              <option value="Deleted">Deleted</option>
            </select>
          </div>
        </div>
      </div>

      {/* Add "New User Ledger" Modal matching Screenshots 3, 4, 5 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 z-50 overflow-y-auto">
          <div className="bg-white rounded shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-300 my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-[#152847] text-white px-4 py-2.5 flex items-center justify-between">
              <h2 className="text-sm font-bold tracking-wide">Ledger</h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-white hover:text-slate-300 transition-colors p-0.5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateLedger}>
              {/* Modal Body: 2 Columns */}
              <div className="p-4 flex flex-col md:flex-row gap-4 text-xs">
                {/* Left Column (Inputs) */}
                <div className="w-full md:w-[63%] space-y-3">
                  {/* Row 1: Ledger Name, Real Name, Group */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Ledger Name</label>
                      <input
                        type="text"
                        required
                        autoFocus
                        value={partyName}
                        onChange={(e) => setPartyName(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[#fef08a] border border-amber-300 rounded text-xs font-semibold text-slate-900 uppercase focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Real Name</label>
                      <input
                        type="text"
                        value={realName}
                        onChange={(e) => setRealName(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Group</label>
                      <select
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 font-medium focus:outline-none focus:border-blue-500"
                      >
                        {GROUPS.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Row 2: Distributor */}
                  <div className="w-full sm:w-1/2">
                    <label className="block text-slate-700 font-medium mb-1">Distributor</label>
                    <input
                      type="text"
                      value={distributor}
                      onChange={(e) => setDistributor(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Row 3: Rates Grid with Navy Blue Header */}
                  <div>
                    {groupName === 'Fanter' ? (
                      /* 4-column rate table for Fanter as shown in Image 5 */
                      <div className="border border-[#152847] rounded overflow-hidden">
                        <div className="grid grid-cols-4 bg-[#152847] text-white text-[11px] font-bold text-center py-1">
                          <div className="border-r border-[#223b63]">Dara Rate</div>
                          <div className="border-r border-[#223b63]">Commission</div>
                          <div className="border-r border-[#223b63]">Akhar Rate</div>
                          <div>Commission</div>
                        </div>
                        <div className="grid grid-cols-4 bg-white p-1 gap-1">
                          <input
                            type="text"
                            value={daraRate}
                            onChange={(e) => setDaraRate(e.target.value)}
                            className="w-full px-1.5 py-1 text-center font-mono font-semibold text-xs border border-slate-300 rounded"
                          />
                          <input
                            type="text"
                            value={daraComm}
                            onChange={(e) => setDaraComm(e.target.value)}
                            className="w-full px-1.5 py-1 text-center font-mono font-semibold text-xs border border-slate-300 rounded"
                          />
                          <input
                            type="text"
                            value={akharRate}
                            onChange={(e) => setAkharRate(e.target.value)}
                            className="w-full px-1.5 py-1 text-center font-mono font-semibold text-xs border border-slate-300 rounded"
                          />
                          <input
                            type="text"
                            value={akharComm}
                            onChange={(e) => setAkharComm(e.target.value)}
                            className="w-full px-1.5 py-1 text-center font-mono font-semibold text-xs border border-slate-300 rounded"
                          />
                        </div>
                      </div>
                    ) : (
                      /* 8-column rate table as shown in Image 3 */
                      <div className="border border-[#152847] rounded overflow-hidden">
                        <div className="grid grid-cols-8 bg-[#152847] text-white text-[10px] font-bold text-center py-1">
                          <div className="border-r border-[#223b63]">Dara Rate</div>
                          <div className="border-r border-[#223b63]">Commission</div>
                          <div className="border-r border-[#223b63]">Akhar Rate</div>
                          <div className="border-r border-[#223b63]">Commission</div>
                          <div className="border-r border-[#223b63]">TP Comm</div>
                          <div className="border-r border-[#223b63]">Rebate</div>
                          <div className="border-r border-[#223b63]">TP-R</div>
                          <div>Hissa</div>
                        </div>
                        <div className="grid grid-cols-8 bg-white p-1 gap-1 text-center items-center">
                          <input
                            type="text"
                            value={daraRate}
                            onChange={(e) => setDaraRate(e.target.value)}
                            className="w-full px-1 py-1 text-center font-mono font-semibold text-[11px] border border-slate-300 rounded"
                          />
                          <input
                            type="text"
                            value={daraComm}
                            onChange={(e) => setDaraComm(e.target.value)}
                            className="w-full px-1 py-1 text-center font-mono font-semibold text-[11px] border border-slate-300 rounded"
                          />
                          <input
                            type="text"
                            value={akharRate}
                            onChange={(e) => setAkharRate(e.target.value)}
                            className="w-full px-1 py-1 text-center font-mono font-semibold text-[11px] border border-slate-300 rounded"
                          />
                          <input
                            type="text"
                            value={akharComm}
                            onChange={(e) => setAkharComm(e.target.value)}
                            className="w-full px-1 py-1 text-center font-mono font-semibold text-[11px] border border-slate-300 rounded"
                          />
                          <button
                            type="button"
                            onClick={() => setTpComm(tpComm === 'YES' ? 'NO' : 'YES')}
                            className="w-full py-1 text-center font-bold text-[10px] border border-slate-300 rounded bg-slate-50 hover:bg-slate-100 text-slate-700"
                          >
                            {tpComm}
                          </button>
                          <input
                            type="text"
                            value={rebate}
                            onChange={(e) => setRebate(e.target.value)}
                            className="w-full px-1 py-1 text-center font-mono font-semibold text-[11px] border border-slate-300 rounded"
                          />
                          <button
                            type="button"
                            onClick={() => setTpR(tpR === 'YES' ? 'NO' : 'YES')}
                            className="w-full py-1 text-center font-bold text-[10px] border border-slate-300 rounded bg-slate-50 hover:bg-slate-100 text-slate-700"
                          >
                            {tpR}
                          </button>
                          <button
                            type="button"
                            onClick={() => setHissa(hissa === 'YES' ? 'NO' : 'YES')}
                            className="w-full py-1 text-center font-bold text-[10px] border border-slate-300 rounded bg-slate-50 hover:bg-slate-100 text-slate-700"
                          >
                            {hissa}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Row 4: Limit Type, Agent, Ref Ledger (Image 5) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Limit Type</label>
                      <select
                        value={limitType}
                        onChange={(e) => setLimitType(e.target.value)}
                        className="w-full px-2 py-1.5 bg-[#fef08a] border border-amber-300 rounded text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
                      >
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Agent</label>
                      <input
                        list="modal-agents"
                        type="text"
                        value={agentName}
                        onChange={(e) => setAgentName(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 uppercase focus:outline-none focus:border-blue-500"
                      />
                      <datalist id="modal-agents">
                        {agents.map((a) => (
                          <option key={a.id} value={a.agentName} />
                        ))}
                      </datalist>
                    </div>
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Ref Ledger</label>
                      <input
                        type="text"
                        value={refLedger}
                        onChange={(e) => setRefLedger(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Row 5: Grantor/Rmk */}
                  <div className="w-full sm:w-2/3">
                    <label className="block text-slate-700 font-medium mb-1">Grantor/Rmk</label>
                    <input
                      type="text"
                      value={grantor}
                      onChange={(e) => setGrantor(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Row 6: Mobile and Address */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Mobile</label>
                      <input
                        type="text"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                        placeholder="MOBILE"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 placeholder:text-slate-300 placeholder:font-bold focus:outline-none focus:border-blue-500 uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Address</label>
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="ADDRESSS"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 placeholder:text-slate-300 placeholder:font-bold focus:outline-none focus:border-blue-500 uppercase"
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column (3 Tables matching Screenshots 3, 4) */}
                <div className="w-full md:w-[37%] space-y-3 flex flex-col justify-start">
                  {/* Table 1: 3rd Party | D-Comm | A-Comm */}
                  <div className="border border-[#152847] rounded overflow-hidden shadow-2xs">
                    <div className="bg-[#152847] text-white text-[10px] font-bold px-2 py-1 flex items-center justify-between">
                      <span>3rd Party</span>
                      <div className="flex gap-4">
                        <span>D-Comm</span>
                        <span>A-Comm</span>
                      </div>
                    </div>
                    <div className="h-16 bg-white overflow-y-auto p-1.5 text-center text-slate-300 text-[11px] flex items-center justify-center">
                      No 3rd party entries
                    </div>
                  </div>

                  {/* Table 2: 3rd Party | Rebate */}
                  <div className="border border-[#152847] rounded overflow-hidden shadow-2xs">
                    <div className="bg-[#152847] text-white text-[10px] font-bold px-2 py-1 flex items-center justify-between">
                      <span>3rd Party</span>
                      <span>Rebate</span>
                    </div>
                    <div className="h-16 bg-white overflow-y-auto p-1.5 text-center text-slate-300 text-[11px] flex items-center justify-center">
                      No rebate entries
                    </div>
                  </div>

                  {/* Table 3: Party | Hissa */}
                  <div className="border border-[#152847] rounded overflow-hidden shadow-2xs">
                    <div className="bg-[#152847] text-white text-[10px] font-bold px-2 py-1 flex items-center justify-between">
                      <span>Party</span>
                      <span>Hissa</span>
                    </div>
                    <div className="h-16 bg-white overflow-y-auto p-1.5 text-center text-slate-300 text-[11px] flex items-center justify-center">
                      No hissa entries
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer matching Screenshot 3 */}
              <div className="p-3 bg-white border-t border-slate-200 flex justify-end items-center gap-3">
                <button
                  type="submit"
                  className="px-6 py-1.5 bg-[#152847] hover:bg-[#1e3a68] active:bg-[#0f1d33] text-white font-bold rounded text-xs transition-colors shadow-xs"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 text-slate-700 hover:text-slate-900 font-semibold text-xs transition-colors"
                >
                  Close
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ledger Update Modal (Action button) matching the pbmax1.com "Ledger Update" popup */}
      {showUpdateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 z-50 overflow-y-auto">
          <div className="bg-white rounded shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-300 my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-[#1f4277] text-white px-4 py-2.5 flex items-center justify-between">
              <h2 className="text-sm font-bold tracking-wide">
                Ledger Update {updateLedgerDetail ? `| ${updateLedgerDetail.partyName}` : ''}
              </h2>
              <button
                type="button"
                onClick={() => setShowUpdateModal(false)}
                className="text-white hover:text-slate-300 transition-colors p-0.5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tab bar */}
            <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold">
              {UPDATE_TABS.map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setUpdateTab(tab)}
                  className={`px-4 py-2 border-b-2 transition-colors ${
                    updateTab === tab
                      ? 'border-[#1f4277] text-[#1f4277] bg-white'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {updateLoading ? (
              <div className="py-16 text-center text-slate-400 text-xs font-medium">Loading ledger detail...</div>
            ) : updateTab !== 'Info' ? (
              <div className="py-16 text-center text-slate-400 text-xs font-medium">
                {updateTab} details ka koi reference screenshot abhi nahi mila — screenshot milne par yeh tab yahan banega.
              </div>
            ) : (
              <form onSubmit={handleSaveUpdate} className="p-4 flex flex-col md:flex-row gap-4 text-xs">
                {/* Left column: main inputs */}
                <div className="w-full md:w-[63%] space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Distributor</label>
                      <select
                        value={updDistributorId}
                        onChange={(e) => setUpdDistributorId(e.target.value ? parseInt(e.target.value, 10) : '')}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 font-medium focus:outline-none focus:border-blue-500"
                      >
                        <option value="">-Direct-</option>
                        {ledgers.filter(o => o.id !== updateLedgerDetail?.id).map(o => (
                          <option key={o.id} value={o.id}>{o.partyName}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Retailer</label>
                      <select
                        value={updRetailerId}
                        onChange={(e) => setUpdRetailerId(e.target.value ? parseInt(e.target.value, 10) : '')}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 font-medium focus:outline-none focus:border-blue-500"
                      >
                        <option value="">-Direct-</option>
                        {ledgers.filter(o => o.id !== updateLedgerDetail?.id).map(o => (
                          <option key={o.id} value={o.id}>{o.partyName}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2.5">
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Rate</label>
                      <div className="flex items-center gap-1 border border-slate-300 rounded px-1.5 py-1 bg-white">
                        <input
                          type="text"
                          value={updDaraRate}
                          onChange={(e) => setUpdDaraRate(e.target.value)}
                          className="w-10 text-center font-mono text-xs focus:outline-none"
                        />
                        <span className="text-slate-400">-</span>
                        <input
                          type="text"
                          value={updAkharRate}
                          onChange={(e) => setUpdAkharRate(e.target.value)}
                          className="w-10 text-center font-mono text-xs focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Rebate</label>
                      <input
                        type="text"
                        value={updRebate}
                        onChange={(e) => setUpdRebate(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Limit</label>
                      <select
                        value={updHasLimit}
                        onChange={(e) => setUpdHasLimit(e.target.value as 'Yes' | 'No')}
                        className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 font-medium focus:outline-none focus:border-blue-500"
                      >
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Dibba</label>
                      <select
                        value={updDibba}
                        onChange={(e) => setUpdDibba(e.target.value as 'YES' | 'NO')}
                        className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 font-medium focus:outline-none focus:border-blue-500"
                      >
                        <option value="NO">NO</option>
                        <option value="YES">YES</option>
                      </select>
                    </div>
                  </div>

                  <div className="w-1/4 pr-1.5">
                    <label className="block text-slate-700 font-medium mb-1">D-Amt</label>
                    <input
                      type="text"
                      value={updDAmt}
                      onChange={(e) => setUpdDAmt(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Agent</label>
                      <input
                        list="update-agents"
                        type="text"
                        value={updAgentName}
                        onChange={(e) => setUpdAgentName(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 uppercase focus:outline-none focus:border-blue-500"
                      />
                      <datalist id="update-agents">
                        {agents.map((a) => <option key={a.id} value={a.agentName} />)}
                      </datalist>
                    </div>
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">HP Ledger</label>
                      <select
                        value={updHpLedgerId}
                        onChange={(e) => setUpdHpLedgerId(e.target.value ? parseInt(e.target.value, 10) : '')}
                        className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 font-medium focus:outline-none focus:border-blue-500"
                      >
                        <option value="">-</option>
                        {ledgers.filter(o => o.id !== updateLedgerDetail?.id).map(o => (
                          <option key={o.id} value={o.id}>{o.partyName}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Ref-Ledger</label>
                      <select
                        value={updRefLedgerId}
                        onChange={(e) => setUpdRefLedgerId(e.target.value ? parseInt(e.target.value, 10) : '')}
                        className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 font-medium focus:outline-none focus:border-blue-500"
                      >
                        <option value="">-</option>
                        {ledgers.filter(o => o.id !== updateLedgerDetail?.id).map(o => (
                          <option key={o.id} value={o.id}>{o.partyName}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Real Name</label>
                      <input
                        type="text"
                        value={updRealName}
                        onChange={(e) => setUpdRealName(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[#fef08a] border border-amber-300 rounded text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Grantor/Rmk</label>
                      <input
                        type="text"
                        value={updGrantor}
                        onChange={(e) => setUpdGrantor(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Dealing</label>
                      <select
                        value={updDealing}
                        onChange={(e) => setUpdDealing(e.target.value)}
                        className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 font-medium focus:outline-none focus:border-blue-500"
                      >
                        <option value="DAILY">DAILY</option>
                        <option value="WEEKLY">WEEKLY</option>
                        <option value="MONTHLY">MONTHLY</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Mobile</label>
                      <input
                        type="text"
                        value={updMobile}
                        onChange={(e) => setUpdMobile(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Address</label>
                      <input
                        type="text"
                        value={updAddress}
                        onChange={(e) => setUpdAddress(e.target.value)}
                        placeholder="ADDRESSS"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-blue-500 uppercase"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={updateSaving}
                      className="px-6 py-1.5 bg-[#152847] hover:bg-[#1e3a68] active:bg-[#0f1d33] text-white font-bold rounded text-xs transition-colors shadow-xs disabled:opacity-50"
                    >
                      {updateSaving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>

                {/* Right column: 3rd Party summary tables (read-only, same shell as Add modal) */}
                <div className="w-full md:w-[37%] space-y-3 flex flex-col justify-start">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">3rd Party Commission</label>
                    <input
                      type="text"
                      value={upd3rdPartyComm}
                      onChange={(e) => setUpd3rdPartyComm(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">3rd Party Rebate</label>
                    <input
                      type="text"
                      value={upd3rdPartyRebate}
                      onChange={(e) => setUpd3rdPartyRebate(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Hissa</label>
                    <input
                      type="text"
                      value={updHissa}
                      onChange={(e) => setUpdHissa(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
