const express = require('express');
const router = express.Router();
const axios = require('axios');

// Load env (index.js may already do this — safe to call again)
require('dotenv').config();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// try optional server package if installed (no crash if missing)
let optionalGetTranscript = null;
try {
  // package exports: { getTranscript }
  /* eslint-disable global-require */
  const mod = require('youtube-transcript');
  if (mod && typeof mod.getTranscript === 'function') optionalGetTranscript = mod.getTranscript;
} catch (e) {
  // ignore — we'll fallback to timedtext HTTP endpoint
  console.warn('youtube-transcript not available, will use timedtext fallback');
}

// helpers
function extractVideoId(urlOrId) {
  if (!urlOrId || typeof urlOrId !== 'string') return null;
  // common patterns: v=..., youtu.be/, /embed/, or plain 11-char id
  const patterns = [
    /(?:v=|v\/|embed\/|watch\?v=|youtu\.be\/)([0-9A-Za-z_-]{11})/,
    /^([0-9A-Za-z_-]{11})$/
  ];
  for (const p of patterns) {
    const m = urlOrId.match(p);
    if (m && m[1]) return m[1];
  }
  return null;
}

function decodeHTMLEntities(str) {
  if (!str) return '';
  // basic replacements + numeric entities
  const map = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };
  let out = str.replace(/&(amp|lt|gt|quot|#39);/g, m => map[m] || m);
  out = out.replace(/&#(\d+);/g, (m, num) => String.fromCharCode(parseInt(num, 10)));
  return out;
}

function parseTimedTextList(xml) {
  const tracks = [];
  const trackRe = /<track\s+([^>]+?)\/?>/gi;
  let m;
  while ((m = trackRe.exec(xml))) {
    const attrs = m[1];
    const langMatch = attrs.match(/lang_code="([^"]+)"/i);
    const nameMatch = attrs.match(/name="([^"]*)"/i);
    tracks.push({
      lang: langMatch ? langMatch[1] : null,
      name: nameMatch ? nameMatch[1] : ''
    });
  }
  return tracks;
}

function parseTimedText(xml) {
  // extract <text ...>content</text> and decode entities, preserve some spacing
  const parts = [];
  const re = /<text[^>]*?>(.*?)<\/text>/gis;
  let m;
  while ((m = re.exec(xml))) {
    parts.push(decodeHTMLEntities(m[1].replace(/\s+/g, ' ').trim()));
  }
  return parts.join(' ');
}

async function fetchTimedTextList(videoId) {
  const url = `https://video.google.com/timedtext?type=list&v=${encodeURIComponent(videoId)}`;
  const resp = await axios.get(url, { timeout: 8000 });
  return parseTimedTextList(resp.data || '');
}

async function fetchTimedTextForLang(videoId, lang) {
  const url = `https://video.google.com/timedtext?lang=${encodeURIComponent(lang)}&v=${encodeURIComponent(videoId)}`;
  const resp = await axios.get(url, { timeout: 10000 });
  return parseTimedText(resp.data || '');
}

function ensureSize(text, maxChars = 150000) {
  if (!text) return '';
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + '\n\n[transcript truncated]';
}

// POST /api/fetch-transcript
router.post('/fetch-transcript', async (req, res) => {
  try {
    const { videoId } = req.body || {};
    const id = extractVideoId(videoId);
    if (!id) return res.status(400).json({ error: 'Invalid YouTube URL or ID' });

    // 1) try optional server package if available
    if (optionalGetTranscript) {
      try {
        const items = await optionalGetTranscript(id);
        if (Array.isArray(items) && items.length > 0) {
          const transcriptText = items.map(i => i.text).join(' ');
          return res.json({ transcript: transcriptText });
        }
      } catch (e) {
        // fall through to timedtext fallback
        console.warn('optional getTranscript failed, falling back:', e?.message || e);
      }
    }

    // 2) timedtext fallback: get list of tracks, prefer English, then any available
    const tracks = await fetchTimedTextList(id);
    if (!tracks || tracks.length === 0) {
      return res.status(404).json({ error: 'No captions available for this video' });
    }

    // prefer en / en-US / en-GB
    const preferred = tracks.find(t => t.lang && /^en(?:-|$)/i.test(t.lang)) || tracks[0];
    const lang = preferred.lang || tracks[0].lang || 'en';
    const transcriptText = await fetchTimedTextForLang(id, lang);

    if (!transcriptText || transcriptText.trim().length === 0) {
      return res.status(404).json({ error: 'Captions exist but could not be retrieved' });
    }

    res.json({ transcript: transcriptText });
  } catch (err) {
    console.error('fetch-transcript error:', err?.response?.data ?? err?.message ?? err);
    res.status(500).json({ error: 'Failed to fetch transcript', detail: err?.message ?? null });
  }
});

// POST /api/generate-summary
router.post('/generate-summary', async (req, res) => {
  try {
    const { transcript } = req.body || {};
    if (!transcript || typeof transcript !== 'string' || transcript.trim().length === 0) {
      return res.status(400).json({ error: 'Transcript is required' });
    }
    if (!OPENROUTER_API_KEY) {
      console.error('Missing OPENROUTER_API_KEY');
      return res.status(500).json({ error: 'Server misconfiguration' });
    }

    const safeTranscript = ensureSize(transcript, 100000);
    const systemPrompt = "You are a helpful AI assistant. Summarize the following transcript and extract core points.";

    const payload = {
      model: "openai/gpt-5",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: safeTranscript }
      ]
    };

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      payload,
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const aiSummary = response?.data?.choices?.[0]?.message?.content;
    if (!aiSummary) {
      console.error('OpenRouter returned unexpected shape:', response?.data);
      return res.status(502).json({ error: 'AI did not return a summary', raw: response?.data });
    }

    res.json({ summary: aiSummary });
  } catch (error) {
    console.error('generate-summary error:', error?.response?.data ?? error?.message ?? error);
    res.status(500).json({ error: 'Failed to generate summary', detail: error?.message ?? null });
  }
});

module.exports = router;