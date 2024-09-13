// main/background.ts
import { app, ipcMain, BrowserWindow, powerMonitor } from 'electron';
import serve from 'electron-serve';
import Store from 'electron-store';
import path from 'path';
import axios from 'axios';
import { SyncManager } from './SyncManager';
import { encrypt, decrypt } from './encryptionUtils';
import { ActivityLog, DailyActivity, User, ActivityData } from './types';

const isProd: boolean = process.env.NODE_ENV === 'production';

if (isProd) {
  serve({ directory: 'app' });
} else {
  app.setPath('userData', `${app.getPath('userData')} (development)`);
}

const store = new Store<{
  'auth-token'?: string;
  user?: string;
  activityData: string;
}>();

let mainWindow: BrowserWindow | null = null;
let lastActivityTime = Date.now();
let isCurrentlyActive = false;
let currentSessionStart = 0;
let todayFirstLogin = 0;
const idleThreshold = 60000; // 1 minute in milliseconds

const PAYLOAD_CMS_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000';

const createWindow = async () => {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (isProd) {
    await mainWindow.loadURL('app://./home');
  } else {
    const port = process.argv[2];
    await mainWindow.loadURL(`http://localhost:${port}/home`);
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

function setupActivityTracking() {
  const updateActivity = () => {
    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityTime;

    if (timeSinceLastActivity >= idleThreshold) {
      if (isCurrentlyActive) {
        logActivity('logout', lastActivityTime);
        isCurrentlyActive = false;
      }
    } else {
      if (!isCurrentlyActive) {
        logActivity('login', now);
        isCurrentlyActive = true;
        currentSessionStart = now;
      }
    }

    lastActivityTime = now;
    updateCurrentSessionTime();
  };

  powerMonitor.on('unlock-screen', updateActivity);
  powerMonitor.on('lock-screen', updateActivity);
  powerMonitor.on('resume', updateActivity);
  powerMonitor.on('suspend', updateActivity);

  setInterval(() => {
    const idleTimeSeconds = powerMonitor.getSystemIdleTime();
    if (idleTimeSeconds * 1000 < idleThreshold) {
      updateActivity();
    } else if (isCurrentlyActive) {
      updateActivity();
    }
    
    // Sync data every 15 minutes
    SyncManager.batchSync();
  }, 900000);

  setInterval(updateCurrentSessionTime, 5000);
}

function getActivityData(): ActivityData {
  const encryptedData = store.get('activityData', encrypt({}));
  const decryptedData = decrypt(encryptedData);
  return decryptedData || {};
}

function saveActivityData(data: ActivityData) {
  store.set('activityData', encrypt(data));
}

function logActivity(type: 'login' | 'logout', timestamp: number) {
  const currentDate = new Date(timestamp).toISOString().split('T')[0];
  const savedData = getActivityData();
  
  if (!savedData[currentDate]) {
    savedData[currentDate] = {
      date: currentDate,
      firstLogin: timestamp,
      logActivity: [],
      grossTime: 0,
      effectiveTime: 0,
      idleTime: 0,
    };
  }
  
  const todayData = savedData[currentDate];
  
  if (type === 'login') {
    todayData.logActivity.push({ logIn: timestamp });
    if (todayData.firstLogin === 0 || timestamp < todayData.firstLogin) {
      todayData.firstLogin = timestamp;
      todayFirstLogin = timestamp;
    }
    currentSessionStart = timestamp;
    isCurrentlyActive = true;
  } else if (type === 'logout') {
    const lastLog = todayData.logActivity[todayData.logActivity.length - 1];
    if (lastLog && !lastLog.logOut) {
      lastLog.logOut = timestamp;
    }
    isCurrentlyActive = false;
  }
  
  updateCurrentSessionTime(currentDate, savedData);
  saveActivityData(savedData);
}

function updateCurrentSessionTime(currentDate?: string, savedData?: ActivityData) {
  const now = Date.now();
  const data = savedData || getActivityData();
  const date = currentDate || new Date().toISOString().split('T')[0];
  const todayData = data[date] || { 
    date,
    firstLogin: now,
    logActivity: [],
    grossTime: 0,
    effectiveTime: 0,
    idleTime: 0,
  };

  if (todayFirstLogin === 0) {
    todayFirstLogin = todayData.firstLogin;
  }

  if (isCurrentlyActive) {
    const sessionDuration = now - currentSessionStart;
    todayData.effectiveTime += sessionDuration;
    currentSessionStart = now;
  }

  todayData.grossTime = now - todayFirstLogin;
  todayData.idleTime = todayData.grossTime - todayData.effectiveTime;

  data[date] = todayData;
  saveActivityData(data);

  if (mainWindow) {
    mainWindow.webContents.send('update-session-time', {
      grossTime: todayData.grossTime,
      effectiveTime: todayData.effectiveTime,
      idleTime: todayData.idleTime
    });
  }
}

app.on('ready', () => {
  createWindow();
  setupActivityTracking();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC Handlers
ipcMain.handle('sign-in', async (_, { email, password }) => {
  try {
    const response = await axios.post(`${PAYLOAD_CMS_URL}/api/users/login`, {
      email,
      password,
    });
    
    if (response.data && response.data.user) {
      await store.set('auth-token', response.data.token);
      await store.set('user', encrypt(response.data.user));
      return { success: true, user: response.data.user };
    } else {
      throw new Error('Invalid response from server');
    }
  } catch (error) {
    console.error('Sign-in error:', error);
    if (axios.isAxiosError(error) && error.response) {
      return { 
        success: false, 
        error: error.response.data?.message || 'An error occurred during sign-in'
      };
    }
    return { success: false, error: 'An error occurred during sign-in' };
  }
});

ipcMain.handle('get-token', () => {
  return store.get('auth-token');
});

ipcMain.handle('get-user', () => {
  const encryptedUser = store.get('user');
  return encryptedUser ? decrypt(encryptedUser) : null;
});

ipcMain.handle('logout', () => {
  store.delete('auth-token');
  store.delete('user');
  return { success: true };
});

ipcMain.handle('check-auth', async () => {
  const token = store.get('auth-token');
  if (!token) {
    return { isAuthenticated: false };
  }

  try {
    const response = await axios.get(`${PAYLOAD_CMS_URL}/api/users/me`, {
      headers: {
        Authorization: `JWT ${token}`,
      },
    });

    if (response.data && response.data.user) {
      return { isAuthenticated: true, user: response.data.user };
    } else {
      store.delete('auth-token');
      store.delete('user');
      return { isAuthenticated: false };
    }
  } catch (error) {
    console.error('Auth check error:', error);
    store.delete('auth-token');
    store.delete('user');
    return { isAuthenticated: false };
  }
});

ipcMain.handle('get-activity-data', () => {
  return getActivityData();
});

ipcMain.handle('get-current-session-time', () => {
  const currentDate = new Date().toISOString().split('T')[0];
  const savedData = getActivityData();
  const todayData = savedData[currentDate] || { 
    date: currentDate,
    firstLogin: Date.now(),
    logActivity: [],
    grossTime: 0,
    effectiveTime: 0,
    idleTime: 0,
  };

  if (isCurrentlyActive) {
    const now = Date.now();
    const sessionDuration = now - currentSessionStart;
    todayData.effectiveTime += sessionDuration;
    todayData.grossTime = now - todayFirstLogin;
    todayData.idleTime = todayData.grossTime - todayData.effectiveTime;
  }

  return {
    grossTime: todayData.grossTime,
    effectiveTime: todayData.effectiveTime,
    idleTime: todayData.idleTime
  };
});