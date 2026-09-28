import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseProvider: process.env.DATABASE_PROVIDER || 'firebase',
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || 'trending-studio-kkdi',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
    serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.resolve(process.cwd(), 'serviceAccountKey.json'),
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'trending_studio_default_access_secret_2026',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'trending_studio_default_refresh_secret_2026',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:8081,http://localhost:3000').split(','),
  uploadDir: path.resolve(process.env.UPLOAD_DIR || './uploads'),
};
