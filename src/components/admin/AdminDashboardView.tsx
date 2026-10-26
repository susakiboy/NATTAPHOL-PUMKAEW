import React, { useState } from 'react';
import { DashboardStats } from '../../types';
import { api } from '../../services/api';
import { Users, CheckCircle2, Ticket, Hash, PieChart, Power, RefreshCw, AlertCircle, Building2, Clock, ArrowRight } from 'lucide-react';

interface AdminDashboardViewProps {
  stats: DashboardStats | null;
  onRefresh: () => void;
  onNavigateToRegistrations: () => void;
  onNavigateToFactories: () => void;
  onNavigateToSettings: () => void;
  onNavigateToGas: () => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  stats,
  onRefresh,
  onNavigateToRegistrations,
  onNavigateToFactories,
  onNavigateToSettings,
  onNavigateToGas,
}) => {
  const [toggling, setToggling] = useState(false);

  if (!stats) {
    return (
      <div className="p-8 text-center text-slate-500">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
        <p className="text-sm">กำลังโหลดข้อมูลแดชบอร์ด...</p>
      </div>
    );
  }

  const handleToggleRegistration = async () => {
    setToggling(true);
    try {
      await api.setRegistrationStatus(!stats.settings.registrationOpen);
      onRefresh();
    } catch (err: any) {
      alert('ไม่สามารถเปลี่ยนสถานะระบบได้: ' + err.message);
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Event Status & Quick Toggle */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {stats.settings.eventName} ({stats.settings.eventYear})
            </span>
            <span className="text-slate-300">·</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              stats.settings.registrationOpen
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}>
              {stats.settings.registrationOpen ? 'ระบบเปิดรับลงทะเบียน' : 'ระบบปิดรับลงทะเบียน'}
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">ภาพรวมการลงทะเบียนงานเลี้ยงปีใหม่</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            ช่วงหมายเลขที่เปิดให้สุ่ม: #{stats.settings.minNumber} - #{stats.settings.maxNumber} (ความจุ {stats.totalCapacity.toLocaleString()} หมายเลข)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleRegistration}
            disabled={toggling}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer ${
              stats.settings.registrationOpen
                ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{stats.settings.registrationOpen ? 'ปิดรับลงทะเบียนชั่วคราว' : 'เปิดรับลงทะเบียน'}</span>
          </button>

          <button
            onClick={onRefresh}
            className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Registered */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">ผู้ลงทะเบียนทั้งหมด</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">
            {stats.totalRegistered.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            ใช้งานอยู่ <span className="font-semibold text-slate-700 tabular-nums">{stats.activeCount}</span> · ยกเลิก <span className="font-semibold text-rose-600 tabular-nums">{stats.cancelledCount}</span>
          </div>
        </div>

        {/* Used Numbers */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">หมายเลขที่ถูกจัดสรรแล้ว</span>
            <Hash className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-600 tabular-nums">
            {stats.usedNumbersCount.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            คิดเป็น <span className="font-semibold text-slate-700 tabular-nums">{stats.capacityPercent}%</span> ของความจุ
          </div>
        </div>

        {/* Available Numbers */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">หมายเลขคงเหลือให้สุ่ม</span>
            <Ticket className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 tabular-nums">
            {stats.availableNumbersCount.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            จากทั้งหมด <span className="font-semibold text-slate-700 tabular-nums">{stats.totalCapacity.toLocaleString()}</span> หมายเลข
          </div>
        </div>

        {/* Capacity Percentage Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">อัตราการใช้งานความจุ</span>
            <PieChart className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-indigo-600 tabular-nums">
            {stats.capacityPercent}%
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, stats.capacityPercent)}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2-Column Split: Factory Breakdown & Recent Registrations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Factory Registrations Breakdown */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-600" />
              <h3 className="text-sm font-bold text-slate-900">สัดส่วนผู้ลงทะเบียนตามโรงงาน/สาขา</h3>
            </div>
            <button
              onClick={onNavigateToFactories}
              className="text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
            >
              <span>จัดการโรงงาน</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3.5">
            {stats.factoryStats.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">ยังไม่มีข้อมูลโรงงาน</p>
            ) : (
              stats.factoryStats.map((fac) => {
                const percent = stats.activeCount > 0 ? (fac.count / stats.activeCount) * 100 : 0;
                return (
                  <div key={fac.factoryId} className="text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-slate-800 flex items-center gap-1.5">
                        {fac.factoryName}
                        {!fac.active && (
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">ปิดใช้งาน</span>
                        )}
                      </span>
                      <span className="font-semibold text-slate-900 tabular-nums">
                        {fac.count.toLocaleString()} คน ({Math.round(percent)}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-amber-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Registrations Feed */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-600" />
              <h3 className="text-sm font-bold text-slate-900">การลงทะเบียนล่าสุด</h3>
            </div>
            <button
              onClick={onNavigateToRegistrations}
              className="text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
            >
              <span>ดูทั้งหมด ({stats.totalRegistered})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {stats.recentRegistrations.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">ยังไม่มีรายการลงทะเบียน</p>
            ) : (
              stats.recentRegistrations.map((reg) => (
                <div key={reg.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-slate-900">{reg.fullName}</div>
                    <div className="text-[11px] text-slate-500">
                      รหัส: <span className="font-mono">{reg.employeeId}</span> · {reg.factoryNameSnapshot}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block text-xs font-mono font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md tabular-nums">
                      #{reg.assignedNumber}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {reg.registrationTimestamp.split(' ')[1] || reg.registrationTimestamp}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Google Sheets Integration Quick Access Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">ระบบเชื่อมต่อ Google Sheets & Apps Script</h4>
            <p className="text-xs text-slate-400 mt-0.5">
              จัดการสิทธิ์การเชื่อมต่อ Web App URL คัดลอกโค้ดสคริปต์ และตรวจสอบโครงสร้างตารางทั้ง 5 แผ่น
            </p>
          </div>
        </div>

        <button
          onClick={onNavigateToGas}
          className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
        >
          <span>เปิดหน้าจัดการ Google Sheets & Code</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
