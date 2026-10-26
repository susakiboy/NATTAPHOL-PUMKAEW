import { Factory, Registration, PublicConfig, DashboardStats, SystemSettings, AuditLog, AdminUser } from '../types';

const GAS_URL_KEY = 'nyp2027_gas_url';
const ADMIN_EMAIL_KEY = 'nyp2027_admin_email';

export function getGasUrl(): string {
  try {
    return localStorage.getItem(GAS_URL_KEY) || '';
  } catch (e) {
    return '';
  }
}

export function setGasUrl(url: string) {
  try {
    if (url) {
      localStorage.setItem(GAS_URL_KEY, url.trim());
    } else {
      localStorage.removeItem(GAS_URL_KEY);
    }
  } catch (e) {
    // ignore
  }
}

export function getStoredAdminEmail(): string {
  try {
    return localStorage.getItem(ADMIN_EMAIL_KEY) || '';
  } catch (e) {
    return '';
  }
}

export function setStoredAdminEmail(email: string) {
  try {
    if (email) {
      localStorage.setItem(ADMIN_EMAIL_KEY, email);
    } else {
      localStorage.removeItem(ADMIN_EMAIL_KEY);
    }
  } catch (e) {
    // ignore
  }
}

class ApiService {
  private getHeaders(adminEmail?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const email = adminEmail || getStoredAdminEmail();
    if (email) {
      headers['x-admin-email'] = email;
    }
    return headers;
  }

  // --- Public APIs ---

  async getPublicConfig(): Promise<PublicConfig> {
    const gasUrl = getGasUrl();
    if (gasUrl) {
      try {
        const res = await fetch(`${gasUrl}?action=getPublicConfig`);
        const json = await res.json();
        if (json.success && json.data) return json.data;
      } catch (err) {
        console.warn('Direct GAS fetch failed, falling back to local server:', err);
      }
    }

    const res = await fetch('/api/config');
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to load configuration');
    return json.data;
  }

  async getActiveFactories(): Promise<Factory[]> {
    const gasUrl = getGasUrl();
    if (gasUrl) {
      try {
        const res = await fetch(`${gasUrl}?action=getActiveFactories`);
        const json = await res.json();
        if (json.success && json.data) return json.data;
      } catch (e) {
        // fallback
      }
    }
    const res = await fetch('/api/factories');
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to load factories');
    return json.data;
  }

  async registerEmployee(formData: {
    employeeId: string;
    firstName: string;
    lastName: string;
    department: string;
    factoryId: string;
  }): Promise<{ registration: Registration; isDuplicate?: boolean }> {
    const gasUrl = getGasUrl();
    if (gasUrl) {
      try {
        const res = await fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'registerEmployee', formData }),
        });
        const json = await res.json();
        if (!json.success) {
          const err = new Error(json.error || 'Registration failed') as any;
          err.isDuplicate = json.isDuplicate;
          err.existingRegistration = json.existingRegistration;
          throw err;
        }
        return { registration: json.data };
      } catch (err: any) {
        if (err.isDuplicate || err.message?.includes('ลงทะเบียน')) throw err;
        console.warn('Direct GAS POST failed, using backend:', err);
      }
    }

    const res = await fetch('/api/register', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(formData),
    });
    const json = await res.json();
    if (!json.success) {
      const err = new Error(json.error || 'Registration failed') as any;
      err.isDuplicate = json.isDuplicate;
      err.existingRegistration = json.existingRegistration;
      throw err;
    }
    return { registration: json.data };
  }

  async checkRegistrationByEmployeeId(employeeId: string): Promise<Registration | null> {
    const res = await fetch(`/api/registration/check/${encodeURIComponent(employeeId.trim())}`);
    const json = await res.json();
    return json.data || null;
  }

  async getRegistrationById(id: string): Promise<Registration> {
    const res = await fetch(`/api/registration/${encodeURIComponent(id)}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Not found');
    return json.data;
  }

  // --- Admin APIs ---

  async adminLogin(email: string, passkey: string): Promise<AdminUser> {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, passkey }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Login failed');
    setStoredAdminEmail(json.user.email);
    return json.user;
  }

  async getAdminDashboard(adminEmail?: string): Promise<DashboardStats> {
    const res = await fetch('/api/admin/dashboard', {
      headers: this.getHeaders(adminEmail),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to load dashboard');
    return json.data;
  }

  async getRegistrations(
    filters: { search?: string; factoryId?: string; status?: string },
    page: number = 1,
    limit: number = 20,
    adminEmail?: string
  ): Promise<{ items: Registration[]; total: number; page: number; totalPages: number }> {
    const params = new URLSearchParams({
      search: filters.search || '',
      factoryId: filters.factoryId || 'ALL',
      status: filters.status || 'ALL',
      page: String(page),
      limit: String(limit),
    });
    const res = await fetch(`/api/admin/registrations?${params.toString()}`, {
      headers: this.getHeaders(adminEmail),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to load registrations');
    return json.data;
  }

  async updateRegistration(
    id: string,
    data: { firstName: string; lastName: string; department: string },
    adminEmail?: string
  ): Promise<void> {
    const res = await fetch(`/api/admin/registrations/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(adminEmail),
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to update');
  }

  async cancelRegistration(id: string, releaseNumber: boolean, adminEmail?: string): Promise<void> {
    const res = await fetch(`/api/admin/registrations/${id}/cancel`, {
      method: 'POST',
      headers: this.getHeaders(adminEmail),
      body: JSON.stringify({ releaseNumber }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to cancel');
  }

  async getAllFactories(adminEmail?: string): Promise<Factory[]> {
    const res = await fetch('/api/admin/factories', {
      headers: this.getHeaders(adminEmail),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to load factories');
    return json.data;
  }

  async addFactory(data: { code: string; name: string }, adminEmail?: string): Promise<Factory> {
    const res = await fetch('/api/admin/factories', {
      method: 'POST',
      headers: this.getHeaders(adminEmail),
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to create factory');
    return json.data;
  }

  async updateFactory(id: string, data: { name: string }, adminEmail?: string): Promise<Factory> {
    const res = await fetch(`/api/admin/factories/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(adminEmail),
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to update factory');
    return json.data;
  }

  async setFactoryStatus(id: string, active: boolean, adminEmail?: string): Promise<Factory> {
    const res = await fetch(`/api/admin/factories/${id}/status`, {
      method: 'PATCH',
      headers: this.getHeaders(adminEmail),
      body: JSON.stringify({ active }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to change factory status');
    return json.data;
  }

  async getNumberSettings(adminEmail?: string): Promise<SystemSettings> {
    const res = await fetch('/api/admin/number-settings', {
      headers: this.getHeaders(adminEmail),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to load settings');
    return json.data;
  }

  async updateNumberSettings(settings: SystemSettings, adminEmail?: string): Promise<SystemSettings> {
    const res = await fetch('/api/admin/number-settings', {
      method: 'PUT',
      headers: this.getHeaders(adminEmail),
      body: JSON.stringify(settings),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to update settings');
    return json.data;
  }

  async setRegistrationStatus(isOpen: boolean, adminEmail?: string): Promise<void> {
    const res = await fetch('/api/admin/registration-status', {
      method: 'PATCH',
      headers: this.getHeaders(adminEmail),
      body: JSON.stringify({ isOpen }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to update status');
  }

  async getAuditLogs(page: number = 1, limit: number = 20, adminEmail?: string): Promise<{ items: AuditLog[]; total: number; totalPages: number }> {
    const res = await fetch(`/api/admin/audit-logs?page=${page}&limit=${limit}`, {
      headers: this.getHeaders(adminEmail),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to load audit logs');
    return json.data;
  }

  getExportUrl(format: 'xlsx' | 'csv', factoryId: string = 'ALL', status: string = 'ALL', adminEmail?: string): string {
    const email = adminEmail || getStoredAdminEmail();
    return `/api/admin/export?format=${format}&factoryId=${encodeURIComponent(factoryId)}&status=${encodeURIComponent(status)}&email=${encodeURIComponent(email)}`;
  }
}

export const api = new ApiService();
