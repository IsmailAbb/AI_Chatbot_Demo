require('dotenv').config();
const express = require('express');
const OpenAI = require('openai');
const rateLimit = require('express-rate-limit');

const app = express();

// Validate API key on startup
if (!process.env.OPENAI_API_KEY) {
    console.error('ERROR: OPENAI_API_KEY is not set. Add it to your .env file or Render environment variables.');
    process.exit(1);
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(express.json());
app.use(express.static('public'));

// Rate limit: 15 requests per minute per IP
const chatLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.setHeader('Content-Type', 'text/event-stream');
        res.write(`data: ${JSON.stringify({ error: 'Too many requests — please wait a moment and try again.' })}\n\n`);
        res.end();
    },
});

app.post('/api/chat', chatLimiter, async (req, res) => {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.write(`data: ${JSON.stringify({ error: 'Invalid request.' })}\n\n`);
        return res.end();
    }

    // Reject messages that are too long (bypass of frontend maxlength)
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.content?.length > 500) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.write(`data: ${JSON.stringify({ error: 'Message is too long. Please keep it under 500 characters.' })}\n\n`);
        return res.end();
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
        const stream = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages,
            stream: true,
        });

        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
                res.write(`data: ${JSON.stringify({ content })}\n\n`);
            }
        }

        res.write('data: [DONE]\n\n');
        res.end();
    } catch (err) {
        console.error('OpenAI API error:', err?.status, err?.code, err?.message);

        let message;
        const status = err?.status;
        const code = err?.code;

        if (status === 401 || code === 'invalid_api_key') {
            message = 'The AI service is temporarily unavailable. Please try again later.';
        } else if (status === 429) {
            message = 'The AI is getting a lot of traffic right now. Please wait a moment and try again.';
        } else if (status === 503 || status === 502) {
            message = 'The AI service is temporarily down for maintenance. Please try again in a few minutes.';
        } else if (status === 500) {
            message = 'The AI service encountered an internal error. Please try again.';
        } else if (status === 400) {
            message = 'There was an issue with the request. Try starting a new conversation.';
        } else if (status === 404) {
            message = 'The AI model is currently unavailable. Please try again later.';
        } else if (code === 'ECONNREFUSED' || code === 'ENOTFOUND' || code === 'ETIMEDOUT') {
            message = 'Unable to reach the AI service. Please check your connection and try again.';
        } else if (err?.type === 'insufficient_quota') {
            message = 'The AI service quota has been reached. Please try again later.';
        } else {
            message = 'Something went wrong. Please try again.';
        }

        res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
        res.end();
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
