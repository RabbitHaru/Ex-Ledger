const http = require('http');

http.get('http://localhost:8080/api/v1/exchange/history/USD?days=20', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log('Returned dates:', parsed.map(x => x.date).join(', '));
    } catch(e) {
      console.log('Error parsing JSON:', e.message);
      console.log('Raw data:', data);
    }
  });
}).on('error', err => {
  console.log('Error: ', err.message);
});
