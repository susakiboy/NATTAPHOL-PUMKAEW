/**
 * Core business rules and validation logic for New Year Party Registration 2027.
 * Decoupled from UI and transport for deterministic unit testing.
 */

export interface RegistrationInput {
  employeeId: string;
  firstName: string;
  lastName: string;
  department: string;
  factoryId: string;
}

export interface FactoryRecord {
  id: string;
  code: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RegistrationRecord {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  department: string;
  factoryId: string;
  factoryNameSnapshot: string;
  assignedNumber: number;
  registrationTimestamp: string;
  registrationStatus: 'ACTIVE' | 'CANCELLED';
  updatedTimestamp: string;
}

export interface NumberSettings {
  minNumber: number;
  maxNumber: number;
  registrationOpen: boolean;
  eventName: string;
  eventYear: number;
  confirmationMessage: string;
  registrationDeadline?: string;
  retainCancelledNumbers: boolean;
}

/**
 * Normalizes Employee ID by trimming whitespace while strictly preserving leading zeros.
 */
export function normalizeEmployeeId(id: unknown): string {
  if (id === null || id === undefined) return '';
  return String(id).trim();
}

/**
 * Validates Employee ID string.
 */
export function validateEmployeeId(id: string): { valid: boolean; error?: string } {
  const normalized = normalizeEmployeeId(id);
  if (!normalized) {
    return { valid: false, error: 'กรุณากรอกรหัสพนักงาน' };
  }
  if (normalized.length < 2 || normalized.length > 30) {
    return { valid: false, error: 'รหัสพนักงานต้องมีความยาว 2 - 30 ตัวอักษร' };
  }
  // Disallow forbidden special characters that could cause formula injection or malformed data
  if (/^[=+\-@]/.test(normalized)) {
    return { valid: false, error: 'รหัสพนักงานต้องไม่ขึ้นต้นด้วยเครื่องหมาย =, +, - หรือ @' };
  }
  return { valid: true };
}

/**
 * Validates full registration form input.
 */
export function validateRegistrationInput(
  data: Partial<RegistrationInput>,
  activeFactories: FactoryRecord[],
  isRegistrationOpen: boolean,
  deadline?: string
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (!isRegistrationOpen) {
    errors.system = 'ระบบปิดรับการลงทะเบียนชั่วคราวตามประกาศของผู้จัดงาน';
    return { valid: false, errors };
  }

  if (deadline) {
    const deadlineDate = new Date(deadline);
    if (!isNaN(deadlineDate.getTime()) && Date.now() > deadlineDate.getTime()) {
      errors.system = 'หมดเขตการลงทะเบียนสำหรับงานเลี้ยงปีใหม่แล้ว';
      return { valid: false, errors };
    }
  }

  const empIdVal = validateEmployeeId(data.employeeId || '');
  if (!empIdVal.valid && empIdVal.error) {
    errors.employeeId = empIdVal.error;
  }

  const firstName = (data.firstName || '').trim();
  if (!firstName) {
    errors.firstName = 'กรุณากรอกชื่อ';
  } else if (firstName.length < 2) {
    errors.firstName = 'ชื่อต้องมีความยาวอย่างน้อย 2 ตัวอักษร';
  } else if (/^[=+\-@]/.test(firstName)) {
    errors.firstName = 'ชื่อต้องไม่ขึ้นต้นด้วยเครื่องหมายพิเศษ';
  }

  const lastName = (data.lastName || '').trim();
  if (!lastName) {
    errors.lastName = 'กรุณากรอกนามสกุล';
  } else if (lastName.length < 2) {
    errors.lastName = 'นามสกุลต้องมีความยาวอย่างน้อย 2 ตัวอักษร';
  } else if (/^[=+\-@]/.test(lastName)) {
    errors.lastName = 'นามสกุลต้องไม่ขึ้นต้นด้วยเครื่องหมายพิเศษ';
  }

  const department = (data.department || '').trim();
  if (!department) {
    errors.department = 'กรุณากรอกแผนก';
  } else if (department.length < 2) {
    errors.department = 'แผนกต้องมีความยาวอย่างน้อย 2 ตัวอักษร';
  } else if (/^[=+\-@]/.test(department)) {
    errors.department = 'แผนกต้องไม่ขึ้นต้นด้วยเครื่องหมายพิเศษ';
  }

  const factoryId = (data.factoryId || '').trim();
  if (!factoryId) {
    errors.factoryId = 'กรุณาเลือกโรงงาน / สาขา';
  } else {
    const matched = activeFactories.find((f) => f.id === factoryId && f.active);
    if (!matched) {
      errors.factoryId = 'โรงงานที่เลือกไม่เปิดให้บริการหรือไม่มีในระบบ';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Server-side allocation of an unassigned random registration number.
 * Ensures the generated number is within [min, max] and not in unavailableNumbers.
 */
export function allocateRandomNumber(
  min: number,
  max: number,
  unavailableNumbers: Set<number> | number[],
  randomFn: () => number = Math.random
): { success: boolean; number?: number; error?: string } {
  if (min > max || min < 1) {
    return { success: false, error: 'ช่วงตัวเลขไม่ถูกต้อง (ค่าเริ่มต้นต้อง $\\ge 1$ และน้อยกว่าหรือเท่ากับค่าสูงสุด)' };
  }

  const unavailableSet = unavailableNumbers instanceof Set
    ? unavailableNumbers
    : new Set(unavailableNumbers);

  const totalCapacity = max - min + 1;
  const usedCount = Array.from(unavailableSet).filter((n) => n >= min && n <= max).length;
  const remaining = totalCapacity - usedCount;

  if (remaining <= 0) {
    return {
      success: false,
      error: `หมายเลขลงทะเบียนเต็มแล้ว (ความจุทั้งหมด ${totalCapacity.toLocaleString()} หมายเลข ถูกใช้ครบทั้งหมดแล้ว)`,
    };
  }

  // If density of available numbers is high, probe randomly
  // Otherwise, compile remaining pool directly to avoid infinite loop
  if (remaining / totalCapacity > 0.15) {
    for (let attempts = 0; attempts < 100; attempts++) {
      const candidate = Math.floor(randomFn() * totalCapacity) + min;
      if (!unavailableSet.has(candidate)) {
        return { success: true, number: candidate };
      }
    }
  }

  // Deterministic fallback: collect all available numbers and pick one randomly
  const pool: number[] = [];
  for (let num = min; num <= max; num++) {
    if (!unavailableSet.has(num)) {
      pool.push(num);
    }
  }

  if (pool.length === 0) {
    return { success: false, error: 'หมายเลขลงทะเบียนเต็มแล้ว' };
  }

  const selectedIndex = Math.floor(randomFn() * pool.length);
  return { success: true, number: pool[selectedIndex] };
}

/**
 * Safety check for Admin updating min/max range.
 * Validates that no active assigned registration falls outside the proposed range.
 */
export function validateRangeChange(
  newMin: number,
  newMax: number,
  currentActiveNumbers: number[]
): { safe: boolean; reason?: string; violations?: number[] } {
  if (newMin < 1) {
    return { safe: false, reason: 'หมายเลขเริ่มต้นต้องมีค่าตั้งแต่ 1 ขึ้นไป' };
  }
  if (newMin > newMax) {
    return { safe: false, reason: 'หมายเลขเริ่มต้นต้องน้อยกว่าหรือเท่ากับหมายเลขสิ้นสุด' };
  }

  const violations = currentActiveNumbers.filter((n) => n < newMin || n > newMax);
  if (violations.length > 0) {
    return {
      safe: false,
      reason: `ไม่สามารถปรับช่วงหมายเลขได้ เนื่องจากมีพนักงานที่ได้รับหมายเลข ${violations.slice(0, 5).join(', ')}${violations.length > 5 ? ' และอื่นๆ' : ''} ซึ่งอยู่นอกช่วงใหม่`,
      violations,
    };
  }

  const newCapacity = newMax - newMin + 1;
  if (newCapacity < currentActiveNumbers.length) {
    return {
      safe: false,
      reason: `ความจุใหม่ (${newCapacity.toLocaleString()} หมายเลข) น้อยกว่าจำนวนผู้ลงทะเบียนที่ใช้งานอยู่ (${currentActiveNumbers.length.toLocaleString()} คน)`,
    };
  }

  return { safe: true };
}

/**
 * Aggregates dashboard metrics from raw records.
 */
export function computeDashboardStats(
  registrations: RegistrationRecord[],
  factories: FactoryRecord[],
  settings: NumberSettings
) {
  const activeRegistrations = registrations.filter((r) => r.registrationStatus === 'ACTIVE');
  const cancelledRegistrations = registrations.filter((r) => r.registrationStatus === 'CANCELLED');

  const totalRegistered = registrations.length;
  const activeCount = activeRegistrations.length;
  const cancelledCount = cancelledRegistrations.length;

  const totalCapacity = Math.max(0, settings.maxNumber - settings.minNumber + 1);

  // Used numbers includes active ones, and if policy retains cancelled numbers, include them too
  const usedNumbersSet = new Set<number>();
  activeRegistrations.forEach((r) => usedNumbersSet.add(r.assignedNumber));
  if (settings.retainCancelledNumbers) {
    cancelledRegistrations.forEach((r) => usedNumbersSet.add(r.assignedNumber));
  }

  const usedNumbersCount = Array.from(usedNumbersSet).filter(
    (n) => n >= settings.minNumber && n <= settings.maxNumber
  ).length;

  const availableNumbersCount = Math.max(0, totalCapacity - usedNumbersCount);
  const capacityPercent = totalCapacity > 0 ? (usedNumbersCount / totalCapacity) * 100 : 0;

  // Breakdown by factory
  const factoryCounts: Record<string, { factoryId: string; factoryName: string; count: number; active: boolean }> = {};
  
  factories.forEach((f) => {
    factoryCounts[f.id] = {
      factoryId: f.id,
      factoryName: f.name,
      count: 0,
      active: f.active,
    };
  });

  activeRegistrations.forEach((r) => {
    if (!factoryCounts[r.factoryId]) {
      factoryCounts[r.factoryId] = {
        factoryId: r.factoryId,
        factoryName: r.factoryNameSnapshot || 'Unknown',
        count: 0,
        active: false,
      };
    }
    factoryCounts[r.factoryId].count += 1;
  });

  // Recent registrations
  const recentRegistrations = [...activeRegistrations]
    .sort((a, b) => new Date(b.registrationTimestamp).getTime() - new Date(a.registrationTimestamp).getTime())
    .slice(0, 10);

  return {
    totalRegistered,
    activeCount,
    cancelledCount,
    totalCapacity,
    usedNumbersCount,
    availableNumbersCount,
    capacityPercent: Math.round(capacityPercent * 10) / 10,
    factoryStats: Object.values(factoryCounts),
    recentRegistrations,
  };
}
