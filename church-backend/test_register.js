const http = require('http');
const data = JSON.stringify({
  name: 'Auto Test',
  email: `autotest_${Math.floor(Math.random()*100000)}@example.com`,
  password: 'test1234'
});

const options = {
  hostname: '127.0.0.1',
  port: 4000,
  path: '/api/auth/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('STATUS', res.statusCode);
    try {
      console.log('BODY', JSON.parse(body));
    } catch (e) {
      console.log('BODY RAW', body);
    }
  });
});

req.on('error', (e) => {
  console.error('Request error', e.message);
});

req.write(data);
req.end();
