// main/types.ts
export interface ActivityLog {
  logIn: number;
  logOut?: number;
}

export interface DailyActivity {
  date: string;
  firstLogin: number;
  logActivity: ActivityLog[];
  grossTime: number;
  effectiveTime: number;
  idleTime: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export type ActivityData = Record<string, DailyActivity>;