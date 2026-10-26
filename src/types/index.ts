export interface Factory {
  id: string;
  code: string;
  name: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Registration {
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
  updatedTimestamp?: string;
}

export interface SystemSettings {
  minNumber: number;
  maxNumber: number;
  registrationOpen: boolean;
  eventName: string;
  eventYear: number;
  confirmationMessage: string;
  registrationDeadline?: string;
  retainCancelledNumbers: boolean;
}

export interface PublicConfig {
  eventName: string;
  eventYear: number;
  registrationOpen: boolean;
  confirmationMessage: string;
  registrationDeadline?: string;
  factories: Factory[];
}

export interface DashboardStats {
  totalRegistered: number;
  activeCount: number;
  cancelledCount: number;
  totalCapacity: number;
  usedNumbersCount: number;
  availableNumbersCount: number;
  capacityPercent: number;
  settings: SystemSettings;
  factoryStats: {
    factoryId: string;
    factoryCode?: string;
    factoryName: string;
    active: boolean;
    count: number;
  }[];
  recentRegistrations: Registration[];
}

export interface AuditLog {
  id: string;
  timestamp: string;
  adminEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
}

export interface AdminUser {
  id: string;
  email: string;
  role: string;
}
