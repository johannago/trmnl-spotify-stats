# TRMNL Spotify Stats Plugin

Display your Spotify listening statistics on your TRMNL e-ink display, including top artists, top tracks, and recently played songs.

https://usetrmnl.com/recipes/164583

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/Z8Z81L4M6Q)

<img width="946" height="941" alt="image" src="https://github.com/user-attachments/assets/a452fedf-bcb7-4e5d-a13c-b374ef4178cd" />


## Features

- 📊 **Top Artists** - See your most listened-to artists
- 🎵 **Top Tracks** - View your favorite songs
- 🕐 **Recently Played** - Track your listening history
- ⏱️ **Time Ranges** - Choose between Last 4 Weeks, Last 6 Months, or All Time

## Prerequisites

- A Spotify account (Free or Premium)
- A TRMNL account and device
- Node.js installed (version 18 or higher) - for token generation only

## Setup Guide

### Step 1: Create a Spotify App

1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Log in with your Spotify account
3. Click **"Create app"**
4. Fill in the app details:
   - **App name**: `TRMNL Spotify Stats` (or any name you prefer)
   - **App description**: `Display Spotify stats on TRMNL`
   - **Redirect URI**: `http://127.0.0.1:8888/callback`
   - **Which API/SDKs are you planning to use?**: Check "Web API"
5. Click **"Save"**
6. On your app's dashboard, click **"Settings"**
7. Copy your **Client ID** and **Client Secret** - you'll need these later

### Step 2: Generate Your Refresh Token

#### 2.1 Clone or Download This Repository
```bash
git clone <your-repo-url>
cd trmnl-spotify-stats
```

#### 2.2 Install Dependencies

```bash
npm install
```

#### 2.3 Configure Environment Variables

Create a `.env` file in the project root:
For Linux
```bash
# Copy the example file
cp .env.example .env
```
For Windows
```
# Copy the example file
copy .env.example .env
```


Edit `.env` and add your Spotify credentials:

```env
PORT=3000
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
SPOTIFY_REFRESH_TOKEN=your_refresh_token_here
```

#### 2.4 Run the Token Generator
You only need to copy and set this one time after you copy this.

```bash
node get-refresh-token.js
```

This will:
1. Start a local server on `http://localhost:8888`
2. Open your browser and navigate to `http://localhost:8888`
3. Click **"Authorize with Spotify"**
4. Log in to Spotify (if not already logged in)
5. Click **"Agree"** to grant permissions
6. You'll be redirected to a success page with your **refresh token**

**Important:** Copy the refresh token and save it securely. You'll need it for the TRMNL configuration.

Press `Ctrl+C` to stop the server once you have your token.

## Troubleshooting

### "invalid_client" Error

**Problem:** Getting an error when authorizing with Spotify.

**Solution:**
- Make sure your Redirect URI in Spotify Dashboard is exactly: `http://127.0.0.1:8888/callback`
- Check that you're using `http://` (not `https://`)
- Verify your Client ID and Client Secret are correct

### "Missing credentials" Error

**Problem:** API returns 400 error about missing credentials.

**Solution:**
- Verify you filled in all three fields in the TRMNL plugin configuration
- Check that your polling URL includes the `{{ }}` template variables
- Make sure there are no extra spaces in your credentials

### No Data Appearing on TRMNL (If you're self-hosting)

**Problem:** The plugin is installed but shows no data.

**Solution:**
- Check that your server is publicly accessible (visit the URL in a browser)
- Visit `https://your-server.com/health` to verify the server is running
- Check the TRMNL plugin logs for any errors
- Verify your refresh token hasn't expired or been revoked

### "Token expired" Errors

**Problem:** Getting authentication errors after some time.

**Solution:**
- This usually means your refresh token was revoked or the app permissions changed
- Re-run the `get-refresh-token.js` script to generate a new token
- Update the token in your TRMNL plugin configuration


## API Endpoints

### `GET /api/spotify-stats`

Returns Spotify statistics in JSON format.

**Pass this in the request header:**
- `client_id` (required) - Spotify Client ID
- `client_secret` (required) - Spotify Client Secret
- `refresh_token` (required) - Spotify Refresh Token
- `time_range` (optional) - One of: `short_term`, `medium_term`, `long_term` (default: `medium_term`)

**Response:**
```json
{
  "time_range_label": "Last 6 Months",
  "top_artists": [
    {
      "rank": 1,
      "name": "Artist Name",
      "genres": "genre1, genre2, genre3"
    }
  ],
  "top_tracks": [
    {
      "rank": 1,
      "name": "Track Name",
      "artist": "Artist Name",
      "album": "Album Name"
    }
  ],
  "recently_played": [
    {
      "rank": 1,
      "name": "Track Name",
      "artist": "Artist Name",
      "played_at": "Oct 12, 2:30 PM"
    }
  ],
  "currently_playing": {
    "name": "Track Name",
    "artist": "Artist Name",
    "album": "Album Name",
    "is_playing": true
  },
  "updated_at": "2025-10-12T02:30:00.000Z"
}
```

### `GET /health`

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-12T02:30:00.000Z"
}
```

## Privacy & Security

- Your Spotify credentials are sent directly from TRMNL to your server (not stored on TRMNL's servers)
- The server only accesses data you explicitly authorize (top artists, tracks, listening history)
- Your refresh token allows ongoing access - keep it secure and don't share it
- You can revoke access anytime from your [Spotify Account Settings](https://www.spotify.com/account/apps/)

## Customization

### Changing the Display Layout

Edit `template.liquid` to customize how your stats are displayed. The template uses Liquid syntax and supports:
- Conditional logic (`{% if %}`)
- Loops (`{% for %}`)
- Filters (`{{ variable | filter }}`)

### Adjusting Refresh Interval

In your TRMNL plugin settings, change the polling interval:
- **5 minutes** - Frequent updates, more API calls
- **15 minutes** - Balanced (recommended)
- **30-60 minutes** - Less frequent, conserves API quota

### Changing Number of Items Displayed

Edit `server.js` and modify the `limit` parameter in the API calls (line 195-198):

```javascript
getTopArtists(clientId, clientSecret, refreshToken, timeRange, 10),  // Change 5 to 10
```

## Support

For issues or questions:
- Check the [Troubleshooting](#troubleshooting) section above
- Review [Spotify API Documentation](https://developer.spotify.com/documentation/web-api)
- Check [TRMNL Documentation](https://docs.usetrmnl.com)

## License

MIT License - feel free to use and modify for your own TRMNL device!
