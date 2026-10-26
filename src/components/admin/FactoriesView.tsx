import React, { useState } from 'react';
import { Factory, DashboardStats } from '../../types';
import { api } from '../../services/api';
import { Building2, Plus, Edit2, Power, Search, AlertCircle, AlertTriangle, X, CheckCircle2 } from 'lucide-react';

interface FactoriesViewProps {
  factories: Factory[];
  stats: DashboardStats | null;
  onRefresh: () => void;
}

export const FactoriesView: React.FC<FactoriesViewProps> = ({
  factories,
  stats,
  onRefresh,
}) => {
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingFactory, setEditingFactory] = useState<Factory | null>(null);
  const [togglingFactory, setTogglingFactory] = useState<Factory | null>(null);

  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [editName, setEditName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Map counts per factory
  const countMap: Record<string, number> = {};
  if (stats?.factoryStats) {
    stats.factoryStats.forEach((fs) => {
      countMap[fs.factoryId] = fs.count;
    });
  }

  const filtered = factories.filter((f) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return f.name.toLowerCase().includes(q) || f.code.toLowerCase().includes(q);
  });

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!newCode.trim() || !newName.trim()) {
      setError('กรุณากรอกรหัสและชื่อโรงงานให้ครบถ้วน');
      return;
    }

    setLoading(true);
    try {
      await api.addFactory({
        code: newCode.trim().toUpperCase(),
        name: newName.trim(),
      });
      setIsAddOpen(false);
      setNewCode('');
      setNewName('');
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'เพิ่มโรงงานไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFactory || !editName.trim()) return;

    setLoading(true);
    setError(null);
    try {
      await api.updateFactory(editingFactory.id, { name: editName.trim() });
      setEditingFactory(null);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'แก้ไขข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!togglingFactory) return;
    setLoading(true);
    try {
      await api.setFactoryStatus(togglingFactory.id, !togglingFactory.active);
      setTogglingFactory(null);
      onRefresh();
    } catch (err: any) {
      alert('เปลี่ยนสถานะไม่สำเร็จ: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Add Action */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">จัดการข้อมูลโรงงานและสาขา (Factories)</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            โรงงานที่เปิดใช้งาน (Active) จะปรากฏในตัวเลือกของแบบฟอร์มลงทะเบียนพนักงาน
          </p>
        </div>

        <button
          onClick={() => {
            setIsAddOpen(true);
            setError(null);
          }}
          className="px-4 py-2.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>เพิ่มโรงงานใหม่</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาตามชื่อ หรือรหัสโรงงาน..."
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
          />
        </div>
      </div>

      {/* Factories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((fac) => {
          const registeredCount = countMap[fac.id] || 0;
          return (
            <div
              key={fac.id}
              className={`bg-white border rounded-2xl p-5 shadow-xs flex flex-col justify-between transition-all ${
                fac.active ? 'border-slate-200 hover:border-slate-300' : 'border-slate-200/60 bg-slate-50/50 opacity-80'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-md">
                    {fac.code}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      fac.active
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}
                  >
                    {fac.active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 mb-1">{fac.name}</h3>
                <p className="text-xs text-slate-500 mb-4">รหัสระบบ: {fac.id}</p>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs mb-4">
                  <span className="text-slate-600">พนักงานที่ลงทะเบียน:</span>
                  <span className="font-bold text-slate-900 tabular-nums">
                    {registeredCount.toLocaleString()} คน
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => {
                    setEditingFactory(fac);
                    setEditName(fac.name);
                    setError(null);
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>แก้ไขชื่อ</span>
                </button>

                <button
                  onClick={() => setTogglingFactory(fac)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                    fac.active
                      ? 'text-rose-600 hover:bg-rose-50'
                      : 'text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>{fac.active ? 'ปิดรับสาขานี้' : 'เปิดใช้งาน'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Snapshot preservation notice */}
      <div className="p-4 bg-amber-50/60 border border-amber-200/70 rounded-2xl text-xs text-amber-900 flex items-start gap-2.5">
        <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold block">หลักประกันความถูกต้องของข้อมูล (Historical Data Snapshot):</span>
          <span className="text-amber-800">
            การเปลี่ยนชื่อหรือปิดใช้งานโรงงานจะไม่กระทบต่อประวัติการลงทะเบียนเดิม ระบบบันทึกชื่อโรงงานแบบ Snapshot ไว้ในทุกรายการของ Google Sheets อย่างถาวร
          </span>
        </div>
      </div>

      {/* Add Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">เพิ่มโรงงาน / สาขาใหม่</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="py-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  รหัสโรงงาน (Factory Code) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  placeholder="เช่น BKP, RAYONG, FAC-06"
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 uppercase font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  ชื่อโรงงาน / สาขา (Factory Name) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="เช่น โรงงานระยอง (นิคมมาบตาพุด)"
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-amber-500"
                />
              </div>

              {error && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                  {error}
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg cursor-pointer"
                >
                  {loading ? 'กำลังบันทึก...' : 'บันทึกโรงงาน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingFactory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">แก้ไขชื่อโรงงาน</h3>
              <button onClick={() => setEditingFactory(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="py-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">รหัสโรงงาน</label>
                <input
                  type="text"
                  value={editingFactory.code}
                  disabled
                  className="w-full px-3 py-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">ชื่อโรงงาน</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-amber-500"
                />
              </div>

              {error && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                  {error}
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingFactory(null)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg cursor-pointer"
                >
                  {loading ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toggle Status Confirmation Modal with Warning */}
      {togglingFactory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {togglingFactory.active ? 'ยืนยันการปิดใช้งานโรงงาน?' : 'ยืนยันการเปิดใช้งานโรงงาน?'}
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  คุณกำลังจะ{togglingFactory.active ? 'ปิดรับการลงทะเบียนสำหรับ' : 'เปิดใช้งาน'}{' '}
                  <span className="font-semibold text-slate-900">{togglingFactory.name}</span>
                </p>
              </div>
            </div>

            {togglingFactory.active && (countMap[togglingFactory.id] || 0) > 0 && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 mb-4 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>
                  <strong>คำเตือน:</strong> มีพนักงานลงทะเบียนภายใต้โรงงานนี้แล้วจำนวน{' '}
                  <strong>{countMap[togglingFactory.id]} คน</strong> การปิดใช้งานจะทำให้ไม่สามารถเลือกลงทะเบียนใหม่ได้ แต่ประวัติเดิมจะยังคงอยู่ครบถ้วน
                </span>
              </div>
            )}

            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setTogglingFactory(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleToggleStatus}
                disabled={loading}
                className={`px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer ${
                  togglingFactory.active
                    ? 'text-white bg-rose-600 hover:bg-rose-700'
                    : 'text-white bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {loading ? 'กำลังประมวลผล...' : togglingFactory.active ? 'ยืนยันการปิดรับ' : 'ยืนยันเปิดใช้งาน'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
