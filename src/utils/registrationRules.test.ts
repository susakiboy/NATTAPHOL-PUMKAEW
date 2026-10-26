import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeEmployeeId,
  validateEmployeeId,
  validateRegistrationInput,
  allocateRandomNumber,
  validateRangeChange,
  computeDashboardStats,
  FactoryRecord,
  RegistrationRecord,
  NumberSettings,
} from './registrationRules.js';

test('normalizeEmployeeId preserves leading zeros and trims whitespace', () => {
  assert.equal(normalizeEmployeeId(' 00123 '), '00123');
  assert.equal(normalizeEmployeeId('000789'), '000789');
  assert.equal(normalizeEmployeeId(null), '');
  assert.equal(normalizeEmployeeId(undefined), '');
  assert.equal(normalizeEmployeeId(456), '456');
});

test('validateEmployeeId enforces constraints and blocks injection characters', () => {
  assert.equal(validateEmployeeId('').valid, false);
  assert.equal(validateEmployeeId('  ').valid, false);
  assert.equal(validateEmployeeId('=SUM(A1)').valid, false);
  assert.equal(validateEmployeeId('+12345').valid, false);
  assert.equal(validateEmployeeId('@hack').valid, false);
  assert.equal(validateEmployeeId('-999').valid, false);
  assert.equal(validateEmployeeId('001234').valid, true);
  assert.equal(validateEmployeeId('EMP-2027-01').valid, true);
});

test('validateRegistrationInput rejects closed registration and invalid factory', () => {
  const activeFactories: FactoryRecord[] = [
    { id: 'f-1', code: 'HQ', name: 'สำนักงานใหญ่', active: true, createdAt: '', updatedAt: '' },
    { id: 'f-2', code: 'FAC-A', name: 'โรงงานชลบุรี', active: false, createdAt: '', updatedAt: '' },
  ];

  // System closed
  const closedRes = validateRegistrationInput(
    { employeeId: '001', firstName: 'สมชาย', lastName: 'ใจดี', department: 'IT', factoryId: 'f-1' },
    activeFactories,
    false
  );
  assert.equal(closedRes.valid, false);
  assert.ok(closedRes.errors.system);

  // Inactive factory chosen
  const inactiveFacRes = validateRegistrationInput(
    { employeeId: '001', firstName: 'สมชาย', lastName: 'ใจดี', department: 'IT', factoryId: 'f-2' },
    activeFactories,
    true
  );
  assert.equal(inactiveFacRes.valid, false);
  assert.ok(inactiveFacRes.errors.factoryId);

  // Valid form
  const validRes = validateRegistrationInput(
    { employeeId: '001', firstName: 'สมชาย', lastName: 'ใจดี', department: 'IT', factoryId: 'f-1' },
    activeFactories,
    true
  );
  assert.equal(validRes.valid, true);
  assert.equal(Object.keys(validRes.errors).length, 0);
});

test('allocateRandomNumber allocates inside range and never repeats used numbers', () => {
  const min = 1;
  const max = 5;
  const used = new Set<number>([1, 2, 4, 5]);

  // Only 3 is remaining
  const res = allocateRandomNumber(min, max, used);
  assert.equal(res.success, true);
  assert.equal(res.number, 3);

  // When all are used
  const fullUsed = new Set<number>([1, 2, 3, 4, 5]);
  const fullRes = allocateRandomNumber(min, max, fullUsed);
  assert.equal(fullRes.success, false);
  assert.ok(fullRes.error);
});

test('validateRangeChange detects existing assigned numbers out of new bounds', () => {
  const currentActiveNumbers = [10, 50, 100, 250, 800];

  // Proposal 1: 50 to 1000 -> Number 10 is outside
  const res1 = validateRangeChange(50, 1000, currentActiveNumbers);
  assert.equal(res1.safe, false);
  assert.ok(res1.violations?.includes(10));

  // Proposal 2: 1 to 500 -> Number 800 is outside
  const res2 = validateRangeChange(1, 500, currentActiveNumbers);
  assert.equal(res2.safe, false);
  assert.ok(res2.violations?.includes(800));

  // Proposal 3: 1 to 1000 -> Safe
  const res3 = validateRangeChange(1, 1000, currentActiveNumbers);
  assert.equal(res3.safe, true);
});

test('computeDashboardStats aggregates correct counts and factory breakdown', () => {
  const factories: FactoryRecord[] = [
    { id: 'f-1', code: 'HQ', name: 'สำนักงานใหญ่', active: true, createdAt: '', updatedAt: '' },
    { id: 'f-2', code: 'CHON', name: 'โรงงานชลบุรี', active: true, createdAt: '', updatedAt: '' },
  ];

  const registrations: RegistrationRecord[] = [
    {
      id: 'r-1',
      employeeId: '001',
      firstName: 'ก้อง',
      lastName: 'เกียรติ',
      fullName: 'ก้อง เกียรติ',
      department: 'HR',
      factoryId: 'f-1',
      factoryNameSnapshot: 'สำนักงานใหญ่',
      assignedNumber: 15,
      registrationTimestamp: '2026-10-26T08:00:00Z',
      registrationStatus: 'ACTIVE',
      updatedTimestamp: '',
    },
    {
      id: 'r-2',
      employeeId: '002',
      firstName: 'สมศรี',
      lastName: 'ยินดี',
      fullName: 'สมศรี ยินดี',
      department: 'Production',
      factoryId: 'f-2',
      factoryNameSnapshot: 'โรงงานชลบุรี',
      assignedNumber: 42,
      registrationTimestamp: '2026-10-26T08:05:00Z',
      registrationStatus: 'ACTIVE',
      updatedTimestamp: '',
    },
    {
      id: 'r-3',
      employeeId: '003',
      firstName: 'วิชัย',
      lastName: 'มั่งคั่ง',
      fullName: 'วิชัย มั่งคั่ง',
      department: 'Logistics',
      factoryId: 'f-2',
      factoryNameSnapshot: 'โรงงานชลบุรี',
      assignedNumber: 99,
      registrationTimestamp: '2026-10-26T08:10:00Z',
      registrationStatus: 'CANCELLED',
      updatedTimestamp: '',
    },
  ];

  const settings: NumberSettings = {
    minNumber: 1,
    maxNumber: 100,
    registrationOpen: true,
    eventName: 'New Year Party 2027',
    eventYear: 2027,
    confirmationMessage: 'ยินดีต้อนรับสู่งานเลี้ยงปีใหม่',
    retainCancelledNumbers: true,
  };

  const stats = computeDashboardStats(registrations, factories, settings);
  assert.equal(stats.totalRegistered, 3);
  assert.equal(stats.activeCount, 2);
  assert.equal(stats.cancelledCount, 1);
  assert.equal(stats.totalCapacity, 100);
  assert.equal(stats.usedNumbersCount, 3); // 15, 42, and retained 99
  assert.equal(stats.availableNumbersCount, 97);
});
