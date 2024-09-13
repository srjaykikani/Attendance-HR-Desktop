// main/SyncManager.ts
import axios from 'axios';
import Store from 'electron-store';
import { DailyActivity, ActivityData } from './types';
import { encrypt, decrypt } from './encryptionUtils';

const store = new Store<{
  'auth-token'?: string;
  activityData: string;
}>();

const PAYLOAD_CMS_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000';

function getActivityData(): ActivityData {
  const encryptedData = store.get('activityData', encrypt({}));
  const decryptedData = decrypt(encryptedData);
  return decryptedData || {};
}

function saveActivityData(data: ActivityData) {
  store.set('activityData', encrypt(data));
}

export class SyncManager {
  static async syncActivityData() {
    const token = store.get('auth-token');
    const activityData = getActivityData();
    
    if (!token) {
      console.error('No auth token available');
      return;
    }
    
    for (const [date, activity] of Object.entries(activityData)) {
      try {
        await axios.post(`${PAYLOAD_CMS_URL}/api/activity-logs`, activity, {
          headers: {
            Authorization: `JWT ${token}`,
          },
        });
        
        // Remove synced data
        delete activityData[date];
      } catch (error) {
        console.error(`Failed to sync activity for ${date}:`, error);
      }
    }
    
    // Update store with remaining unsynced data
    saveActivityData(activityData);
  }

  static async queueActivityData(activity: DailyActivity) {
    const encryptedQueue = store.get('syncQueue', encrypt([]));
    const currentQueue = decrypt(encryptedQueue) as DailyActivity[];
    currentQueue.push(activity);
    store.set('syncQueue', encrypt(currentQueue));
  }

  static async processQueue() {
    const encryptedQueue = store.get('syncQueue', encrypt([]));
    const queue = decrypt(encryptedQueue) as DailyActivity[];
    const token = store.get('auth-token');

    if (!token) {
      console.error('No auth token available');
      return;
    }

    for (const activity of queue) {
      try {
        await axios.post(`${PAYLOAD_CMS_URL}/api/activity-logs`, activity, {
          headers: {
            Authorization: `JWT ${token}`,
          },
        });
        
        // Remove synced activity from queue
        const index = queue.indexOf(activity);
        if (index > -1) {
          queue.splice(index, 1);
        }
      } catch (error) {
        console.error('Failed to sync queued activity:', error);
        break; // Stop processing on first error
      }
    }

    // Update queue in store
    store.set('syncQueue', encrypt(queue));
  }

  static async fetchUserActivity(userId: string, date: string) {
    const token = store.get('auth-token');

    if (!token) {
      console.error('No auth token available');
      return null;
    }

    try {
      const response = await axios.get(`${PAYLOAD_CMS_URL}/api/activity-logs`, {
        params: { user: userId, date },
        headers: {
          Authorization: `JWT ${token}`,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching activity data:', error);
      return null;
    }
  }

  static async batchSync() {
    const token = store.get('auth-token');
    const activityData = getActivityData();
    const batchSize = 10; // Adjust based on your needs
    const entries = Object.entries(activityData);
    
    if (!token) {
      console.error('No auth token available');
      return;
    }
    
    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);
      const batchData = Object.fromEntries(batch);
      
      try {
        await axios.post(`${PAYLOAD_CMS_URL}/api/activity-logs/batch`, batchData, {
          headers: {
            Authorization: `JWT ${token}`,
          },
        });
        
        // Remove synced data
        batch.forEach(([date]) => delete activityData[date]);
      } catch (error) {
        console.error('Batch sync error:', error);
        break; // Stop on error
      }
    }
    
    // Update store with remaining unsynced data
    saveActivityData(activityData);
  }
}