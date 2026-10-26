import React, { useState } from 'react';
import { api } from '../services/api';
import { Registration } from '../types';
import { Search, X, AlertCircle, ArrowRight } from 'lucide-react';

interface LookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRegistration: (reg: Registration) => void;
}

export const LookupModal: React.FC<LookupModalProps> = ({
  isOpen,
  onClose,
  onSelectRegistration,
}) => {
  const [empId, setEmpId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Registration | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empId.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await api.checkRegistrationByEmployeeId(empId.trim());
      if (data) {
        setResult(data);
      } else {
        setError(`ไม่พบข้อมูลการลงทะเบียนสำหรับรหัสพนักงาน "${empId.trim()}"`);
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการค้นหา');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold">ตรวจสอบข้อมูลการลงทะเบียน</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-xs text-slate-600 mb-4">
            กรอกรหัสพนักงานของคุณเพื่อตรวจสอบหมายเลขและเปิดดูบัตรยืนยัน
          </p>

          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label htmlFor="lookupEmpId" className="block text-xs font-semibold text-slate-700 mb-1">
                รหัสพนักงาน (Employee ID)
              </label>
              <input
                id="lookupEmpId"
                type="text"
                value={empId}
                onChange={(e) => setEmpId(e.target.value)}
                placeholder="เช่น 00101, 00452"
                autoFocus
                className="w-full px-4 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !empId.trim()}
              className="w-full py-2.5 px-4 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? 'กำลังค้นหา...' : 'ค้นหาข้อมูล'}
            </button>
          </form>

          {error && (
            <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200 text-left">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <span className="text-xs text-slate-500 block">ชื่อผู้ลงทะเบียน</span>
                  <span className="font-bold text-slate-900 text-sm">{result.fullName}</span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-500 block">หมายเลขที่ได้</span>
                  <span className="text-2xl font-black font-mono text-amber-600">#{result.assignedNumber}</span>
                </div>
              </div>

              <div className="py-2.5 space-y-1 text-xs text-slate-600">
                <div>แผนก: {result.department}</div>
                <div>โรงงาน: {result.factoryNameSnapshot}</div>
                <div>สถานะ: {result.registrationStatus === 'ACTIVE' ? 'ลงทะเบียนแล้ว' : 'ยกเลิก'}</div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onSelectRegistration(result);
                  onClose();
                }}
                className="mt-3 w-full py-2 px-3 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>เปิดดูบัตรยืนยันฉบับเต็ม</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
