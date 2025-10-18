const transcriptApiUrl = 'https://youtube-transcript-api.example.com'; // Replace with actual API URL
const openRouterApiUrl = 'https://openrouter.ai/api/v1/chat/completions'; // Replace with actual API URL
const apiKey = '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'; // Replace with your actual API key

document.getElementById('fetch-transcript').addEventListener('click', async () => {
    const videoUrl = document.getElementById('video-url').value;
    const transcript = await fetchTranscript(videoUrl);
    document.getElementById('transcript').value = transcript;
});

document.getElementById('generate-summary').addEventListener('click', async () => {
    const transcript = document.getElementById('transcript').value;
    const summary = await generateSummary(transcript);
    document.getElementById('summary').value = summary;
});

document.getElementById('save-summary').addEventListener('click', () => {
    const summary = document.getElementById('summary').value;
    saveSummary(summary);
});

document.addEventListener('DOMContentLoaded', () => {
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        submitBtn.addEventListener('click', handleSubmit);
    } else {
        console.warn('submitBtn not found in DOM');
    }
});

async function fetchTranscript(videoUrl) {
    const response = await fetch(`${transcriptApiUrl}?url=${encodeURIComponent(videoUrl)}`);
    const data = await response.json();
    return data.transcript;
}

async function generateSummary(transcript) {
    const response = await fetch(openRouterApiUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: "openai/gpt-5",
            messages: [
                { role: "system", content: "Summarize the following transcript." },
                { role: "user", content: transcript }
            ]
        })
    });
    const data = await response.json();
    return data.choices[0].message.content;
}

function saveSummary(summary) {
    const summaries = JSON.parse(localStorage.getItem('summaries')) || [];
    summaries.push(summary);
    localStorage.setItem('summaries', JSON.stringify(summaries));
    alert('Summary saved successfully!');
}