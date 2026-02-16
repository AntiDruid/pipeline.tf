const express = require('express');
const cors = require('cors');
const query = require('source-server-query');

const app = express();
app.use(cors());
app.use(express.json());

const serversFile = './servers.json'; 

app.get('/api/servers', async (req, res) => {
  try {
    const fs = require('fs');
    const serverList = JSON.parse(fs.readFileSync(serversFile, 'utf8'));

    const results = await Promise.all(
      serverList.map(async (s) => {
        const [host, port] = s.ip.split(':');
        const queryPort = parseInt(port || 27015);
        const startTime = Date.now();

        try {
          const info = await query.info(host, queryPort, 2000);
          const ping = Date.now() - startTime;

          return {
            name: info.name || s.name || 'Unknown Server',
            map: info.map || 'Unknown',
            players: `${info.players ?? 0}/24`,   // Always show max as 24
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
            players: `0/24`,                      // Always show max as 24
            location: s.location || 'Unknown',
            ip: s.ip,
            ping: `${ping} ms (timeout)`,
            online: false
          };
        }
      })
    );

    // Optional: still sort by ping
    results.sort((a, b) => parseInt(a.ping) - parseInt(b.ping));

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load/query servers' });
  }
});

app.get('/', (req, res) => {
  res.redirect('/api/servers');
});

aconst PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});