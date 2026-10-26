import React from 'react';
import { Sparkles, Shield, Search, UserCheck } from 'lucide-react';
import { AdminUser } from '../types';

interface NavbarProps {
  currentView: 'register' | 'admin';
  setCurrentView: (view: 'register' | 'admin') => void;
  onOpenLookup: () => void;
  adminUser: AdminUser | null;
  onOpenAdminLogin: () => void;
  onLogoutAdmin: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  setCurrentView,
  onOpenLookup,
  adminUser,
  onOpenAdminLogin,
  onLogoutAdmin,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand title, one line */}
        <button
          onClick={() => setCurrentView('register')}
          className="flex items-center gap-2.5 text-left group whitespace-nowrap shrink-0 hover:opacity-90 transition-opacity cursor-pointer"
        >
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 shadow-md">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-white block leading-none">
              NEW YEAR PARTY 2027
            </span>
            <span className="text-[11px] font-normal text-slate-400 block leading-tight">
              ระบบลงทะเบียนและสุ่มหมายเลขงานเลี้ยง
            </span>
          </div>
        </button>

        {/* Zone 2: Navigation links, single line */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          <button
            onClick={() => setCurrentView('register')}
            className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              currentView === 'register'
                ? 'text-amber-400 font-semibold'
                : 'hover:text-white'
            }`}
          >
            แบบฟอร์มลงทะเบียน
          </button>

          <button
            onClick={onOpenLookup}
            className="whitespace-nowrap shrink-0 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Search className="w-4 h-4 text-slate-400" />
            <span>ตรวจสอบหมายเลข</span>
          </button>

          <button
            onClick={() => setCurrentView('admin')}
            className={`whitespace-nowrap shrink-0 transition-colors flex items-center gap-1.5 cursor-pointer ${
              currentView === 'admin'
                ? 'text-amber-400 font-semibold'
                : 'hover:text-white'
            }`}
          >
            <Shield className="w-4 h-4 text-slate-400" />
            <span>ระบบผู้ดูแลระบบ (Admin)</span>
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          {adminUser ? (
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-block text-xs text-slate-300 bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-md">
                {adminUser.email}
              </span>
              <button
                onClick={onLogoutAdmin}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                ออกจากระบบ
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                if (currentView === 'admin') {
                  onOpenAdminLogin();
                } else {
                  setCurrentView('admin');
                }
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors shadow-sm whitespace-nowrap shrink-0 flex items-center gap-1.5"
            >
              <UserCheck className="w-4 h-4" />
              <span>เข้าสู่ระบบ Admin</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
