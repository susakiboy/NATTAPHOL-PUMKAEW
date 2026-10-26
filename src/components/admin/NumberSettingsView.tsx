import React, { useState, useEffect } from 'react';
import { SystemSettings, DashboardStats } from '../../types';
import { api } from '../../services/api';
import { Settings, ShieldAlert, CheckCircle2, AlertTriangle, Save, RefreshCw } from 'lucide-react';

interface NumberSettingsViewProps {
  stats: DashboardStats | null;
  onRefresh: () => void;
}

export const NumberSettingsView: React.FC<NumberSettingsViewProps> = ({ stats, onRefresh }) => {
  const [minNumber, setMinNumber] = useState(1);
  const [maxNumber, setMaxNumber] = useState(1000);
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [eventName, setEventName] = useState('New Year Party 2027');
  const [eventYear, setEventYear] = useState(2027);
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const [registrationDeadline, setRegistrationDeadline] = useState('');
  const [retainCancelledNumbers, setRetainCancelledNumbers] = useState(true);

  const [saving, setSaving] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (stats?.settings) {
      setMinNumber(stats.settings.minNumber);
      setMaxNumber(stats.settings.maxNumber);
      setRegistrationOpen(stats.settings.registrationOpen);
      setEventName(stats.settings.eventName);
      setEventYear(stats.settings.eventYear);
      setConfirmationMessage(stats.settings.confirmationMessage || '');
      setRegistrationDeadline(stats.settings.registrationDeadline || '');
      setRetainCancelledNumbers(stats.settings.retainCancelledNumbers ?? true);
    }
  }, [stats]);

  const proposedCapacity = Math.max(0, maxNumber - minNumber + 1);

  const handlePreSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (minNumber < 1) {
      setError('หมายเลขเริ่มต้นต้องมีค่าตั้งแต่ 1 ขึ้นไป');
      return;
    }
    if (minNumber > maxNumber) {
      setError('หมายเลขเริ่มต้นต้องน้อยกว่าหรือเท่ากับหมายเลขสิ้นสุด');
      return;
    }
    if (proposedCapacity < (stats?.activeCount || 0)) {
      setError(`ความจุใหม่ (${proposedCapacity.toLocaleString()} หมายเลข) น้อยกว่าจำนวนผู้ลงทะเบียนปัจจุบัน (${stats?.activeCount.toLocaleString()} คน)`);
      return;
    }

    // Open confirmation warning dialog
    setShowConfirmModal(true);
  };

  const handleSaveConfirmed = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.updateNumberSettings({
        minNumber,
        maxNumber,
        registrationOpen,
        eventName: eventName.trim(),
        eventYear,
        confirmationMessage: confirmationMessage.trim(),
        registrationDeadline: registrationDeadline.trim(),
        retainCancelledNumbers,
      });

      setShowConfirmModal(false);
      setSuccessMessage('บันทึกการตั้งค่าระบบและช่วงหมายเลขเรียบร้อยแล้ว');
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'บันทึกการตั้งค่าไม่สำเร็จ');
      setShowConfirmModal(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Settings className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">การตั้งค่าช่วงหมายเลขและระบบ (Number & System Settings)</h2>
            <p className="text-xs text-slate-500">
              กำหนดช่วงหมายเลขสุ่มของขวัญ กฎการจัดสรร และข้อความประชาสัมพันธ์
            </p>
          </div>
        </div>

        {successMessage && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handlePreSave} className="mt-6 space-y-6">
          {/* Section 1: Number Range */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <span>ช่วงหมายเลขสุ่มของขวัญ (Random Number Range)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="minNumber" className="block text-xs font-semibold text-slate-700 mb-1">
                  หมายเลขเริ่มต้น (Minimum Number) <span className="text-rose-500">*</span>
                </label>
                <input
                  id="minNumber"
                  type="number"
                  min="1"
                  value={minNumber}
                  onChange={(e) => setMinNumber(parseInt(e.target.value, 10) || 1)}
                  required
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 font-mono tabular-nums focus:outline-none focus:border-amber-500 bg-white"
                />
                <p className="text-[11px] text-slate-500 mt-1">ค่าเริ่มต้นคือ 1</p>
              </div>

              <div>
                <label htmlFor="maxNumber" className="block text-xs font-semibold text-slate-700 mb-1">
                  หมายเลขสิ้นสุด (Maximum Number) <span className="text-rose-500">*</span>
                </label>
                <input
                  id="maxNumber"
                  type="number"
                  min={minNumber}
                  value={maxNumber}
                  onChange={(e) => setMaxNumber(parseInt(e.target.value, 10) || minNumber)}
                  required
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 font-mono tabular-nums focus:outline-none focus:border-amber-500 bg-white"
                />
                <p className="text-[11px] text-slate-500 mt-1">ค่าเริ่มต้นคือ 1000</p>
              </div>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-wrap items-center justify-between text-xs gap-2">
              <span className="text-slate-600">ความจุทั้งหมดของช่วงใหม่:</span>
              <span className="font-mono font-bold text-slate-900 tabular-nums text-sm">
                {proposedCapacity.toLocaleString()} หมายเลข
              </span>
            </div>
          </div>

          {/* Section 2: Number Retention Policy */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              นโยบายจัดการหมายเลขที่ถูกยกเลิก (Cancellation Number Policy)
            </h3>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={retainCancelledNumbers}
                onChange={(e) => setRetainCancelledNumbers(e.target.checked)}
                className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
              />
              <div className="text-xs">
                <span className="font-semibold text-slate-800 block">
                  สงวนหมายเลขที่ถูกยกเลิกไว้ (Retain as Reserved - แนะนำ)
                </span>
                <span className="text-slate-500 block mt-0.5">
                  เมื่อมีการยกเลิกการลงทะเบียน ระบบจะไม่นำหมายเลขเดิมกลับมาสุ่มซ้ำโดยอัตโนมัติ เพื่อป้องกันความสับสนเรื่องบัตรของขวัญในวันงาน
                </span>
              </div>
            </label>
          </div>

          {/* Section 3: Event Information */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              ข้อมูลงานและข้อความแจ้งเตือน (Event Display & Details)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="eventName" className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่องานเลี้ยง (Event Name)
                </label>
                <input
                  id="eventName"
                  type="text"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-amber-500 bg-white"
                />
              </div>

              <div>
                <label htmlFor="eventYear" className="block text-xs font-semibold text-slate-700 mb-1">
                  ปี ค.ศ. ของงาน (Event Year)
                </label>
                <input
                  id="eventYear"
                  type="number"
                  value={eventYear}
                  onChange={(e) => setEventYear(parseInt(e.target.value, 10) || 2027)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-amber-500 bg-white"
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirmMsg" className="block text-xs font-semibold text-slate-700 mb-1">
                ข้อความต้อนรับและขอบคุณ (Confirmation Message)
              </label>
              <textarea
                id="confirmMsg"
                rows={2}
                value={confirmationMessage}
                onChange={(e) => setConfirmationMessage(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-amber-500 bg-white"
              />
            </div>

            <div>
              <label htmlFor="regDeadline" className="block text-xs font-semibold text-slate-700 mb-1">
                กำหนดเวลาสิ้นสุดการลงทะเบียน (Optional Deadline)
              </label>
              <input
                id="regDeadline"
                type="datetime-local"
                value={registrationDeadline}
                onChange={(e) => setRegistrationDeadline(e.target.value)}
                className="w-full sm:w-auto px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-amber-500 bg-white"
              />
              <p className="text-[11px] text-slate-500 mt-1">ปล่อยว่างไว้หากเปิดตลอดเวลาจนกว่าจะปิดด้วยตนเอง</p>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>บันทึกการตั้งค่าทั้งหมด</span>
            </button>
          </div>
        </form>
      </div>

      {/* Confirmation Warning Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">ตรวจสอบความปลอดภัยก่อนบันทึก</h3>
                <p className="text-xs text-slate-600 mt-1">
                  คุณกำลังจะปรับเปลี่ยนช่วงหมายเลขเป็น [#{minNumber} ถึง #{maxNumber}]
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5 mb-5 text-slate-600">
              <div>✓ ระบบจะตรวจสอบว่าไม่มีหมายเลขเดิมที่ถูกจัดสรรไปแล้วอยู่นอกช่วงใหม่</div>
              <div>✓ ข้อมูลการลงทะเบียนเดิมจะไม่ถูกลบหรือเขียนทับเด็ดขาด</div>
              <div>✓ ความจุใหม่: {proposedCapacity.toLocaleString()} หมายเลข</div>
            </div>

            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveConfirmed}
                disabled={saving}
                className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg cursor-pointer"
              >
                {saving ? 'กำลังบันทึก...' : 'ยืนยันและบันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
