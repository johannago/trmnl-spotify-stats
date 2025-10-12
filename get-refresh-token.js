require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
const PORT = 8888;

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;

// Required scopes for the plugin
const SCOPES = [
  'user-top-read',              // Top artists and tracks
  'user-read-recently-played',  // Recently played
  'user-read-currently-playing' // Currently playing
].join(' ');

// Step 1: Start authorization flow
app.get('/login', (req, res) => {
  const authUrl = 'https://accounts.spotify.com/authorize?' +
    new URLSearchParams({
      response_type: 'code',
      client_id: CLIENT_ID,
      scope: SCOPES,
      redirect_uri: REDIRECT_URI,
    });

  res.redirect(authUrl);
});

// Step 2: Handle callback and exchange code for tokens
app.get('/callback', async (req, res) => {
  const code = req.query.code;

  if (!code) {
    return res.send('Error: No authorization code received');
  }

  try {
    const response = await axios.post(
      'https://accounts.spotify.com/api/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64'),
        },
      }
    );

    const { access_token, refresh_token, expires_in } = response.data;

    res.send(`
      <html>
        <head><title>Spotify Authorization Successful</title></head>
        <body style="font-family: monospace; padding: 20px;">
          <h1>✅ Authorization Successful!</h1>
          <p>Copy the refresh token below and add it to your .env file:</p>
          <div style="background: #f0f0f0; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <strong>SPOTIFY_REFRESH_TOKEN=</strong>${refresh_token}
          </div>
          <p><strong>Access Token (expires in ${expires_in}s):</strong></p>
          <div style="background: #f0f0f0; padding: 15px; margin: 20px 0; border-radius: 5px; word-break: break-all;">
            ${access_token}
          </div>
          <p>You can close this window and stop the server (Ctrl+C).</p>
        </body>
      </html>
    `);

    console.log('\n✅ Authorization successful!');
    console.log('\n📝 Add this to your .env file:');
    console.log(`SPOTIFY_REFRESH_TOKEN=${refresh_token}\n`);
  } catch (error) {
    console.error('Error exchanging code for token:', error.response?.data || error.message);
    res.send('Error getting refresh token. Check the console.');
  }
});

app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>Spotify Token Generator</title></head>
      <body style="font-family: sans-serif; padding: 40px; text-align: center;">
        <h1>🎵 Spotify Refresh Token Generator</h1>
        <p>Click the button below to authorize with Spotify:</p>
        <a href="/login" style="display: inline-block; background: #1DB954; color: white;
          padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold;
          margin-top: 20px;">
          Authorize with Spotify
        </a>
      </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log('\n🎵 Spotify Token Generator');
  console.log(`\n👉 Open this URL in your browser: http://localhost:${PORT}`);
  console.log('\nMake sure you have set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in your .env file!\n');
});
