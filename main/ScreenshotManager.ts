import { desktopCapturer } from 'electron';
import { uploadScreenshot } from './utils/s3Upload';
import path from 'path';

export class ScreenshotManager {
  private interval: NodeJS.Timeout | null = null;
  private userEmail: string;
  private retryCount: number = 0;
  private maxRetries: number = 3;
  private captureInterval: number = 5 * 60 * 1000; // 5 minutes
  private isCapturing: boolean = false;

  constructor(userEmail: string) {
    this.userEmail = userEmail;
  }

  async start() {
    if (this.isCapturing) {
      console.log('Screenshot capture already running');
      return;
    }
    
    console.log('Starting screenshot capture for:', this.userEmail);
    this.isCapturing = true;
    
    try {
      await this.captureAndUpload();
      this.interval = setInterval(() => this.captureAndUpload(), this.captureInterval);
      console.log('Screenshot capture started successfully');
    } catch (error) {
      console.error('Failed to start screenshot capture:', error);
      this.isCapturing = false;
      throw error;
    }
  }

  stop() {
    console.log('Stopping screenshot capture');
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.isCapturing = false;
  }

  private async captureAndUpload() {
    console.log('Attempting to capture screenshot...');
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1920, height: 1080 }
      });

      console.log('Available sources:', sources.length);
      if (!sources.length) throw new Error('No screen sources found');

      const imageBuffer = sources[0].thumbnail.toPNG();
      console.log('Screenshot captured, uploading...');
      
      const url = await uploadScreenshot(imageBuffer, this.userEmail);
      console.log('Screenshot uploaded successfully:', url);
      
      this.retryCount = 0;
    } catch (error) {
      console.error('Screenshot capture/upload failed:', error);
      
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        console.log(`Retrying in 10s (attempt ${this.retryCount}/${this.maxRetries})`);
        setTimeout(() => this.captureAndUpload(), 10000);
      } else {
        console.error('Max retries exceeded, giving up');
        this.retryCount = 0;
      }
    }
  }

  isActive() {
    return this.isCapturing;
  }
}
