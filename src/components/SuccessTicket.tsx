import React, { useEffect } from 'react';
import { Registration } from '../types';
import confetti from 'canvas-confetti';
import { Printer, CheckCircle2, Building2, User, Hash, Briefcase, Calendar, Sparkles, ArrowLeft } from 'lucide-react';

interface SuccessTicketProps {
  registration: Registration;
  onReset: () => void;
}

export const SuccessTicket: React.FC<SuccessTicketProps> = ({ registration, onReset }) => {
  useEffect(() => {
    // Launch celebratory confetti
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#EC4899'],
      });
    } catch (e) {
      // ignore
    }
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
      {/* Screen action banner (hidden on print) */}
      <div className="no-print flex items-center justify-between mb-6">
        <button
          onClick={onReset}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-2 rounded-lg transition-colors shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>กลับไปหน้าลงทะเบียน</span>
        </button>

        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 px-4 py-2 rounded-lg transition-colors shadow-sm cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>พิมพ์บัตร / บันทึกเป็น PDF</span>
        </button>
      </div>

      {/* Printable Ticket Container */}
      <div
        id="printable-ticket"
        className="bg-white border-2 border-slate-200 rounded-3xl shadow-xl overflow-hidden relative"
      >
        {/* Top Decorative Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white px-6 sm:px-8 py-8 text-center relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-semibold mb-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>ลงทะเบียนสำเร็จ! (Registration Confirmed)</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            NEW YEAR PARTY 2027
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            บัตรยืนยันการลงทะเบียนและหมายเลขลุ้นของขวัญพิเศษ
          </p>
        </div>

        {/* Assigned Number Centerpiece */}
        <div className="p-6 sm:p-10 text-center border-b border-dashed border-slate-200 bg-gradient-to-b from-amber-50/50 to-white">
          <p className="text-xs uppercase tracking-widest font-semibold text-slate-500 mb-2">
            หมายเลขของคุณคือ
          </p>

          <div className="inline-block relative my-2">
            <div className="text-6xl sm:text-8xl font-black font-mono tracking-tighter text-slate-900 drop-shadow-sm tabular-nums">
              {registration.assignedNumber}
            </div>
            <div className="absolute -top-2 -right-4 text-amber-500 animate-bounce">
              <Sparkles className="w-6 h-6" />
            </div>
          </div>

          <p className="text-xs text-slate-500 mt-2">
            บันทึกถาวรใน Google Sheets เรียบร้อยแล้ว (รหัสอ้างอิง: {registration.id})
          </p>
        </div>

        {/* Ticket Details Grid */}
        <div className="p-6 sm:p-8 bg-white">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
            ข้อมูลผู้ลงทะเบียน (Attendee Information)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <User className="w-4 h-4 text-slate-400 mt-0.5" />
              <div>
                <span className="text-xs text-slate-500 block">ชื่อ - นามสกุล</span>
                <span className="font-semibold text-slate-900 text-base">{registration.fullName}</span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <Hash className="w-4 h-4 text-slate-400 mt-0.5" />
              <div>
                <span className="text-xs text-slate-500 block">รหัสพนักงาน</span>
                <span className="font-mono font-semibold text-slate-900 text-base">{registration.employeeId}</span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <Briefcase className="w-4 h-4 text-slate-400 mt-0.5" />
              <div>
                <span className="text-xs text-slate-500 block">แผนก / ฝ่าย</span>
                <span className="font-medium text-slate-800">{registration.department}</span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <Building2 className="w-4 h-4 text-slate-400 mt-0.5" />
              <div>
                <span className="text-xs text-slate-500 block">โรงงาน / สาขา</span>
                <span className="font-medium text-slate-800">{registration.factoryNameSnapshot}</span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>ลงทะเบียนเมื่อ: {registration.registrationTimestamp}</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>สถานะ: ใช้งานได้ (Active)</span>
            </div>
          </div>
        </div>

        {/* Instructions banner */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 text-center text-xs text-slate-600">
          โปรดบันทึกภาพหน้าจอหรือพิมพ์บัตรนี้เพื่อแสดง ณ จุดลงทะเบียนเข้างานเลี้ยงปีใหม่ 2027
        </div>
      </div>

      {/* Action buttons below */}
      <div className="no-print mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          onClick={handlePrint}
          className="w-full sm:w-auto px-6 py-3 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>พิมพ์บัตร / บันทึกเป็น PDF (Print)</span>
        </button>

        <button
          onClick={onReset}
          className="w-full sm:w-auto px-6 py-3 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>ลงทะเบียนพนักงานท่านอื่น</span>
        </button>
      </div>
    </div>
  );
};
