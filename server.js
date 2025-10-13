require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory token cache
let accessToken = null;
let tokenExpiresAt = 0;

/**
 * Refresh Spotify access token using the refresh token
 */
async function getSpotifyAccessToken(clientId, clientSecret, refreshToken) {
  // Return cached token if still valid (and credentials match)
  if (accessToken && Date.now() < tokenExpiresAt) {
    return accessToken;
  }

  try {
    const response = await axios.post(
      'https://accounts.spotify.com/api/token',
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(
            clientId + ':' + clientSecret
          ).toString('base64'),
        },
      }
    );

    accessToken = response.data.access_token;
    tokenExpiresAt = Date.now() + (response.data.expires_in * 1000) - 60000; // Refresh 1 min early

    return accessToken;
  } catch (error) {
    console.error('Error refreshing Spotify token:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Fetch user's top artists from Spotify
 */
async function getTopArtists(clientId, clientSecret, refreshToken, timeRange = 'medium_term', limit = 5) {
  const token = await getSpotifyAccessToken(clientId, clientSecret, refreshToken);

  try {
    const response = await axios.get('https://api.spotify.com/v1/me/top/artists', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      params: {
        time_range: timeRange,
        limit: limit,
      },
    });

    return response.data.items.map((artist, index) => ({
      rank: index + 1,
      name: artist.name,
      genres: artist.genres.slice(0, 3).join(', ') || 'N/A',
      image: artist.images[0]?.url || null,
    }));
  } catch (error) {
    console.error('Error fetching top artists:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Fetch user's top tracks from Spotify
 */
async function getTopTracks(clientId, clientSecret, refreshToken, timeRange = 'medium_term', limit = 5) {
  const token = await getSpotifyAccessToken(clientId, clientSecret, refreshToken);

  try {
    const response = await axios.get('https://api.spotify.com/v1/me/top/tracks', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      params: {
        time_range: timeRange,
        limit: limit,
      },
    });

    return response.data.items.map((track, index) => ({
      rank: index + 1,
      name: track.name,
      artist: track.artists.map(a => a.name).join(', '),
      album: track.album.name,
      image: track.album.images[0]?.url || null,
    }));
  } catch (error) {
    console.error('Error fetching top tracks:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Fetch recently played tracks
 */
async function getRecentlyPlayed(clientId, clientSecret, refreshToken, limit = 5) {
  const token = await getSpotifyAccessToken(clientId, clientSecret, refreshToken);

  try {
    const response = await axios.get('https://api.spotify.com/v1/me/player/recently-played', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      params: {
        limit: limit,
      },
    });

    return response.data.items.map((item, index) => ({
      rank: index + 1,
      name: item.track.name,
      artist: item.track.artists.map(a => a.name).join(', '),
      played_at: new Date(item.played_at).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }),
    }));
  } catch (error) {
    console.error('Error fetching recently played:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Fetch currently playing track
 */
async function getCurrentlyPlaying(clientId, clientSecret, refreshToken) {
  const token = await getSpotifyAccessToken(clientId, clientSecret, refreshToken);

  try {
    const response = await axios.get('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.status === 204 || !response.data || !response.data.item) {
      return null;
    }

    return {
      name: response.data.item.name,
      artist: response.data.item.artists.map(a => a.name).join(', '),
      album: response.data.item.album.name,
      is_playing: response.data.is_playing,
      progress_ms: response.data.progress_ms,
      duration_ms: response.data.item.duration_ms,
    };
  } catch (error) {
    if (error.response?.status === 204) {
      return null;
    }
    console.error('Error fetching currently playing:', error.response?.data || error.message);
    return null;
  }
}

// Main endpoint for TRMNL polling
app.get('/api/spotify-stats', async (req, res) => {
  try {
    // Get credentials from headers (preferred) or query params (fallback) or env vars (local testing)
    const clientId = req.headers['x-spotify-client-id'] || process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = req.headers['x-spotify-client-secret'] || process.env.SPOTIFY_CLIENT_SECRET;
    const refreshToken = req.headers['x-spotify-refresh-token'] || process.env.SPOTIFY_REFRESH_TOKEN;

    // Validate credentials
    if (!clientId || !clientSecret || !refreshToken) {
      return res.status(400).json({
        error: 'Missing credentials',
        message: 'Please provide credentials in headers (x-spotify-client-id, x-spotify-client-secret, x-spotify-refresh-token)'
      });
    }

    // Get time range from headers or query params (default: medium_term)
    const timeRange = req.headers['x-spotify-time-range'] || req.query.time_range || 'medium_term';

    // Fetch all data in parallel
    const [topArtists, topTracks, recentlyPlayed, currentlyPlaying] = await Promise.all([
      getTopArtists(clientId, clientSecret, refreshToken, timeRange, 5),
      getTopTracks(clientId, clientSecret, refreshToken, timeRange, 5),
      getRecentlyPlayed(clientId, clientSecret, refreshToken, 5),
      getCurrentlyPlaying(clientId, clientSecret, refreshToken),
    ]);

    // Format response for TRMNL
    const response = {
      time_range_label: {
        'short_term': 'Last 4 Weeks',
        'medium_term': 'Last 6 Months',
        'long_term': 'All Time',
      }[timeRange],
      top_artists: topArtists,
      top_tracks: topTracks,
      recently_played: recentlyPlayed,
      currently_playing: currentlyPlaying,
      updated_at: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    console.error('Error in /api/spotify-stats:', error);
    res.status(500).json({
      error: 'Failed to fetch Spotify statistics',
      message: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root endpoint with instructions
app.get('/', (req, res) => {
  res.json({
    message: 'TRMNL Spotify Stats API',
    endpoints: {
      '/api/spotify-stats': 'Get Spotify statistics (supports ?time_range=short_term|medium_term|long_term)',
      '/health': 'Health check',
    },
  });
});

app.listen(PORT, () => {
  console.log(`🎵 TRMNL Spotify Stats server running on port ${PORT}`);
  console.log(`📊 API endpoint: http://localhost:${PORT}/api/spotify-stats`);
});
