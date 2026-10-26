import React, { useState, useEffect } from 'react';
import { PublicConfig, Registration, AdminUser } from './types';
import { api, getStoredAdminEmail, setStoredAdminEmail } from './services/api';
import { Navbar } from './components/Navbar';
import { RegistrationForm } from './components/RegistrationForm';
import { SuccessTicket } from './components/SuccessTicket';
import { LookupModal } from './components/LookupModal';
import { AdminLoginModal } from './components/admin/AdminLoginModal';
import { AdminLayout } from './components/admin/AdminLayout';
import { GasSetupGuideView } from './components/admin/GasSetupGuideView';
import { RefreshCw, Sparkles, AlertCircle } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<'register' | 'admin' | 'gas-guide'>('register');
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [confirmedRegistration, setConfirmedRegistration] = useState<Registration | null>(null);

  const [isLookupOpen, setIsLookupOpen] = useState(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);

  const loadConfig = async () => {
    try {
      const data = await api.getPublicConfig();
      setConfig(data);
    } catch (err) {
      console.error('Failed to load public configuration:', err);
    } finally {
      setLoadingConfig(false);
    }
  };

  useEffect(() => {
    loadConfig();
    // Check if admin is already stored
    const storedEmail = getStoredAdminEmail();
    if (storedEmail) {
      setAdminUser({
        id: 'ADM-STORED',
        email: storedEmail,
        role: 'SUPER_ADMIN',
      });
    }
  }, []);

  const handleRegistrationSuccess = (reg: Registration) => {
    setConfirmedRegistration(reg);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogoutAdmin = () => {
    setAdminUser(null);
    setStoredAdminEmail('');
    setCurrentView('register');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      {/* Top Navigation Bar */}
      <Navbar
        currentView={currentView}
        setCurrentView={(view) => {
          setCurrentView(view);
          if (view === 'admin' && !adminUser) {
            setIsAdminLoginOpen(true);
          }
        }}
        onOpenLookup={() => setIsLookupOpen(true)}
        adminUser={adminUser}
        onOpenAdminLogin={() => setIsAdminLoginOpen(true)}
        onLogoutAdmin={handleLogoutAdmin}
      />

      {/* Main View Router */}
      <div className="flex-1">
        {currentView === 'register' && (
          <main className="py-6 sm:py-10">
            {loadingConfig ? (
              <div className="max-w-md mx-auto p-12 text-center text-slate-500">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-amber-500" />
                <p className="text-sm font-medium">กำลังเตรียมระบบลงทะเบียน...</p>
              </div>
            ) : confirmedRegistration ? (
              <SuccessTicket
                registration={confirmedRegistration}
                onReset={() => {
                  setConfirmedRegistration(null);
                  loadConfig();
                }}
              />
            ) : (
              <RegistrationForm
                config={config}
                onSuccess={handleRegistrationSuccess}
                onOpenLookup={() => setIsLookupOpen(true)}
              />
            )}
          </main>
        )}

        {currentView === 'admin' && (
          adminUser ? (
            <AdminLayout
              adminUser={adminUser}
              onLogout={handleLogoutAdmin}
              onBackToPublic={() => setCurrentView('register')}
            />
          ) : (
            <div className="max-w-md mx-auto my-16 p-8 bg-white border border-slate-200 rounded-3xl shadow-sm text-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">กรุณาเข้าสู่ระบบ Admin</h2>
              <p className="text-xs text-slate-500 mb-6">
                แดชบอร์ดนี้สำหรับผู้ดูแลระบบและคณะกรรมการจัดงาน New Year Party 2027
              </p>
              <button
                onClick={() => setIsAdminLoginOpen(true)}
                className="w-full py-2.5 px-4 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-colors shadow-sm cursor-pointer"
              >
                เข้าสู่ระบบผู้ดูแลระบบ (Admin Login)
              </button>
            </div>
          )
        )}

        {currentView === 'gas-guide' && (
          <main className="max-w-5xl mx-auto px-4 py-8">
            <GasSetupGuideView />
          </main>
        )}
      </div>

      {/* Lookup Modal */}
      <LookupModal
        isOpen={isLookupOpen}
        onClose={() => setIsLookupOpen(false)}
        onSelectRegistration={(reg) => {
          setConfirmedRegistration(reg);
          setCurrentView('register');
        }}
      />

      {/* Admin Login Modal */}
      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        onClose={() => setIsAdminLoginOpen(false)}
        onLoginSuccess={(user) => {
          setAdminUser(user);
          setCurrentView('admin');
        }}
      />

      {/* Corporate Event Footer (Shown on Public Views) */}
      {currentView !== 'admin' && (
        <footer className="no-print border-t border-slate-200 bg-white py-6 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">New Year Party Registration 2027</span>
              <span>·</span>
              <span>Powered by Google Sheets & Apps Script</span>
            </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsLookupOpen(true)}
              className="hover:text-slate-800 transition-colors cursor-pointer"
            >
              ค้นหาหมายเลขพนักงาน
            </button>
            <span>·</span>
            <button
              onClick={() => {
                if (adminUser) {
                  setCurrentView('admin');
                } else {
                  setIsAdminLoginOpen(true);
                }
              }}
              className="hover:text-slate-800 transition-colors cursor-pointer"
            >
              ผู้ดูแลระบบ (Admin)
            </button>
            <span>·</span>
            <button
              onClick={() => setCurrentView('gas-guide')}
              className="hover:text-slate-800 transition-colors cursor-pointer"
            >
              Google Sheets Setup
            </button>
          </div>
        </div>
      </footer>
      )}
    </div>
  );
}
