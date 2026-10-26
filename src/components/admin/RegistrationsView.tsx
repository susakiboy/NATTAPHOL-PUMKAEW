import React, { useState, useEffect } from 'react';
import { Registration, Factory } from '../../types';
import { api } from '../../services/api';
import { Search, Filter, Eye, Edit2, Ban, CheckCircle2, X, RefreshCw, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';

interface RegistrationsViewProps {
  factories: Factory[];
}

export const RegistrationsView: React.FC<RegistrationsViewProps> = ({ factories }) => {
  const [items, setItems] = useState<Registration[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [factoryId, setFactoryId] = useState('ALL');
  const [status, setStatus] = useState('ALL');

  // Modals state
  const [viewingRecord, setViewingRecord] = useState<Registration | null>(null);
  const [editingRecord, setEditingRecord] = useState<Registration | null>(null);
  const [cancellingRecord, setCancellingRecord] = useState<Registration | null>(null);
  const [releaseNumber, setReleaseNumber] = useState(false);

  // Edit form state
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editDept, setEditDept] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchRegistrations = async () => {
    setLoading(true);
    try {
      const data = await api.getRegistrations({ search, factoryId, status }, page, 20);
      setItems(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages || 1);
    } catch (err: any) {
      console.error('Failed to load registrations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, [page, factoryId, status]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchRegistrations();
  };

  const handleOpenEdit = (record: Registration) => {
    setEditingRecord(record);
    setEditFirstName(record.firstName);
    setEditLastName(record.lastName);
    setEditDept(record.department);
  };

  const handleSaveEdit = async () => {
    if (!editingRecord) return;
    setActionLoading(true);
    try {
      await api.updateRegistration(editingRecord.id, {
        firstName: editFirstName.trim(),
        lastName: editLastName.trim(),
        department: editDept.trim(),
      });
      setEditingRecord(null);
      fetchRegistrations();
    } catch (err: any) {
      alert('แก้ไขไม่สำเร็จ: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancellingRecord) return;
    setActionLoading(true);
    try {
      await api.cancelRegistration(cancellingRecord.id, releaseNumber);
      setCancellingRecord(null);
      fetchRegistrations();
    } catch (err: any) {
      alert('ยกเลิกไม่สำเร็จ: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาด้วยรหัสพนักงาน, ชื่อ, แผนก, หรือหมายเลข..."
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={factoryId}
              onChange={(e) => {
                setFactoryId(e.target.value);
                setPage(1);
              }}
              className="py-2 px-3 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">โรงงานทั้งหมด</option>
              {factories.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>

            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="py-2 px-3 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">สถานะทั้งหมด</option>
              <option value="ACTIVE">ลงทะเบียนแล้ว (Active)</option>
              <option value="CANCELLED">ยกเลิกแล้ว (Cancelled)</option>
            </select>

            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-colors cursor-pointer shrink-0"
            >
              ค้นหา
            </button>

            <button
              type="button"
              onClick={() => {
                setSearch('');
                setFactoryId('ALL');
                setStatus('ALL');
                setPage(1);
                fetchRegistrations();
              }}
              className="p-2 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors shrink-0"
              title="ล้างตัวกรอง"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Table Container */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-white border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4 font-semibold text-center w-20">หมายเลข</th>
                <th className="py-3.5 px-4 font-semibold">รหัสพนักงาน</th>
                <th className="py-3.5 px-4 font-semibold">ชื่อ - นามสกุล</th>
                <th className="py-3.5 px-4 font-semibold">แผนก / ฝ่าย</th>
                <th className="py-3.5 px-4 font-semibold">โรงงาน / สาขา</th>
                <th className="py-3.5 px-4 font-semibold">วันที่-เวลา</th>
                <th className="py-3.5 px-4 font-semibold text-center">สถานะ</th>
                <th className="py-3.5 px-4 font-semibold text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                    <span>กำลังโหลดรายชื่อ...</span>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    ไม่พบข้อมูลการลงทะเบียนที่ตรงกับเงื่อนไข
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 text-center font-mono font-bold text-amber-700 tabular-nums">
                      #{row.assignedNumber}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-800 tabular-nums">
                      {row.employeeId}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {row.fullName}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {row.department}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {row.factoryNameSnapshot}
                    </td>
                    <td className="py-3 px-4 text-slate-500 tabular-nums whitespace-nowrap">
                      {row.registrationTimestamp}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        row.registrationStatus === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {row.registrationStatus === 'ACTIVE' ? 'ลงทะเบียนแล้ว' : 'ยกเลิก'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setViewingRecord(row)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="ดูรายละเอียด"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(row)}
                          className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                          title="แก้ไขข้อมูล"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {row.registrationStatus === 'ACTIVE' && (
                          <button
                            onClick={() => {
                              setCancellingRecord(row);
                              setReleaseNumber(false);
                            }}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="ยกเลิกการลงทะเบียน"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            แสดงรายการ {items.length} จากทั้งหมด <span className="font-semibold text-slate-800">{total}</span> รายการ (หน้า {page} / {totalPages})
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-mono font-medium">{page}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* View Details Modal */}
      {viewingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">รายละเอียดการลงทะเบียน</h3>
              <button onClick={() => setViewingRecord(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="py-4 space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">หมายเลขที่ได้รับ</span>
                <span className="font-mono font-bold text-amber-600 text-base">#{viewingRecord.assignedNumber}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">รหัสพนักงาน</span>
                <span className="font-mono font-medium">{viewingRecord.employeeId}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">ชื่อ - นามสกุล</span>
                <span className="font-medium text-slate-900">{viewingRecord.fullName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">แผนก</span>
                <span>{viewingRecord.department}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">โรงงาน / สาขา</span>
                <span>{viewingRecord.factoryNameSnapshot}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">วันที่ลงทะเบียน</span>
                <span>{viewingRecord.registrationTimestamp}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">สถานะ</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                  viewingRecord.registrationStatus === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                }`}>
                  {viewingRecord.registrationStatus}
                </span>
              </div>
            </div>
            <div className="pt-3 border-t border-slate-100 text-right">
              <button
                onClick={() => setViewingRecord(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Details Modal */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">แก้ไขข้อมูลพนักงาน</h3>
              <button onClick={() => setEditingRecord(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="py-4 space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">รหัสพนักงาน (ไม่สามารถแก้ไขได้)</label>
                <input
                  type="text"
                  value={editingRecord.employeeId}
                  disabled
                  className="w-full px-3 py-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-medium">ชื่อ</label>
                <input
                  type="text"
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-medium">นามสกุล</label>
                <input
                  type="text"
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-medium">แผนก / ฝ่าย</label>
                <input
                  type="text"
                  value={editDept}
                  onChange={(e) => setEditDept(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setEditingRecord(null)}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg cursor-pointer"
              >
                {actionLoading ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancellingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">ยืนยันการยกเลิกการลงทะเบียน?</h3>
                <p className="text-xs text-slate-600 mt-1">
                  คุณกำลังจะยกเลิกการลงทะเบียนของ <span className="font-semibold">{cancellingRecord.fullName}</span> (รหัส: {cancellingRecord.employeeId}) หมายเลข <span className="font-mono font-bold text-amber-600">#{cancellingRecord.assignedNumber}</span>
                </p>
              </div>
            </div>

            {/* Retention policy toggle */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 mb-5 text-xs">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={releaseNumber}
                  onChange={(e) => setReleaseNumber(e.target.checked)}
                  className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                />
                <div>
                  <span className="font-semibold text-slate-800 block">
                    ปล่อยหมายเลข #{cancellingRecord.assignedNumber} คืนสู่ระบบเพื่อสุ่มใหม่
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    (ค่าเริ่มต้น: ไม่เลือก เพื่อสงวนหมายเลขไว้ ไม่นำกลับมาสุ่มซ้ำ ป้องกันความสับสนเรื่องสลาก/บัตรในงาน)
                  </span>
                </div>
              </label>
            </div>

            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setCancellingRecord(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                ย้อนกลับ
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer"
              >
                {actionLoading ? 'กำลังยกเลิก...' : 'ยืนยันการยกเลิก'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
