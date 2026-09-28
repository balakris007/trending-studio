import { google } from 'googleapis';
import path from 'path';
import fs from 'fs';

async function main() {
  const keyPath = path.resolve(__dirname, '../apps/api/serviceAccountKey.json');
  console.log('Using service account key at:', keyPath);
  
  if (!fs.existsSync(keyPath)) {
    console.error('Service account key not found!');
    process.exit(1);
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: keyPath,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const authClient = await auth.getClient();
  console.log('Authenticated service account client successfully!');
  
  const sheets = google.sheets({ version: 'v4', auth: authClient as any });
  console.log('Google Sheets API client initialized.');
}

main().catch((err) => {
  console.error('Error testing sheets API:', err.message);
});
