import React, { useState } from 'react';
import { getGasUrl, setGasUrl, parseJsonResponse } from '../../services/api';
import { FileSpreadsheet, Copy, Check, ExternalLink, Link2, Terminal, Shield, CheckCircle2, AlertCircle } from 'lucide-react';

// Preloaded script contents for fast copying
const SETUP_GS_CONTENT = `/**
 * NEW YEAR PARTY REGISTRATION SYSTEM 2027
 * Database Initialization and Schema Setup for Google Sheets
 */
var SHEET_NAMES = {
  REGISTRATIONS: 'Registrations',
  FACTORIES: 'Factories',
  SETTINGS: 'Settings',
  ADMINS: 'Admins',
  AUDIT_LOGS: 'AuditLogs'
};

function setupDatabase() {
  var ss = getSpreadsheet();
  setupWorksheet(ss, SHEET_NAMES.REGISTRATIONS, [
    'Registration ID', 'Employee ID', 'First Name', 'Last Name',
    'Full Name', 'Department', 'Factory ID', 'Factory Name Snapshot',
    'Assigned Number', 'Registration Timestamp', 'Registration Status', 'Updated Timestamp'
  ], [160, 140, 150, 150, 200, 150, 120, 180, 140, 180, 140, 180]);

  var regSheet = ss.getSheetByName(SHEET_NAMES.REGISTRATIONS);
  regSheet.getRange('B:B').setNumberFormat('@'); // Plain text format

  var facSheet = setupWorksheet(ss, SHEET_NAMES.FACTORIES, [
    'Factory ID', 'Factory Code', 'Factory Name', 'Active Status', 'Created At', 'Updated At'
  ], [120, 120, 240, 120, 180, 180]);

  if (facSheet.getLastRow() <= 1) {
    var nowIso = new Date().toISOString();
    var defaultFactories = [
      ['FAC-01', 'HQ', 'สำนักงานใหญ่ (กรุงเทพฯ)', true, nowIso, nowIso],
      ['FAC-02', 'BKP', 'โรงงานบางปะกง (ฉะเชิงเทรา)', true, nowIso, nowIso],
      ['FAC-03', 'AYU', 'โรงงานโรจนะ (อยุธยา)', true, nowIso, nowIso],
      ['FAC-04', 'LCH', 'โรงงานแหลมฉบัง (ชลบุรี)', true, nowIso, nowIso],
      ['FAC-05', 'KRT', 'โรงงานโคราช (นครราชสีมา)', true, nowIso, nowIso]
    ];
    facSheet.getRange(2, 1, defaultFactories.length, 6).setValues(defaultFactories);
  }

  var setSheet = setupWorksheet(ss, SHEET_NAMES.SETTINGS, [
    'Setting Key', 'Setting Value', 'Updated At'
  ], [220, 320, 200]);

  if (setSheet.getLastRow() <= 1) {
    var nowIso = new Date().toISOString();
    var defaultSettings = [
      ['MIN_NUMBER', '1', nowIso],
      ['MAX_NUMBER', '1000', nowIso],
      ['REGISTRATION_OPEN', 'true', nowIso],
      ['EVENT_NAME', 'New Year Party 2027', nowIso],
      ['EVENT_YEAR', '2027', nowIso],
      ['CONFIRMATION_MESSAGE', 'ยินดีต้อนรับสู่งานเลี้ยงสังสรรค์ส่งท้ายปีเก่าต้อนรับปีใหม่ 2027!', nowIso],
      ['REGISTRATION_DEADLINE', '', nowIso],
      ['RETAIN_CANCELLED_NUMBERS', 'true', nowIso]
    ];
    setSheet.getRange(2, 1, defaultSettings.length, 3).setValues(defaultSettings);
  }

  var adminSheet = setupWorksheet(ss, SHEET_NAMES.ADMINS, [
    'Admin ID', 'Admin Email', 'Role', 'Active Status', 'Created At', 'Updated At'
  ], [120, 260, 140, 120, 180, 180]);

  if (adminSheet.getLastRow() <= 1) {
    var ownerEmail = Session.getEffectiveUser().getEmail() || 'admin@company.com';
    var nowIso = new Date().toISOString();
    adminSheet.appendRow(['ADM-01', ownerEmail, 'SUPER_ADMIN', true, nowIso, nowIso]);
    adminSheet.appendRow(['ADM-02', 'jnsmedia.organizer@gmail.com', 'SUPER_ADMIN', true, nowIso, nowIso]);
  }

  setupWorksheet(ss, SHEET_NAMES.AUDIT_LOGS, [
    'Log ID', 'Timestamp', 'Admin Email', 'Action', 'Target Type', 'Target ID', 'Details'
  ], [120, 180, 240, 180, 140, 140, 350]);

  appendAuditLog('SYSTEM', 'DATABASE_INITIALIZED', 'DATABASE', ss.getId(), 'Database setup completed.');
  return { success: true, message: 'Database setup completed successfully' };
}`;

export const GasSetupGuideView: React.FC = () => {
  const [urlInput, setUrlInput] = useState(getGasUrl());
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'setup' | 'code' | 'api' | 'manifest'>('setup');
  const [copiedTab, setCopiedTab] = useState<string | null>(null);

  const handleSaveUrl = () => {
    setGasUrl(urlInput);
    setTestResult({ success: true, message: 'บันทึก URL สำเร็จ! ระบบจะเรียกใช้ Google Apps Script Web App เมื่อเชื่อมต่อ' });
  };

  const handleTestConnection = async () => {
    if (!urlInput.trim()) {
      setTestResult({ success: false, message: 'กรุณากรอก Google Apps Script Web App URL ก่อนทดสอบ' });
      return;
    }

    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${urlInput.trim()}?action=getPublicConfig`);
      const json = await parseJsonResponse(res);
      if (json.success) {
        setTestResult({
          success: true,
          message: `เชื่อมต่อสำเร็จ! ดึงข้อมูลงาน: "${json.data?.eventName || 'New Year Party 2027'}" โรงงานที่เปิด: ${json.data?.factories?.length || 0} แห่ง`,
        });
        setGasUrl(urlInput);
      } else {
        setTestResult({ success: false, message: 'การเชื่อมต่อส่งข้อผิดพลาดกลับมา: ' + (json.error || 'Unknown error') });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: 'ไม่สามารถติดต่อ Web App URL ได้ ตรวจสอบว่าได้ตั้งค่า "Who has access: Anyone" หรือไม่ (Error: ' + err.message + ')',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTab(key);
    setTimeout(() => setCopiedTab(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Connector Switcher Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Link2 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">การเชื่อมต่อ Google Apps Script Web App (Live Connector)</h2>
            <p className="text-xs text-slate-500">
              สลับการทำงานระหว่างเซิร์ฟเวอร์จำลองในระบบและ Google Apps Script Web App จริง
            </p>
          </div>
        </div>

        <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Google Apps Script Web App URL (ลงท้ายด้วย /exec)
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
              className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-amber-500 bg-white"
            />
            <button
              onClick={handleTestConnection}
              disabled={testing}
              className="px-4 py-2 text-xs font-semibold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-xl transition-colors cursor-pointer shrink-0"
            >
              {testing ? 'กำลังทดสอบ...' : 'ทดสอบการเชื่อมต่อ'}
            </button>
            <button
              onClick={handleSaveUrl}
              className="px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shrink-0"
            >
              บันทึก URL
            </button>
          </div>

          {testResult && (
            <div
              className={`mt-3 p-3 rounded-lg text-xs flex items-start gap-2 ${
                testResult.success
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          <p className="text-[11px] text-slate-500 mt-2">
            * หากปล่อยว่างไว้ ระบบจะทำงานผ่าน Local Full-Stack Node/Express API พร้อมฐานข้อมูลถาวรในตัว
          </p>
        </div>
      </div>

      {/* Step by step instructions */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Terminal className="w-4 h-4 text-amber-500" />
          <span>ขั้นตอนการติดตั้ง Google Spreadsheet และ Google Apps Script</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
            <span className="font-bold text-slate-900 block text-sm">
              1. สร้าง Google Spreadsheet
            </span>
            <p className="text-slate-600">
              เปิด <a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-amber-700 underline font-medium">sheets.new</a> และตั้งชื่อชีท เช่น "New Year Party 2027 Database" จากนั้นคัดลอก Spreadsheet ID จาก URL
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
            <span className="font-bold text-slate-900 block text-sm">
              2. เปิด Apps Script Editor
            </span>
            <p className="text-slate-600">
              ในหน้า Google Sheet คลิกเมนู <strong>ส่วนขยาย (Extensions) &gt; Apps Script</strong>
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
            <span className="font-bold text-slate-900 block text-sm">
              3. ตั้งค่า SPREADSHEET_ID ใน Script Properties
            </span>
            <p className="text-slate-600">
              คลิก <strong>การตั้งค่าโปรเจกต์ (Project Settings ⚙️)</strong> เลื่อนลงมาที่ <strong>Script Properties</strong> คลิก Add property: ชื่อ <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">SPREADSHEET_ID</code> ใส่ ID ชีทของคุณ
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
            <span className="font-bold text-slate-900 block text-sm">
              4. รันฟังก์ชัน setupDatabase()
            </span>
            <p className="text-slate-600">
              ใน Apps Script เลือกฟังก์ชัน <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">setupDatabase</code> แล้วกด <strong>เรียกใช้ (Run)</strong> เพื่อสร้างตาราง 5 แผ่นและสไตล์หัวตารางอัตโนมัติ
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5 md:col-span-2">
            <span className="font-bold text-slate-900 block text-sm">
              5. เผยแพร่เป็น Web App (Deploy as Web App)
            </span>
            <p className="text-slate-600">
              คลิก <strong>ทำให้ใช้งานได้ (Deploy) &gt; การทำให้ใช้งานได้ใหม่ (New deployment)</strong> &gt; เลือกประเภท <strong>เว็บแอป (Web app)</strong><br />
              - เรียกใช้ในฐานะ (Execute as): <strong>ฉัน (Me)</strong><br />
              - ผู้ที่มีสิทธิ์เข้าถึง (Who has access): <strong>ทุกคน (Anyone)</strong><br />
              คลิก <strong>ทำให้ใช้งานได้</strong> แล้วคัดลอก Web App URL มาใส่ในช่องด้านบน
            </p>
          </div>
        </div>
      </div>

      {/* Code Viewer and Copy Box */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">ไฟล์โค้ด Google Apps Script ในโปรเจกต์</h3>
            <p className="text-xs text-slate-500">สามารถดูไฟล์ฉบับเต็มได้ในโฟลเดอร์ <code>/gas/</code></p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCopy('active', SETUP_GS_CONTENT)}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {copiedTab === 'active' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedTab === 'active' ? 'คัดลอกแล้ว!' : 'คัดลอกโค้ด Setup.gs'}</span>
            </button>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto max-h-96">
          <pre>{SETUP_GS_CONTENT}</pre>
        </div>
      </div>
    </div>
  );
};
