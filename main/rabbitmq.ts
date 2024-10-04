// main/rabbitmq.ts
import amqp from 'amqplib';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
const QUEUE_NAME = 'attendance_updates';

let channel: amqp.Channel | null = null;

export async function initializeRabbitMQ() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    console.log('RabbitMQ connection established');
  } catch (error) {
    console.error('Failed to connect to RabbitMQ:', error);
  }
}

export async function sendAttendanceUpdate(userId: string, data: any) {
  if (!channel) {
    console.error('RabbitMQ channel not initialized');
    return;
  }

  try {
    const message = JSON.stringify({ userId, data });
    channel.sendToQueue(QUEUE_NAME, Buffer.from(message));
  } catch (error) {
    console.error('Failed to send message to RabbitMQ:', error);
  }
}