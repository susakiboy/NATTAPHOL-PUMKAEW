import React, { useState, useEffect } from 'react';
import { AuditLog } from '../../types';
import { api } from '../../services/api';
import { ShieldCheck, RefreshCw, ChevronLeft, ChevronRight, User } from 'lucide-react';

export const AuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getAuditLogs(page, 20);
      setLogs(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages || 1);
    } catch (e) {
      console.error('Failed to load audit logs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page]);

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">ประวัติการทำงานและการตรวจสอบ (Audit Logs)</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            บันทึกทุกกิจกรรมของผู้ดูแลระบบ การเปลี่ยนการตั้งค่า และการส่งออกรายงาน
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="p-2 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          title="รีเฟรชข้อมูล"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-white border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4 font-semibold whitespace-nowrap">วันที่-เวลา</th>
                <th className="py-3.5 px-4 font-semibold whitespace-nowrap">ผู้ดำเนินการ (Admin)</th>
                <th className="py-3.5 px-4 font-semibold whitespace-nowrap">กิจกรรม (Action)</th>
                <th className="py-3.5 px-4 font-semibold whitespace-nowrap">เป้าหมาย (Target)</th>
                <th className="py-3.5 px-4 font-semibold">รายละเอียด (Details)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                    <span>กำลังโหลดประวัติ...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400">
                    ยังไม่มีข้อมูลประวัติ Audit Log
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap tabular-nums">
                      {log.timestamp}
                    </td>
                    <td className="py-3 px-4 text-slate-800 font-medium whitespace-nowrap">
                      {log.adminEmail}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-mono text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {log.targetType}: {log.targetId}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {log.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            แสดง {logs.length} จากทั้งหมด <span className="font-semibold text-slate-800">{total}</span> บันทึก
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
    </div>
  );
};
