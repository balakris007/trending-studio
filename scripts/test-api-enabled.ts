import { GoogleSheetsService } from '../apps/api/src/services/googleSheetsService';

async function main() {
  const sheets = await GoogleSheetsService.getSheetsClient();
  
  // Public sheet or non-shared sheet to see exact Google API response
  try {
    // Standard template sheet or random valid ID format
    const res = await sheets.spreadsheets.get({ spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms' });
    console.log('Success! Title:', res.data.properties?.title);
  } catch (err: any) {
    console.log('Error status:', err.status || err.code);
    console.log('Error message:', err.message);
    console.log('Error details:', JSON.stringify(err.errors || err.response?.data?.error, null, 2));
  }
}

main();
