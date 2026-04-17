# AI Chatbot Demo

A client-ready AI chatbot built for **eLuminate Marketing** — a Florida-based digital marketing agency specializing in law firms, commercial real estate, and professional services.

Single-page web app with a Node.js/Express backend that streams responses from the OpenAI API. No frameworks, no build step — just clean HTML/CSS/JS served from one Render deployment.

## Features

- **Streaming responses** — tokens render word-by-word via Server-Sent Events, with a thinking indicator while the AI processes
- **Agency-trained context** — system prompt loaded with eLuminate's services, pricing, team info, and testimonials so the bot can answer real questions
- **Markdown rendering** — bot responses display headings, bold, italic, lists, and code blocks properly
- **Suggested questions** — clickable prompt chips guide first-time users into the conversation
- **Rate limiting** — 15 requests/min per IP via `express-rate-limit`
- **Error handling** — user-friendly messages for API failures, rate limits, network issues, and invalid keys
- **Mobile responsive** — works on phones with safe-area insets, iOS zoom prevention, and dynamic viewport height
- **Branded UI** — eLuminate color palette (#358fb7, #f5b42f, #ffffff, #1c3d4a) with logo and favicon

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | HTML, CSS, vanilla JavaScript |
| Backend | Node.js, Express |
| AI | OpenAI GPT-4o-mini |
| Hosting | Render (free tier) |

## Project Structure

```
├── server.js            # Express server + OpenAI streaming proxy
├── package.json
├── .env                 # OPENAI_API_KEY (not committed)
├── .gitignore
└── public/
    ├── index.html       # Chat UI
    ├── style.css        # Styles + responsive layout
    ├── app.js           # Streaming logic + markdown parser
    ├── favicon.svg
    └── eLuminate_logo.png
```

## Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- An [OpenAI API key](https://platform.openai.com/api-keys)

### Local Development

```bash
git clone https://github.com/IsmailAbb/AI_Chatbot_Demo.git
cd AI_Chatbot_Demo
npm install
```

Create a `.env` file in the project root:

```
OPENAI_API_KEY=sk-your-key-here
```

Start the dev server:

```bash
npm run dev
```

Visit `http://localhost:3000`

### Deploy to Render

1. Push to GitHub
2. On [Render](https://render.com): **New +** > **Web Service** > connect the repo
3. Set **Build Command** to `npm install` and **Start Command** to `node server.js`
4. Add `OPENAI_API_KEY` in the **Environment** tab
5. Deploy

## Customization

The system prompt in `public/app.js` controls the bot's personality and knowledge. Swap it out to repurpose the demo for any client or use case — customer support, sales qualifier, FAQ bot, onboarding guide, etc.

## License

MIT
