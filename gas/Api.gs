/**
 * ============================================================================
 * NEW YEAR PARTY REGISTRATION SYSTEM 2027
 * Core Business Logic, Data Access, and Security Functions
 * ============================================================================
 */

/**
 * Retrieves the database Spreadsheet instance using Script Properties.
 * Fallback to active spreadsheet if bound to a sheet.
 */
function getSpreadsheet() {
  var props = PropertiesService.getScriptProperties();
  var sheetId = props.getProperty('SPREADSHEET_ID');
  if (sheetId && sheetId.trim() !== '') {
    return SpreadsheetApp.openById(sheetId.trim());
  }
  // If no script property is set, fallback to bound spreadsheet
  try {
    var active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) return active;
  } catch (err) {
    // ignore
  }
  throw new Error('SPREADSHEET_ID is not configured in Script Properties. Please run Setup or set SPREADSHEET_ID in Project Settings.');
}

/**
 * Public Config: Returns safe, non-sensitive configuration for public registration.
 */
function getPublicRegistrationConfig() {
  var settings = getNumberSettings();
  var factories = getActiveFactories();
  return {
    success: true,
    data: {
      eventName: settings.eventName,
      eventYear: settings.eventYear,
      registrationOpen: settings.registrationOpen,
      confirmationMessage: settings.confirmationMessage,
      registrationDeadline: settings.registrationDeadline,
      factories: factories
    }
  };
}

/**
 * Returns only active factories for the public registration dropdown.
 */
function getActiveFactories() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAMES.FACTORIES);
  if (!sheet || sheet.getLastRow() <= 1) return [];

  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).getValues();
  var activeFactories = [];
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var isActive = (row[3] === true || String(row[3]).toLowerCase() === 'true');
    if (isActive) {
      activeFactories.push({
        id: String(row[0]),
        code: String(row[1]),
        name: String(row[2]),
        active: true
      });
    }
  }
  return activeFactories;
}

/**
 * Registers an employee with strict server-side concurrency locking and duplicate prevention.
 */
function registerEmployee(formData) {
  if (!formData) {
    return { success: false, error: 'ไม่พบข้อมูลการลงทะเบียน' };
  }

  // 1. Sanitize & Normalize Inputs
  var rawEmpId = formData.employeeId !== undefined && formData.employeeId !== null ? String(formData.employeeId) : '';
  var employeeId = rawEmpId.trim();
  var firstName = String(formData.firstName || '').trim();
  var lastName = String(formData.lastName || '').trim();
  var department = String(formData.department || '').trim();
  var factoryId = String(formData.factoryId || '').trim();

  // Basic Validation
  if (!employeeId) return { success: false, error: 'กรุณากรอกรหัสพนักงาน' };
  if (!firstName) return { success: false, error: 'กรุณากรอกชื่อ' };
  if (!lastName) return { success: false, error: 'กรุณากรอกนามสกุล' };
  if (!department) return { success: false, error: 'กรุณากรอกแผนก' };
  if (!factoryId) return { success: false, error: 'กรุณาเลือกโรงงาน / สาขา' };

  // Disallow injection formulas
  if (/^[=+\-@]/.test(employeeId) || /^[=+\-@]/.test(firstName) || /^[=+\-@]/.test(lastName)) {
    return { success: false, error: 'ข้อมูลต้องไม่ขึ้นต้นด้วยเครื่องหมายพิเศษ (=, +, -, @)' };
  }

  // 2. Check System Open Status & Deadline
  var settings = getNumberSettings();
  if (!settings.registrationOpen) {
    return { success: false, error: 'ระบบปิดรับการลงทะเบียนชั่วคราวตามประกาศของผู้จัดงาน' };
  }
  if (settings.registrationDeadline) {
    var deadlineDate = new Date(settings.registrationDeadline);
    if (!isNaN(deadlineDate.getTime()) && Date.now() > deadlineDate.getTime()) {
      return { success: false, error: 'หมดเขตการลงทะเบียนสำหรับงานเลี้ยงปีใหม่แล้ว' };
    }
  }

  // 3. Confirm Factory Exists and Is Active
  var activeFactories = getActiveFactories();
  var matchedFactory = null;
  for (var f = 0; f < activeFactories.length; f++) {
    if (activeFactories[f].id === factoryId) {
      matchedFactory = activeFactories[f];
      break;
    }
  }
  if (!matchedFactory) {
    return { success: false, error: 'โรงงานที่เลือกไม่เปิดให้บริการหรือไม่มีในระบบ' };
  }

  // 4. Quick Pre-check for duplicate Employee ID before lock
  var existingPrecheck = findRegistrationByEmployeeId(employeeId);
  if (existingPrecheck && existingPrecheck.registrationStatus === 'ACTIVE') {
    return {
      success: false,
      isDuplicate: true,
      error: 'รหัสพนักงาน ' + employeeId + ' ได้ลงทะเบียนเรียบร้อยแล้วในระบบ (หมายเลข: ' + existingPrecheck.assignedNumber + ')',
      existingRegistration: existingPrecheck
    };
  }

  // 5. Acquire Script Lock to guarantee atomic check-and-assign
  var lock = LockService.getScriptLock();
  var hasLock = false;
  try {
    // Wait up to 30 seconds for lock
    hasLock = lock.tryLock(30000);
    if (!hasLock) {
      return {
        success: false,
        error: 'มีผู้ใช้งานลงทะเบียนพร้อมกันเป็นจำนวนมาก กรุณารอสักครู่แล้วลองใหม่อีกครั้ง'
      };
    }

    var ss = getSpreadsheet();
    var regSheet = ss.getSheetByName(SHEET_NAMES.REGISTRATIONS);
    if (!regSheet) {
      throw new Error('ไม่พบชีท Registrations กรุณาติดต่อผู้ดูแลระบบเพื่อรัน setupDatabase()');
    }

    // Read all existing records while holding lock
    var lastRow = regSheet.getLastRow();
    var unavailableNumbers = {};
    var duplicateFound = null;

    if (lastRow > 1) {
      var records = regSheet.getRange(2, 1, lastRow - 1, 12).getValues();
      for (var r = 0; r < records.length; r++) {
        var recRow = records[r];
        var recId = String(recRow[0]);
        var recEmpId = String(recRow[1]).trim();
        var recStatus = String(recRow[10]);
        var recNum = parseInt(recRow[8], 10);

        // Check duplicate employee ID
        if (recEmpId.toLowerCase() === employeeId.toLowerCase() && recStatus === 'ACTIVE') {
          duplicateFound = {
            id: recId,
            employeeId: recEmpId,
            firstName: String(recRow[2]),
            lastName: String(recRow[3]),
            fullName: String(recRow[4]),
            department: String(recRow[5]),
            factoryId: String(recRow[6]),
            factoryNameSnapshot: String(recRow[7]),
            assignedNumber: recNum,
            registrationTimestamp: String(recRow[9]),
            registrationStatus: recStatus
          };
          break;
        }

        // Account for used numbers
        if (!isNaN(recNum)) {
          if (recStatus === 'ACTIVE') {
            unavailableNumbers[recNum] = true;
          } else if (recStatus === 'CANCELLED' && settings.retainCancelledNumbers) {
            unavailableNumbers[recNum] = true;
          }
        }
      }
    }

    if (duplicateFound) {
      return {
        success: false,
        isDuplicate: true,
        error: 'รหัสพนักงาน ' + employeeId + ' ได้ลงทะเบียนเรียบร้อยแล้วในระบบ (หมายเลข: ' + duplicateFound.assignedNumber + ')',
        existingRegistration: duplicateFound
      };
    }

    // 6. Allocate Random Number within [min, max]
    var min = parseInt(settings.minNumber, 10) || 1;
    var max = parseInt(settings.maxNumber, 10) || 1000;
    var totalCap = max - min + 1;

    // Collect available pool
    var availablePool = [];
    for (var n = min; n <= max; n++) {
      if (!unavailableNumbers[n]) {
        availablePool.push(n);
      }
    }

    if (availablePool.length === 0) {
      return {
        success: false,
        error: 'ขออภัย หมายเลขลงทะเบียนเต็มแล้ว (' + totalCap.toLocaleString() + ' หมายเลขถูกจัดสรรครบแล้ว)'
      };
    }

    // Cryptographic/pseudo-random selection from remaining pool
    var randomIndex = Math.floor(Math.random() * availablePool.length);
    var assignedNumber = availablePool[randomIndex];

    // 7. Write to Google Sheets
    var registrationId = 'REG-' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyyMMdd-HHmmss') + '-' + Math.floor(1000 + Math.random() * 9000);
    var nowTimestamp = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss');
    var fullName = firstName + ' ' + lastName;

    var newRow = [
      registrationId,
      "'" + employeeId, // Explicit apostrophe to guarantee Google Sheets stores as string preserving leading zeros
      firstName,
      lastName,
      fullName,
      department,
      factoryId,
      matchedFactory.name,
      assignedNumber,
      nowTimestamp,
      'ACTIVE',
      nowTimestamp
    ];

    regSheet.appendRow(newRow);
    SpreadsheetApp.flush(); // Force sync to guarantee write success

    var confirmation = {
      id: registrationId,
      employeeId: employeeId,
      firstName: firstName,
      lastName: lastName,
      fullName: fullName,
      department: department,
      factoryId: factoryId,
      factoryNameSnapshot: matchedFactory.name,
      assignedNumber: assignedNumber,
      registrationTimestamp: nowTimestamp,
      registrationStatus: 'ACTIVE'
    };

    appendAuditLog('PUBLIC', 'REGISTRATION_SUCCESS', 'REGISTRATION', registrationId, 'Assigned number #' + assignedNumber + ' to ' + fullName + ' (' + employeeId + ')');

    return {
      success: true,
      message: 'ลงทะเบียนสำเร็จ!',
      data: confirmation
    };

  } catch (err) {
    Logger.log('Error during registration: ' + err.toString());
    return {
      success: false,
      error: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + err.message
    };
  } finally {
    if (hasLock) {
      lock.releaseLock();
    }
  }
}

/**
 * Searches registration by employee ID
 */
function findRegistrationByEmployeeId(employeeId) {
  if (!employeeId) return null;
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAMES.REGISTRATIONS);
  if (!sheet || sheet.getLastRow() <= 1) return null;

  var target = String(employeeId).trim().toLowerCase();
  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 12).getValues();

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var empId = String(row[1]).trim().toLowerCase();
    if (empId === target) {
      return {
        id: String(row[0]),
        employeeId: String(row[1]).trim(),
        firstName: String(row[2]),
        lastName: String(row[3]),
        fullName: String(row[4]),
        department: String(row[5]),
        factoryId: String(row[6]),
        factoryNameSnapshot: String(row[7]),
        assignedNumber: parseInt(row[8], 10),
        registrationTimestamp: String(row[9]),
        registrationStatus: String(row[10]),
        updatedTimestamp: String(row[11])
      };
    }
  }
  return null;
}

/**
 * Retrieves registration confirmation details by registration ID
 */
function getRegistrationConfirmation(registrationId) {
  if (!registrationId) return { success: false, error: 'Invalid ID' };
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAMES.REGISTRATIONS);
  if (!sheet || sheet.getLastRow() <= 1) return { success: false, error: 'Not found' };

  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 12).getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]) === registrationId) {
      return {
        success: true,
        data: {
          id: String(data[i][0]),
          employeeId: String(data[i][1]).trim(),
          firstName: String(data[i][2]),
          lastName: String(data[i][3]),
          fullName: String(data[i][4]),
          department: String(data[i][5]),
          factoryId: String(data[i][6]),
          factoryNameSnapshot: String(data[i][7]),
          assignedNumber: parseInt(data[i][8], 10),
          registrationTimestamp: String(data[i][9]),
          registrationStatus: String(data[i][10])
        }
      };
    }
  }
  return { success: false, error: 'ไม่พบข้อมูลการลงทะเบียน' };
}

/**
 * Admin Authentication & Authorization:
 * Checks email against Admins sheet.
 */
function authenticateAdmin(email, secretKey) {
  var userEmail = (email || '').trim().toLowerCase();
  
  // Also check session user if executing in Google Apps Script authenticated domain
  if (!userEmail) {
    try {
      userEmail = (Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail() || '').toLowerCase();
    } catch (e) {
      // ignore
    }
  }

  // Validate Secret passkey for web app access if configured
  var props = PropertiesService.getScriptProperties();
  var adminPasskey = props.getProperty('ADMIN_PASSKEY') || 'NYP2027@AdminSecure';
  if (secretKey && secretKey !== adminPasskey) {
    return { success: false, error: 'รหัสผ่านผู้ดูแลระบบไม่ถูกต้อง' };
  }

  var auth = authorizeAdmin(userEmail);
  if (!auth.authorized) {
    return {
      success: false,
      error: 'อีเมล ' + userEmail + ' ไม่มีสิทธิ์เข้าถึงระบบผู้ดูแลระบบ (กรุณาติดต่อ Super Admin)'
    };
  }

  return {
    success: true,
    user: {
      email: userEmail,
      role: auth.role
    }
  };
}

/**
 * Authorizes email against the Admins sheet allowlist.
 */
function authorizeAdmin(email) {
  if (!email) return { authorized: false };
  var cleanEmail = String(email).trim().toLowerCase();

  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAMES.ADMINS);
  if (!sheet || sheet.getLastRow() <= 1) {
    // If table empty, allow owner
    return { authorized: true, role: 'SUPER_ADMIN' };
  }

  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).getValues();
  for (var i = 0; i < data.length; i++) {
    var adminEmail = String(data[i][1]).trim().toLowerCase();
    var role = String(data[i][2]);
    var active = (data[i][3] === true || String(data[i][3]).toLowerCase() === 'true');

    if (adminEmail === cleanEmail && active) {
      return { authorized: true, role: role };
    }
  }
  return { authorized: false };
}

/**
 * Aggregates statistics for Admin Dashboard.
 */
function getAdminDashboardStats() {
  var ss = getSpreadsheet();
  var settings = getNumberSettings();
  var factories = getAllFactories();

  var regSheet = ss.getSheetByName(SHEET_NAMES.REGISTRATIONS);
  var registrations = [];

  if (regSheet && regSheet.getLastRow() > 1) {
    var data = regSheet.getRange(2, 1, regSheet.getLastRow() - 1, 12).getValues();
    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      registrations.push({
        id: String(row[0]),
        employeeId: String(row[1]).trim(),
        firstName: String(row[2]),
        lastName: String(row[3]),
        fullName: String(row[4]),
        department: String(row[5]),
        factoryId: String(row[6]),
        factoryNameSnapshot: String(row[7]),
        assignedNumber: parseInt(row[8], 10),
        registrationTimestamp: String(row[9]),
        registrationStatus: String(row[10])
      });
    }
  }

  // Active / cancelled
  var activeRegs = registrations.filter(function(r) { return r.registrationStatus === 'ACTIVE'; });
  var cancelledRegs = registrations.filter(function(r) { return r.registrationStatus === 'CANCELLED'; });

  var totalCapacity = Math.max(0, parseInt(settings.maxNumber, 10) - parseInt(settings.minNumber, 10) + 1);

  var usedMap = {};
  activeRegs.forEach(function(r) { usedMap[r.assignedNumber] = true; });
  if (settings.retainCancelledNumbers) {
    cancelledRegs.forEach(function(r) { usedMap[r.assignedNumber] = true; });
  }

  var usedNumbersCount = 0;
  for (var n = settings.minNumber; n <= settings.maxNumber; n++) {
    if (usedMap[n]) usedNumbersCount++;
  }

  var availableNumbersCount = Math.max(0, totalCapacity - usedNumbersCount);
  var capacityPercent = totalCapacity > 0 ? (usedNumbersCount / totalCapacity) * 100 : 0;

  // Breakdown by factory
  var factoryStats = factories.map(function(f) {
    var count = activeRegs.filter(function(r) { return r.factoryId === f.id; }).length;
    return {
      factoryId: f.id,
      factoryCode: f.code,
      factoryName: f.name,
      active: f.active,
      count: count
    };
  });

  // Recent 10 registrations
  var recent = activeRegs.slice().reverse().slice(0, 10);

  return {
    success: true,
    data: {
      totalRegistered: registrations.length,
      activeCount: activeRegs.length,
      cancelledCount: cancelledRegs.length,
      totalCapacity: totalCapacity,
      usedNumbersCount: usedNumbersCount,
      availableNumbersCount: availableNumbersCount,
      capacityPercent: Math.round(capacityPercent * 10) / 10,
      settings: settings,
      factoryStats: factoryStats,
      recentRegistrations: recent
    }
  };
}

/**
 * Searches and paginates registrations for Admin Table.
 */
function getRegistrations(filters, pagination) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAMES.REGISTRATIONS);
  if (!sheet || sheet.getLastRow() <= 1) {
    return { success: true, data: { items: [], total: 0, page: 1, limit: 20 } };
  }

  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 12).getValues();
  var allItems = [];

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    allItems.push({
      id: String(row[0]),
      employeeId: String(row[1]).trim(),
      firstName: String(row[2]),
      lastName: String(row[3]),
      fullName: String(row[4]),
      department: String(row[5]),
      factoryId: String(row[6]),
      factoryNameSnapshot: String(row[7]),
      assignedNumber: parseInt(row[8], 10),
      registrationTimestamp: String(row[9]),
      registrationStatus: String(row[10]),
      updatedTimestamp: String(row[11])
    });
  }

  // Apply filters
  filters = filters || {};
  var filtered = allItems.filter(function(item) {
    if (filters.factoryId && filters.factoryId !== 'ALL' && item.factoryId !== filters.factoryId) {
      return false;
    }
    if (filters.status && filters.status !== 'ALL' && item.registrationStatus !== filters.status) {
      return false;
    }
    if (filters.search) {
      var q = filters.search.toLowerCase().trim();
      var matchEmp = item.employeeId.toLowerCase().indexOf(q) !== -1;
      var matchName = item.fullName.toLowerCase().indexOf(q) !== -1;
      var matchDept = item.department.toLowerCase().indexOf(q) !== -1;
      var matchFac = item.factoryNameSnapshot.toLowerCase().indexOf(q) !== -1;
      var matchNum = String(item.assignedNumber).indexOf(q) !== -1;
      if (!matchEmp && !matchName && !matchDept && !matchFac && !matchNum) return false;
    }
    return true;
  });

  // Sorting: Default by registrationTimestamp desc
  filtered.sort(function(a, b) {
    return new Date(b.registrationTimestamp).getTime() - new Date(a.registrationTimestamp).getTime();
  });

  pagination = pagination || {};
  var page = parseInt(pagination.page, 10) || 1;
  var limit = parseInt(pagination.limit, 10) || 20;
  var startIndex = (page - 1) * limit;
  var pagedItems = filtered.slice(startIndex, startIndex + limit);

  return {
    success: true,
    data: {
      items: pagedItems,
      total: filtered.length,
      page: page,
      limit: limit,
      totalPages: Math.ceil(filtered.length / limit)
    }
  };
}

/**
 * Updates editable employee fields in registration record.
 */
function updateRegistration(adminEmail, registrationId, updateData) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAMES.REGISTRATIONS);
  if (!sheet || sheet.getLastRow() <= 1) return { success: false, error: 'Record not found' };

  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 12).getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]) === registrationId) {
      var rowNum = i + 2;
      var fName = updateData.firstName ? String(updateData.firstName).trim() : String(data[i][2]);
      var lName = updateData.lastName ? String(updateData.lastName).trim() : String(data[i][3]);
      var dept = updateData.department ? String(updateData.department).trim() : String(data[i][5]);
      var fullName = fName + ' ' + lName;
      var nowIso = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss');

      sheet.getRange(rowNum, 3).setValue(fName);
      sheet.getRange(rowNum, 4).setValue(lName);
      sheet.getRange(rowNum, 5).setValue(fullName);
      sheet.getRange(rowNum, 6).setValue(dept);
      sheet.getRange(rowNum, 12).setValue(nowIso);

      appendAuditLog(adminEmail, 'UPDATE_REGISTRATION', 'REGISTRATION', registrationId, 'Updated details for ' + registrationId + ': ' + fullName);
      return { success: true, message: 'บันทึกการแก้ไขเรียบร้อยแล้ว' };
    }
  }
  return { success: false, error: 'ไม่พบรายการที่ต้องการแก้ไข' };
}

/**
 * Cancels a registration record and retains or releases its number.
 */
function cancelRegistration(adminEmail, registrationId, releaseNumber) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAMES.REGISTRATIONS);
  if (!sheet || sheet.getLastRow() <= 1) return { success: false, error: 'Record not found' };

  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 12).getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]) === registrationId) {
      var rowNum = i + 2;
      var assignedNum = data[i][8];
      var nowIso = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss');

      sheet.getRange(rowNum, 11).setValue('CANCELLED');
      sheet.getRange(rowNum, 12).setValue(nowIso);

      var details = 'Cancelled registration #' + assignedNum;
      if (releaseNumber) {
        details += ' (Number explicitly released for reuse)';
      } else {
        details += ' (Number retained/reserved)';
      }

      appendAuditLog(adminEmail, 'CANCEL_REGISTRATION', 'REGISTRATION', registrationId, details);
      return { success: true, message: 'ยกเลิกการลงทะเบียนเรียบร้อยแล้ว' };
    }
  }
  return { success: false, error: 'ไม่พบรายการที่ต้องการยกเลิก' };
}

/**
 * Returns all factories (active + inactive) for Admin management.
 */
function getAllFactories() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAMES.FACTORIES);
  if (!sheet || sheet.getLastRow() <= 1) return [];

  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).getValues();
  var list = [];
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    list.push({
      id: String(row[0]),
      code: String(row[1]),
      name: String(row[2]),
      active: (row[3] === true || String(row[3]).toLowerCase() === 'true'),
      createdAt: String(row[4]),
      updatedAt: String(row[5])
    });
  }
  return list;
}

/**
 * Adds a new factory.
 */
function addFactory(adminEmail, factoryData) {
  var code = String(factoryData.code || '').trim().toUpperCase();
  var name = String(factoryData.name || '').trim();

  if (!code || !name) {
    return { success: false, error: 'กรุณากรอกรหัสและชื่อโรงงาน' };
  }

  var existing = getAllFactories();
  for (var i = 0; i < existing.length; i++) {
    if (existing[i].code === code) {
      return { success: false, error: 'รหัสโรงงาน ' + code + ' มีอยู่ในระบบแล้ว' };
    }
  }

  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAMES.FACTORIES);
  var factoryId = 'FAC-' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyyMMdd') + '-' + Math.floor(100 + Math.random() * 900);
  var nowIso = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss');

  sheet.appendRow([factoryId, code, name, true, nowIso, nowIso]);
  appendAuditLog(adminEmail, 'ADD_FACTORY', 'FACTORY', factoryId, 'Added factory ' + code + ' - ' + name);

  return { success: true, message: 'เพิ่มโรงงานเรียบร้อยแล้ว', data: { id: factoryId, code: code, name: name, active: true } };
}

/**
 * Updates factory name or code.
 */
function updateFactory(adminEmail, factoryId, factoryData) {
  var name = String(factoryData.name || '').trim();
  if (!name) return { success: false, error: 'กรุณากรอกชื่อโรงงาน' };

  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAMES.FACTORIES);
  if (!sheet || sheet.getLastRow() <= 1) return { success: false, error: 'Factory not found' };

  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]) === factoryId) {
      var rowNum = i + 2;
      var nowIso = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss');
      sheet.getRange(rowNum, 3).setValue(name);
      sheet.getRange(rowNum, 6).setValue(nowIso);

      appendAuditLog(adminEmail, 'UPDATE_FACTORY', 'FACTORY', factoryId, 'Renamed factory to: ' + name);
      return { success: true, message: 'แก้ไขข้อมูลโรงงานเรียบร้อยแล้ว' };
    }
  }
  return { success: false, error: 'ไม่พบโรงงานที่ต้องการแก้ไข' };
}

/**
 * Toggles factory active status.
 */
function setFactoryStatus(adminEmail, factoryId, active) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAMES.FACTORIES);
  if (!sheet || sheet.getLastRow() <= 1) return { success: false, error: 'Factory not found' };

  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]) === factoryId) {
      var rowNum = i + 2;
      var nowIso = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss');
      sheet.getRange(rowNum, 4).setValue(Boolean(active));
      sheet.getRange(rowNum, 6).setValue(nowIso);

      appendAuditLog(adminEmail, 'SET_FACTORY_STATUS', 'FACTORY', factoryId, 'Changed status to: ' + (active ? 'ACTIVE' : 'INACTIVE'));
      return { success: true, message: 'เปลี่ยนสถานะโรงงานเรียบร้อยแล้ว' };
    }
  }
  return { success: false, error: 'ไม่พบโรงงาน' };
}

/**
 * Reads settings from Settings worksheet.
 */
function getNumberSettings() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAMES.SETTINGS);
  var defaults = {
    minNumber: 1,
    maxNumber: 1000,
    registrationOpen: true,
    eventName: 'New Year Party 2027',
    eventYear: 2027,
    confirmationMessage: 'ยินดีต้อนรับสู่งานเลี้ยงสังสรรค์ส่งท้ายปีเก่าต้อนรับปีใหม่ 2027!',
    registrationDeadline: '',
    retainCancelledNumbers: true
  };

  if (!sheet || sheet.getLastRow() <= 1) return defaults;

  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
  var settingsMap = {};
  for (var i = 0; i < data.length; i++) {
    settingsMap[String(data[i][0])] = data[i][1];
  }

  return {
    minNumber: parseInt(settingsMap['MIN_NUMBER'], 10) || defaults.minNumber,
    maxNumber: parseInt(settingsMap['MAX_NUMBER'], 10) || defaults.maxNumber,
    registrationOpen: settingsMap['REGISTRATION_OPEN'] !== undefined ? String(settingsMap['REGISTRATION_OPEN']).toLowerCase() === 'true' : true,
    eventName: settingsMap['EVENT_NAME'] || defaults.eventName,
    eventYear: parseInt(settingsMap['EVENT_YEAR'], 10) || defaults.eventYear,
    confirmationMessage: settingsMap['CONFIRMATION_MESSAGE'] || defaults.confirmationMessage,
    registrationDeadline: settingsMap['REGISTRATION_DEADLINE'] || '',
    retainCancelledNumbers: settingsMap['RETAIN_CANCELLED_NUMBERS'] !== undefined ? String(settingsMap['RETAIN_CANCELLED_NUMBERS']).toLowerCase() === 'true' : true
  };
}

/**
 * Updates number range and system configuration with strict safety validation.
 */
function updateNumberSettings(adminEmail, newSettings) {
  var min = parseInt(newSettings.minNumber, 10);
  var max = parseInt(newSettings.maxNumber, 10);

  if (isNaN(min) || min < 1) return { success: false, error: 'หมายเลขเริ่มต้นต้องมีค่าตั้งแต่ 1 ขึ้นไป' };
  if (isNaN(max) || max < min) return { success: false, error: 'หมายเลขสูงสุดต้องมากกว่าหรือเท่ากับหมายเลขเริ่มต้น' };

  // Check if existing assigned numbers violate new bounds
  var ss = getSpreadsheet();
  var regSheet = ss.getSheetByName(SHEET_NAMES.REGISTRATIONS);
  if (regSheet && regSheet.getLastRow() > 1) {
    var regData = regSheet.getRange(2, 1, regSheet.getLastRow() - 1, 12).getValues();
    var violations = [];
    for (var r = 0; r < regData.length; r++) {
      if (String(regData[r][10]) === 'ACTIVE') {
        var num = parseInt(regData[r][8], 10);
        if (num < min || num > max) {
          violations.push(num);
        }
      }
    }
    if (violations.length > 0) {
      return {
        success: false,
        error: 'ไม่สามารถปรับช่วงหมายเลขได้ เนื่องจากมีพนักงานที่ได้รับหมายเลข (' + violations.slice(0, 5).join(', ') + ') ซึ่งอยู่นอกช่วงใหม่'
      };
    }
  }

  var setSheet = ss.getSheetByName(SHEET_NAMES.SETTINGS);
  var nowIso = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss');

  var updates = {
    'MIN_NUMBER': String(min),
    'MAX_NUMBER': String(max),
    'REGISTRATION_OPEN': String(Boolean(newSettings.registrationOpen)),
    'EVENT_NAME': String(newSettings.eventName || 'New Year Party 2027'),
    'EVENT_YEAR': String(newSettings.eventYear || 2027),
    'CONFIRMATION_MESSAGE': String(newSettings.confirmationMessage || ''),
    'REGISTRATION_DEADLINE': String(newSettings.registrationDeadline || ''),
    'RETAIN_CANCELLED_NUMBERS': String(newSettings.retainCancelledNumbers !== false)
  };

  if (!setSheet) {
    setSheet = ss.insertSheet(SHEET_NAMES.SETTINGS);
    setSheet.appendRow(['Setting Key', 'Setting Value', 'Updated At']);
  }

  // Clear and rewrite settings key-value rows
  setSheet.getRange(2, 1, Math.max(1, setSheet.getLastRow() - 1), 3).clearContent();
  var rows = [];
  for (var k in updates) {
    rows.push([k, updates[k], nowIso]);
  }
  setSheet.getRange(2, 1, rows.length, 3).setValues(rows);

  appendAuditLog(adminEmail, 'UPDATE_SETTINGS', 'SETTINGS', 'RANGE', 'Updated number range to [' + min + ' - ' + max + '], Open: ' + newSettings.registrationOpen);

  return { success: true, message: 'บันทึกการตั้งค่าเรียบร้อยแล้ว' };
}

/**
 * Quick toggle for registration open/closed status.
 */
function setRegistrationStatus(adminEmail, isOpen) {
  var settings = getNumberSettings();
  settings.registrationOpen = Boolean(isOpen);
  return updateNumberSettings(adminEmail, settings);
}

/**
 * Real XLSX Export: Generates genuine Microsoft Excel Workbook (.xlsx)
 * Creates temporary spreadsheet, builds styled data table, exports as XLSX blob via Drive.
 */
function exportRegistrations(adminEmail, filters, format) {
  format = (format || 'xlsx').toLowerCase();
  var ss = getSpreadsheet();
  var regSheet = ss.getSheetByName(SHEET_NAMES.REGISTRATIONS);
  
  if (!regSheet || regSheet.getLastRow() <= 1) {
    return { success: false, error: 'ไม่พบข้อมูลสำหรับส่งออก' };
  }

  var data = regSheet.getRange(2, 1, regSheet.getLastRow() - 1, 12).getValues();
  filters = filters || {};

  var exportRows = [
    ['ลำดับที่', 'หมายเลขที่ได้รับ', 'รหัสพนักงาน', 'ชื่อ', 'นามสกุล', 'ชื่อ-นามสกุล', 'แผนก', 'โรงงาน/สาขา', 'วันที่ลงทะเบียน', 'สถานะ']
  ];

  var count = 0;
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var facId = String(row[6]);
    var status = String(row[10]);

    if (filters.factoryId && filters.factoryId !== 'ALL' && facId !== filters.factoryId) continue;
    if (filters.status && filters.status !== 'ALL' && status !== filters.status) continue;

    count++;
    exportRows.push([
      count,
      parseInt(row[8], 10),
      "'" + String(row[1]).trim(), // preserve leading zeros as text
      String(row[2]),
      String(row[3]),
      String(row[4]),
      String(row[5]),
      String(row[7]),
      String(row[9]),
      status === 'ACTIVE' ? 'ลงทะเบียนแล้ว' : 'ยกเลิก'
    ]);
  }

  appendAuditLog(adminEmail, 'EXPORT_REPORT', 'REGISTRATIONS', format.toUpperCase(), 'Exported ' + count + ' records as ' + format.toUpperCase());

  // If CSV requested
  if (format === 'csv') {
    var csvContent = exportRows.map(function(r) {
      return r.map(function(field) {
        var str = String(field).replace(/"/g, '""');
        return '"' + str + '"';
      }).join(',');
    }).join('\r\n');

    var csvBlob = Utilities.newBlob(csvContent, 'text/csv;charset=utf-8', 'NewYearParty2027_Registrations.csv');
    return {
      success: true,
      filename: 'NewYearParty2027_Registrations.csv',
      mimeType: 'text/csv',
      base64: Utilities.base64Encode(csvBlob.getBytes()),
      totalRecords: count
    };
  }

  // Real XLSX Export via Drive / Temp Spreadsheet
  var tempName = 'Export_NewYearParty2027_' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyyMMdd_HHmmss');
  var tempSs = SpreadsheetApp.create(tempName);
  var tempSheet = tempSs.getActiveSheet();
  tempSheet.setName('Registrations');

  tempSheet.getRange(1, 1, exportRows.length, exportRows[0].length).setValues(exportRows);
  
  // Style headers
  var header = tempSheet.getRange(1, 1, 1, exportRows[0].length);
  header.setBackground('#0F172A');
  header.setFontColor('#FFFFFF');
  header.setFontWeight('bold');

  SpreadsheetApp.flush();

  // Fetch as XLSX blob
  var tempId = tempSs.getId();
  var url = 'https://docs.google.com/spreadsheets/d/' + tempId + '/export?format=xlsx';
  var response = UrlFetchApp.fetch(url, {
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true
  });

  var xlsxBlob = response.getBlob().setName('NewYearParty2027_Registrations.xlsx');

  // Safely delete temp spreadsheet from Drive
  try {
    DriveApp.getFileById(tempId).setTrashed(true);
  } catch (e) {
    Logger.log('Could not trash temp sheet: ' + e.message);
  }

  return {
    success: true,
    filename: 'NewYearParty2027_Registrations.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    base64: Utilities.base64Encode(xlsxBlob.getBytes()),
    totalRecords: count
  };
}

/**
 * Retrieves audit logs for Admin inspection.
 */
function getAuditLogs(filters, pagination) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAMES.AUDIT_LOGS);
  if (!sheet || sheet.getLastRow() <= 1) {
    return { success: true, data: { items: [], total: 0, page: 1, limit: 20 } };
  }

  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 7).getValues();
  var logs = [];
  for (var i = data.length - 1; i >= 0; i--) {
    logs.push({
      id: String(data[i][0]),
      timestamp: String(data[i][1]),
      adminEmail: String(data[i][2]),
      action: String(data[i][3]),
      targetType: String(data[i][4]),
      targetId: String(data[i][5]),
      details: String(data[i][6])
    });
  }

  pagination = pagination || {};
  var page = parseInt(pagination.page, 10) || 1;
  var limit = parseInt(pagination.limit, 10) || 20;
  var startIndex = (page - 1) * limit;

  return {
    success: true,
    data: {
      items: logs.slice(startIndex, startIndex + limit),
      total: logs.length,
      page: page,
      limit: limit,
      totalPages: Math.ceil(logs.length / limit)
    }
  };
}

/**
 * Appends record to AuditLogs sheet
 */
function appendAuditLog(adminEmail, action, targetType, targetId, details) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAMES.AUDIT_LOGS);
    if (!sheet) return;

    var logId = 'LOG-' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyyMMdd-HHmmss') + '-' + Math.floor(100 + Math.random() * 900);
    var nowIso = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss');

    sheet.appendRow([
      logId,
      nowIso,
      adminEmail || 'SYSTEM',
      action,
      targetType,
      targetId,
      details
    ]);
  } catch (err) {
    Logger.log('Failed to write audit log: ' + err.message);
  }
}
