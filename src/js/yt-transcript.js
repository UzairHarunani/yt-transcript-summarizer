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

async function fetchTranscriptForVideo(videoId) {
  return await YTTranscriptAPI.fetchTranscript(videoId);
}

// expose to other client scripts
window.fetchTranscriptForVideo = fetchTranscriptForVideo;
window.YTTranscriptAPI = YTTranscriptAPI;

export default YTTranscriptAPI;