const express = require('express');
const cors = require('cors');
const query = require('source-server-query');
const path = require('path');
const fs = require('fs');

const app = express();

// Middleware
app.use(cors());                    // Allow cross-origin requests (safe for public API)
app.use(express.json());

// Serve static files (HTML, CSS, JS, images) from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Your API endpoint
app.get('/api/servers', async (req, res) => {
  try {
    const serversFile = './servers.json';
    if (!fs.existsSync(serversFile)) {
      return res.status(500).json({ error: 'servers.json not found' });
    }

    const serverList = JSON.parse(fs.readFileSync(serversFile, 'utf8'));

    const results = await Promise.all(
      serverList.map(async (s) => {
        const [host, portStr] = s.ip.split(':');
        const queryPort = parseInt(portStr || '27015', 10);
        const startTime = Date.now();

        try {
          const info = await query.info(host, queryPort, 2000);
          const ping = Date.now() - startTime;

          return {
            name: info.name || s.name || 'Unknown Server',
            map: info.map || 'Unknown',
            players: `${info.players ?? 0}/24`,
            location: s.location || 'Unknown',
            ip: s.ip,
            ping: `${ping} ms`,
            online: true
          };
        } catch (err) {
          const ping = Date.now() - startTime;
          return {
            name: s.name || s.ip,
            map: 'OFFLINE',
            players: '0/24',
            location: s.location || 'Unknown',
            ip: s.ip,
            ping: `${ping} ms (timeout)`,
            online: false
          };
        }
      })
    );

    // Sort by ping (ascending)
    results.sort((a, b) => parseInt(a.ping) - parseInt(b.ping));

    res.json(results);
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: 'Failed to load/query servers' });
  }
});

// Catch-all route: serve index.html for client-side routing / direct access
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('index.html not found in /public');
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});