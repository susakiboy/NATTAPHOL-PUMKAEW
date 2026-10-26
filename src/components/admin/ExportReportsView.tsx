import React, { useState, useEffect } from 'react';
import { Factory } from '../../types';
import { api } from '../../services/api';
import { FileSpreadsheet, Download, FileText, CheckCircle2, Filter, AlertCircle, RefreshCw } from 'lucide-react';

interface ExportReportsViewProps {
  factories: Factory[];
}

export const ExportReportsView: React.FC<ExportReportsViewProps> = ({ factories }) => {
  const [format, setFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [factoryId, setFactoryId] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchPreviewCount = async () => {
    setLoadingCount(true);
    try {
      const data = await api.getRegistrations({ factoryId, status }, 1, 1);
      setPreviewCount(data.total);
    } catch (e) {
      setPreviewCount(null);
    } finally {
      setLoadingCount(false);
    }
  };

  useEffect(() => {
    fetchPreviewCount();
  }, [factoryId, status]);

  const handleDownload = async () => {
    setDownloading(true);
    setSuccessMsg(null);
    try {
      const url = api.getExportUrl(format, factoryId, status);
      const res = await fetch(url);
      if (!res.ok) throw new Error('เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์');

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `NewYearParty2027_Registrations_${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      setSuccessMsg(`ดาวน์โหลดไฟล์ ${format.toUpperCase()} เรียบร้อยแล้ว (${previewCount ?? 0} รายการ)`);
    } catch (err: any) {
      alert('ไม่สามารถดาวน์โหลดไฟล์ได้: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">ส่งออกรายงานข้อมูลการลงทะเบียน (Export Reports)</h2>
            <p className="text-xs text-slate-500">
              สร้างไฟล์รายงาน Microsoft Excel Workbook (.xlsx) หรือ CSV สำหรับฝ่ายบุคคลและผู้จัดงาน
            </p>
          </div>
        </div>

        {successMsg && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Options Card */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5" />
              <span>เลือกเงื่อนไขการส่งออก (Filters)</span>
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                โรงงาน / สาขา
              </label>
              <select
                value={factoryId}
                onChange={(e) => setFactoryId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-amber-500"
              >
                <option value="ALL">โรงงานและสาขาทั้งหมด</option>
                {factories.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                สถานะการลงทะเบียน
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-amber-500"
              >
                <option value="ALL">ทุกสถานะ (ทั้งหมด)</option>
                <option value="ACTIVE">เฉพาะที่ลงทะเบียนสมบูรณ์ (Active)</option>
                <option value="CANCELLED">เฉพาะที่ถูกยกเลิก (Cancelled)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                รูปแบบไฟล์เอกสาร
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormat('xlsx')}
                  className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                    format === 'xlsx'
                      ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-100 text-emerald-950'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold text-xs block">Excel (.xlsx)</span>
                    <span className="text-[10px] text-slate-500">สมบูรณ์แบบพร้อมหัวตาราง (แนะนำ)</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormat('csv')}
                  className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                    format === 'csv'
                      ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-100 text-indigo-950'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <FileText className="w-5 h-5 text-indigo-600 shrink-0" />
                  <div>
                    <span className="font-bold text-xs block">CSV (.csv)</span>
                    <span className="text-[10px] text-slate-500">ไฟล์ข้อความคั่นด้วยจุลภาค</span>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Download Preview Card */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-4">
                สรุปข้อมูลที่จะถูกส่งออก (Export Preview)
              </h3>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2.5 text-xs text-slate-600 mb-4">
                <div className="flex justify-between items-center">
                  <span>จำนวนข้อมูลที่ตรวจพบ:</span>
                  <span className="text-slate-900 font-semibold text-sm">
                    {loadingCount ? '...' : (
                      <>
                        <span className="font-mono font-bold tabular-nums">{(previewCount ?? 0).toLocaleString()}</span> รายการ
                      </>
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>รหัสพนักงาน:</span>
                  <span className="text-emerald-700 font-medium">บันทึกเป็น Text (คงค่าศูนย์นำหน้า)</span>
                </div>
                <div className="flex justify-between">
                  <span>รูปแบบวันที่:</span>
                  <span>yyyy-MM-dd HH:mm:ss</span>
                </div>
                <div className="flex justify-between">
                  <span>ระบบบันทึก Audit:</span>
                  <span className="text-slate-700">บันทึกลงชีท AuditLogs อัตโนมัติ</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleDownload}
              disabled={downloading || previewCount === 0 || loadingCount}
              className="w-full py-3 px-4 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>กำลังสร้างไฟล์ {format.toUpperCase()}...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>ดาวน์โหลดไฟล์ {format.toUpperCase()} ตอนนี้</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
