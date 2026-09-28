import http from 'http';
import { app } from '../apps/api/src/app';

async function testAuth() {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(5099, () => resolve()));
  const baseUrl = 'http://127.0.0.1:5099/api/v1';

  try {
    console.log('--- 1. Test Super Admin login with email & full password ---');
    let res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'admin@trendingstudio.com', password: 'adminpassword123' }),
    });
    let data: any = await res.json();
    console.log('Admin Email Login -> Status:', res.status, 'Success:', data.success, 'User:', data.data?.user?.name);

    console.log('\n--- 2. Test Super Admin login with alias & short password ---');
    res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'admin', password: 'admin123' }),
    });
    data = await res.json();
    console.log('Admin Alias Login -> Status:', res.status, 'Success:', data.success, 'User:', data.data?.user?.email);

    console.log('\n--- 3. Test Staff login with email & password ---');
    res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'billing@trendingstudio.com', password: 'billingpassword123' }),
    });
    data = await res.json();
    console.log('Staff Email Login -> Status:', res.status, 'Success:', data.success, 'User:', data.data?.user?.name);

    console.log('\n--- 4. Test Staff login with alias & short password ---');
    res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'staff', password: 'staff123' }),
    });
    data = await res.json();
    console.log('Staff Alias Login -> Status:', res.status, 'Success:', data.success, 'User:', data.data?.user?.email);

    console.log('\n--- 5. Test phone number login ---');
    res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: '7904064446', password: 'adminpassword123' }),
    });
    data = await res.json();
    console.log('Phone Login -> Status:', res.status, 'Success:', data.success, 'User:', data.data?.user?.email);

    console.log('\n--- 6. Test invalid password ---');
    res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'admin', password: 'wrongpassword' }),
    });
    data = await res.json();
    console.log('Wrong Password -> Status:', res.status, 'Error:', data.error);
  } finally {
    server.close();
  }
}

testAuth().catch(console.error);
