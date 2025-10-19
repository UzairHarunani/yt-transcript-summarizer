const express = require('express');
const router = express.Router();
const axios = require('axios');

// Load env
require('dotenv').config();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const SHOW_STACK = process.env.SHOW_STACK === 'true';

// robust loader + debug info for youtube-transcript (adaptive)
let getTranscriptFromPackage = null;
try {
  const mod = require('youtube-transcript');
  try {
    console.log('YTTRANSCRIPT module raw:', typeof mod);
    console.log('YTTRANSCRIPT module keys:', Object.keys(mod || {}));
    if (mod && mod.default) {
      console.log('YTTRANSCRIPT default export type:', typeof mod.default, Object.keys(mod.default || {}));
    }
  } catch (dbg) {
    console.warn('Failed to inspect youtube-transcript module shape:', dbg?.message ?? dbg);
  }

  // If package exports a YoutubeTranscript class (observed keys), try multiple access patterns:
  if (mod && mod.YoutubeTranscript) {
    const YTClass = mod.YoutubeTranscript;
    // 1) static method
    if (typeof YTClass.getTranscript === 'function') {
      getTranscriptFromPackage = async (id) => {
        console.log('Using YoutubeTranscript.getTranscript (static)');
        return await YTClass.getTranscript(id);
      };
    } else {
      // 2) instance methods: try common names
      try {
        const inst = new YTClass();
        if (typeof inst.getTranscript === 'function') {
          getTranscriptFromPackage = async (id) => {
            console.log('Using new YoutubeTranscript().getTranscript()');
            return await inst.getTranscript(id);
          };
        } else if (typeof inst.fetch === 'function') {
          getTranscriptFromPackage = async (id) => {
            console.log('Using new YoutubeTranscript().fetch()');
            return await inst.fetch(id);
          };
        } else if (typeof inst.fetchTranscript === 'function') {
          getTranscriptFromPackage = async (id) => {
            console.log('Using new YoutubeTranscript().fetchTranscript()');
            return await inst.fetchTranscript(id);
          };
        }
      } catch (instErr) {
        console.warn('Could not instantiate YoutubeTranscript class:', instErr?.message ?? instErr);
      }
    }
  }

  // Support other shapes: default export as function/class or direct function
  if (!getTranscriptFromPackage) {
    // default export
    const candidate = mod.default || mod;
    if (typeof candidate === 'function') {
      // function that likely returns transcript
      getTranscriptFromPackage = async (id) => {
        console.log('Using function-style export from youtube-transcript');
        return await candidate(id);
      };
    } else if (candidate && typeof candidate.getTranscript === 'function') {
      getTranscriptFromPackage = async (id) => {
        console.log('Using candidate.getTranscript from youtube-transcript');
        return await candidate.getTranscript(id);
      };
    }
  }

  console.log('youtube-transcript loaded (usable):', !!getTranscriptFromPackage);
} catch (e) {
  console.warn('youtube-transcript require failed:', e?.message ?? e);
}

// helper to normalize various return shapes to a transcript string
async function tryPackageAndNormalize(id) {
  if (!getTranscriptFromPackage) return null;
  try {
    const items = await getTranscriptFromPackage(id);
    if (!items) return null;
    // if string
    if (typeof items === 'string') return items;
    // if array of strings
    if (Array.isArray(items) && items.length > 0 && typeof items[0] === 'string') {
      return items.join(' ');
    }
    // if array of objects with text property
    if (Array.isArray(items)) {
      const joined = items.map(it => {
        if (!it) return '';
        if (typeof it === 'string') return it;
        return it.text || it.caption || it.transcript || '';
      }).filter(Boolean).join(' ');
      if (joined) return joined;
    }
    // if object with transcript property
    if (typeof items === 'object' && (items.transcript || items.text)) {
      return items.transcript || items.text;
    }
    // unknown shape: stringify as fallback
    return JSON.stringify(items);
  } catch (err) {
    console.warn('youtube-transcript call failed:', err?.message ?? err);
    return null;
  }
}

// helpers
function extractVideoId(urlOrId) {
  if (!urlOrId || typeof urlOrId !== 'string') return null;
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
  console.log('DEBUG fetch-transcript body:', JSON.stringify(req.body));
  try {
    const { videoId } = req.body || {};
    const id = extractVideoId(videoId);
    if (!id) return res.status(400).json({ error: 'Invalid YouTube URL or ID' });

    // 1) Try the youtube-transcript package first (most reliable)
    if (getTranscriptFromPackage) {
      try {
        console.log('Attempting youtube-transcript.getTranscript for', id);
        const items = await getTranscriptFromPackage(id);
        if (Array.isArray(items) && items.length > 0) {
          const transcriptText = items.map(i => i.text).join(' ');
          return res.json({ transcript: ensureSize(transcriptText) });
        }
        console.warn('youtube-transcript returned no items for', id);
      } catch (errPkg) {
        console.warn('youtube-transcript failed:', errPkg?.message ?? errPkg);
        // fall through to timedtext fallback
      }
    } else {
      console.log('youtube-transcript not installed; skipping package attempt');
    }

    // 2) Timedtext fallback
    console.log('Timedtext fallback for', id);
    const tracks = await fetchTimedTextList(id);
    if (!tracks || tracks.length === 0) {
      return res.status(404).json({ error: 'No captions available for this video' });
    }
    const preferred = tracks.find(t => t.lang && /^en(?:-|$)/i.test(t.lang)) || tracks[0];
    const lang = preferred.lang || tracks[0].lang || 'en';
    const transcriptText = await fetchTimedTextForLang(id, lang);
    if (!transcriptText || transcriptText.trim().length === 0) {
      return res.status(404).json({ error: 'Captions exist but could not be retrieved' });
    }
    return res.json({ transcript: ensureSize(transcriptText) });
  } catch (err) {
    console.error('fetch-transcript error:', err?.response?.data ?? err?.message ?? err);
    const payload = { error: 'Failed to fetch transcript' };
    if (SHOW_STACK) payload.detail = err?.message ?? null, payload.stack = err?.stack;
    return res.status(500).json(payload);
  }
});

// POST /api/generate-summary (unchanged)
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

    return res.json({ summary: aiSummary });
  } catch (error) {
    console.error('generate-summary error:', error?.response?.data ?? error?.message ?? error);
    return res.status(500).json({ error: 'Failed to generate summary', detail: error?.message ?? null });
  }
});

module.exports = router;
