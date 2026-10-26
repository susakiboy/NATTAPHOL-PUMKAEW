import React, { useState, useEffect } from 'react';
import { AdminUser, DashboardStats, Factory } from '../../types';
import { api } from '../../services/api';
import { AdminDashboardView } from './AdminDashboardView';
import { RegistrationsView } from './RegistrationsView';
import { FactoriesView } from './FactoriesView';
import { NumberSettingsView } from './NumberSettingsView';
import { ExportReportsView } from './ExportReportsView';
import { AuditLogsView } from './AuditLogsView';
import { GasSetupGuideView } from './GasSetupGuideView';
import { LayoutDashboard, Users, Building2, Settings, FileSpreadsheet, ShieldAlert, Code2, LogOut, ArrowLeft, Menu, X, Sparkles } from 'lucide-react';

interface AdminLayoutProps {
  adminUser: AdminUser;
  onLogout: () => void;
  onBackToPublic: () => void;
}

type AdminTab = 'dashboard' | 'registrations' | 'factories' | 'number-settings' | 'export' | 'audit' | 'gas';

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  adminUser,
  onLogout,
  onBackToPublic,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [factories, setFactories] = useState<Factory[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const fetchInitialData = async () => {
    try {
      const [statsData, factoriesData] = await Promise.all([
        api.getAdminDashboard(),
        api.getAllFactories(),
      ]);
      setStats(statsData);
      setFactories(factoriesData);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const menuItems = [
    { id: 'dashboard', label: 'แดชบอร์ดภาพรวม', icon: LayoutDashboard },
    { id: 'registrations', label: 'จัดการรายชื่อผู้ลงทะเบียน', icon: Users },
    { id: 'factories', label: 'จัดการข้อมูลโรงงาน', icon: Building2 },
    { id: 'number-settings', label: 'ตั้งค่าช่วงหมายเลขและระบบ', icon: Settings },
    { id: 'export', label: 'ส่งออกรายงาน Excel (.xlsx)', icon: FileSpreadsheet },
    { id: 'audit', label: 'ประวัติ Audit Logs', icon: ShieldAlert },
    { id: 'gas', label: 'Google Sheets & Code', icon: Code2 },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-800 text-slate-300 shrink-0">
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-white text-sm block leading-none">Admin Console</span>
              <span className="text-[11px] text-slate-400 block mt-0.5">New Year Party 2027</span>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1 flex-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as AdminTab)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer text-left ${
                  isActive
                    ? 'bg-amber-400 text-slate-950 font-semibold shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800 space-y-3">
          <div className="text-[11px] text-slate-400">
            <span className="block text-slate-500 font-semibold uppercase text-[9px]">ผู้ดูแลระบบ</span>
            <span className="font-mono text-slate-300 truncate block">{adminUser.email}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onBackToPublic}
              className="flex-1 py-1.5 px-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>กลับหน้าหลัก</span>
            </button>
            <button
              onClick={onLogout}
              className="py-1.5 px-2.5 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
              title="ออกจากระบบ"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <div className="md:hidden bg-slate-900 border-b border-slate-800 p-4 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <span className="font-bold text-sm">Admin Console 2027</span>
        </div>

        <button
          onClick={onBackToPublic}
          className="text-xs font-medium text-amber-400 flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>หน้าลงทะเบียน</span>
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800 p-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as AdminTab);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors ${
                  isActive ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
          <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
            <span className="text-slate-400 text-[11px] truncate">{adminUser.email}</span>
            <button onClick={onLogout} className="text-rose-400 font-medium">ออกจากระบบ</button>
          </div>
        </div>
      )}

      {/* Main Content Viewport */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {activeTab === 'dashboard' && (
          <AdminDashboardView
            stats={stats}
            onRefresh={fetchInitialData}
            onNavigateToRegistrations={() => setActiveTab('registrations')}
            onNavigateToFactories={() => setActiveTab('factories')}
            onNavigateToSettings={() => setActiveTab('number-settings')}
          />
        )}

        {activeTab === 'registrations' && (
          <RegistrationsView factories={factories} />
        )}

        {activeTab === 'factories' && (
          <FactoriesView factories={factories} stats={stats} onRefresh={fetchInitialData} />
        )}

        {activeTab === 'number-settings' && (
          <NumberSettingsView stats={stats} onRefresh={fetchInitialData} />
        )}

        {activeTab === 'export' && (
          <ExportReportsView factories={factories} />
        )}

        {activeTab === 'audit' && (
          <AuditLogsView />
        )}

        {activeTab === 'gas' && (
          <GasSetupGuideView />
        )}
      </main>
    </div>
  );
};
