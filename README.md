# YouTube Transcript Summarizer

## Overview
The YouTube Transcript Summarizer is a web application that allows users to fetch transcripts from YouTube videos, generate AI-powered summaries, extract core points, create quiz questions, and save summaries locally. This project integrates the YouTube Transcript API and OpenRouter GPT-5 to provide a seamless experience for users looking to summarize video content.

## Features
- Fetch transcripts from YouTube videos using the YouTube Transcript API.
- Generate concise summaries of the transcripts using OpenRouter GPT-5.
- Extract key points from the summaries for quick reference.
- Create quiz questions based on the summarized content.
- Save generated summaries locally for future reference.

## Project Structure
```
youtube-transcript-summarizer
├── src
│   ├── index.html         # Main HTML document for the user interface
│   ├── css
│   │   └── styles.css     # CSS styles for the application
│   └── js
│       ├── app.js         # Main JavaScript file for handling user interactions
│       ├── yt-transcript.js # Functions to interact with the YouTube Transcript API
│       └── openrouter.js   # Functions to interact with the OpenRouter GPT-5 API
├── server
│   ├── index.js           # Entry point for the backend server
│   ├── routes
│   │   └── api.js         # API routes for fetching transcripts and generating summaries
│   └── .env.example       # Template for environment variables
├── data
│   └── summaries.json     # File to store saved summaries locally
├── package.json           # npm configuration file
└── README.md              # Project documentation
```

## Setup Instructions
1. Clone the repository:
   ```
   git clone <repository-url>
   cd youtube-transcript-summarizer
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the `server` directory by copying the `.env.example` file and filling in the required API keys.

4. Start the server:
   ```
   npm run start
   ```

5. Open `src/index.html` in your web browser to access the application.

## Usage Guidelines
- Enter the YouTube video link in the provided input field.
- Click the "Fetch Transcript" button to retrieve the transcript of the video.
- After fetching the transcript, click the "Generate Summary" button to create a summary using AI.
- Use the "Save Summary" button to store the generated summary locally.

## Contributing
Contributions are welcome! Please feel free to submit a pull request or open an issue for any suggestions or improvements.

## License
This project is licensed under the MIT License. See the LICENSE file for more details.