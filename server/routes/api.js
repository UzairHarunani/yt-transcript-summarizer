const express = require('express');
const router = express.Router();
const axios = require('axios');

// Load environment variables from .env file
require('dotenv').config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY; // Your OpenRouter API key
const YOUTUBE_TRANSCRIPT_API_URL = 'https://youtube-transcript-api.example.com'; // Replace with actual YouTube Transcript API URL

// Endpoint to fetch YouTube transcript
router.post('/fetch-transcript', async (req, res) => {
    const { videoId } = req.body;

    try {
        const response = await axios.get(`${YOUTUBE_TRANSCRIPT_API_URL}/transcript/${videoId}`);
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching transcript:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to fetch transcript' });
    }
});

// Endpoint to generate summary using OpenRouter GPT-5
router.post('/generate-summary', async (req, res) => {
    const { transcript } = req.body;

    const systemPrompt = "You are a helpful AI assistant. Summarize the following transcript and extract core points.";

    try {
        const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                model: "openai/gpt-5",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: transcript }
                ]
            },
            {
                headers: {
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const aiSummary = response.data.choices[0].message.content;
        res.json({ summary: aiSummary });
    } catch (error) {
        console.error('Error contacting AI:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to generate summary' });
    }
});

module.exports = router;