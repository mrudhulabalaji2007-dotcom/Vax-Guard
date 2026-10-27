import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer: MongoMemoryServer | null = null;

export async function connectDB(): Promise<void> {
  if (mongoose.connection.readyState === 1) {
    console.log('✅ MongoDB already connected');
    return;
  }

  try {
    const customUri = process.env.MONGODB_URI;
    if (customUri) {
      console.log('🔗 Connecting to external MongoDB instance...');
      await mongoose.connect(customUri);
      console.log('✅ Connected to external MongoDB successfully');
      return;
    }

    console.log('🚀 Initializing in-memory MongoDB server instance (MERN stack)...');
    try {
      if (!mongoServer) {
        mongoServer = await MongoMemoryServer.create({
          instance: {
            dbName: 'vaxguard',
          },
        });
      }
      const mongoUri = mongoServer.getUri();
      await mongoose.connect(mongoUri);
      console.log(`✅ MongoDB initialized & connected at: ${mongoUri}`);
    } catch (memErr) {
      console.warn('⚠️ In-memory MongoDB initialization warning:', memErr);
      const localUri = 'mongodb://127.0.0.1:27017/vaxguard';
      try {
        await mongoose.connect(localUri);
        console.log('✅ Connected to local MongoDB daemon at: ' + localUri);
      } catch (localErr) {
        console.error('❌ Could not connect to local or memory MongoDB:', localErr);
      }
    }
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
  }
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
}
