/**
 * ============================================================================
 * NEW YEAR PARTY REGISTRATION SYSTEM 2027
 * Google Apps Script Web App Router & HTTP Endpoint Handler
 * ============================================================================
 */

/**
 * HTTP GET Handler:
 * Serves either JSON API (e.g. ?action=config) or Web UI HTML
 */
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || '';

  // If requesting JSON API
  if (action) {
    return handleApiRequest(e);
  }

  // If serving full HTML template directly from Google Apps Script
  try {
    var template = HtmlService.createTemplateFromFile('Index');
    return template.evaluate()
      .setTitle('New Year Party Registration 2027')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (err) {
    // If no HTML template file, return API status page
    return ContentService.createTextOutput(JSON.stringify({
      status: 'ONLINE',
      system: 'New Year Party Registration System 2027 API',
      documentation: 'Pass ?action=<actionName> to query endpoints or use POST for actions'
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * HTTP POST Handler:
 * Handles registration, admin updates, factory management, exports
 */
function doPost(e) {
  return handleApiRequest(e);
}

/**
 * Unified API Request Dispatcher
 */
function handleApiRequest(e) {
  var response = { success: false, error: 'Invalid Request' };

  try {
    var body = {};
    if (e.postData && e.postData.contents) {
      try {
        body = JSON.parse(e.postData.contents);
      } catch (err) {
        body = e.parameter || {};
      }
    } else {
      body = e.parameter || {};
    }

    var action = body.action || (e.parameter ? e.parameter.action : '');

    switch (action) {
      // --- Public Endpoints ---
      case 'getPublicConfig':
        response = getPublicRegistrationConfig();
        break;

      case 'getActiveFactories':
        response = { success: true, data: getActiveFactories() };
        break;

      case 'registerEmployee':
        response = registerEmployee(body.formData || body);
        break;

      case 'findRegistration':
        var empId = body.employeeId || e.parameter.employeeId;
        var found = findRegistrationByEmployeeId(empId);
        response = { success: true, data: found };
        break;

      case 'getConfirmation':
        var regId = body.registrationId || e.parameter.registrationId;
        response = getRegistrationConfirmation(regId);
        break;

      // --- Admin Endpoints (Protected) ---
      case 'adminLogin':
        response = authenticateAdmin(body.email, body.secretKey);
        break;

      case 'getAdminDashboard':
        verifyAdminAccess(body.adminEmail);
        response = getAdminDashboardStats();
        break;

      case 'getRegistrations':
        verifyAdminAccess(body.adminEmail);
        response = getRegistrations(body.filters, body.pagination);
        break;

      case 'updateRegistration':
        verifyAdminAccess(body.adminEmail);
        response = updateRegistration(body.adminEmail, body.registrationId, body.updateData);
        break;

      case 'cancelRegistration':
        verifyAdminAccess(body.adminEmail);
        response = cancelRegistration(body.adminEmail, body.registrationId, body.releaseNumber);
        break;

      case 'getAllFactories':
        verifyAdminAccess(body.adminEmail);
        response = { success: true, data: getAllFactories() };
        break;

      case 'addFactory':
        verifyAdminAccess(body.adminEmail);
        response = addFactory(body.adminEmail, body.factoryData);
        break;

      case 'updateFactory':
        verifyAdminAccess(body.adminEmail);
        response = updateFactory(body.adminEmail, body.factoryId, body.factoryData);
        break;

      case 'setFactoryStatus':
        verifyAdminAccess(body.adminEmail);
        response = setFactoryStatus(body.adminEmail, body.factoryId, body.active);
        break;

      case 'getNumberSettings':
        verifyAdminAccess(body.adminEmail);
        response = { success: true, data: getNumberSettings() };
        break;

      case 'updateNumberSettings':
        verifyAdminAccess(body.adminEmail);
        response = updateNumberSettings(body.adminEmail, body.settings);
        break;

      case 'setRegistrationStatus':
        verifyAdminAccess(body.adminEmail);
        response = setRegistrationStatus(body.adminEmail, body.isOpen);
        break;

      case 'exportRegistrations':
        verifyAdminAccess(body.adminEmail);
        response = exportRegistrations(body.adminEmail, body.filters, body.format);
        break;

      case 'getAuditLogs':
        verifyAdminAccess(body.adminEmail);
        response = getAuditLogs(body.filters, body.pagination);
        break;

      case 'setupDatabase':
        verifyAdminAccess(body.adminEmail);
        response = setupDatabase();
        break;

      default:
        response = { success: false, error: 'Unknown action: ' + action };
        break;
    }
  } catch (err) {
    Logger.log('API Dispatch Error: ' + err.toString());
    response = { success: false, error: err.message || err.toString() };
  }

  // Output as JSON with CORS friendly header
  var output = ContentService.createTextOutput(JSON.stringify(response));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

/**
 * Guard function to enforce Admin privilege on API calls
 */
function verifyAdminAccess(adminEmail) {
  var auth = authorizeAdmin(adminEmail);
  if (!auth.authorized) {
    throw new Error('Unauthorized: อีเมลนี้ไม่มีสิทธิ์เข้าถึงข้อมูลผู้ดูแลระบบ');
  }
}
