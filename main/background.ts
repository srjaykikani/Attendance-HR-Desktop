import { app, ipcMain, BrowserWindow, powerMonitor } from 'electron';
import serve from 'electron-serve';
import Store from 'electron-store';
import path from 'path';
import axios from 'axios';

const isProd: boolean = process.env.NODE_ENV === 'production';

if (isProd) {
  serve({ directory: 'app' });
} else {
  app.setPath('userData', `${app.getPath('userData')} (development)`);
}

interface LogEntry {
  type: 'login' | 'logout';
  timestamp: number;
}

interface ActivityData {
  [date: string]: {
    firstLogin: number;
    lastLogout: number;
    grossTime: number;
    effectiveTime: number;
    idleTime: number;
    logs: LogEntry[];
  };
}

const store = new Store<{
  'auth-token'?: string;
  activityData: ActivityData;
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
    
    await mainWindow.webContents.session.clearStorageData({
      storages: ['filesystem', 'indexdb', 'localstorage', 'shadercache', 'websql', 'serviceworkers', 'cachestorage']
    });
  }

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow?.webContents.executeJavaScript(`
      navigator.credentials.preventSilentAccess();
    `);
  });

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
  }, 1000);

  setInterval(updateCurrentSessionTime, 5000);
}

function logActivity(type: 'login' | 'logout', timestamp: number) {
  const currentDate = new Date(timestamp).toISOString().split('T')[0];
  const savedData = store.get('activityData', {});
  if (!savedData[currentDate]) {
    savedData[currentDate] = { 
      firstLogin: 0, 
      lastLogout: 0, 
      grossTime: 0, 
      effectiveTime: 0, 
      idleTime: 0, 
      logs: [] 
    };
  }
  
  const todayData = savedData[currentDate];
  todayData.logs.push({ type, timestamp });
  
  if (type === 'login') {
    if (todayData.firstLogin === 0 || timestamp < todayData.firstLogin) {
      todayData.firstLogin = timestamp;
      todayFirstLogin = timestamp;
    }
    currentSessionStart = timestamp;
    isCurrentlyActive = true;
  } else if (type === 'logout') {
    todayData.lastLogout = timestamp;
    isCurrentlyActive = false;
  }
  
  updateCurrentSessionTime();
  store.set('activityData', savedData);
}

function updateCurrentSessionTime() {
  const currentDate = new Date().toISOString().split('T')[0];
  const savedData = store.get('activityData', {});
  const todayData = savedData[currentDate] || { 
    firstLogin: 0, 
    lastLogout: 0, 
    grossTime: 0, 
    effectiveTime: 0, 
    idleTime: 0, 
    logs: [] 
  };

  const now = Date.now();

  if (todayFirstLogin === 0) {
    todayFirstLogin = todayData.firstLogin || now;
  }

  if (isCurrentlyActive) {
    const sessionDuration = now - currentSessionStart;
    todayData.effectiveTime += sessionDuration;
    currentSessionStart = now;
  }

  todayData.lastLogout = now;
  todayData.grossTime = now - todayFirstLogin;
  todayData.idleTime = todayData.grossTime - todayData.effectiveTime;

  savedData[currentDate] = todayData;
  store.set('activityData', savedData);

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

ipcMain.handle('logout', () => {
  store.delete('auth-token');
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
      return { isAuthenticated: false };
    }
  } catch (error) {
    console.error('Auth check error:', error);
    store.delete('auth-token');
    return { isAuthenticated: false };
  }
});

ipcMain.handle('fetch-user-info', async (_, userId: string) => {
  const token = store.get('auth-token');
  if (!token) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const response = await axios.get(`${PAYLOAD_CMS_URL}/api/users/${userId}`, {
      headers: {
        Authorization: `JWT ${token}`,
      },
    });

    if (response.data && response.data.user) {
      return { success: true, user: response.data.user };
    } else {
      throw new Error('Invalid response from server');
    }
  } catch (error) {
    console.error('Error fetching user info:', error);
    return { success: false, error: 'An error occurred while fetching user info' };
  }
});

ipcMain.handle('get-activity-data', () => {
  return store.get('activityData', {});
});

ipcMain.handle('get-current-session-time', () => {
  const currentDate = new Date().toISOString().split('T')[0];
  const savedData = store.get('activityData', {});
  const todayData = savedData[currentDate] || { 
    firstLogin: 0, 
    lastLogout: 0, 
    grossTime: 0, 
    effectiveTime: 0, 
    idleTime: 0, 
    logs: [] 
  };

  if (isCurrentlyActive) {
    const now = Date.now();
    const sessionDuration = now - currentSessionStart;
    todayData.effectiveTime += sessionDuration;
    todayData.lastLogout = now;
    todayData.grossTime = now - todayFirstLogin;
    todayData.idleTime = todayData.grossTime - todayData.effectiveTime;
  }

  return {
    grossTime: todayData.grossTime,
    effectiveTime: todayData.effectiveTime,
    idleTime: todayData.idleTime
  };
});