const express = require('express');
const cors = require('cors');
const ytdlp = require('yt-dlp-exec');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration - allow your Vercel frontend
const allowedOrigins = [
  'https://www.yutubetomp4.online',
  'https://yutubetomp4.online',
  'http://localhost:4321', // Astro dev server
  'http://localhost:3000',
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST'],
  credentials: true,
}));

app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'TubeToMP4 API',
    version: '1.1.0',
    ytdlp: '2025.12.08'
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Validate YouTube URL
function isValidYouTubeUrl(url) {
  const patterns = [
    /^(https?:\/\/)?(www\.)?youtube\.com\/watch\?v=[\w-]+/,
    /^(https?:\/\/)?(www\.)?youtube\.com\/shorts\/[\w-]+/,
    /^(https?:\/\/)?youtu\.be\/[\w-]+/,
    /^(https?:\/\/)?(www\.)?youtube\.com\/embed\/[\w-]+/,
    /^(https?:\/\/)?(www\.)?youtube\.com\/v\/[\w-]+/,
    /^(https?:\/\/)?(www\.)?youtube\.com\/live\/[\w-]+/,
  ];
  return patterns.some(pattern => pattern.test(url));
}

// Common yt-dlp options for YouTube (updated for 2025.12.08)
const getYtdlpOptions = () => ({
  noCheckCertificates: true,
  noWarnings: true,
  preferFreeFormats: true,
  // User agent to avoid blocks
  addHeader: [
    'referer:youtube.com',
    'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  ],
  // Cookies handling for age-restricted content
  cookiesFromBrowser: process.env.COOKIES_BROWSER || undefined,
  // Network options
  socketTimeout: 30,
  retries: 3,
});

// Get video info endpoint
app.post('/api/info', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    if (!isValidYouTubeUrl(url)) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    console.log(`[INFO] Fetching info for: ${url}`);

    const info = await ytdlp(url, {
      ...getYtdlpOptions(),
      dumpSingleJson: true,
      flatPlaylist: true, // Don't download playlist items
    });

    // Extract MP4 formats with both video and audio (progressive)
    const progressiveFormats = info.formats
      .filter(f =>
        f.ext === 'mp4' &&
        f.vcodec && f.vcodec !== 'none' &&
        f.acodec && f.acodec !== 'none'
      )
      .map(f => ({
        formatId: f.format_id,
        quality: f.format_note || f.resolution || `${f.height}p` || 'Unknown',
        resolution: f.resolution || (f.width && f.height ? `${f.width}x${f.height}` : null),
        height: f.height,
        ext: f.ext,
        filesize: f.filesize || f.filesize_approx,
        fps: f.fps,
        vcodec: f.vcodec,
        acodec: f.acodec,
        url: f.url,
        tbr: f.tbr, // Total bitrate
      }))
      .sort((a, b) => (b.height || 0) - (a.height || 0));

    // Extract video-only formats for higher quality (720p+)
    const videoOnlyFormats = info.formats
      .filter(f =>
        (f.ext === 'mp4' || f.ext === 'webm') &&
        f.vcodec && f.vcodec !== 'none' &&
        (!f.acodec || f.acodec === 'none') &&
        f.height && f.height >= 720
      )
      .map(f => ({
        formatId: f.format_id,
        quality: f.format_note || `${f.height}p`,
        resolution: f.resolution || `${f.width}x${f.height}`,
        height: f.height,
        ext: f.ext,
        filesize: f.filesize || f.filesize_approx,
        fps: f.fps,
        vcodec: f.vcodec,
        // Check for AI super resolution formats (new in 2025.12.08)
        isSuperRes: f.format_note?.toLowerCase().includes('premium') || f.format_id?.includes('premium'),
        needsMerge: true,
      }))
      .sort((a, b) => (b.height || 0) - (a.height || 0))
      .filter((f, i, arr) => arr.findIndex(x => x.height === f.height) === i); // Unique heights

    // Extract audio formats for MP3
    const audioFormats = info.formats
      .filter(f =>
        f.acodec && f.acodec !== 'none' &&
        (!f.vcodec || f.vcodec === 'none') &&
        (f.ext === 'm4a' || f.ext === 'webm' || f.ext === 'mp3')
      )
      .map(f => ({
        formatId: f.format_id,
        quality: f.format_note || (f.abr ? `${Math.round(f.abr)}kbps` : 'Unknown'),
        abr: f.abr,
        ext: f.ext,
        filesize: f.filesize || f.filesize_approx,
        acodec: f.acodec,
        url: f.url,
      }))
      .sort((a, b) => (b.abr || 0) - (a.abr || 0))
      .slice(0, 5); // Top 5 audio formats

    // Build combined formats list (prioritize progressive, then add video-only options)
    const combinedVideoFormats = [];

    // Add progressive formats first
    progressiveFormats.forEach(f => {
      if (!combinedVideoFormats.find(x => x.height === f.height)) {
        combinedVideoFormats.push(f);
      }
    });

    // Add video-only formats for higher qualities not in progressive
    videoOnlyFormats.forEach(f => {
      if (!combinedVideoFormats.find(x => x.height === f.height)) {
        combinedVideoFormats.push(f);
      }
    });

    // Sort by height descending
    combinedVideoFormats.sort((a, b) => (b.height || 0) - (a.height || 0));

    const response = {
      id: info.id,
      title: info.title,
      description: info.description?.substring(0, 500),
      thumbnail: info.thumbnail || (info.thumbnails && info.thumbnails[info.thumbnails.length - 1]?.url),
      duration: info.duration,
      durationString: info.duration_string,
      viewCount: info.view_count,
      likeCount: info.like_count,
      uploadDate: info.upload_date,
      channel: info.channel || info.uploader,
      channelUrl: info.channel_url || info.uploader_url,
      isLive: info.is_live || false,
      formats: {
        video: combinedVideoFormats.slice(0, 6), // Top 6 video formats
        videoOnly: videoOnlyFormats.slice(0, 4), // Top 4 video-only
        audio: audioFormats.slice(0, 3), // Top 3 audio formats
      },
    };

    console.log(`[INFO] Found ${combinedVideoFormats.length} video, ${audioFormats.length} audio formats for: ${info.title}`);
    res.json(response);

  } catch (error) {
    console.error('[ERROR] Fetching video info:', error.message);

    // Handle specific yt-dlp errors
    if (error.message.includes('Video unavailable')) {
      return res.status(404).json({ error: 'Video not found or unavailable' });
    }
    if (error.message.includes('Private video')) {
      return res.status(403).json({ error: 'This video is private' });
    }
    if (error.message.includes('age')) {
      return res.status(403).json({ error: 'Age-restricted video. Cannot process.' });
    }
    if (error.message.includes('copyright')) {
      return res.status(403).json({ error: 'Video blocked due to copyright' });
    }

    res.status(500).json({
      error: 'Failed to fetch video info',
      message: error.message
    });
  }
});

// Get direct download URL
app.post('/api/download', async (req, res) => {
  try {
    const { url, formatId, type = 'video', quality } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    if (!isValidYouTubeUrl(url)) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    console.log(`[DOWNLOAD] Getting URL for: ${url}, format: ${formatId || 'best'}, type: ${type}`);

    // Build format selector
    let format;
    if (formatId) {
      format = formatId;
    } else if (type === 'audio') {
      // Best audio in m4a format for compatibility
      format = 'bestaudio[ext=m4a]/bestaudio';
    } else if (quality) {
      // Specific quality requested
      format = `best[height<=${quality}][ext=mp4]/best[height<=${quality}]`;
    } else {
      // Best progressive format (video+audio combined)
      format = 'best[ext=mp4]/best';
    }

    const info = await ytdlp(url, {
      ...getYtdlpOptions(),
      dumpSingleJson: true,
      format: format,
    });

    // Find the selected format's URL
    let downloadUrl = info.url;
    let selectedFormat = null;

    // If specific format was requested, find it
    if (formatId && info.formats) {
      selectedFormat = info.formats.find(f => f.format_id === formatId);
      if (selectedFormat?.url) {
        downloadUrl = selectedFormat.url;
      }
    }

    // Fallback to requested_formats or best available
    if (!downloadUrl && info.requested_formats) {
      const reqFormat = info.requested_formats.find(f => f.url);
      if (reqFormat) {
        downloadUrl = reqFormat.url;
        selectedFormat = reqFormat;
      }
    }

    // Final fallback
    if (!downloadUrl && info.formats) {
      const bestFormat = info.formats
        .filter(f => f.url && (type === 'audio' ? f.acodec !== 'none' : f.vcodec !== 'none'))
        .sort((a, b) => (b.tbr || 0) - (a.tbr || 0))[0];
      if (bestFormat) {
        downloadUrl = bestFormat.url;
        selectedFormat = bestFormat;
      }
    }

    if (!downloadUrl) {
      return res.status(500).json({ error: 'Could not retrieve download URL' });
    }

    res.json({
      id: info.id,
      title: info.title,
      thumbnail: info.thumbnail,
      downloadUrl: downloadUrl,
      format: selectedFormat ? {
        id: selectedFormat.format_id,
        ext: selectedFormat.ext,
        quality: selectedFormat.format_note || selectedFormat.resolution,
        filesize: selectedFormat.filesize || selectedFormat.filesize_approx,
        height: selectedFormat.height,
      } : null,
      // Filename suggestion
      filename: `${info.title.replace(/[^\w\s-]/g, '')}.${selectedFormat?.ext || 'mp4'}`,
    });

  } catch (error) {
    console.error('[ERROR] Getting download URL:', error.message);
    res.status(500).json({
      error: 'Failed to get download URL',
      message: error.message
    });
  }
});

// Get available qualities for a video (lightweight endpoint)
app.post('/api/qualities', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url || !isValidYouTubeUrl(url)) {
      return res.status(400).json({ error: 'Valid YouTube URL is required' });
    }

    const info = await ytdlp(url, {
      ...getYtdlpOptions(),
      dumpSingleJson: true,
      simulate: true,
    });

    // Get unique quality options
    const qualities = [...new Set(
      info.formats
        .filter(f => f.height && f.vcodec && f.vcodec !== 'none')
        .map(f => f.height)
    )]
      .sort((a, b) => b - a)
      .map(q => ({
        label: `${q}p`,
        value: q,
        available: true,
      }));

    res.json({
      id: info.id,
      title: info.title,
      duration: info.duration,
      qualities,
    });

  } catch (error) {
    console.error('[ERROR] Getting qualities:', error.message);
    res.status(500).json({ error: 'Failed to get qualities' });
  }
});

// Proxy endpoint for direct streaming (optional, for CORS bypass)
app.get('/api/proxy', async (req, res) => {
  const { url: videoUrl } = req.query;

  if (!videoUrl) {
    return res.status(400).json({ error: 'URL parameter required' });
  }

  try {
    const response = await fetch(videoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.youtube.com/',
      },
    });

    // Forward headers
    res.set('Content-Type', response.headers.get('content-type'));
    res.set('Content-Length', response.headers.get('content-length'));
    res.set('Accept-Ranges', 'bytes');

    // Pipe the response
    response.body.pipe(res);
  } catch (error) {
    console.error('[ERROR] Proxy:', error.message);
    res.status(500).json({ error: 'Proxy failed' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[ERROR] Unhandled:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`TubeToMP4 API v1.1.0 running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`yt-dlp version: 2025.12.08 compatible`);
});
