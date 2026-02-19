const express = require('express');
const fs = require('fs');
const path = require('path');
const ChatbotKnowledge = require('../models/chatbotKnowledge');

const router = express.Router();
const knowledgeBasePath = path.join(__dirname, '..', 'data', 'chatbot-knowledge-base.json');

let fallbackKnowledgeBase = [];
try {
  fallbackKnowledgeBase = JSON.parse(fs.readFileSync(knowledgeBasePath, 'utf8'));
} catch (error) {
  console.error('Failed to load chatbot knowledge base:', error.message);
}

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

function rankRelevantDocuments(query) {
  return rankRelevantDocumentsFromCollection(query, fallbackKnowledgeBase);
}

function rankRelevantDocumentsFromCollection(query, collection) {
  const queryTokens = new Set(tokenize(query));
  if (queryTokens.size === 0) {
    return [];
  }

  const scored = collection
    .map((doc) => {
      const content = String(doc?.content || '');
      if (!content) {
        return { doc: { content: '' }, score: 0 };
      }

      const docTokens = Array.isArray(doc?.tokens) && doc.tokens.length
        ? doc.tokens
        : tokenize(content);
      let score = 0;
      for (const token of docTokens) {
        if (queryTokens.has(token)) score += 1;
      }
      return { doc: { content }, score };
    })
    .sort((a, b) => b.score - a.score)
    .filter((item) => item.score > 0)
    .slice(0, 3)
    .map((item) => item.doc.content);

  return scored;
}

function buildPrompt(query, relevantDocs, context) {
  const parts = [
    'You are RapidRoutines AI, a helpful calisthenics and fitness assistant. ',
    'You know fitness topics including weight loss, muscle building, nutrition, cardio vs strength, and recovery.',
    '\n\n',
  ];

  if (relevantDocs.length) {
    parts.push('RELEVANT INFORMATION:\n');
    relevantDocs.forEach((doc, idx) => {
      parts.push(`[${idx + 1}] ${doc}\n\n`);
    });
  }

  if (Array.isArray(context) && context.length) {
    parts.push('CONVERSATION HISTORY:\n');
    context.slice(-4).forEach((msg) => {
      const role = String(msg?.role || 'user');
      const content = String(msg?.content || '');
      parts.push(`${role}: ${content}\n`);
    });
    parts.push('\n');
  }

  parts.push(`User query: ${query}\n`);
  parts.push(
    'Respond in a friendly, helpful manner with accurate fitness information. ',
    'Keep responses concise and easy to read. ',
    'Use **bold text** for key points and section titles. ',
    'Do not use markdown heading syntax with #, ##, or ###. ',
    'Use plain section titles (prefer **bold titles**) and bullet points that start with "- ". ',
    'Do not use code blocks. Do not include unnecessary symbols. ',
    'If the user greets you, greet them back simply. Ask one follow-up question if the query is too general.'
  );

  return parts.join('');
}

function normalizeChatbotText(text) {
  const normalizedLines = String(text || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => {
      // Convert markdown headings into bold section titles.
      const headingMatch = line.match(/^\s{0,3}#{1,6}\s*(.+?)\s*$/);
      if (headingMatch) {
        return `**${headingMatch[1]}**`;
      }

      // Normalize bullet markers to "- ".
      const bulletMatch = line.match(/^\s*[\*\u2022]\s+(.+)$/);
      if (bulletMatch) {
        return `- ${bulletMatch[1]}`;
      }

      return line;
    });

  return normalizedLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

router.post('/generate', async (req, res) => {
  try {
    const userQuery = String(req.body?.query || '').trim();
    const context = Array.isArray(req.body?.context) ? req.body.context : [];

    if (!userQuery) {
      return res.status(400).json({ error: 'Missing query' });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY not set in environment variables.' });
    }

    const mongoDocs = await ChatbotKnowledge.find({}, { content: 1, tokens: 1, _id: 0 }).lean();
    const sourceDocs = mongoDocs.length > 0 ? mongoDocs : fallbackKnowledgeBase;
    const relevantDocs = rankRelevantDocumentsFromCollection(userQuery, sourceDocs);
    const prompt = buildPrompt(userQuery, relevantDocs, context);
    const geminiApiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
    const url = `${geminiApiUrl}?key=${geminiApiKey}`;

    const geminiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    const contentType = geminiResponse.headers.get('content-type') || '';
    const rawBody = await geminiResponse.text();

    if (!contentType.includes('application/json')) {
      return res.status(geminiResponse.status).json({
        error: 'Expected JSON from Gemini',
        details: rawBody.slice(0, 500),
      });
    }

    let parsedBody;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch (error) {
      return res.status(geminiResponse.status).type('application/json').send(rawBody);
    }

    const generatedText = parsedBody?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof generatedText === 'string' && generatedText.trim()) {
      parsedBody.candidates[0].content.parts[0].text = normalizeChatbotText(generatedText);
    }

    return res.status(geminiResponse.status).json(parsedBody);
  } catch (error) {
    console.error('Chatbot generation error:', error);
    return res.status(500).json({ error: 'Unable to generate response right now.' });
  }
});

module.exports = router;
