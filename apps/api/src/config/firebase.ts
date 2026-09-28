import fs from 'fs';
import path from 'path';
import { initializeApp, getApps, cert, applicationDefault, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let firestoreInstance: Firestore | null = null;
let firebaseAppInstance: App | null = null;
let isFirebaseConnected = false;
let isMockFallback = false;

export function initFirebase(): { db: Firestore | null; isMock: boolean } {
  if (firestoreInstance) {
    return { db: firestoreInstance, isMock: false };
  }
  if (isMockFallback) {
    return { db: null, isMock: true };
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || 'trending-studio-kkdi';
  const potentialServiceAccountPaths = [
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
    path.resolve(process.cwd(), 'serviceAccountKey.json'),
    path.resolve(process.cwd(), 'apps/api/serviceAccountKey.json'),
    path.resolve(__dirname, '../../serviceAccountKey.json'),
    path.resolve(__dirname, '../../../serviceAccountKey.json'),
  ].filter(Boolean) as string[];

  const serviceAccountPath = potentialServiceAccountPaths.find((p) => fs.existsSync(p));
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined;

  // Detect if credentials are demo placeholders or explicitly requested local mode
  const isPlaceholderEmail = clientEmail?.includes('fbsvc@trending-studio') || clientEmail?.includes('example.com');
  const forceLocal = process.env.USE_LOCAL_FIRESTORE === 'true';

  try {
    let hasCredentials = false;

    if (!forceLocal && !getApps().length) {
      if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
        console.log(`[Firebase] Initializing with service account file from: ${serviceAccountPath}`);
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        firebaseAppInstance = initializeApp({
          credential: cert(serviceAccount),
          projectId: serviceAccount.project_id || projectId,
        });
        hasCredentials = true;
      } else if (clientEmail && privateKey && !isPlaceholderEmail) {
        console.log(`[Firebase] Initializing with environment credentials for project: ${projectId}`);
        firebaseAppInstance = initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });
        hasCredentials = true;
      } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
        console.log(`[Firebase] Initializing with Google Application Default Credentials for project: ${projectId}`);
        firebaseAppInstance = initializeApp({
          credential: applicationDefault(),
          projectId,
        });
        hasCredentials = true;
      } else if (process.env.FIRESTORE_EMULATOR_HOST) {
        console.log(`[Firebase] Connecting to Firestore Emulator at ${process.env.FIRESTORE_EMULATOR_HOST}`);
        firebaseAppInstance = initializeApp({ projectId });
        hasCredentials = true;
      }
    } else if (!forceLocal && getApps().length > 0) {
      hasCredentials = true;
    }

    if (!hasCredentials) {
      console.log(`[Firebase] Notice: Running in persistent local Firestore adapter mode.`);
      console.log(`[Firebase] (To connect to live Google Cloud Firestore, provide a valid serviceAccountKey.json or real FIREBASE_CLIENT_EMAIL in .env)`);
      isMockFallback = true;
      return { db: null, isMock: true };
    }

    firestoreInstance = getFirestore();
    try {
      firestoreInstance.settings({ ignoreUndefinedProperties: true });
    } catch {
      // settings already initialized
    }

    isFirebaseConnected = true;
    console.log(`[Firebase] Connected to Google Cloud Firestore (Project: ${projectId}).`);
    return { db: firestoreInstance, isMock: false };
  } catch (err: any) {
    console.warn(`[Firebase] Warning: Could not connect to remote Firebase (${err.message}). Using local in-memory Firestore adapter.`);
    isMockFallback = true;
    return { db: null, isMock: true };
  }
}

export function getDb(): Firestore | null {
  if (!firestoreInstance && !isMockFallback) {
    initFirebase();
  }
  return firestoreInstance;
}
