import { app, ipcMain, BrowserWindow } from 'electron';
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

const store = new Store();

let mainWindow: BrowserWindow | null = null;

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

// Replace with your Payload CMS URL
const PAYLOAD_CMS_URL = 'http://localhost:3000/admin'; // Update this with your actual Payload CMS URL

app.on('ready', createWindow);

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

ipcMain.handle('sign-in', async (_, { email, password }) => {
  try {
    const response = await axios.post(`${PAYLOAD_CMS_URL}/api/users/login`, {
      email,
      password,
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (response.data && response.data.user) {
      // Store the token securely
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
        error: error.response.data?.errors?.[0]?.message || 'An error occurred during sign-in'
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
        Authorization: `Bearer ${token}`,
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