import { GoogleSheetsService } from '../apps/api/src/services/googleSheetsService';

async function verify() {
  console.log('--- 1. Testing Google Sheets Service Account Resolution ---');
  const email = GoogleSheetsService.getServiceAccountEmail();
  console.log('Google Service Account Email:', email);

  console.log('\n--- 2. Testing URL & Spreadsheet ID Extraction ---');
  const sampleUrl = 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0';
  const extractedId = GoogleSheetsService.extractSpreadsheetId(sampleUrl);
  console.log('Sample input URL:', sampleUrl);
  console.log('Extracted ID:', extractedId);
  if (extractedId !== '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms') {
    throw new Error('ID extraction mismatch!');
  }

  console.log('\n--- 3. Testing Google Sheets Client Initialization ---');
  const client = await GoogleSheetsService.getSheetsClient();
  console.log('Google Sheets API client initialized successfully.');

  console.log('\n--- 4. Testing Permission / Not Found Error Handling ---');
  // Test with dummy ID to verify friendly error reporting
  const testRes = await GoogleSheetsService.testConnection('dummy_spreadsheet_id_12345');
  console.log('Test connection result (expected non-existent):', testRes);

  console.log('\n--- Verification completed successfully! ---');
}

verify().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
