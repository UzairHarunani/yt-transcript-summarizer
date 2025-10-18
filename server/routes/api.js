const express = require('express');
const router = express.Router();
const axios = require('axios');
const { getTranscript } = require('youtube-transcript'); // server-side module

// Load env if not already loaded by server entry
require('dotenv').config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// helper: extract 11-char YouTube id from URL or accept plain id
function extractVideoId(urlOrId) {
  if (!urlOrId || typeof urlOrId !== 'string') return null;
  // common patterns
  const patterns = [
    /(?:v=|\/)([0-9A-Za-z_-]{11})(?:&|$)/, // v=... or /... (most)
    /^([0-9A-Za-z_-]{11})$/ // plain id
  ];
  for (const rg of patterns) {
    const m = urlOrId.match(rg);
    if (m && m[1]) return m[1];
    if (m && m[0] && m[0].length === 11) return m[0];
  }
  return null;
}

// truncate large text to avoid token issues
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

    const items = await getTranscript(id); // returns [{text, start, duration}, ...]
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(404).json({ error: 'No transcript found for this video' });
    }

    const transcriptText = items.map(i => i.text).join(' ');
    res.json({ transcript: transcriptText });
  } catch (err) {
    console.error('getTranscript error:', err?.response ?? err?.message ?? err);
    res.status(500).json({ error: 'Failed to fetch transcript' });
  }
});

// POST /api/generate-summary
router.post('/generate-summary', async (req, res) => {
  try {
    const { transcript } = req.body || {};
    if (!transcript || typeof transcript !== 'string') {
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
      return res.status(502).json({ error: 'AI did not return a summary' });
    }

    res.json({ summary: aiSummary });
  } catch (error) {
    console.error('Error contacting AI:', error?.response?.data ?? error?.message ?? error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

module.exports = router;