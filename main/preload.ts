import { contextBridge, ipcRenderer } from 'electron';
import { ActivityData, User } from './types';

contextBridge.exposeInMainWorld('ipc', {
  invoke: (channel: string, data: any) => ipcRenderer.invoke(channel, data),
  toggleTracking: () => ipcRenderer.invoke('toggle-tracking'),
  getActivityData: () => ipcRenderer.invoke('get-activity-data'),
  getCurrentSessionTime: () => ipcRenderer.invoke('get-current-session-time'),
  checkAuth: () => ipcRenderer.invoke('check-auth'),
  getTrackingStatus: () => ipcRenderer.invoke('get-tracking-status'),
});

declare global {
  interface Window {
    ipc: {
      invoke: (channel: string, data: any) => Promise<any>;
      toggleTracking: () => Promise<{ success: boolean; isTrackingEnabled: boolean }>;
      getActivityData: () => Promise<ActivityData>;
      getCurrentSessionTime: () => Promise<{ grossTime: number; effectiveTime: number; idleTime: number }>;
      checkAuth: () => Promise<{ isAuthenticated: boolean; user?: User }>;
      getTrackingStatus: () => Promise<{ isTrackingEnabled: boolean }>;
    }
  }
}