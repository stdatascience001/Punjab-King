import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ShiftDto, LedgerDto, UserSession } from '@pb/types';
import { apiRequest } from '../api/client.js';
import { ArrowLeft, X, Check, Search, Plus, Shuffle, Calendar, Clock } from 'lucide-react';

interface EntryRow {
  numberValue: string;
  amount: number;
  entryType: 'DARA' | 'HARUF_ANDAR' | 'HARUF_BAHAR';
}

interface AddTransactionPageProps {
  shifts: ShiftDto[];
  activeShift: ShiftDto | null;
  onSelectShift?: (shift: ShiftDto) => void;
  onNavigate?: (page: string, param?: string) => void;
  transactionId?: string;
  user?: UserSession | null;
}

export const AddTransactionPage: React.FC<AddTransactionPageProps> = ({
  shifts,
  activeShift,
  onSelectShift,
  onNavigate,
  transactionId,
  user,
}) => {
  // Party state
  const [parties, setParties] = useState<LedgerDto[]>([]);
  const [partySearch, setPartySearch] = useState('');
  const [selectedParty, setSelectedParty] = useState<LedgerDto | null>(null);
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);
  const [activePartyIndex, setActivePartyIndex] = useState(0);

  // Active shift resolution based on transactionId or props
  const [resolvedShift, setResolvedShift] = useState<ShiftDto | null>(activeShift || null);
  const [allShifts, setAllShifts] = useState<ShiftDto[]>(shifts);

  // Slips / Entries
  const [entriesList, setEntriesList] = useState<EntryRow[]>([]);
  const [inputNumber, setInputNumber] = useState('');
  const [inputAmount, setInputAmount] = useState('');

  // Right column: Copy transaction to other shifts & narration
  const [selectedCopyShiftIds, setSelectedCopyShiftIds] = useState<number[]>([]);
  const [copyToAll, setCopyToAll] = useState(false);
  const [narration, setNarration] = useState('');

  // Countdown timer for shift cutoff (e.g. 02:22:51)
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(2 * 3600 + 22 * 60 + 51);

  // Feedback states
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Generator Modals
  const [showCrossModal, setShowCrossModal] = useState(false);
  const [crossDigits, setCrossDigits] = useState<number[]>([]);
  const [crossWithJoda, setCrossWithJoda] = useState(true);
  const [crossAmount, setCrossAmount] = useState<number>(10);

  const [showFromToModal, setShowFromToModal] = useState(false);
  const [fromNum, setFromNum] = useState<number>(1);
  const [toNum, setToNum] = useState<number>(10);
  const [fromToPalti, setFromToPalti] = useState(false);
  const [fromToAmount, setFromToAmount] = useState<number>(10);

  const [showRandomModal, setShowRandomModal] = useState(false);
  const [randomNumbers, setRandomNumbers] = useState<string[]>(['']);
  const [randomAmountStr, setRandomAmountStr] = useState<string>('');
  const [randomPltAmountStr, setRandomPltAmountStr] = useState<string>('');
  const [activeRandomFocus, setActiveRandomFocus] = useState<string>('num-0');

  const [showJantriModal, setShowJantriModal] = useState(false);

  // DOM Refs for fast keyboard navigation
  const partyInputRef = useRef<HTMLInputElement>(null);
  const numberInputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch parties & shifts on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [pRes, sRes] = await Promise.all([
          apiRequest<LedgerDto[]>('/ledgers'),
          apiRequest<ShiftDto[]>('/shifts'),
        ]);

        if (sRes.data && sRes.data.length > 0) {
          setAllShifts(sRes.data);
        }

        if (pRes.data) {
          setParties(pRes.data);
        }

        // Check transactionId to load shift or party
        if (transactionId) {
          const numId = parseInt(transactionId, 10);
          if (!isNaN(numId)) {
            // 1. Direct Shift match (e.g. /transaction_add/85 where 85 is shift ID)
            const shiftMatch = sRes.data?.find((s: ShiftDto) => s.id === numId);
            if (shiftMatch) {
              setResolvedShift(shiftMatch);
              if (onSelectShift) onSelectShift(shiftMatch);
            } else {
              // 2. If not a direct shift match, check if it's a transaction ID to load
              try {
                const txRes = await apiRequest<any>(`/transactions/${numId}`);
                if (txRes.data) {
                  if (txRes.data.shiftId && sRes.data) {
                    const matchFromTx = sRes.data.find((s: ShiftDto) => s.id === txRes.data.shiftId);
                    if (matchFromTx) {
                      setResolvedShift(matchFromTx);
                      if (onSelectShift) onSelectShift(matchFromTx);
                    }
                  }
                  if (txRes.data.partyName && pRes.data) {
                    const matchingParty = pRes.data.find((p: LedgerDto) =>
                      p.partyName.toLowerCase() === txRes.data.partyName.toLowerCase()
                    );
                    if (matchingParty) {
                      setSelectedParty(matchingParty);
                      setPartySearch(matchingParty.partyName);
                    }
                  }
                }
              } catch (err) {}
            }
          }
        } else if (activeShift) {
          setResolvedShift(activeShift);
        }
      } catch (err) {
        console.warn('Failed to load initial add-transaction data:', err);
      }
    };

    loadInitialData();
  }, [transactionId]);

  // Sync activeShift prop if provided and no specific route ID was given
  useEffect(() => {
    if (!transactionId && activeShift && !resolvedShift) {
      setResolvedShift(activeShift);
    }
  }, [activeShift, transactionId, resolvedShift]);

  // Countdown timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeftSeconds(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimeLeft = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const formatDate = () => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  };

  // Filtered parties based on input
  const filteredParties = useMemo(() => {
    if (!partySearch.trim()) return parties;
    return parties.filter(p =>
      p.partyName.toLowerCase().includes(partySearch.trim().toLowerCase())
    );
  }, [parties, partySearch]);

  const handleSelectParty = (p: LedgerDto) => {
    setSelectedParty(p);
    setPartySearch(p.partyName);
    setShowPartyDropdown(false);
    numberInputRef.current?.focus();
  };

  // Grand Total calculation
  const grandTotal = useMemo(() => {
    return entriesList.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [entriesList]);

  // Add new entry (supports single entry or multiple entries separated by spaces/commas/ranges/equal)
  const handleAddEntry = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const rawNum = inputNumber.trim();
    const defaultAmt = parseFloat(inputAmount.trim());

    if (!rawNum) {
      numberInputRef.current?.focus();
      return;
    }

    // Split on commas, spaces, semicolons or newlines
    const tokens = rawNum.split(/[\s,;]+/).filter(Boolean);
    const newEntries: EntryRow[] = [];

    for (const token of tokens) {
      // Check for inline pair format: "number=amount" or "number*amount"
      if (token.includes('=') || token.includes('*')) {
        const parts = token.split(/[=*]/);
        const numPart = parts[0].trim();
        const amtPart = parseFloat(parts[1].trim());
        if (numPart && !isNaN(amtPart) && amtPart > 0) {
          let entryType: 'DARA' | 'HARUF_ANDAR' | 'HARUF_BAHAR' = 'DARA';
          if (numPart.toUpperCase().startsWith('A')) entryType = 'HARUF_ANDAR';
          else if (numPart.toUpperCase().startsWith('B')) entryType = 'HARUF_BAHAR';
          newEntries.push({ numberValue: numPart, amount: amtPart, entryType });
          continue;
        }
      }

      // Check for range format like "1-10"
      if (token.includes('-') && !token.toUpperCase().startsWith('A-') && !token.toUpperCase().startsWith('B-')) {
        const parts = token.split('-');
        const start = parseInt(parts[0], 10);
        const end = parseInt(parts[1], 10);
        if (!isNaN(start) && !isNaN(end) && start <= end && !isNaN(defaultAmt) && defaultAmt > 0) {
          for (let n = start; n <= end; n++) {
            newEntries.push({ numberValue: String(n), amount: defaultAmt, entryType: 'DARA' });
          }
          continue;
        }
      }

      // Standard entry requiring default amount
      if (isNaN(defaultAmt) || defaultAmt <= 0) {
        amountInputRef.current?.focus();
        return;
      }

      let entryType: 'DARA' | 'HARUF_ANDAR' | 'HARUF_BAHAR' = 'DARA';
      if (token.toUpperCase().startsWith('A')) entryType = 'HARUF_ANDAR';
      else if (token.toUpperCase().startsWith('B')) entryType = 'HARUF_BAHAR';
      newEntries.push({ numberValue: token, amount: defaultAmt, entryType });
    }

    if (newEntries.length > 0) {
      setEntriesList(prev => [...prev, ...newEntries]);
      setInputNumber('');
      setInputAmount('');
      numberInputRef.current?.focus();
    } else if (isNaN(defaultAmt) || defaultAmt <= 0) {
      amountInputRef.current?.focus();
    }
  };

  // Remove single entry
  const handleRemoveEntry = (index: number) => {
    setEntriesList(prev => prev.filter((_, i) => i !== index));
  };

  // Clear all
  const handleClear = () => {
    setEntriesList([]);
    setInputNumber('');
    setInputAmount('');
    setNarration('');
    setSelectedCopyShiftIds([]);
    setCopyToAll(false);
    setErrorMsg(null);
    setSuccessMsg(null);
    numberInputRef.current?.focus();
  };

  // Declared status of resolved shift
  const isShiftDeclared = !!(resolvedShift?.declaredNumber || resolvedShift?.status === 'DECLARED' || resolvedShift?.status === 'AUDITED');

  // Copy shift toggling - only non-declared shifts can be copied to
  const currentShiftName = resolvedShift?.name || activeShift?.name || 'GHAZIABAD';
  const otherShifts = useMemo(() => {
    return allShifts.filter(s =>
      s.name.toUpperCase() !== currentShiftName.toUpperCase() &&
      !s.declaredNumber &&
      s.status !== 'DECLARED' &&
      s.status !== 'AUDITED'
    );
  }, [allShifts, currentShiftName]);

  const toggleCopyShift = (shiftId: number) => {
    setSelectedCopyShiftIds(prev =>
      prev.includes(shiftId) ? prev.filter(id => id !== shiftId) : [...prev, shiftId]
    );
  };

  const toggleCopyAll = () => {
    if (copyToAll) {
      setSelectedCopyShiftIds([]);
      setCopyToAll(false);
    } else {
      setSelectedCopyShiftIds(otherShifts.map(s => s.id));
      setCopyToAll(true);
    }
  };

  // Save Now (F2)
  const handleSaveNow = async () => {
    if (isShiftDeclared) {
      setErrorMsg(`Shift "${currentShiftName}" result is already declared (${resolvedShift?.declaredNumber || 'DECLARED'}). Transactions are closed.`);
      return;
    }
    if (!selectedParty) {
      setErrorMsg('Please select a party first.');
      partyInputRef.current?.focus();
      return;
    }
    if (entriesList.length === 0) {
      setErrorMsg('Please add at least one number entry.');
      numberInputRef.current?.focus();
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const shiftIdToUse = resolvedShift?.id || activeShift?.id || (allShifts[0]?.id) || 3;
      const payload = {
        shiftId: shiftIdToUse,
        partyId: selectedParty.id,
        entries: entriesList.map(e => ({
          entryType: e.entryType,
          numberValue: e.numberValue,
          amount: e.amount,
        })),
        narration: narration.trim() || undefined,
      };

      const res = await apiRequest('/transactions', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // If copy shifts were selected, replicate to those shifts as well
      if (selectedCopyShiftIds.length > 0) {
        for (const cShiftId of selectedCopyShiftIds) {
          try {
            await apiRequest('/transactions', {
              method: 'POST',
              body: JSON.stringify({ ...payload, shiftId: cShiftId }),
            });
          } catch (err) {}
        }
      }

      setSuccessMsg('Transaction slip saved successfully!');
      setTimeout(() => {
        handleClear();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save transaction slip');
    } finally {
      setSubmitting(false);
    }
  };

  // Generator Handlers
  const handleGenerateCross = async () => {
    if (crossDigits.length < 2 || crossAmount <= 0) return;
    try {
      const res = await apiRequest<{ numberValue: string; amount: number; entryType: string }[]>(
        '/transactions/generate/cross',
        {
          method: 'POST',
          body: JSON.stringify({
            digits: crossDigits,
            withJoda: crossWithJoda,
            amount: crossAmount,
          }),
        }
      );
      if (res.data) {
        const newEntries: EntryRow[] = res.data.map(e => ({
          numberValue: e.numberValue,
          amount: e.amount,
          entryType: 'DARA',
        }));
        setEntriesList(prev => [...prev, ...newEntries]);
        setShowCrossModal(false);
      }
    } catch (err: any) {
      // Fallback local cross generation
      const digits = crossDigits;
      const generated: EntryRow[] = [];
      for (const d1 of digits) {
        for (const d2 of digits) {
          if (!crossWithJoda && d1 === d2) continue;
          generated.push({
            numberValue: `${d1}${d2}`,
            amount: crossAmount,
            entryType: 'DARA',
          });
        }
      }
      setEntriesList(prev => [...prev, ...generated]);
      setShowCrossModal(false);
    }
  };

  const handleGenerateFromTo = async () => {
    if (fromNum > toNum || fromToAmount <= 0) return;
    try {
      const res = await apiRequest<{ numberValue: string; amount: number; entryType: string }[]>(
        '/transactions/generate/from-to',
        {
          method: 'POST',
          body: JSON.stringify({
            fromNumber: fromNum,
            toNumber: toNum,
            withPalti: fromToPalti,
            amount: fromToAmount,
          }),
        }
      );
      if (res.data) {
        const newEntries: EntryRow[] = res.data.map(e => ({
          numberValue: e.numberValue,
          amount: e.amount,
          entryType: 'DARA',
        }));
        setEntriesList(prev => [...prev, ...newEntries]);
        setShowFromToModal(false);
      }
    } catch (err) {
      // Local fallback
      const generated: EntryRow[] = [];
      for (let n = fromNum; n <= toNum; n++) {
        const s = String(n).padStart(2, '0');
        generated.push({ numberValue: s, amount: fromToAmount, entryType: 'DARA' });
        if (fromToPalti && s.length === 2 && s[0] !== s[1]) {
          const rev = s[1] + s[0];
          generated.push({ numberValue: rev, amount: fromToAmount, entryType: 'DARA' });
        }
      }
      setEntriesList(prev => [...prev, ...generated]);
      setShowFromToModal(false);
    }
  };

  const handleRandomNumberChange = (index: number, val: string) => {
    setRandomNumbers(prev => {
      const updated = [...prev];
      updated[index] = val;
      if (index === updated.length - 1 && val.trim() !== '') {
        updated.push('');
      }
      return updated;
    });
  };

  const randomTotalAmount = useMemo(() => {
    const amt = parseFloat(randomAmountStr) || 0;
    const pltAmt = parseFloat(randomPltAmountStr) || 0;
    let total = 0;

    const validNumbers: string[] = [];
    for (const val of randomNumbers) {
      const parts = val.split(/[\s,;]+/).filter(Boolean);
      validNumbers.push(...parts);
    }

    for (const num of validNumbers) {
      if (amt > 0) total += amt;
      if (pltAmt > 0) {
        const cleaned = num.trim();
        if (cleaned.length === 2 && cleaned[0] !== cleaned[1]) {
          total += pltAmt;
        } else if (cleaned.length === 1) {
          total += pltAmt;
        }
      }
    }
    return total;
  }, [randomNumbers, randomAmountStr, randomPltAmountStr]);

  const handleSaveRandom = () => {
    const amt = parseFloat(randomAmountStr) || 0;
    const pltAmt = parseFloat(randomPltAmountStr) || 0;

    const validNumbers: string[] = [];
    for (const val of randomNumbers) {
      const parts = val.split(/[\s,;]+/).filter(Boolean);
      validNumbers.push(...parts);
    }

    if (validNumbers.length === 0) {
      setShowRandomModal(false);
      return;
    }

    const newEntries: EntryRow[] = [];
    for (const num of validNumbers) {
      let entryType: 'DARA' | 'HARUF_ANDAR' | 'HARUF_BAHAR' = 'DARA';
      if (num.toUpperCase().startsWith('A')) entryType = 'HARUF_ANDAR';
      else if (num.toUpperCase().startsWith('B')) entryType = 'HARUF_BAHAR';

      if (amt > 0) {
        newEntries.push({ numberValue: num, amount: amt, entryType });
      }

      if (pltAmt > 0) {
        const cleaned = num.trim();
        if (cleaned.length === 2 && cleaned[0] !== cleaned[1]) {
          const palti = cleaned[1] + cleaned[0];
          newEntries.push({ numberValue: palti, amount: pltAmt, entryType });
        } else if (cleaned.length === 1) {
          const palti = `${cleaned}0`;
          newEntries.push({ numberValue: palti, amount: pltAmt, entryType });
        }
      }
    }

    if (newEntries.length > 0) {
      setEntriesList(prev => [...prev, ...newEntries]);
    }

    setShowRandomModal(false);
    setRandomNumbers(['']);
    setRandomAmountStr('');
    setRandomPltAmountStr('');
  };

  // Keyboard Shortcuts: F2, F4, F6, F7, F8, F12, ~, Shift+Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === 'Escape') {
        e.preventDefault();
        if (window.opener) {
          window.close();
        } else if (onNavigate) {
          onNavigate('transaction-list');
        } else {
          window.location.href = '/transaction_list';
        }
        return;
      }

      if (e.key === 'F2') {
        e.preventDefault();
        handleSaveNow();
      } else if (e.key === 'F4' || e.key === 'F8') {
        e.preventDefault();
        setShowRandomModal(true);
      } else if (e.key === 'F6') {
        e.preventDefault();
        setShowCrossModal(true);
      } else if (e.key === 'F7') {
        e.preventDefault();
        setShowFromToModal(true);
      } else if (e.key === 'F12') {
        e.preventDefault();
        setShowJantriModal(true);
      } else if (e.key === '`' || e.key === '~') {
        e.preventDefault();
        numberInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [entriesList, selectedParty, selectedCopyShiftIds, narration]);

  // Rate string display
  const partyDaraRate = selectedParty?.daraRate ? Math.round(Number(selectedParty.daraRate)) : 0;
  const partyAkharRate = selectedParty?.akharRate ? Math.round(Number(selectedParty.akharRate)) : 0;

  return (
    <div className="h-screen w-screen flex flex-col bg-[#eaedf2] text-slate-900 overflow-hidden font-sans select-none">
      {/* 1. TOP BAR matching Screenshot 2, 3, 5 */}
      <div className="bg-white border-b border-slate-300 px-3 py-2 flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
        {/* Left Side: Back Arrow, Party Input, Rate, Limit, Capping, Bracket */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => {
              if (window.opener) {
                window.close();
              } else if (onNavigate) {
                onNavigate('transaction-list');
              } else {
                window.location.href = '/transaction_list';
              }
            }}
            title="Exit / Back (Shift + Esc)"
            className="p-1 text-slate-800 hover:text-black hover:bg-slate-100 rounded transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 font-bold" />
          </button>

          <span className="font-bold text-slate-800 text-xs sm:text-sm">Party</span>

          {/* Party Autocomplete Input Container */}
          <div className="relative">
            <input
              ref={partyInputRef}
              type="text"
              value={partySearch}
              onChange={(e) => {
                setPartySearch(e.target.value);
                setShowPartyDropdown(true);
                setActivePartyIndex(0);
              }}
              onFocus={() => setShowPartyDropdown(true)}
              onBlur={() => setTimeout(() => setShowPartyDropdown(false), 200)}
              placeholder="Search party..."
              className="bg-[#fef08a] border border-amber-400 font-bold text-slate-900 px-3 py-1 text-xs rounded-xs w-52 sm:w-64 focus:outline-none focus:ring-1 focus:ring-amber-500 uppercase"
              onKeyDown={(e) => {
                if (showPartyDropdown && filteredParties.length > 0) {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setActivePartyIndex(prev => (prev + 1) % filteredParties.length);
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setActivePartyIndex(prev => (prev - 1 + filteredParties.length) % filteredParties.length);
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSelectParty(filteredParties[activePartyIndex]);
                  }
                }
              }}
            />

            {/* Dropdown Menu matching Screenshot 2 */}
            {showPartyDropdown && filteredParties.length > 0 && (
              <div className="absolute top-full left-0 mt-1 w-64 sm:w-72 bg-white border border-slate-300 shadow-2xl rounded-xs z-50 max-h-60 overflow-y-auto pbmax-table-scrollbar divide-y divide-slate-100">
                {filteredParties.map((p, idx) => {
                  const isHighlighted = idx === activePartyIndex;
                  return (
                    <div
                      key={p.id}
                      onMouseDown={() => handleSelectParty(p)}
                      className={`px-3 py-1.5 text-xs uppercase cursor-pointer transition-colors ${
                        isHighlighted
                          ? 'bg-[#eab308] text-white font-bold'
                          : 'bg-white hover:bg-amber-50 text-slate-800 font-semibold'
                      }`}
                    >
                      {p.partyName}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Rate Pill */}
          <div className="bg-[#f97316] text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap shadow-xs">
            Rate: {partyDaraRate ? `${partyDaraRate}/10-${partyAkharRate}/10` : '0/0-0/0'}
          </div>

          {/* Limit Pill */}
          <div className="bg-[#f97316] text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap shadow-xs">
            Limit: {selectedParty?.betLimit ? Number(selectedParty.betLimit).toLocaleString('en-IN') : 0}
          </div>

          {/* Capping Pill */}
          <div className="bg-[#ef4444] text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap shadow-xs">
            Capping: 0
          </div>

          {/* Bracket Pill */}
          <div className="bg-[#f97316] text-white text-xs font-bold px-2.5 py-1 rounded-full cursor-pointer shadow-xs select-none">
            [ ]
          </div>
        </div>

        {/* Right Side: Date & Time Left */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="bg-[#ef4444] text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap shadow-xs">
            Date: {formatDate()}
          </div>
          <div className="bg-[#16a34a] text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap shadow-xs font-mono">
            Time Left: {formatTimeLeft(timeLeftSeconds)}
          </div>
        </div>
      </div>

      {/* Success / Error Toast Notification */}
      {successMsg && (
        <div className="bg-emerald-600 text-white text-xs font-bold py-1.5 px-4 text-center animate-in fade-in flex-shrink-0">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="bg-rose-600 text-white text-xs font-bold py-1.5 px-4 text-center animate-in fade-in flex-shrink-0">
          {errorMsg}
        </div>
      )}

      {/* 2. MAIN WORKSPACE (3 Columns) matching Screenshot 2 & 3 */}
      <div className="flex-1 flex overflow-hidden bg-white">
        {/* COLUMN 1: Left - Entry Input & Table matching Screenshot 1 & 2 */}
        <div className="w-64 sm:w-72 flex flex-col border-r border-slate-300 bg-white flex-shrink-0">
          {/* Top Form Header with NUMBER, AMOUNT, and + */}
          <form
            onSubmit={handleAddEntry}
            className="flex items-center gap-1.5 p-2 flex-shrink-0"
          >
            <input
              ref={numberInputRef}
              type="text"
              value={inputNumber}
              onChange={(e) => setInputNumber(e.target.value)}
              placeholder="NUMBER"
              className="flex-1 min-w-0 h-8 bg-[#fef08a] border-2 border-[#1b3258] text-center font-bold text-xs text-slate-900 outline-none uppercase placeholder:text-slate-400 rounded-xs"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  amountInputRef.current?.focus();
                }
              }}
            />
            <input
              ref={amountInputRef}
              type="number"
              value={inputAmount}
              onChange={(e) => setInputAmount(e.target.value)}
              placeholder="AMOUNT"
              className="flex-1 min-w-0 h-8 bg-white border-2 border-[#1b3258] text-center font-bold text-xs text-slate-900 outline-none placeholder:text-slate-400 rounded-xs"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddEntry();
                }
              }}
            />
            <button
              type="submit"
              title="Add Entry (+)"
              className="w-8 h-8 flex-shrink-0 bg-[#00897b] hover:bg-[#00796b] active:bg-[#00695c] text-white flex items-center justify-center font-bold text-lg border-2 border-[#1b3258] rounded-xs cursor-pointer shadow-xs transition-colors"
            >
              +
            </button>
          </form>

          {/* Table Rows matching Screenshot 2 & 3 */}
          <div className="flex-1 overflow-y-auto pbmax-table-scrollbar px-2">
            <table className="w-full text-xs font-mono border-collapse">
              <tbody>
                {entriesList.map((entry, idx) => (
                  <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="py-1 px-2 font-bold text-center text-slate-900 text-xs w-[44%] border-r border-slate-100">
                      {entry.numberValue}
                    </td>
                    <td className="py-1 px-2 font-bold text-center text-slate-900 text-xs w-[44%] border-r border-slate-100">
                      {entry.amount}
                    </td>
                    <td className="py-1 px-1 text-center w-[12%] min-w-[34px]">
                      <button
                        type="button"
                        onClick={() => handleRemoveEntry(idx)}
                        className="w-7 h-6 bg-[#dc2626] hover:bg-[#b91c1c] text-white text-[11px] font-bold rounded-xs cursor-pointer shadow-xs flex items-center justify-center mx-auto"
                        title="Delete"
                      >
                        x
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* COLUMN 2: Center - Instructions & Total Count */}
        <div className="flex-1 flex flex-col border-r border-slate-300 bg-white overflow-y-auto">
          {/* Header matching Screenshot 2 */}
          <div className="bg-[#1b3258] text-white font-bold text-xs py-2 px-3 tracking-wide flex-shrink-0">
            Utar Mode Instructions
          </div>

          {/* Instructions List */}
          <div className="p-4 text-xs text-slate-800 space-y-3 font-medium flex-shrink-0">
            <div>1. Dara Number: should be 1 to 100</div>
            <div>2. Bahar Akhar Number: should be 000 to 999</div>
            <div>3. Andar Akhar Number: should be 0000 to 9999</div>
            <div>4. Press F12 for Jantri View</div>
            <div>5. Press &apos;~&apos; for Re-Focus</div>
          </div>

          {/* Center Prominent Indicator: Total Count matching Screenshot 2 & 3 */}
          <div className="flex-1 flex items-center justify-center my-12 sm:my-20">
            <div className="text-sm sm:text-base font-bold text-slate-800 tracking-wide">
              Total Count : {entriesList.length}
            </div>
          </div>
        </div>

        {/* COLUMN 3: Right - Shift Copy, Narration, Grand Total */}
        <div className="w-72 sm:w-80 flex flex-col bg-white flex-shrink-0">
          {/* Header matching Screenshot 2 (green for LIVE, pink for DECLARED) */}
          <div className={`${isShiftDeclared ? 'bg-[#ec135d]' : 'bg-[#22c55e]'} text-white font-bold text-center py-2 text-sm uppercase tracking-wide flex-shrink-0 shadow-xs`}>
            {currentShiftName} {isShiftDeclared ? `[RESULT: ${resolvedShift?.declaredNumber || 'DECLARED'}]` : '[LIVE]'}
          </div>

          {/* Tick Shift for Copy Transaction Header */}
          <div className="bg-[#1b3258] text-white text-xs font-bold py-1.5 px-3 flex items-center gap-2 flex-shrink-0">
            <input
              type="checkbox"
              id="tick-all"
              checked={copyToAll}
              onChange={toggleCopyAll}
              className="rounded cursor-pointer"
            />
            <label htmlFor="tick-all" className="cursor-pointer">
              Tick Shift for Copy Transaction
            </label>
          </div>

          {/* Copy Shifts Checkboxes matching Screenshot 2 */}
          <div className="divide-y divide-slate-200 border-b border-slate-300">
            {otherShifts.map((s) => (
              <label
                key={s.id}
                className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-800 uppercase hover:bg-slate-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedCopyShiftIds.includes(s.id)}
                  onChange={() => toggleCopyShift(s.id)}
                  className="rounded cursor-pointer"
                />
                <span>{s.name}</span>
              </label>
            ))}
          </div>

          {/* Applied Narration Header */}
          <div className="bg-[#1b3258] text-white text-xs font-bold py-1.5 px-3 flex-shrink-0">
            Applied Narration
          </div>

          {/* Narration Textarea */}
          <div className="p-2 border-b border-slate-300">
            <textarea
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
              rows={3}
              placeholder="Remarks / Narration..."
              className="w-full p-2 text-xs border border-slate-300 rounded-xs focus:outline-none focus:border-blue-500 font-mono resize-none"
            />
          </div>

          {/* Spacer */}
          <div className="flex-1 bg-white"></div>

          {/* Grand Total Red Banner matching Screenshot 2 & 3 */}
          <div className="bg-[#dc2626] text-white font-bold text-center py-2.5 text-base tracking-wide flex-shrink-0 shadow-sm">
            Grand Total: {grandTotal}
          </div>
        </div>
      </div>

      {/* 3. BOTTOM ACTION BAR matching Screenshot 2 & 3 */}
      <div className="bg-[#152847] px-4 py-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-400 flex-shrink-0">
        {/* Left: Need Help? & Shift + Esc */}
        <div className="flex items-center gap-3">
          <span className="text-[#fde047] font-bold text-xs cursor-pointer hover:underline">
            Need Help?
          </span>
          <span className="text-white text-xs font-mono">
            [ shift + esc = Exit ]
          </span>
        </div>

        {/* Right: Generator & Save Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowRandomModal(true)}
            className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-bold px-3 py-1.5 rounded cursor-pointer transition-colors shadow-xs"
          >
            Random (F4)
          </button>
          <button
            type="button"
            onClick={() => setShowCrossModal(true)}
            className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-bold px-3 py-1.5 rounded cursor-pointer transition-colors shadow-xs"
          >
            Cross (F6)
          </button>
          <button
            type="button"
            onClick={() => setShowFromToModal(true)}
            className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-bold px-3 py-1.5 rounded cursor-pointer transition-colors shadow-xs"
          >
            From-To (F7)
          </button>
          <button
            type="button"
            onClick={() => setShowRandomModal(true)}
            className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-bold px-3 py-1.5 rounded cursor-pointer transition-colors shadow-xs"
          >
            Random (F8)
          </button>
          <button
            type="button"
            disabled={submitting || isShiftDeclared}
            onClick={handleSaveNow}
            className={`text-white text-xs font-bold px-4 py-1.5 rounded transition-colors shadow-xs ${
              isShiftDeclared
                ? 'bg-slate-500 cursor-not-allowed opacity-75'
                : 'bg-[#00897b] hover:bg-[#00796b] cursor-pointer'
            } disabled:opacity-50`}
          >
            {submitting ? 'Saving...' : isShiftDeclared ? 'Result Declared' : 'Save Now (F2)'}
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="bg-[#eab308] hover:bg-[#ca8a04] text-white text-xs font-bold px-4 py-1.5 rounded cursor-pointer transition-colors shadow-xs"
          >
            Clear
          </button>
        </div>
      </div>

      {/* GENERATOR MODAL 1: Cross Generator (F6) */}
      {showCrossModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 z-50 animate-in fade-in">
          <div className="bg-white rounded-lg shadow-2xl max-w-sm w-full overflow-hidden border border-slate-300">
            <div className="bg-[#152847] text-white px-4 py-2 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider">Crossing Number Generator (F6)</h3>
              <button
                type="button"
                onClick={() => setShowCrossModal(false)}
                className="text-slate-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Select Digits (0 - 9):</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {Array.from({ length: 10 }, (_, i) => {
                    const isSelected = crossDigits.includes(i);
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setCrossDigits(prev =>
                            prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i]
                          );
                        }}
                        className={`py-1.5 rounded font-bold font-mono transition-colors ${
                          isSelected
                            ? 'bg-[#152847] text-white'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
                        }`}
                      >
                        {i}
                      </button>
                    );
                  })}
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={crossWithJoda}
                  onChange={(e) => setCrossWithJoda(e.target.checked)}
                  className="rounded"
                />
                <span>Include Joda (e.g. 11, 22, 33)</span>
              </label>
              <div>
                <label className="block text-slate-700 font-bold mb-1">Amount per number:</label>
                <input
                  type="number"
                  value={crossAmount}
                  onChange={(e) => setCrossAmount(Number(e.target.value))}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono font-bold"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCrossModal(false)}
                  className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleGenerateCross}
                  disabled={crossDigits.length < 2}
                  className="px-4 py-1.5 bg-[#00897b] hover:bg-[#00796b] text-white font-bold rounded disabled:opacity-50"
                >
                  Generate & Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GENERATOR MODAL 2: From-To Generator (F7) */}
      {showFromToModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 z-50 animate-in fade-in">
          <div className="bg-white rounded-lg shadow-2xl max-w-sm w-full overflow-hidden border border-slate-300">
            <div className="bg-[#152847] text-white px-4 py-2 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider">From-To Sequence Generator (F7)</h3>
              <button
                type="button"
                onClick={() => setShowFromToModal(false)}
                className="text-slate-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">From Number:</label>
                  <input
                    type="number"
                    min={0}
                    max={99}
                    value={fromNum}
                    onChange={(e) => setFromNum(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">To Number:</label>
                  <input
                    type="number"
                    min={0}
                    max={99}
                    value={toNum}
                    onChange={(e) => setToNum(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono font-bold"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={fromToPalti}
                  onChange={(e) => setFromToPalti(e.target.checked)}
                  className="rounded"
                />
                <span>Include Palti (Reverse Digits)</span>
              </label>
              <div>
                <label className="block text-slate-700 font-bold mb-1">Amount per number:</label>
                <input
                  type="number"
                  value={fromToAmount}
                  onChange={(e) => setFromToAmount(Number(e.target.value))}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono font-bold"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFromToModal(false)}
                  className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleGenerateFromTo}
                  className="px-4 py-1.5 bg-[#00897b] hover:bg-[#00796b] text-white font-bold rounded"
                >
                  Generate & Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GENERATOR MODAL 3: Random Generator matching Screenshot 1 & 3 */}
      {showRandomModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-xs shadow-2xl w-full max-w-[340px] overflow-hidden border border-slate-300">
            {/* Header */}
            <div className="bg-[#24497e] text-white px-4 py-2.5 flex items-center justify-between">
              <h3 className="text-sm font-bold tracking-wide">Random</h3>
              <button
                type="button"
                onClick={() => setShowRandomModal(false)}
                className="text-white/80 hover:text-white p-0.5 cursor-pointer"
              >
                <X className="w-4 h-4 font-bold" />
              </button>
            </div>

            <div className="p-4">
              {/* Scrollable Fields matching Screenshot 1 & 3 */}
              <div className="max-h-56 overflow-y-auto pr-1 pbmax-table-scrollbar space-y-2">
                {/* Dynamic NUMBER inputs */}
                {randomNumbers.map((numVal, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-3">
                    <label className="font-bold text-xs text-slate-800 uppercase tracking-wider w-28 text-right">
                      NUMBER
                    </label>
                    <input
                      type="text"
                      value={numVal}
                      onChange={(e) => handleRandomNumberChange(idx, e.target.value)}
                      onFocus={() => setActiveRandomFocus(`num-${idx}`)}
                      className={`w-32 h-7 text-center font-bold text-sm border border-slate-300 rounded-xs outline-none uppercase font-mono transition-colors ${
                        activeRandomFocus === `num-${idx}` ? 'bg-[#fde68a] border-amber-400' : 'bg-white'
                      }`}
                      placeholder=""
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (idx === randomNumbers.length - 1 && numVal.trim() === '') {
                            const amtEl = document.getElementById('random-amount-input');
                            amtEl?.focus();
                          }
                        }
                      }}
                    />
                  </div>
                ))}

                {/* AMOUNT input */}
                <div className="flex items-center justify-between gap-3">
                  <label className="font-bold text-xs text-slate-800 uppercase tracking-wider w-28 text-right">
                    AMOUNT
                  </label>
                  <input
                    id="random-amount-input"
                    type="number"
                    value={randomAmountStr}
                    onChange={(e) => setRandomAmountStr(e.target.value)}
                    onFocus={() => setActiveRandomFocus('amount')}
                    placeholder="AMOUNT"
                    className={`w-32 h-7 text-center font-bold text-sm border border-slate-300 rounded-xs outline-none font-mono placeholder:text-slate-300 placeholder:text-xs uppercase transition-colors ${
                      activeRandomFocus === 'amount' ? 'bg-[#fde68a] border-amber-400' : 'bg-white'
                    }`}
                  />
                </div>

                {/* PLT-AMOUNT input */}
                <div className="flex items-center justify-between gap-3">
                  <label className="font-bold text-xs text-slate-800 uppercase tracking-wider w-28 text-right">
                    PLT-AMOUNT
                  </label>
                  <input
                    type="number"
                    value={randomPltAmountStr}
                    onChange={(e) => setRandomPltAmountStr(e.target.value)}
                    onFocus={() => setActiveRandomFocus('plt-amount')}
                    placeholder="PLT-AMOUNT"
                    className={`w-32 h-7 text-center font-bold text-sm border border-slate-300 rounded-xs outline-none font-mono placeholder:text-slate-300 placeholder:text-xs uppercase transition-colors ${
                      activeRandomFocus === 'plt-amount' ? 'bg-[#fde68a] border-amber-400' : 'bg-white'
                    }`}
                  />
                </div>
              </div>

              {/* TOTAL AMOUNT matching Screenshot 1 & 3 */}
              <div className="text-center font-bold text-xs text-slate-800 my-3 tracking-wide">
                TOTAL AMOUNT : {randomTotalAmount}
              </div>

              {/* Bottom Buttons matching Screenshot 1 & 3 */}
              <div className="border-t border-slate-200 pt-3 flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={handleSaveRandom}
                  className="bg-[#24497e] hover:bg-[#1a355c] text-white font-bold text-xs px-6 py-1.5 rounded-xs transition-colors shadow-xs cursor-pointer"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setShowRandomModal(false)}
                  className="text-slate-700 hover:text-black font-bold text-xs px-3 py-1.5 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QUICK JANTRI MODAL (F12) */}
      {showJantriModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 z-50 animate-in fade-in">
          <div className="bg-[#1b3258] rounded-lg shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-500">
            <div className="bg-[#1b3258] text-white px-4 py-2.5 flex items-center justify-between border-b border-[#294979]">
              <h3 className="text-xs font-bold uppercase tracking-wider">
                Quick Jantri Preview ({selectedParty?.partyName || 'CURRENT SLIP'})
              </h3>
              <button
                type="button"
                onClick={() => setShowJantriModal(false)}
                className="text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-white p-3 overflow-x-auto">
              <div className="grid grid-cols-10 gap-1 font-mono text-center">
                {Array.from({ length: 100 }, (_, i) => {
                  const num = i + 1;
                  const numStr = String(num);
                  const numPadded = num < 100 ? String(num).padStart(2, '0') : '00';
                  const match = entriesList.filter(
                    e => e.numberValue === numStr || e.numberValue === numPadded
                  );
                  const sum = match.reduce((a, b) => a + b.amount, 0);
                  return (
                    <div
                      key={num}
                      className={`relative h-10 border flex items-center justify-center rounded-xs ${
                        sum > 0
                          ? 'bg-amber-100 border-amber-400 text-slate-900 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-400'
                      }`}
                    >
                      <span className="absolute top-0.5 left-0.5 text-[8px] font-bold px-1 rounded-xs bg-[#fef9c3] text-[#854d0e]">
                        {num}
                      </span>
                      {sum > 0 && <span className="text-xs font-bold">{sum}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
