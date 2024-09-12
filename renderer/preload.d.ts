import { contextBridge, ipcRenderer } from 'electron';
import { ActivityData, User } from './types';

contextBridge.exposeInMainWorld('ipc', {
  invoke: (channel: string, data: any) => ipcRenderer.invoke(channel, data),
  getActivityData: () => ipcRenderer.invoke('get-activity-data'),
  getCurrentSessionTime: () => ipcRenderer.invoke('get-current-session-time'),
  checkAuth: () => ipcRenderer.invoke('check-auth'),
  signIn: (credentials: { email: string; password: string }) => ipcRenderer.invoke('sign-in', credentials),
  getToken: () => ipcRenderer.invoke('get-token'),
  logout: () => ipcRenderer.invoke('logout'),
  fetchUserInfo: (userId: string) => ipcRenderer.invoke('fetch-user-info', userId),
});

declare global {
  interface Window {
    ipc: {
      invoke: (channel: string, data: any) => Promise<any>;
      getActivityData: () => Promise<ActivityData>;
      getCurrentSessionTime: () => Promise<{ grossTime: number; effectiveTime: number; idleTime: number }>;
      checkAuth: () => Promise<{ isAuthenticated: boolean; user?: User }>;
      signIn: (credentials: { email: string; password: string }) => Promise<{ success: boolean; user?: User; error?: string }>;
      getToken: () => Promise<string | undefined>;
      logout: () => Promise<{ success: boolean }>;
      fetchUserInfo: (userId: string) => Promise<{ success: boolean; user?: User; error?: string }>;
    }
  }
}