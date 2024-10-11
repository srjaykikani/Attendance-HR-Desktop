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
let lastUpdateTime = Date.now();
let lastIdleStartTime = 0;
const idleThreshold = 300000; // 5 minutes in milliseconds
const checkInterval = 5000; // Check every 5 seconds

const PAYLOAD_CMS_URL = 'http://localhost:3000';

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
    try {
      const now = Date.now();
      const idleTimeSeconds = powerMonitor.getSystemIdleTime();
      const isIdle = idleTimeSeconds * 1000 >= idleThreshold;

      if (isIdle && isCurrentlyActive) {
        // Transition to idle
        logActivity('logout', now);
        isCurrentlyActive = false;
        lastIdleStartTime = now - (idleTimeSeconds * 1000);
      } else if (!isIdle && !isCurrentlyActive) {
        // Transition to active
        logActivity('login', now);
        isCurrentlyActive = true;
        currentSessionStart = now;
      }

      updateCurrentSessionTime(now, isIdle, idleTimeSeconds);
    } catch (error) {
      console.error('Error in updateActivity:', error);
    }
  };

  powerMonitor.on('unlock-screen', updateActivity);
  powerMonitor.on('lock-screen', updateActivity);
  powerMonitor.on('resume', updateActivity);
  powerMonitor.on('suspend', updateActivity);

  setInterval(updateActivity, checkInterval);

  // Sync data every 15 minutes
  setInterval(() => {
    SyncManager.batchSync();
  }, 900000);
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

  saveActivityData(savedData);

  // Send log activity to Payload CMS using the IPC handler
  const user = getUser();
  if (user) {
    window.electron.ipcRenderer.invoke('log-activity', {
      userId: user.id,
      type,
      timestamp,
    }).catch(error => {
      console.error('Failed to send activity log to Payload CMS:', error);
    });
  }

  // Queue activity data for syncing
  SyncManager.queueActivityData(todayData);
}


function getUser(): User | null {
  const encryptedUser = store.get('user');
  if (!encryptedUser) return null;
  
  try {
    const decryptedUser = decrypt(encryptedUser);
    return typeof decryptedUser === 'string' ? JSON.parse(decryptedUser) : decryptedUser;
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
}

function updateCurrentSessionTime(now: number, isIdle: boolean, idleTimeSeconds: number) {
  const currentDate = new Date(now).toISOString().split('T')[0];
  const savedData = getActivityData();
  const todayData = savedData[currentDate] || { 
    date: currentDate,
    firstLogin: now,
    logActivity: [],
    grossTime: 0,
    effectiveTime: 0,
    idleTime: 0,
  };

  if (todayFirstLogin === 0) {
    todayFirstLogin = todayData.firstLogin;
  }

  const timeSinceLastUpdate = now - lastUpdateTime;

  if (isIdle) {
    const idleDuration = Math.min(timeSinceLastUpdate, idleTimeSeconds * 1000);
    todayData.idleTime += idleDuration;
    todayData.effectiveTime += timeSinceLastUpdate - idleDuration;
  } else {
    todayData.effectiveTime += timeSinceLastUpdate;
  }

  todayData.grossTime = now - todayFirstLogin;

  savedData[currentDate] = todayData;
  saveActivityData(savedData);
  lastUpdateTime = now;

  if (mainWindow) {
    mainWindow.webContents.send('update-session-time', {
      grossTime: todayData.grossTime,
      effectiveTime: todayData.effectiveTime,
      idleTime: todayData.idleTime
    });
  }
}

app.on('ready', async () => {
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

// Add this to your existing IPC handlers in background.ts

ipcMain.handle('log-activity', async (_, { userId, type, timestamp, duration }) => {
  try {
    const token = store.get('auth-token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const currentDate = new Date(timestamp).toISOString().split('T')[0];
    
    // First, fetch the existing activity log for the day
    const response = await axios.get(
      `${PAYLOAD_CMS_URL}/api/activity-logs`,
      {
        params: {
          where: {
            and: [
              {
                user: {
                  equals: userId
                }
              },
              {
                date: {
                  equals: currentDate
                }
              }
            ]
          }
        },
        headers: {
          Authorization: `JWT ${token}`,
        },
      }
    );

    let activityLogId;
    let existingEntries = [];

    if (response.data.docs.length > 0) {
      // Update existing log
      activityLogId = response.data.docs[0].id;
      existingEntries = response.data.docs[0].activityEntries || [];
    }

    const newEntry = {
      time: new Date(timestamp).toISOString(),
      duration: duration
    };

    const updatedEntries = [...existingEntries, newEntry];

    // Calculate total times
    let grossTime = 0;
    let effectiveTime = 0;
    updatedEntries.forEach(entry => {
      if (entry.duration) {
        grossTime += entry.duration;
        effectiveTime += entry.duration;
      }
    });

    const timeData = {
      date: currentDate,
      user: userId,
      activityEntries: updatedEntries,
      grossTime: grossTime,
      effectiveTime: effectiveTime,
      idleTime: 0 // Manual entries don't count as idle time
    };

    let finalResponse;
    if (activityLogId) {
      // Update existing log
      finalResponse = await axios.patch(
        `${PAYLOAD_CMS_URL}/api/activity-logs/${activityLogId}`,
        timeData,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `JWT ${token}`,
          },
        }
      );
    } else {
      // Create new log
      finalResponse = await axios.post(
        `${PAYLOAD_CMS_URL}/api/activity-logs`,
        timeData,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `JWT ${token}`,
          },
        }
      );
    }

    if (finalResponse.status === 200 || finalResponse.status === 201) {
      // Update local storage
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
      
      savedData[currentDate].grossTime += duration;
      savedData[currentDate].effectiveTime += duration;
      saveActivityData(savedData);

      return { success: true };
    } else {
      throw new Error(`Failed to log activity with status: ${finalResponse.status}`);
    }
  } catch (error) {
    console.error('Error logging manual time:', error);
    if (axios.isAxiosError(error) && error.response) {
      return {
        success: false,
        error: error.response.data?.errors?.[0]?.message || 'An error occurred while logging the activity',
        status: error.response.status
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred while logging the activity'
    };
  }
});



ipcMain.handle('update-user-comment', async (_, { userId, comment }) => {
  try {
    const token = store.get('auth-token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const url = `${PAYLOAD_CMS_URL}/api/users/${userId}`;
    
    const response = await axios.patch(
      url,
      { comment },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `JWT ${token}`,
        },
      }
    );

    if (response.status === 200) {
      return { success: true, data: response.data };
    } else {
      throw new Error('Failed to update comment');
    }
  } catch (error) {
    console.error('Error updating user comment:', error);
    if (axios.isAxiosError(error) && error.response) {
      return { 
        success: false, 
        error: error.response.data?.errors?.[0]?.message || 'An error occurred while updating the comment',
        status: error.response.status
      };
    }
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An error occurred while updating the comment'
    };
  }
});

ipcMain.handle('fetch-user-info', async (_, userId) => {
  try {
    const token = store.get('auth-token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const url = `${PAYLOAD_CMS_URL}/api/users/${userId}`;
    
    const response = await axios.get(url, {
      headers: {
        Authorization: `JWT ${token}`,
      },
    });

    if (response.status === 200) {
      return { success: true, user: response.data };
    } else {
      throw new Error('Failed to fetch user info');
    }
  } catch (error) {
    console.error('Error fetching user info:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An error occurred while fetching user info'
    };
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
  const now = Date.now();
  const idleTimeSeconds = powerMonitor.getSystemIdleTime();
  const isIdle = idleTimeSeconds * 1000 >= idleThreshold;
  updateCurrentSessionTime(now, isIdle, idleTimeSeconds);
  
  const currentDate = new Date(now).toISOString().split('T')[0];
  const savedData = getActivityData();
  const todayData = savedData[currentDate] || { 
    date: currentDate,
    firstLogin: now,
    logActivity: [],
    grossTime: 0,
    effectiveTime: 0,
    idleTime: 0,
  };

  return {
    grossTime: todayData.grossTime,
    effectiveTime: todayData.effectiveTime,
    idleTime: todayData.idleTime
  };
});

ipcMain.handle('manual-sync', async () => {
  try {
    await SyncManager.processQueue();
    return { success: true };
  } catch (error) {
    console.error('Manual sync error:', error);
    return { success: false, error: 'An error occurred during manual sync' };
  }
});