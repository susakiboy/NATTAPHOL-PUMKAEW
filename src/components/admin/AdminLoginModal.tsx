import React, { useState } from 'react';
import { api } from '../../services/api';
import { AdminUser } from '../../types';
import { Shield, KeyRound, Mail, AlertCircle, X, CheckCircle2 } from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: AdminUser) => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [email, setEmail] = useState('jnsmedia.organizer@gmail.com');
  const [passkey, setPasskey] = useState('NYP2027@AdminSecure');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const user = await api.adminLogin(email.trim(), passkey);
      onLoginSuccess(user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-400/20 text-amber-400 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold">เข้าสู่ระบบผู้ดูแลระบบ (Admin)</h3>
              <p className="text-[11px] text-slate-400">การจัดการระบบและรายงานสรุป</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="adminEmail" className="block text-xs font-semibold text-slate-700 mb-1">
                อีเมลผู้ดูแลระบบ (Admin Email)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="adminEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="admin@company.com"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                />
              </div>
            </div>

            <div>
              <label htmlFor="adminPasskey" className="block text-xs font-semibold text-slate-700 mb-1">
                รหัสผ่านความปลอดภัย (Admin Passkey)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  id="adminPasskey"
                  type="password"
                  value={passkey}
                  onChange={(e) => setPasskey(e.target.value)}
                  required
                  placeholder="กรอกรหัสผ่าน Admin"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                />
              </div>
            </div>

            <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-100 text-xs text-amber-900 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">สิทธิ์เริ่มต้นสำหรับทดสอบระบบ:</span>
                <span className="text-[11px] text-amber-800">
                  อีเมล: <code className="bg-amber-100 px-1 py-0.5 rounded">jnsmedia.organizer@gmail.com</code>
                  <br />
                  รหัสผ่าน: <code className="bg-amber-100 px-1 py-0.5 rounded">NYP2027@AdminSecure</code>
                </span>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? 'กำลังตรวจสอบสิทธิ์...' : 'เข้าสู่ระบบ'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
