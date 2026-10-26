/**
 * ============================================================================
 * NEW YEAR PARTY REGISTRATION SYSTEM 2027
 * Database Initialization and Schema Setup for Google Sheets
 * ============================================================================
 */

var SHEET_NAMES = {
  REGISTRATIONS: 'Registrations',
  FACTORIES: 'Factories',
  SETTINGS: 'Settings',
  ADMINS: 'Admins',
  AUDIT_LOGS: 'AuditLogs'
};

/**
 * Main Setup Function: Run this function once from Apps Script Editor
 * to initialize all worksheets, column headers, format styles, and default rows.
 * Safe to run multiple times: PRESERVES EXISTING RECORDS.
 */
function setupDatabase() {
  var ss = getSpreadsheet();
  Logger.log('Initializing New Year Party 2027 Database on Spreadsheet: ' + ss.getName());

  // 1. Setup Registrations Sheet
  setupWorksheet(ss, SHEET_NAMES.REGISTRATIONS, [
    'Registration ID',
    'Employee ID',
    'First Name',
    'Last Name',
    'Full Name',
    'Department',
    'Factory ID',
    'Factory Name Snapshot',
    'Assigned Number',
    'Registration Timestamp',
    'Registration Status',
    'Updated Timestamp'
  ], [160, 140, 150, 150, 200, 150, 120, 180, 140, 180, 140, 180]);

  // Enforce Employee ID column as Plain Text format to preserve leading zeros
  var regSheet = ss.getSheetByName(SHEET_NAMES.REGISTRATIONS);
  regSheet.getRange('B:B').setNumberFormat('@'); // Column B: Employee ID

  // 2. Setup Factories Sheet
  var facSheet = setupWorksheet(ss, SHEET_NAMES.FACTORIES, [
    'Factory ID',
    'Factory Code',
    'Factory Name',
    'Active Status',
    'Created At',
    'Updated At'
  ], [120, 120, 240, 120, 180, 180]);

  // Seed default factories if sheet is newly created (has only headers)
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
    Logger.log('Seeded default factories.');
  }

  // 3. Setup Settings Sheet
  var setSheet = setupWorksheet(ss, SHEET_NAMES.SETTINGS, [
    'Setting Key',
    'Setting Value',
    'Updated At'
  ], [220, 320, 200]);

  // Seed default settings if empty
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
    Logger.log('Seeded default settings.');
  }

  // 4. Setup Admins Sheet
  var adminSheet = setupWorksheet(ss, SHEET_NAMES.ADMINS, [
    'Admin ID',
    'Admin Email',
    'Role',
    'Active Status',
    'Created At',
    'Updated At'
  ], [120, 260, 140, 120, 180, 180]);

  // Seed current user email as primary Super Admin if empty
  if (adminSheet.getLastRow() <= 1) {
    var ownerEmail = Session.getEffectiveUser().getEmail() || 'admin@company.com';
    var nowIso = new Date().toISOString();
    adminSheet.appendRow(['ADM-01', ownerEmail, 'SUPER_ADMIN', true, nowIso, nowIso]);
    // Also add organizers if available
    adminSheet.appendRow(['ADM-02', 'jnsmedia.organizer@gmail.com', 'SUPER_ADMIN', true, nowIso, nowIso]);
    Logger.log('Seeded default admin email: ' + ownerEmail);
  }

  // 5. Setup AuditLogs Sheet
  setupWorksheet(ss, SHEET_NAMES.AUDIT_LOGS, [
    'Log ID',
    'Timestamp',
    'Admin Email',
    'Action',
    'Target Type',
    'Target ID',
    'Details'
  ], [120, 180, 240, 180, 140, 140, 350]);

  // Record initialization in Audit Log
  appendAuditLog('SYSTEM', 'DATABASE_INITIALIZED', 'DATABASE', ss.getId(), 'Database setup executed successfully without overwriting records.');

  Logger.log('Database setup completed successfully.');
  return { success: true, message: 'Database setup completed successfully' };
}

/**
 * Helper to ensure a worksheet exists with styled headers and column widths
 */
function setupWorksheet(ss, sheetName, headers, columnWidths) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  // Check header
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  
  if (lastRow === 0 || lastCol === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    // If headers exist, verify first row
    var existingHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    if (existingHeaders.length < headers.length) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
  }

  // Header styling: Midnight Navy Corporate theme
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground('#0F172A'); // Slate 900
  headerRange.setFontColor('#FFFFFF');
  headerRange.setFontWeight('bold');
  headerRange.setFontFamily('Prompt');
  headerRange.setFontSize(10);
  headerRange.setHorizontalAlignment('center');
  headerRange.setVerticalAlignment('middle');
  sheet.setRowHeight(1, 38);
  sheet.setFrozenRows(1);

  // Set column widths
  if (columnWidths && columnWidths.length) {
    for (var i = 0; i < columnWidths.length; i++) {
      sheet.setColumnWidth(i + 1, columnWidths[i]);
    }
  }

  return sheet;
}
