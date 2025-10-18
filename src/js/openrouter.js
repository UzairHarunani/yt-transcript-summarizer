const axios = require('axios');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY; // Ensure to set your API key in the environment variables

async function generateSummary(transcript) {
    const systemPrompt = "Summarize the following transcript and extract core points: " + transcript;

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

        return response.data.choices[0].message.content;
    } catch (error) {
        console.error('Error contacting OpenRouter API:', error.response ? error.response.data : error.message);
        throw new Error('Failed to generate summary');
    }
}

async function createQuizQuestions(summary) {
    const systemPrompt = "Create quiz questions based on the following summary: " + summary;

    try {
        const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                model: "openai/gpt-5",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: summary }
                ]
            },
            {
                headers: {
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return response.data.choices[0].message.content;
    } catch (error) {
        console.error('Error contacting OpenRouter API for quiz questions:', error.response ? error.response.data : error.message);
        throw new Error('Failed to create quiz questions');
    }
}

module.exports = {
    generateSummary,
    createQuizQuestions
};