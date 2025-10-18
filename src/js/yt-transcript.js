const YTTranscriptAPI = {
    async fetchTranscript(videoId) {
        try {
            const response = await fetch(`https://www.googleapis.com/youtube/v3/captions?videoId=${videoId}&key=YOUR_YOUTUBE_API_KEY`);
            if (!response.ok) {
                throw new Error('Failed to fetch transcript');
            }
            const data = await response.json();
            return data.items; // Adjust based on actual API response structure
        } catch (error) {
            console.error('Error fetching transcript:', error);
            throw error;
        }
    },

    async getTranscript(videoUrl) {
        const videoId = this.extractVideoId(videoUrl);
        if (!videoId) {
            throw new Error('Invalid YouTube URL');
        }
        return await this.fetchTranscript(videoId);
    },

    extractVideoId(url) {
        const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^&\n]{11})/;
        const match = url.match(regex);
        return match ? match[1] : null;
    }
};

// Helper for client: extract video id from URL or accept id directly
function extractVideoId(urlOrId) {
  if (!urlOrId || typeof urlOrId !== 'string') return null;
  // v=..., youtu.be/..., /embed/, or plain id
  const patterns = [
    /(?:v=|v\/|embed\/|watch\?v=|youtu\.be\/)([0-9A-Za-z_-]{11})/,
    /([0-9A-Za-z_-]{11})/
  ];
  for (const p of patterns) {
    const m = urlOrId.match(p);
    if (m && m[1]) return m[1];
  }
  return null;
}

async function fetchTranscriptForVideo(videoId) {
  return await YTTranscriptAPI.fetchTranscript(videoId);
}

// expose to other client scripts
window.fetchTranscriptForVideo = fetchTranscriptForVideo;
window.YTTranscriptAPI = YTTranscriptAPI;

// exposed helpers for other client code
window.extractVideoId = extractVideoId;
window.getVideoId = (urlOrId) => extractVideoId(urlOrId);

