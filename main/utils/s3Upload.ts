import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  endpoint: 'https://sgp1.digitaloceanspaces.com',
  region: 'sgp1',
  credentials: {
    accessKeyId: 'NMCX6WOAVGTQWOI4G5FI',
    secretAccessKey: '++RI8VTlCgn9rTocYipS/mmsC8vVq/S+2XhbPvja3ck',
  },
});

export const uploadToS3 = async (buffer: Buffer, key: string, mimetype: string) => {
  try {
    await s3Client.send(new PutObjectCommand({
      Bucket: 'keka',
      Key: key,
      Body: buffer,
      ContentType: mimetype,
      ACL: 'public-read',
    }));

    return `https://keka.sgp1.digitaloceanspaces.com/${key}`;
  } catch (error) {
    console.error('S3 upload error:', error);
    throw error;
  }
};

export const uploadScreenshot = async (buffer: Buffer, userEmail: string): Promise<string> => {
  try {
    const timestamp = new Date().toISOString();
    const yearMonth = timestamp.substring(0, 7);
    const filename = `${timestamp.replace(/[:.]/g, '-')}.png`;
    const key = `screenshots/${userEmail}/${yearMonth}/${filename}`;

    await s3Client.send(new PutObjectCommand({
      Bucket: 'keka',
      Key: key,
      Body: buffer,
      ContentType: 'image/png',
      ACL: 'public-read',
    }));

    return `https://keka.sgp1.digitaloceanspaces.com/${key}`;
  } catch (error) {
    console.error('Screenshot upload error:', error);
    throw error;
  }
};
