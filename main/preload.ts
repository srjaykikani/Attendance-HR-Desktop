// main/preload.ts
import { contextBridge, ipcRenderer } from 'electron';
import { ActivityData, User } from './types';

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    invoke: (channel: string, data: any) => ipcRenderer.invoke(channel, data),
  },
});

contextBridge.exposeInMainWorld('ipc', {
  invoke: (channel: string, data: any) => ipcRenderer.invoke(channel, data),
  logActivity: (data: { userId: string; type: 'login' | 'logout'; timestamp: number }) =>ipcRenderer.invoke('log-activity', data),
  getActivityData: () => ipcRenderer.invoke('get-activity-data'),
  getCurrentSessionTime: () => ipcRenderer.invoke('get-current-session-time'),
  checkAuth: () => ipcRenderer.invoke('check-auth'),
  signIn: (credentials: { email: string; password: string }) => ipcRenderer.invoke('sign-in', credentials),
  getToken: () => ipcRenderer.invoke('get-token'),
  logout: () => ipcRenderer.invoke('logout'),
  fetchUserInfo: (userId: string) => ipcRenderer.invoke('fetch-user-info', userId),
  updateUserComment: (data: { userId: string; comment: string }) => ipcRenderer.invoke('update-user-comment', data),
});

contextBridge.exposeInMainWorld('screenshot', {
  startCapture: () => ipcRenderer.invoke('start-screenshot-capture'),
  stopCapture: () => ipcRenderer.invoke('stop-screenshot-capture'),
  getCaptureStatus: () => ipcRenderer.invoke('get-screenshot-status'),
});

declare global {
  interface Window {
    electron: {
      ipcRenderer: {
        invoke(channel: string, data?: any): Promise<any>;
      };
    };
    ipc: {
      invoke: (channel: string, data: any) => Promise<any>;
      getActivityData: () => Promise<ActivityData>;
      getCurrentSessionTime: () => Promise<{ grossTime: number; effectiveTime: number; idleTime: number }>;
      checkAuth: () => Promise<{ isAuthenticated: boolean; user?: User }>;
      signIn: (credentials: { email: string; password: string }) => Promise<{ success: boolean; user?: User; error?: string }>;
      getToken: () => Promise<string | undefined>;
      logout: () => Promise<{ success: boolean }>;
      fetchUserInfo: (userId: string) => Promise<{ success: boolean; user?: User; error?: string }>;
      updateUserComment: (data: { userId: string; comment: string }) => Promise<{ success: boolean; error?: string }>;
    };
    screenshot: {
      startCapture: () => Promise<{ success: boolean; error?: string }>;
      stopCapture: () => Promise<{ success: boolean }>;
      getCaptureStatus: () => Promise<{ isCapturing: boolean }>;
    };
  }
}