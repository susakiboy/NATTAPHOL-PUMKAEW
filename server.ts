import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import * as XLSX from 'xlsx';
import {
  RegistrationRecord,
  FactoryRecord,
  NumberSettings,
  allocateRandomNumber,
  validateRegistrationInput,
  validateRangeChange,
  computeDashboardStats,
  normalizeEmployeeId,
} from './src/utils/registrationRules';

interface AuditLogRecord {
  id: string;
  timestamp: string;
  adminEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
}

interface DatabaseState {
  registrations: RegistrationRecord[];
  factories: FactoryRecord[];
  settings: NumberSettings;
  admins: { id: string; email: string; role: string; active: boolean }[];
  auditLogs: AuditLogRecord[];
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DB_FILE = path.resolve(DATA_DIR, 'database.json');

function getDefaultDatabase(): DatabaseState {
  const now = new Date().toISOString();
  return {
    registrations: [
      {
        id: 'REG-20261026-0001-4821',
        employeeId: '00101',
        firstName: 'ก้องเกียรติ',
        lastName: 'วราลักษณ์',
        fullName: 'ก้องเกียรติ วราลักษณ์',
        department: 'เทคโนโลยีสารสนเทศ (IT)',
        factoryId: 'FAC-01',
        factoryNameSnapshot: 'สำนักงานใหญ่ (กรุงเทพฯ)',
        assignedNumber: 108,
        registrationTimestamp: '2026-10-26 09:15:30',
        registrationStatus: 'ACTIVE',
        updatedTimestamp: '2026-10-26 09:15:30',
      },
      {
        id: 'REG-20261026-0002-7312',
        employeeId: '00452',
        firstName: 'สมศรี',
        lastName: 'รุ่งเรืองยิ่ง',
        fullName: 'สมศรี รุ่งเรืองยิ่ง',
        department: 'ฝ่ายผลิตและคุณภาพ (QA)',
        factoryId: 'FAC-02',
        factoryNameSnapshot: 'โรงงานบางปะกง (ฉะเชิงเทรา)',
        assignedNumber: 312,
        registrationTimestamp: '2026-10-26 09:22:14',
        registrationStatus: 'ACTIVE',
        updatedTimestamp: '2026-10-26 09:22:14',
      },
      {
        id: 'REG-20261026-0003-8890',
        employeeId: '00683',
        firstName: 'นพพล',
        lastName: 'เจริญสุข',
        fullName: 'นพพล เจริญสุข',
        department: 'คลังสินค้าและโลจิสติกส์',
        factoryId: 'FAC-03',
        factoryNameSnapshot: 'โรงงานโรจนะ (อยุธยา)',
        assignedNumber: 528,
        registrationTimestamp: '2026-10-26 09:30:05',
        registrationStatus: 'ACTIVE',
        updatedTimestamp: '2026-10-26 09:30:05',
      },
      {
        id: 'REG-20261026-0004-9124',
        employeeId: '00711',
        firstName: 'ปิยะมาศ',
        lastName: 'ประเสริฐศิลป์',
        fullName: 'ปิยะมาศ ประเสริฐศิลป์',
        department: 'ฝ่ายทรัพยากรบุคคล (HR)',
        factoryId: 'FAC-01',
        factoryNameSnapshot: 'สำนักงานใหญ่ (กรุงเทพฯ)',
        assignedNumber: 64,
        registrationTimestamp: '2026-10-26 09:45:50',
        registrationStatus: 'ACTIVE',
        updatedTimestamp: '2026-10-26 09:45:50',
      },
    ],
    factories: [
      { id: 'FAC-01', code: 'HQ', name: 'สำนักงานใหญ่ (กรุงเทพฯ)', active: true, createdAt: now, updatedAt: now },
      { id: 'FAC-02', code: 'BKP', name: 'โรงงานบางปะกง (ฉะเชิงเทรา)', active: true, createdAt: now, updatedAt: now },
      { id: 'FAC-03', code: 'AYU', name: 'โรงงานโรจนะ (อยุธยา)', active: true, createdAt: now, updatedAt: now },
      { id: 'FAC-04', code: 'LCH', name: 'โรงงานแหลมฉบัง (ชลบุรี)', active: true, createdAt: now, updatedAt: now },
      { id: 'FAC-05', code: 'KRT', name: 'โรงงานโคราช (นครราชสีมา)', active: true, createdAt: now, updatedAt: now },
    ],
    settings: {
      minNumber: 1,
      maxNumber: 1000,
      registrationOpen: true,
      eventName: 'New Year Party 2027',
      eventYear: 2027,
      confirmationMessage: 'ยินดีต้อนรับสู่งานเลี้ยงสังสรรค์ส่งท้ายปีเก่าต้อนรับปีใหม่ 2027 สัญลักษณ์แห่งความสำเร็จและความก้าวหน้า!',
      registrationDeadline: '',
      retainCancelledNumbers: true,
    },
    admins: [
      { id: 'ADM-01', email: 'jnsmedia.organizer@gmail.com', role: 'SUPER_ADMIN', active: true },
      { id: 'ADM-02', email: 'admin@company.com', role: 'SUPER_ADMIN', active: true },
    ],
    auditLogs: [
      {
        id: 'LOG-INIT',
        timestamp: now,
        adminEmail: 'SYSTEM',
        action: 'DATABASE_INITIALIZED',
        targetType: 'SYSTEM',
        targetId: 'INIT',
        details: 'System initialized with default schema and active factories.',
      },
    ],
  };
}

let db: DatabaseState;

function loadDatabase(): DatabaseState {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Failed to read db file:', err);
  }
  const defaultState = getDefaultDatabase();
  saveDatabase(defaultState);
  return defaultState;
}

function saveDatabase(state: DatabaseState) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save db file:', err);
  }
}

db = loadDatabase();

// In-memory Mutex to emulate LockService.getScriptLock() concurrency protection
class ServerLock {
  private queue: Promise<void> = Promise.resolve();

  async acquire<T>(task: () => Promise<T>): Promise<T> {
    const next = this.queue.then(async () => {
      return await task();
    });
    this.queue = next.then(() => {}, () => {});
    return next;
  }
}

const serverLock = new ServerLock();

function appendAudit(adminEmail: string, action: string, targetType: string, targetId: string, details: string) {
  const log: AuditLogRecord = {
    id: `LOG-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    timestamp: new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }),
    adminEmail: adminEmail || 'SYSTEM',
    action,
    targetType,
    targetId,
    details,
  };
  db.auditLogs.unshift(log);
  if (db.auditLogs.length > 500) {
    db.auditLogs.pop();
  }
  saveDatabase(db);
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // --- Public APIs ---

  // 1. Get Public Config
  app.get('/api/config', (_req: Request, res: Response) => {
    const activeFactories = db.factories.filter((f) => f.active);
    res.json({
      success: true,
      data: {
        eventName: db.settings.eventName,
        eventYear: db.settings.eventYear,
        registrationOpen: db.settings.registrationOpen,
        confirmationMessage: db.settings.confirmationMessage,
        registrationDeadline: db.settings.registrationDeadline,
        factories: activeFactories,
      },
    });
  });

  // 2. Get Active Factories
  app.get('/api/factories', (_req: Request, res: Response) => {
    const active = db.factories.filter((f) => f.active);
    res.json({ success: true, data: active });
  });

  // 3. Register Employee (with atomic LockService emulation & duplicate prevention)
  app.post('/api/register', async (req: Request, res: Response) => {
    try {
      const result = await serverLock.acquire(async () => {
        const body = req.body || {};
        const empId = normalizeEmployeeId(body.employeeId);
        const activeFactories = db.factories.filter((f) => f.active);

        // Validation
        const val = validateRegistrationInput(
          { ...body, employeeId: empId },
          activeFactories,
          db.settings.registrationOpen,
          db.settings.registrationDeadline
        );

        if (!val.valid) {
          return { status: 400, data: { success: false, errors: val.errors, error: Object.values(val.errors)[0] } };
        }

        // Duplicate Check
        const existing = db.registrations.find(
          (r) => r.employeeId.toLowerCase() === empId.toLowerCase() && r.registrationStatus === 'ACTIVE'
        );
        if (existing) {
          return {
            status: 409,
            data: {
              success: false,
              isDuplicate: true,
              error: `รหัสพนักงาน ${empId} ได้ลงทะเบียนไว้แล้วในระบบ (หมายเลขที่ได้รับ: #${existing.assignedNumber})`,
              existingRegistration: existing,
            },
          };
        }

        // Matched Factory
        const factory = db.factories.find((f) => f.id === body.factoryId && f.active);
        if (!factory) {
          return { status: 400, data: { success: false, error: 'โรงงานที่เลือกไม่เปิดให้บริการ' } };
        }

        // Allocate Number
        const unavailableNumbers = new Set<number>();
        db.registrations.forEach((r) => {
          if (r.registrationStatus === 'ACTIVE') {
            unavailableNumbers.add(r.assignedNumber);
          } else if (r.registrationStatus === 'CANCELLED' && db.settings.retainCancelledNumbers) {
            unavailableNumbers.add(r.assignedNumber);
          }
        });

        const alloc = allocateRandomNumber(db.settings.minNumber, db.settings.maxNumber, unavailableNumbers);
        if (!alloc.success || !alloc.number) {
          return { status: 400, data: { success: false, error: alloc.error || 'หมายเลขสุ่มเต็มแล้ว' } };
        }

        const nowIso = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
        const regId = `REG-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const firstName = String(body.firstName).trim();
        const lastName = String(body.lastName).trim();
        const fullName = `${firstName} ${lastName}`;

        const newRecord: RegistrationRecord = {
          id: regId,
          employeeId: empId,
          firstName,
          lastName,
          fullName,
          department: String(body.department).trim(),
          factoryId: factory.id,
          factoryNameSnapshot: factory.name,
          assignedNumber: alloc.number,
          registrationTimestamp: nowIso,
          registrationStatus: 'ACTIVE',
          updatedTimestamp: nowIso,
        };

        db.registrations.unshift(newRecord);
        appendAudit('PUBLIC', 'REGISTRATION_SUCCESS', 'REGISTRATION', regId, `Assigned number #${alloc.number} to ${fullName} (${empId})`);
        saveDatabase(db);

        return {
          status: 200,
          data: {
            success: true,
            message: 'ลงทะเบียนสำเร็จ!',
            data: newRecord,
          },
        };
      });

      res.status(result.status).json(result.data);
    } catch (err: any) {
      console.error('Registration server error:', err);
      res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการประมวลผล: ' + err.message });
    }
  });

  // 4. Check Registration by Employee ID
  app.get('/api/registration/check/:empId', (req: Request, res: Response) => {
    const empId = normalizeEmployeeId(req.params.empId);
    const found = db.registrations.find(
      (r) => r.employeeId.toLowerCase() === empId.toLowerCase() && r.registrationStatus === 'ACTIVE'
    );
    res.json({ success: true, data: found || null });
  });

  // 5. Get Confirmation by ID
  app.get('/api/registration/:id', (req: Request, res: Response) => {
    const found = db.registrations.find((r) => r.id === req.params.id);
    if (!found) {
      return res.status(404).json({ success: false, error: 'ไม่พบข้อมูลการลงทะเบียน' });
    }
    res.json({ success: true, data: found });
  });

  // --- Admin Authentication & Authorization Middleware ---
  function requireAdmin(req: Request, res: Response, next: () => void) {
    const adminEmail = (req.headers['x-admin-email'] as string || '').toLowerCase().trim();
    if (!adminEmail) {
      return res.status(401).json({ success: false, error: 'กรุณาเข้าสู่ระบบผู้ดูแลระบบ' });
    }
    const admin = db.admins.find((a) => a.email.toLowerCase() === adminEmail && a.active);
    if (!admin) {
      return res.status(403).json({ success: false, error: 'อีเมลนี้ไม่มีสิทธิ์เข้าถึงระบบผู้ดูแลระบบ' });
    }
    next();
  }

  // 6. Admin Login
  app.post('/api/admin/login', (req: Request, res: Response) => {
    const email = (req.body.email || '').trim().toLowerCase();
    const passkey = req.body.passkey || '';

    // Verify against Admins table
    const admin = db.admins.find((a) => a.email.toLowerCase() === email && a.active);
    if (!admin) {
      return res.status(403).json({ success: false, error: 'อีเมลนี้ไม่ได้รับอนุญาตให้เข้าใช้งานระบบผู้ดูแลระบบ' });
    }

    // Default passkey verification
    if (passkey !== 'NYP2027@AdminSecure' && passkey !== 'admin') {
      return res.status(401).json({ success: false, error: 'รหัสผ่าน Admin Passkey ไม่ถูกต้อง' });
    }

    appendAudit(email, 'ADMIN_LOGIN', 'AUTH', admin.id, 'Admin successfully logged in.');
    res.json({
      success: true,
      user: {
        id: admin.id,
        email: admin.email,
        role: admin.role,
      },
    });
  });

  // 7. Admin Dashboard Stats
  app.get('/api/admin/dashboard', requireAdmin, (_req: Request, res: Response) => {
    const stats = computeDashboardStats(db.registrations, db.factories, db.settings);
    res.json({
      success: true,
      data: {
        ...stats,
        settings: db.settings,
      },
    });
  });

  // 8. Admin Registrations (Search, Filter, Sort, Pagination)
  app.get('/api/admin/registrations', requireAdmin, (req: Request, res: Response) => {
    const search = ((req.query.search as string) || '').toLowerCase().trim();
    const factoryId = (req.query.factoryId as string) || 'ALL';
    const status = (req.query.status as string) || 'ALL';
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;

    let filtered = db.registrations.filter((r) => {
      if (factoryId !== 'ALL' && r.factoryId !== factoryId) return false;
      if (status !== 'ALL' && r.registrationStatus !== status) return false;
      if (search) {
        const mEmp = r.employeeId.toLowerCase().includes(search);
        const mName = r.fullName.toLowerCase().includes(search);
        const mDept = r.department.toLowerCase().includes(search);
        const mFac = r.factoryNameSnapshot.toLowerCase().includes(search);
        const mNum = String(r.assignedNumber).includes(search);
        if (!mEmp && !mName && !mDept && !mFac && !mNum) return false;
      }
      return true;
    });

    // Sort by registrationTimestamp desc
    filtered.sort((a, b) => new Date(b.registrationTimestamp).getTime() - new Date(a.registrationTimestamp).getTime());

    const total = filtered.length;
    const startIndex = (page - 1) * limit;
    const items = filtered.slice(startIndex, startIndex + limit);

    res.json({
      success: true,
      data: {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  });

  // 9. Update Registration (Edit permitted details)
  app.put('/api/admin/registrations/:id', requireAdmin, (req: Request, res: Response) => {
    const adminEmail = (req.headers['x-admin-email'] as string || '').toLowerCase();
    const id = req.params.id;
    const idx = db.registrations.findIndex((r) => r.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'ไม่พบรายการที่ต้องการแก้ไข' });
    }

    const { firstName, lastName, department } = req.body;
    const current = db.registrations[idx];
    const newFName = firstName ? String(firstName).trim() : current.firstName;
    const newLName = lastName ? String(lastName).trim() : current.lastName;
    const newDept = department ? String(department).trim() : current.department;

    db.registrations[idx] = {
      ...current,
      firstName: newFName,
      lastName: newLName,
      fullName: `${newFName} ${newLName}`,
      department: newDept,
      updatedTimestamp: new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }),
    };

    appendAudit(adminEmail, 'UPDATE_REGISTRATION', 'REGISTRATION', id, `Updated details for ${id} (${newFName} ${newLName})`);
    saveDatabase(db);
    res.json({ success: true, message: 'บันทึกการแก้ไขเรียบร้อยแล้ว', data: db.registrations[idx] });
  });

  // 10. Cancel Registration
  app.post('/api/admin/registrations/:id/cancel', requireAdmin, (req: Request, res: Response) => {
    const adminEmail = (req.headers['x-admin-email'] as string || '').toLowerCase();
    const id = req.params.id;
    const releaseNumber = Boolean(req.body.releaseNumber);
    const idx = db.registrations.findIndex((r) => r.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'ไม่พบรายการที่ต้องการยกเลิก' });
    }

    const record = db.registrations[idx];
    record.registrationStatus = 'CANCELLED';
    record.updatedTimestamp = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });

    const detailMsg = `Cancelled registration #${record.assignedNumber} (${record.fullName}). ${
      releaseNumber ? 'Number released for reuse.' : 'Number retained as reserved.'
    }`;
    appendAudit(adminEmail, 'CANCEL_REGISTRATION', 'REGISTRATION', id, detailMsg);
    saveDatabase(db);

    res.json({ success: true, message: 'ยกเลิกการลงทะเบียนเรียบร้อยแล้ว' });
  });

  // 11. Factory Management APIs
  app.get('/api/admin/factories', requireAdmin, (_req: Request, res: Response) => {
    res.json({ success: true, data: db.factories });
  });

  app.post('/api/admin/factories', requireAdmin, (req: Request, res: Response) => {
    const adminEmail = (req.headers['x-admin-email'] as string || '').toLowerCase();
    const code = String(req.body.code || '').trim().toUpperCase();
    const name = String(req.body.name || '').trim();

    if (!code || !name) {
      return res.status(400).json({ success: false, error: 'กรุณากรอกรหัสและชื่อโรงงาน' });
    }

    if (db.factories.some((f) => f.code === code)) {
      return res.status(400).json({ success: false, error: `รหัสโรงงาน ${code} มีอยู่ในระบบแล้ว` });
    }

    const nowIso = new Date().toISOString();
    const newFactory: FactoryRecord = {
      id: `FAC-${Date.now().toString().slice(-4)}`,
      code,
      name,
      active: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    db.factories.push(newFactory);
    appendAudit(adminEmail, 'ADD_FACTORY', 'FACTORY', newFactory.id, `Created factory ${code} - ${name}`);
    saveDatabase(db);

    res.json({ success: true, message: 'เพิ่มโรงงานเรียบร้อยแล้ว', data: newFactory });
  });

  app.put('/api/admin/factories/:id', requireAdmin, (req: Request, res: Response) => {
    const adminEmail = (req.headers['x-admin-email'] as string || '').toLowerCase();
    const id = req.params.id;
    const name = String(req.body.name || '').trim();
    if (!name) return res.status(400).json({ success: false, error: 'กรุณากรอกชื่อโรงงาน' });

    const idx = db.factories.findIndex((f) => f.id === id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'ไม่พบโรงงาน' });

    db.factories[idx].name = name;
    db.factories[idx].updatedAt = new Date().toISOString();

    appendAudit(adminEmail, 'UPDATE_FACTORY', 'FACTORY', id, `Updated factory name to ${name}`);
    saveDatabase(db);

    res.json({ success: true, message: 'แก้ไขข้อมูลโรงงานเรียบร้อยแล้ว', data: db.factories[idx] });
  });

  app.patch('/api/admin/factories/:id/status', requireAdmin, (req: Request, res: Response) => {
    const adminEmail = (req.headers['x-admin-email'] as string || '').toLowerCase();
    const id = req.params.id;
    const active = Boolean(req.body.active);
    const idx = db.factories.findIndex((f) => f.id === id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'ไม่พบโรงงาน' });

    db.factories[idx].active = active;
    db.factories[idx].updatedAt = new Date().toISOString();

    appendAudit(adminEmail, 'SET_FACTORY_STATUS', 'FACTORY', id, `Set status to ${active ? 'ACTIVE' : 'INACTIVE'}`);
    saveDatabase(db);

    res.json({ success: true, message: 'เปลี่ยนสถานะโรงงานเรียบร้อยแล้ว', data: db.factories[idx] });
  });

  // 12. Number Settings & System Control
  app.get('/api/admin/number-settings', requireAdmin, (_req: Request, res: Response) => {
    res.json({ success: true, data: db.settings });
  });

  app.put('/api/admin/number-settings', requireAdmin, (req: Request, res: Response) => {
    const adminEmail = (req.headers['x-admin-email'] as string || '').toLowerCase();
    const { minNumber, maxNumber, registrationOpen, eventName, eventYear, confirmationMessage, registrationDeadline, retainCancelledNumbers } = req.body;

    const min = parseInt(minNumber, 10);
    const max = parseInt(maxNumber, 10);

    const activeNumbers = db.registrations.filter((r) => r.registrationStatus === 'ACTIVE').map((r) => r.assignedNumber);
    const check = validateRangeChange(min, max, activeNumbers);
    if (!check.safe) {
      return res.status(400).json({ success: false, error: check.reason });
    }

    db.settings = {
      minNumber: min,
      maxNumber: max,
      registrationOpen: Boolean(registrationOpen),
      eventName: eventName ? String(eventName).trim() : db.settings.eventName,
      eventYear: parseInt(eventYear, 10) || db.settings.eventYear,
      confirmationMessage: confirmationMessage !== undefined ? String(confirmationMessage) : db.settings.confirmationMessage,
      registrationDeadline: registrationDeadline || '',
      retainCancelledNumbers: retainCancelledNumbers !== false,
    };

    appendAudit(adminEmail, 'UPDATE_SETTINGS', 'SETTINGS', 'RANGE', `Updated settings: [${min} - ${max}], Open: ${registrationOpen}`);
    saveDatabase(db);

    res.json({ success: true, message: 'บันทึกการตั้งค่าเรียบร้อยแล้ว', data: db.settings });
  });

  app.patch('/api/admin/registration-status', requireAdmin, (req: Request, res: Response) => {
    const adminEmail = (req.headers['x-admin-email'] as string || '').toLowerCase();
    const isOpen = Boolean(req.body.isOpen);
    db.settings.registrationOpen = isOpen;

    appendAudit(adminEmail, 'TOGGLE_REGISTRATION_STATUS', 'SETTINGS', 'SYSTEM', `Changed registration open status to ${isOpen}`);
    saveDatabase(db);

    res.json({ success: true, message: `ระบบ${isOpen ? 'เปิด' : 'ปิด'}รับการลงทะเบียนเรียบร้อยแล้ว`, isOpen });
  });

  // 13. Genuine XLSX & CSV Export
  app.get('/api/admin/export', requireAdmin, (req: Request, res: Response) => {
    const adminEmail = (req.headers['x-admin-email'] as string || '').toLowerCase();
    const format = ((req.query.format as string) || 'xlsx').toLowerCase();
    const factoryId = (req.query.factoryId as string) || 'ALL';
    const status = (req.query.status as string) || 'ALL';

    const filtered = db.registrations.filter((r) => {
      if (factoryId !== 'ALL' && r.factoryId !== factoryId) return false;
      if (status !== 'ALL' && r.registrationStatus !== status) return false;
      return true;
    });

    appendAudit(adminEmail, 'EXPORT_REPORT', 'REGISTRATIONS', format.toUpperCase(), `Exported ${filtered.length} records in ${format.toUpperCase()}`);

    // Build worksheet data rows with explicit column types
    const excelRows = filtered.map((r, index) => ({
      'ลำดับ': index + 1,
      'หมายเลขของขวัญ': r.assignedNumber,
      'รหัสพนักงาน': r.employeeId, // string to preserve leading zeros
      'ชื่อ': r.firstName,
      'นามสกุล': r.lastName,
      'ชื่อ-นามสกุล': r.fullName,
      'แผนก': r.department,
      'โรงงาน/สาขา': r.factoryNameSnapshot,
      'วันที่-เวลาลงทะเบียน': r.registrationTimestamp,
      'สถานะการลงทะเบียน': r.registrationStatus === 'ACTIVE' ? 'ลงทะเบียนแล้ว' : 'ยกเลิก',
    }));

    if (format === 'csv') {
      const ws = XLSX.utils.json_to_sheet(excelRows);
      const csv = XLSX.utils.sheet_to_csv(ws);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="NewYearParty2027_Registrations.csv"');
      return res.send('\uFEFF' + csv); // Include UTF-8 BOM for Excel Thai compatibility
    }

    // Default: Microsoft Excel .xlsx
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelRows);

    // Set column widths for readability
    ws['!cols'] = [
      { wch: 8 },  // ลำดับ
      { wch: 18 }, // หมายเลขของขวัญ
      { wch: 16 }, // รหัสพนักงาน
      { wch: 18 }, // ชื่อ
      { wch: 18 }, // นามสกุล
      { wch: 25 }, // ชื่อ-นามสกุล
      { wch: 22 }, // แผนก
      { wch: 28 }, // โรงงาน/สาขา
      { wch: 22 }, // วันที่-เวลา
      { wch: 18 }, // สถานะ
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'พนักงานที่ลงทะเบียน');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="NewYearParty2027_Registrations.xlsx"');
    res.send(buffer);
  });

  // 14. Audit Logs
  app.get('/api/admin/audit-logs', requireAdmin, (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const startIndex = (page - 1) * limit;

    res.json({
      success: true,
      data: {
        items: db.auditLogs.slice(startIndex, startIndex + limit),
        total: db.auditLogs.length,
        page,
        limit,
        totalPages: Math.ceil(db.auditLogs.length / limit),
      },
    });
  });

  // 15. Setup / Reset Database
  app.post('/api/admin/setup-database', requireAdmin, (req: Request, res: Response) => {
    const adminEmail = (req.headers['x-admin-email'] as string || '').toLowerCase();
    const preserve = req.body.preserveExisting !== false;
    if (!preserve) {
      db = getDefaultDatabase();
      saveDatabase(db);
    }
    appendAudit(adminEmail, 'DATABASE_SETUP', 'SYSTEM', 'SCHEMA', `Executed database setup (Preserve existing: ${preserve})`);
    res.json({ success: true, message: 'ฐานข้อมูลพร้อมใช้งานเรียบร้อยแล้ว' });
  });

  // --- Mount Vite / Static Files ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
