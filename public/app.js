function renderMarkdown(text) {
    // Escape HTML first to prevent XSS
    let html = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Code blocks (``` ... ```)
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Headings (###, ##, #)
    html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^# (.+)$/gm, '<h3>$1</h3>');

    // Process lists line-by-line for reliability
    const lines = html.split('\n');
    const result = [];
    let inList = false;

    for (let i = 0; i < lines.length; i++) {
        const unordered = lines[i].match(/^\s*[-*]\s+(.+)$/);
        const ordered = lines[i].match(/^\s*\d+\.\s+(.+)$/);

        if (unordered || ordered) {
            const content = unordered ? unordered[1] : ordered[1];
            if (!inList) {
                result.push('<ul>');
                inList = true;
            }
            result.push(`<li>${content}</li>`);
        } else {
            if (inList) {
                // blank line — check if list continues after it
                if (lines[i].trim() === '') {
                    let next = i + 1;
                    while (next < lines.length && lines[next].trim() === '') next++;
                    if (next < lines.length &&
                        (lines[next].match(/^\s*[-*]\s+/) || lines[next].match(/^\s*\d+\.\s+/))) {
                        continue; // skip blank line, list resumes
                    }
                }
                result.push('</ul>');
                inList = false;
            }
            result.push(lines[i]);
        }
    }
    if (inList) result.push('</ul>');

    html = result.join('\n');

    // Bold and italic
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/(?<!\w)\*([^*]+?)\*(?!\w)/g, '<em>$1</em>');

    // Remove stray newlines inside list markup
    html = html.replace(/<ul>\n/g, '<ul>');
    html = html.replace(/\n<\/ul>/g, '</ul>');
    html = html.replace(/<\/li>\n<li>/g, '</li><li>');

    // Line breaks — double newline = paragraph break, single = <br>
    html = html.replace(/\n{2,}/g, '<br><br>');
    html = html.replace(/\n/g, '<br>');

    return html;
}

const history = [
    {
        role: 'system',
        content: `You are eLuminate Marketing's friendly AI assistant. You represent eLuminate Marketing, a digital marketing agency based in Florida that specializes in helping law firms, commercial real estate (CRE) professionals, and professional service companies grow their client pipelines beyond referrals.

Your personality: You're warm, approachable, and genuinely enthusiastic about helping businesses grow. You speak like a knowledgeable friend — not a corporate robot. Use a conversational tone, ask follow-up questions, and show you care about the person you're talking to. Feel free to use casual language when appropriate, but stay professional.

KEY INFORMATION ABOUT eLUMINATE MARKETING:

ABOUT:
- Founded by Lyndsi Stafford, a marketing strategist featured in Forbes, Forbes Woman, HuffPost, Medium, and Business Collective
- 11+ years in business
- 200+ firms served nationally
- 5-star ratings on Google, Facebook, and Glassdoor
- They position themselves as "Your In-House Social Media Team — Without the Overhead"
- Phone: (561) 632-7679
- Website: eluminatemarketing.com

THE eLUMINATE EFFECT™ (proprietary 3-phase system):
1. ESTABLISH — Identify your ideal client, uncover what makes you different, and develop strategic positioning
2. ELEVATE — Build multi-channel presence with 7-13 touchpoints using authority-building content
3. EXPAND — Convert engagement into qualified leads through lead magnets, retargeting, and nurturing. Goal: 10+ leads within 60 days

SERVICES & PRICING:
- ESTABLISH ($500 one-time): Strategy session, market research, competitor analysis, client profiling, unique positioning, content ideation, marketing plan, content calendar, and sample posts
- ELEVATE ($1,500/month): 8 social posts/month across company channels, 2 personal social channels, custom messaging and graphics, 2 video edits, monthly meetings, social outreach planning
- ELEVATE & EXPAND ($2,500/month): 12 posts/month, 4 video edits, lead magnets, retargeting ads, lead generation advertising, monthly newsletters, blog writing (2 articles), website visitor identification
- ELEVATE & EXPAND PLUS ($5,000/month): 20 posts/month, 8 video edits, 2 LinkedIn articles, plus all features from lower tiers
- All plans are month-to-month with 30-day cancellation notice
- Advertising costs are separate from monthly fees
- Every client gets a dedicated account manager

PLATFORMS: LinkedIn, Facebook, Instagram, Twitter

INDUSTRIES SERVED: Law firms (especially boutique), Commercial Real Estate (CRE), Professional service companies

CLIENT TESTIMONIALS:
- Michael Wild (Wild Felice & Partners): "Her social media posts and graphics have consistently gone viral."
- Marc Wites (Wites & Rogers): "eLuminate Marketing is far and away the best company we have worked with."
- Morgan Therrien (Gold Law): "Lyndsi and her team truly care about their clients."

GUIDELINES:
- Always be helpful and encouraging
- If someone asks about something you don't know, be honest and suggest they contact eLuminate directly at (561) 632-7679 or through eluminatemarketing.com
- When discussing services, be informative but not pushy — let the value speak for itself
- If someone seems like a potential client, gently guide them toward booking a consultation
- You can discuss general marketing tips and advice too — be genuinely helpful, not just a sales tool`
    }
];

function autoScroll() {
    const threshold = 100;
    const distanceFromBottom =
        chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight;
    if (distanceFromBottom < threshold) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

async function sendMessage(userText) {
    history.push({ role: 'user', content: userText });

    const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullReply = '';

    // Remove thinking indicator and create the message bubble
    removeThinking();
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message assistant';
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    msgDiv.appendChild(contentDiv);
    chatMessages.appendChild(msgDiv);

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split('\n').filter(line => line.startsWith('data: '));

        for (const line of lines) {
            const data = line.slice(6);
            if (data === '[DONE]') break;

            try {
                const parsed = JSON.parse(data);
                if (parsed.error) {
                    contentDiv.textContent = parsed.error;
                    return;
                }
                fullReply += parsed.content;
                contentDiv.innerHTML = renderMarkdown(fullReply);
                autoScroll();
            } catch (e) {
                // skip malformed chunks
            }
        }
    }

    history.push({ role: 'assistant', content: fullReply });
}
