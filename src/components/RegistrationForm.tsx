import React, { useState } from 'react';
import { Factory, PublicConfig, Registration } from '../types';
import { api } from '../services/api';
import { Sparkles, AlertCircle, CheckCircle2, RotateCcw, Building2, User, Hash, Briefcase, Clock, Search } from 'lucide-react';

interface RegistrationFormProps {
  config: PublicConfig | null;
  onSuccess: (registration: Registration) => void;
  onOpenLookup: () => void;
}

export const RegistrationForm: React.FC<RegistrationFormProps> = ({
  config,
  onSuccess,
  onOpenLookup,
}) => {
  const [employeeId, setEmployeeId] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [department, setDepartment] = useState('');
  const [factoryId, setFactoryId] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [duplicateInfo, setDuplicateInfo] = useState<Registration | null>(null);

  const activeFactories: Factory[] = config?.factories || [];
  const isOpen = config?.registrationOpen ?? true;

  const handleReset = () => {
    setEmployeeId('');
    setFirstName('');
    setLastName('');
    setDepartment('');
    setFactoryId('');
    setErrors({});
    setServerError(null);
    setDuplicateInfo(null);
  };

  const handleFieldChange = (field: string, value: string, setter: (val: string) => void) => {
    setter(value);
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (serverError) setServerError(null);
    if (duplicateInfo) setDuplicateInfo(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setDuplicateInfo(null);

    // Frontend validation
    const newErrors: Record<string, string> = {};
    const cleanEmpId = employeeId.trim();

    if (!cleanEmpId) {
      newErrors.employeeId = 'กรุณากรอกรหัสพนักงาน';
    } else if (/^[=+\-@]/.test(cleanEmpId)) {
      newErrors.employeeId = 'รหัสพนักงานต้องไม่ขึ้นต้นด้วยเครื่องหมายพิเศษ';
    }

    if (!firstName.trim()) {
      newErrors.firstName = 'กรุณากรอกชื่อ';
    }
    if (!lastName.trim()) {
      newErrors.lastName = 'กรุณากรอกนามสกุล';
    }
    if (!department.trim()) {
      newErrors.department = 'กรุณากรอกแผนก';
    }
    if (!factoryId.trim()) {
      newErrors.factoryId = 'กรุณาเลือกโรงงาน / สาขา';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.registerEmployee({
        employeeId: cleanEmpId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        department: department.trim(),
        factoryId: factoryId.trim(),
      });

      onSuccess(response.registration);
    } catch (err: any) {
      if (err.isDuplicate && err.existingRegistration) {
        setDuplicateInfo(err.existingRegistration);
        setServerError(`รหัสพนักงาน ${cleanEmpId} ลงทะเบียนในระบบเรียบร้อยแล้ว ได้รับหมายเลข #${err.existingRegistration.assignedNumber}`);
      } else {
        setServerError(err.message || 'ไม่สามารถลงทะเบียนได้ กรุณาลองใหม่อีกครั้ง');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
      {/* Event Header Hero */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          <span>งานเลี้ยงสังสรรค์ส่งท้ายปีเก่าต้อนรับปีใหม่ 2027</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mb-2">
          {config?.eventName || 'New Year Party 2027'}
        </h1>
        <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto">
          ลงทะเบียนเพื่อยืนยันการเข้าร่วมงานและรับหมายเลขสุ่มของขวัญพิเศษประจำค่ำคืนแห่งความสุข
        </p>
      </div>

      {/* Closed Banner */}
      {!isOpen && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-amber-900">
          <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold">ระบบปิดรับการลงทะเบียนชั่วคราว</h3>
            <p className="text-xs sm:text-sm text-amber-800 mt-0.5">
              ขณะนี้ระบบปิดรับการลงทะเบียนตามกำหนดการจัดงาน หากมีข้อสงสัยโปรดติดต่อฝ่ายทรัพยากรบุคคล (HR)
            </p>
          </div>
        </div>
      )}

      {/* Server Error / Duplicate Alert */}
      {serverError && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold">ข้อผิดพลาดในการลงทะเบียน</h4>
            <p className="text-xs sm:text-sm text-rose-800 mt-0.5">{serverError}</p>
            {duplicateInfo && (
              <div className="mt-3 pt-3 border-t border-rose-200 flex flex-wrap gap-2 items-center">
                <button
                  type="button"
                  onClick={() => onSuccess(duplicateInfo)}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors"
                >
                  ดูบัตรยืนยันหมายเลข #{duplicateInfo.assignedNumber}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Registration Card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8">
        <div className="flex items-center justify-between pb-5 mb-6 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">แบบฟอร์มลงทะเบียนพนักงาน</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              กรอกข้อมูลเพื่อบันทึกลงในฐานข้อมูล Google Sheets และรับหมายเลขของขวัญอัตโนมัติ
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenLookup}
            className="text-xs font-medium text-amber-700 hover:text-amber-800 flex items-center gap-1 p-2 rounded-lg hover:bg-amber-50 transition-colors"
            title="ค้นหาบัตรลงทะเบียนเดิม"
          >
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline">เคยลงทะเบียนแล้ว?</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/* Employee ID */}
          <div>
            <label htmlFor="employeeId" className="block text-xs font-semibold text-slate-700 mb-1.5">
              รหัสพนักงาน (Employee ID) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Hash className="w-4 h-4" />
              </div>
              <input
                id="employeeId"
                type="text"
                value={employeeId}
                onChange={(e) => handleFieldChange('employeeId', e.target.value, setEmployeeId)}
                placeholder="เช่น 00148, EMP-2027"
                disabled={!isOpen || submitting}
                className={`w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border bg-slate-50/50 transition-all focus:bg-white focus:outline-none focus:ring-2 ${
                  errors.employeeId
                    ? 'border-rose-400 focus:ring-rose-200 text-rose-900'
                    : 'border-slate-300 focus:border-amber-500 focus:ring-amber-100 text-slate-900'
                }`}
              />
            </div>
            {errors.employeeId ? (
              <p className="mt-1 text-xs text-rose-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.employeeId}
              </p>
            ) : (
              <p className="mt-1 text-[11px] text-slate-400">
                ระบบจะคงค่าศูนย์นำหน้า (Leading Zeros) อย่างถูกต้อง
              </p>
            )}
          </div>

          {/* First Name & Last Name (2-column layout) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-xs font-semibold text-slate-700 mb-1.5">
                ชื่อ (First Name) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => handleFieldChange('firstName', e.target.value, setFirstName)}
                  placeholder="เช่น สมชาย, John"
                  disabled={!isOpen || submitting}
                  className={`w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border bg-slate-50/50 transition-all focus:bg-white focus:outline-none focus:ring-2 ${
                    errors.firstName
                      ? 'border-rose-400 focus:ring-rose-200 text-rose-900'
                      : 'border-slate-300 focus:border-amber-500 focus:ring-amber-100 text-slate-900'
                  }`}
                />
              </div>
              {errors.firstName && (
                <p className="mt-1 text-xs text-rose-600">{errors.firstName}</p>
              )}
            </div>

            <div>
              <label htmlFor="lastName" className="block text-xs font-semibold text-slate-700 mb-1.5">
                นามสกุล (Last Name) <span className="text-rose-500">*</span>
              </label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => handleFieldChange('lastName', e.target.value, setLastName)}
                placeholder="เช่น ใจดี, Doe"
                disabled={!isOpen || submitting}
                className={`w-full px-4 py-2.5 text-sm rounded-lg border bg-slate-50/50 transition-all focus:bg-white focus:outline-none focus:ring-2 ${
                  errors.lastName
                    ? 'border-rose-400 focus:ring-rose-200 text-rose-900'
                    : 'border-slate-300 focus:border-amber-500 focus:ring-amber-100 text-slate-900'
                }`}
              />
              {errors.lastName && (
                <p className="mt-1 text-xs text-rose-600">{errors.lastName}</p>
              )}
            </div>
          </div>

          {/* Department */}
          <div>
            <label htmlFor="department" className="block text-xs font-semibold text-slate-700 mb-1.5">
              แผนก / ฝ่าย (Department) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Briefcase className="w-4 h-4" />
              </div>
              <input
                id="department"
                type="text"
                value={department}
                onChange={(e) => handleFieldChange('department', e.target.value, setDepartment)}
                placeholder="เช่น ฝ่ายผลิต, บัญชี, เทคโนโลยีสารสนเทศ (IT)"
                disabled={!isOpen || submitting}
                className={`w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border bg-slate-50/50 transition-all focus:bg-white focus:outline-none focus:ring-2 ${
                  errors.department
                    ? 'border-rose-400 focus:ring-rose-200 text-rose-900'
                    : 'border-slate-300 focus:border-amber-500 focus:ring-amber-100 text-slate-900'
                }`}
              />
            </div>
            {errors.department && (
              <p className="mt-1 text-xs text-rose-600">{errors.department}</p>
            )}
          </div>

          {/* Factory Dropdown (Loaded dynamically from Google Sheets) */}
          <div>
            <label htmlFor="factoryId" className="block text-xs font-semibold text-slate-700 mb-1.5">
              โรงงาน / สาขา (Factory Location) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Building2 className="w-4 h-4" />
              </div>
              <select
                id="factoryId"
                value={factoryId}
                onChange={(e) => handleFieldChange('factoryId', e.target.value, setFactoryId)}
                disabled={!isOpen || submitting}
                className={`w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border bg-slate-50/50 transition-all focus:bg-white focus:outline-none focus:ring-2 ${
                  errors.factoryId
                    ? 'border-rose-400 focus:ring-rose-200 text-rose-900'
                    : 'border-slate-300 focus:border-amber-500 focus:ring-amber-100 text-slate-900'
                }`}
              >
                <option value="">-- กรุณาเลือกโรงงาน / สาขา --</option>
                {activeFactories.map((fac) => (
                  <option key={fac.id} value={fac.id}>
                    {fac.name} {fac.code ? `(${fac.code})` : ''}
                  </option>
                ))}
              </select>
            </div>
            {errors.factoryId ? (
              <p className="mt-1 text-xs text-rose-600">{errors.factoryId}</p>
            ) : (
              <p className="mt-1 text-[11px] text-slate-400">
                รายชื่อโรงงานอัปเดตแบบเรียลไทม์จากชีท Factories
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex flex-col sm:flex-row items-center gap-3">
            <button
              type="submit"
              disabled={!isOpen || submitting}
              className="w-full sm:flex-1 py-3 px-6 text-sm font-semibold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>กำลังบันทึกและสุ่มหมายเลข...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>ยืนยันการลงทะเบียน (Register)</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleReset}
              disabled={submitting}
              className="w-full sm:w-auto px-5 py-3 text-sm font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>ล้างข้อมูล</span>
            </button>
          </div>
        </form>
      </div>

      {/* System Assurance Footer */}
      <div className="mt-6 text-center text-xs text-slate-500">
        <span>ข้อมูลจัดเก็บปลอดภัยใน Google Sheets</span>
        <span className="mx-2">·</span>
        <span>จัดสรรหมายเลข 1 คนต่อ 1 สิทธิ์</span>
        <span className="mx-2">·</span>
        <span>ระบบล็อคป้องกันหมายเลขซ้ำ</span>
      </div>
    </div>
  );
};
