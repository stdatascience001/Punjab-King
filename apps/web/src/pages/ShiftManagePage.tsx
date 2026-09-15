import React, { useState, useEffect, useRef } from 'react';
import { ShiftDto } from '@pb/types';
import { apiRequest } from '../api/client.js';
import { Clock, X, Edit2, ChevronDown } from 'lucide-react';

interface ShiftManagePageProps {
  shifts: ShiftDto[];
  onRefreshShifts: () => void;
}

const ALL_ROLES = [
  { id: 1, name: 'DEVELOPER' },
  { id: 2, name: 'SUPER ADMIN' },
  { id: 3, name: 'Distributor' },
  { id: 4, name: 'Retailer' },
  { id: 5, name: 'Fanter' },
  { id: 6, name: 'Cash Agent' },
  { id: 7, name: 'ADMIN' },
  { id: 8, name: 'MANAGER' },
  { id: 9, name: 'MARKETER' },
  { id: 10, name: 'AUDITOR' },
  { id: 11, name: 'DATA ENTRY OPERATOR' },
  { id: 12, name: 'TALLY OPERATOR' },
];

export const ShiftManagePage: React.FC<ShiftManagePageProps> = ({ shifts, onRefreshShifts }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingShift, setEditingShift] = useState<ShiftDto | null>(null);
  const [activeActionDropdownId, setActiveActionDropdownId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // Modal Form state matching Image 4
  const [shiftName, setShiftName] = useState('');
  const [openDate, setOpenDate] = useState('08-09-2026');
  const [nextDay, setNextDay] = useState('NO');
  const [shiftFor, setShiftFor] = useState('Both');
  const [roleTimings, setRoleTimings] = useState<{ [roleName: string]: string }>({
    'DEVELOPER': '20:44',
    'SUPER ADMIN': '20:44',
    'Distributor': '20:44',
    'Retailer': '20:44',
    'Fanter': '20:44',
    'Cash Agent': '20:44',
    'ADMIN': '20:44',
    'MANAGER': '20:44',
    'MARKETER': '20:44',
    'AUDITOR': '20:44',
    'DATA ENTRY OPERATOR': '20:44',
    'TALLY OPERATOR': '20:44',
  });

  // F2 Keyboard Shortcut to Open Add Shift Modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        handleOpenAdd();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close Action dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.action-dropdown-container')) {
        setActiveActionDropdownId(null);
      }
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const handleOpenAdd = () => {
    setEditingShift(null);
    setShiftName('');
    setOpenDate('08-09-2026');
    setNextDay('NO');
    setShiftFor('Both');
    const defaultTimings: { [roleName: string]: string } = {};
    ALL_ROLES.forEach(r => {
      defaultTimings[r.name] = '20:44';
    });
    setRoleTimings(defaultTimings);
    setShowModal(true);
  };

  const handleOpenEdit = (s: ShiftDto) => {
    setEditingShift(s);
    setShiftName(s.name);

    let displayDate = s.openDate;
    if (s.openDate && s.openDate.includes('-')) {
      const parts = s.openDate.split('-');
      if (parts.length === 3 && parts[0].length === 4) {
        displayDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }
    setOpenDate(displayDate);
    setNextDay(s.isNextDay ? 'YES' : 'NO');
    setShiftFor(s.shiftFor || 'Both');

    const timings: { [roleName: string]: string } = {};
    ALL_ROLES.forEach(r => {
      const found = s.roleConfigs?.find(rc => rc.roleId === r.id);
      if (found && found.closeTime) {
        timings[r.name] = found.closeTime.slice(0, 5);
      } else {
        timings[r.name] = '20:44';
      }
    });
    setRoleTimings(timings);
    setShowModal(true);
  };

  const handleTimeChange = (role: string, val: string) => {
    setRoleTimings(prev => ({ ...prev, [role]: val }));
  };

  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftName.trim()) return;

    setLoading(true);
    try {
      // Map roleTimings to backend roleConfigs
      const roleConfigs = ALL_ROLES.map(r => {
        const time = roleTimings[r.name] || '20:44';
        return {
          roleId: r.id,
          openTime: '09:00:00',
          closeTime: time.includes(':') ? (time.split(':').length === 2 ? `${time}:00` : time) : '20:44:00',
          isActive: true,
        };
      });

      // Format openDate to YYYY-MM-DD for backend
      let formattedBackendDate = openDate;
      if (openDate.includes('-')) {
        const parts = openDate.split('-');
        if (parts.length === 3 && parts[0].length === 2) {
          formattedBackendDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
      }

      if (editingShift) {
        // Update existing shift
        await apiRequest(`/shifts/${editingShift.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: shiftName.trim().toUpperCase(),
            openDate: formattedBackendDate,
            isNextDay: nextDay === 'YES',
            shiftFor,
            roleConfigs,
          }),
        });
      } else {
        // Create new shift
        await apiRequest('/shifts', {
          method: 'POST',
          body: JSON.stringify({
            name: shiftName.trim().toUpperCase(),
            openDate: formattedBackendDate,
            isNextDay: nextDay === 'YES',
            shiftFor,
            roleConfigs,
          }),
        });
      }

      setShowModal(false);
      setEditingShift(null);
      setShiftName('');
      onRefreshShifts();
    } catch (err: any) {
      alert(err.message || (editingShift ? 'Failed to update shift' : 'Failed to create shift'));
    } finally {
      setLoading(false);
    }
  };


  const handleToggleActive = async (id: number) => {
    try {
      await apiRequest(`/shifts/${id}/toggle-active`, { method: 'PATCH' });
      onRefreshShifts();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle active status');
    }
  };

  // Filter shifts dynamically based on search term
  const filteredShifts = shifts.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.openDate.includes(searchTerm)
  );

  return (
    <div className="min-h-full bg-[#eaedf2] p-4 sm:p-5 flex flex-col justify-between text-slate-800 select-none">
      {/* Container Box matching Image 3 */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        {/* Subheader Filter Bar */}
        <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <span className="font-bold text-sm text-slate-800">Shift</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600 font-medium">Search</span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder=""
                className="w-48 sm:w-64 px-3 py-1.5 bg-[#fef08a] border border-amber-300 rounded text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <button
            onClick={handleOpenAdd}
            className="px-5 py-2 bg-[#1662c6] hover:bg-[#1354ab] active:bg-[#0f4691] text-white font-bold text-xs rounded shadow transition-colors flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
          >
            <span>Add (F2)</span>
          </button>
        </div>

        {/* Shift Data Table matching Image 3 */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#152847] text-white font-bold text-xs">
                <th className="py-2.5 px-3 border-r border-[#223b63] w-14 text-center">Sr. No</th>
                <th className="py-2.5 px-4 border-r border-[#223b63]">Shift Name</th>
                <th className="py-2.5 px-4 border-r border-[#223b63] text-center">Open Date</th>
                <th className="py-2.5 px-3 border-r border-[#223b63] text-center">Next Day</th>
                <th className="py-2.5 px-3 border-r border-[#223b63] text-center">Shift For</th>
                <th className="py-2.5 px-3 border-r border-[#223b63] text-center">IsActive</th>
                <th className="py-2.5 px-4 border-r border-[#223b63] text-center">Updated By</th>
                <th className="py-2.5 px-4 border-r border-[#223b63] text-center">Updated Date</th>
                <th className="py-2.5 px-3 text-center w-24">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans text-xs">
              {filteredShifts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No shifts found matching your search.
                  </td>
                </tr>
              ) : (
                filteredShifts.map((s, idx) => {
                  const isActive = s.isActive !== false;
                  // Format open date nicely like DD-MM-YYYY
                  let displayDate = s.openDate;
                  if (s.openDate.includes('-')) {
                    const parts = s.openDate.split('-');
                    if (parts.length === 3 && parts[0].length === 4) {
                      displayDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
                    }
                  }

                  return (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 text-center font-mono text-slate-600 border-r border-slate-100">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-4 border-r border-slate-100">
                        <div className="flex items-center justify-between gap-2 group">
                          <span
                            onClick={() => handleOpenEdit(s)}
                            className="font-bold text-slate-800 uppercase tracking-wide cursor-pointer hover:text-blue-700 transition-colors"
                            title="Click to edit shift name"
                          >
                            {s.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(s)}
                            className="opacity-70 group-hover:opacity-100 text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded transition-all cursor-pointer"
                            title={`Edit Shift Name: ${s.name}`}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-center font-mono text-slate-600 border-r border-slate-100">
                        {displayDate}
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-600 border-r border-slate-100">
                        {s.isNextDay ? 'Yes' : 'No'}
                      </td>
                      <td className="py-2.5 px-3 text-center font-semibold text-slate-600 border-r border-slate-100">
                        {s.shiftFor || 'BOTH'}
                      </td>
                      <td className="py-2.5 px-3 text-center border-r border-slate-100">
                        <span
                          onClick={() => handleToggleActive(s.id)}
                          className={`cursor-pointer px-3 py-0.5 rounded-full text-[10px] font-bold uppercase transition-transform active:scale-95 inline-block ${
                            isActive
                              ? 'bg-[#00897b] text-white shadow-sm'
                              : 'bg-[#d32f2f] text-white shadow-sm'
                          }`}
                        >
                          {isActive ? 'ACTIVE' : 'DEACTIVE'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-center text-slate-600 font-semibold border-r border-slate-100">
                        {s.updatedBy || 'A100'}
                      </td>
                      <td className="py-2.5 px-4 text-center text-slate-500 font-mono text-[11px] border-r border-slate-100">
                        {s.updatedAt ? new Date(s.updatedAt).toLocaleString('en-GB') : '08-09-2026 20:42 PM'}
                      </td>
                      <td className="py-2.5 px-3 text-center relative">
                        <div className="action-dropdown-container relative inline-block text-left">
                          <button
                            type="button"
                            onClick={() => setActiveActionDropdownId(activeActionDropdownId === s.id ? null : s.id)}
                            className="px-3 py-1 bg-[#1662c6] hover:bg-[#1354ab] text-white rounded text-[11px] font-bold shadow-sm inline-flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <span>Action</span>
                            <ChevronDown className="w-3 h-3" />
                          </button>
                          {activeActionDropdownId === s.id && (
                            <div className="absolute right-0 mt-1 w-36 bg-white border border-slate-200 rounded shadow-xl z-30 py-1 text-left animate-in fade-in duration-100 divide-y divide-slate-100">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveActionDropdownId(null);
                                  handleOpenEdit(s);
                                }}
                                className="w-full px-3 py-2 text-xs text-slate-800 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 font-semibold cursor-pointer text-left"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                                <span>Edit Shift</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveActionDropdownId(null);
                                  handleToggleActive(s.id);
                                }}
                                className="w-full px-3 py-2 text-xs text-slate-800 hover:bg-slate-50 flex items-center gap-2 font-semibold cursor-pointer text-left"
                              >
                                <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-red-500' : 'bg-green-500'}`} />
                                <span>{isActive ? 'Deactivate' : 'Activate'}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* Table Footer matching Image 3 */}
            <tfoot>
              <tr className="bg-[#152847] text-white font-bold text-xs">
                <th className="py-2 px-3 border-r border-[#223b63] text-center">Sr. No</th>
                <th className="py-2 px-4 border-r border-[#223b63]">Shift Name</th>
                <th className="py-2 px-4 border-r border-[#223b63] text-center">Open Date</th>
                <th className="py-2 px-3 border-r border-[#223b63] text-center">Next Day</th>
                <th className="py-2 px-3 border-r border-[#223b63] text-center">Shift For</th>
                <th className="py-2 px-3 border-r border-[#223b63] text-center">IsActive</th>
                <th className="py-2 px-4 border-r border-[#223b63] text-center">Updated By</th>
                <th className="py-2 px-4 border-r border-[#223b63] text-center">Updated Date</th>
                <th className="py-2 px-3 text-center">Action</th>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Bottom Help Note */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-slate-500 text-xs font-semibold">
          Need Help?
        </div>
      </div>

      {/* Add / Edit Shift Modal matching Image 4 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-300">
            {/* Modal Header matching Image 4 */}
            <div className="bg-[#1b2b48] text-white px-5 py-3 flex items-center justify-between">
              <h2 className="text-base font-bold tracking-wide">
                {editingShift ? `Edit Shift: ${editingShift.name}` : 'Add Shift'}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setEditingShift(null);
                }}
                className="text-white hover:text-slate-300 transition-colors p-1 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body matching Image 4 */}
            <form onSubmit={handleSaveShift} className="p-5 space-y-4 text-xs">
              {/* Top Row: 4 Input Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                {/* Shift Name */}
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Shift Name</label>
                  <input
                    type="text"
                    required
                    value={shiftName}
                    onChange={(e) => setShiftName(e.target.value)}
                    placeholder=""
                    className="w-full px-3 py-1.5 bg-[#fef08a] border border-amber-300 rounded text-slate-900 font-bold focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs uppercase"
                  />
                </div>

                {/* Open Date */}
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Open Date</label>
                  <input
                    type="text"
                    value={openDate}
                    onChange={(e) => setOpenDate(e.target.value)}
                    placeholder="08-09-2026"
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-slate-800 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Next Day */}
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Next Day</label>
                  <select
                    value={nextDay}
                    onChange={(e) => setNextDay(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-slate-800 text-xs focus:outline-none focus:border-blue-500"
                  >
                    <option value="NO">NO</option>
                    <option value="YES">YES</option>
                  </select>
                </div>

                {/* Shift Working For */}
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Shift Working For</label>
                  <select
                    value={shiftFor}
                    onChange={(e) => setShiftFor(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-slate-800 text-xs focus:outline-none focus:border-blue-500"
                  >
                    <option value="Both">Both</option>
                    <option value="Manual">Manual</option>
                    <option value="Auto">Auto</option>
                  </select>
                </div>
              </div>

              {/* 12 Role Cut-Off Timings Grid (3 rows x 4 cols) matching Image 4 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                {ALL_ROLES.map(role => (
                  <div key={role.id}>
                    <label className="block text-slate-600 font-semibold mb-1 text-[11px] truncate">
                      {role.name}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={roleTimings[role.name] || '20:44'}
                        onChange={(e) => handleTimeChange(role.name, e.target.value)}
                        className="w-full pl-3 pr-8 py-1.5 bg-white border border-slate-300 rounded text-slate-800 font-mono text-xs focus:outline-none focus:border-blue-500 text-center"
                      />
                      <Clock className="absolute right-2.5 top-2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Modal Footer Buttons matching Image 4 */}
              <div className="flex justify-end items-center gap-3 pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-[#1b3a6d] hover:bg-[#152e57] text-white font-bold rounded text-xs transition-colors shadow-sm cursor-pointer"
                >
                  {loading ? (editingShift ? 'Updating...' : 'Saving...') : (editingShift ? 'Update Shift' : 'Save')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingShift(null);
                  }}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 font-bold text-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
