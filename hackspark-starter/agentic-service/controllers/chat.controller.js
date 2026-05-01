const { GoogleGenerativeAI } = require('@google/generative-ai');
const Session = require('../models/Session');
const Message = require('../models/Message');

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const FETCH_TIMEOUT_MS = Number(process.env.AGENT_FETCH_TIMEOUT_MS || 30000);
const LLM_TIMEOUT_MS = Number(process.env.AGENT_LLM_TIMEOUT_MS || 20000);
const HISTORY_LIMIT = Number(process.env.AGENT_HISTORY_LIMIT || 20);
const GROUNDING_CACHE_TTL_MS = Number(process.env.AGENT_GROUNDING_CACHE_TTL_MS || 60000);

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const groundingCache = new Map();

if (!genAI) {
  console.warn('GEMINI_API_KEY is missing. Agentic replies will use grounded fallback responses.');
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function isRentPiRelated(message) {
  const keywords = [
    'rent', 'rental', 'rentpi', 'product', 'item', 'category', 'price', 'pricing',
    'available', 'availability', 'busy', 'free', 'discount', 'security', 'score',
    'user', 'renter', 'trend', 'trending', 'recommend', 'season', 'peak', 'surge'
  ];
  const lower = String(message || '').toLowerCase();
  return keywords.some((keyword) => lower.includes(keyword));
}

function extractDates(message) {
  return [...String(message).matchAll(/\b\d{4}-\d{2}-\d{2}\b/g)].map((match) => match[0]);
}

function extractMonths(message) {
  return [...String(message).matchAll(/\b\d{4}-\d{2}\b/g)].map((match) => match[0]);
}

function extractFirstInt(message) {
  const match = String(message).match(/\b\d+\b/);
  return match ? Number(match[0]) : null;
}

function extractLimit(message, fallback = 5) {
  const match = String(message).match(/\b(?:top|limit|show|get)\s+(\d{1,2})\b/i);
  const value = match ? Number(match[1]) : fallback;
  return Math.min(Math.max(value, 1), 50);
}

function classifyIntent(message) {
  const lower = message.toLowerCase();
  const dates = extractDates(message);
  const months = extractMonths(message).filter((month) => !dates.some((date) => date.startsWith(month)));

  if ((lower.includes('available') || lower.includes('availability') || lower.includes('free') || lower.includes('busy')) && lower.includes('product')) {
    const productId = extractFirstInt(message);
    if (!productId || dates.length < 2) {
      return {
        type: 'missing',
        reply: 'I can check availability, but I need a product ID and both dates in YYYY-MM-DD format.'
      };
    }
    return { type: 'availability', productId, from: dates[0], to: dates[1] };
  }

  if (
    ((lower.includes('trend') || lower.includes('recommend') || lower.includes('season') || lower.includes('popular')) && (lower.includes('product') || lower.includes('rent') || lower.includes('item'))) ||
    lower.includes('what should i rent') ||
    lower.includes('should i rent') ||
    lower.includes('rent today')
  ) {
    return { type: 'recommendations', date: dates[0] || today(), limit: extractLimit(message, 5) };
  }

  if ((lower.includes('most') || lower.includes('top') || lower.includes('leading') || lower.includes('popular')) && lower.includes('categor')) {
    return { type: 'mostCategory' };
  }

  if ((lower.includes('peak') || lower.includes('busiest') || lower.includes('7-day') || lower.includes('seven-day')) && (lower.includes('period') || lower.includes('window') || lower.includes('rent'))) {
    if (months.length < 2) {
      return {
        type: 'missing',
        reply: 'I can find the peak rental window, but I need a from month and to month in YYYY-MM format.'
      };
    }
    return { type: 'peakWindow', from: months[0], to: months[1] };
  }

  if (lower.includes('surge')) {
    const month = months[0] || today().slice(0, 7);
    return { type: 'surgeDays', month };
  }

  if (lower.includes('discount') || lower.includes('security') || lower.includes('score') || lower.includes('trust')) {
    const userId = extractFirstInt(message);
    if (!userId) {
      return {
        type: 'missing',
        reply: 'I can check a discount tier, but I need the user ID.'
      };
    }
    return { type: 'discount', userId };
  }

  if (lower.includes('product') && extractFirstInt(message)) {
    return { type: 'product', productId: extractFirstInt(message) };
  }

  return { type: 'general' };
}

async function withTimeout(promise, timeoutMs, label) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchJson(url, options = {}) {
  const method = options.method || 'GET';
  const cacheKey = method === 'GET' ? url : null;
  const cached = cacheKey ? groundingCache.get(cacheKey) : null;

  if (cached && Date.now() - cached.savedAt < GROUNDING_CACHE_TTL_MS) {
    return { ok: true, data: cached.data, cached: true };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const body = await response.json().catch(() => ({}));

    if (response.ok) {
      if (cacheKey) {
        groundingCache.set(cacheKey, { data: body, savedAt: Date.now() });
      }
      return { ok: true, data: body };
    }

    if (response.status === 429) {
      return {
        ok: false,
        kind: 'rate_limit',
        status: response.status,
        message: 'The data source is rate limited right now. Please wait a moment and try again.',
        data: body
      };
    }

    return {
      ok: false,
      kind: 'http_error',
      status: response.status,
      message: body.error || body.message || `Data request failed with status ${response.status}.`,
      data: body
    };
  } catch (error) {
    return {
      ok: false,
      kind: error.name === 'AbortError' ? 'timeout' : 'network_error',
      message: error.name === 'AbortError'
        ? 'The data request timed out before the service replied.'
        : `The data service could not be reached: ${error.message}`
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchGrounding(intent) {
  const centralUrl = process.env.CENTRAL_API_URL;
  const centralToken = process.env.CENTRAL_API_TOKEN;
  const centralHeaders = { Authorization: `Bearer ${centralToken}` };

  if (intent.type === 'general') {
    return { ok: true, type: intent.type, data: null };
  }

  if (intent.type === 'mostCategory') {
    if (!centralUrl || !centralToken) {
      return { ok: false, type: intent.type, message: 'Central API configuration is missing.' };
    }
    const result = await fetchJson(`${centralUrl}/api/data/rentals/stats?group_by=category`, { headers: centralHeaders });
    return { ...result, type: intent.type };
  }

  if (intent.type === 'availability') {
    const path = `/rentals/products/${intent.productId}/availability?from=${intent.from}&to=${intent.to}`;
    const result = await fetchJson(`http://rental-service:8002${path}`);
    return { ...result, type: intent.type };
  }

  if (intent.type === 'recommendations') {
    const path = `/analytics/recommendations?date=${intent.date}&limit=${intent.limit}`;
    const result = await fetchJson(`http://analytics-service:8003${path}`);
    return { ...result, type: intent.type };
  }

  if (intent.type === 'peakWindow') {
    const path = `/analytics/peak-window?from=${intent.from}&to=${intent.to}`;
    const result = await fetchJson(`http://analytics-service:8003${path}`);
    return { ...result, type: intent.type };
  }

  if (intent.type === 'surgeDays') {
    const path = `/analytics/surge-days?month=${intent.month}`;
    const result = await fetchJson(`http://analytics-service:8003${path}`);
    return { ...result, type: intent.type };
  }

  if (intent.type === 'discount') {
    const result = await fetchJson(`http://user-service:8001/users/${intent.userId}/discount`);
    return { ...result, type: intent.type };
  }

  if (intent.type === 'product') {
    const result = await fetchJson(`http://rental-service:8002/rentals/products/${intent.productId}`);
    return { ...result, type: intent.type };
  }

  return { ok: true, type: intent.type, data: null };
}

function dataLooksEmpty(grounding) {
  if (!grounding || !grounding.ok) return true;
  const data = grounding.data;
  if (!data) return false;
  if (Array.isArray(data.data)) return data.data.length === 0;
  if (Array.isArray(data.recommendations)) return data.recommendations.length === 0;
  return false;
}

function unavailableReply(grounding) {
  if (grounding.kind === 'rate_limit') {
    return 'I cannot fetch the live RentPi data right now because the data source is rate limited. Please wait a moment and try again.';
  }
  if (grounding.kind === 'timeout') {
    return 'I could not fetch the required RentPi data because the service timed out. I will not guess the answer without fresh data.';
  }
  return `I could not fetch the required RentPi data. ${grounding.message || 'The service returned an error.'} I will not guess without the data.`;
}

function fallbackReply(intent, grounding) {
  if (!grounding.ok) return unavailableReply(grounding);
  if (dataLooksEmpty(grounding)) return 'I checked the RentPi data, but no matching results were available for that request.';

  const data = grounding.data;

  if (intent.type === 'mostCategory') {
    const rows = Array.isArray(data.data) ? data.data : [];
    const best = rows
      .map((row) => ({ category: row.category, count: row.rental_count ?? row.count ?? 0 }))
      .sort((a, b) => b.count - a.count)[0];
    return best ? `${best.category} led with ${best.count.toLocaleString()} rentals.` : 'I could not find category rental statistics in the returned data.';
  }

  if (intent.type === 'availability') {
    const status = data.available ? 'available' : 'not available';
    const busyCount = Array.isArray(data.busyPeriods) ? data.busyPeriods.length : 0;
    const freeCount = Array.isArray(data.freeWindows) ? data.freeWindows.length : 0;
    return `Product ${data.productId} is ${status} from ${data.from} to ${data.to}. I found ${busyCount} busy period(s) and ${freeCount} free window(s).`;
  }

  if (intent.type === 'recommendations') {
    const names = (data.recommendations || []).slice(0, 5).map((item) => `${item.name || `Product ${item.productId}`} (${item.category || 'unknown'}, score ${item.score})`);
    return names.length ? `Recommended products for ${data.date}: ${names.join('; ')}.` : 'No seasonal recommendations were available for that date.';
  }

  if (intent.type === 'peakWindow') {
    const peak = data.peakWindow;
    return peak ? `The peak rental window was ${peak.from} to ${peak.to}, with ${Number(peak.totalRentals).toLocaleString()} rentals.` : 'I could not find a peak rental window in the returned data.';
  }

  if (intent.type === 'surgeDays') {
    const days = Array.isArray(data.data) ? data.data : [];
    const top = [...days].sort((a, b) => (b.count || 0) - (a.count || 0)).slice(0, 3);
    return top.length ? `For ${data.month}, the strongest days were ${top.map((day) => `${day.date} (${day.count} rentals)`).join(', ')}.` : `No surge-day data was available for ${data.month}.`;
  }

  if (intent.type === 'discount') {
    return `User ${data.userId} has a security score of ${data.securityScore} and qualifies for a ${data.discountPercent}% discount.`;
  }

  if (intent.type === 'product') {
    return `${data.name || `Product ${data.id}`} is in ${data.category || 'an unknown category'} and costs ${data.pricePerDay ?? 'unknown'} per day.`;
  }

  return 'I can help with RentPi rentals, products, categories, pricing, availability, discounts, trends, recommendations, peaks, and surge days.';
}

function toGeminiHistory(messages) {
  return messages.slice(-HISTORY_LIMIT).map((message) => ({
    role: message.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: message.content }]
  }));
}

async function generateWithGemini(message, previousMessages, grounding) {
  if (!genAI) {
    throw new Error('Gemini API key is not configured');
  }

  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: [
      'You are RentPi Assistant.',
      'Answer only RentPi platform questions about rentals, products, categories, pricing, availability, users, discounts, trends, recommendations, peaks, and surge days.',
      'Use the provided grounded data as the only source for numbers, product names, dates, and facts.',
      'If the grounded data is empty, errored, missing, or insufficient, say that the data is unavailable and do not guess.',
      'Keep answers concise and useful.'
    ].join(' ')
  });

  const chat = model.startChat({ history: toGeminiHistory(previousMessages) });
  const prompt = [
    `User message: ${message}`,
    `Grounding type: ${grounding.type}`,
    `Grounded data JSON: ${JSON.stringify(grounding.data || null).slice(0, 12000)}`,
    'Reply to the user using only that grounded data. Do not invent missing numbers.'
  ].join('\n\n');

  const result = await withTimeout(chat.sendMessage(prompt), LLM_TIMEOUT_MS, 'LLM');
  return result.response.text().trim();
}

async function generateTitle(firstMessage, assistantReply) {
  if (!genAI) return 'RentPi Conversation';

  try {
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const prompt = [
      'Given this first RentPi chat exchange, reply with ONLY a short 3-5 word title.',
      'No punctuation.',
      `User: ${firstMessage}`,
      `Assistant: ${assistantReply}`
    ].join('\n');
    const result = await withTimeout(model.generateContent(prompt), Math.min(LLM_TIMEOUT_MS, 8000), 'Title generation');
    return cleanTitle(result.response.text());
  } catch (error) {
    console.warn('Session title generation failed:', error.message);
    return 'RentPi Conversation';
  }
}

function cleanTitle(title) {
  const cleaned = String(title || '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 5)
    .join(' ');
  return cleaned || 'RentPi Conversation';
}

async function saveExchange(sessionId, message, reply, isNewSession, shouldUseLlmTitle) {
  await Message.create({ sessionId, role: 'user', content: message });
  await Message.create({ sessionId, role: 'assistant', content: reply });

  const name = isNewSession
    ? (shouldUseLlmTitle ? await generateTitle(message, reply) : 'RentPi Conversation')
    : undefined;

  const update = {
    $set: { lastMessageAt: new Date() },
    $setOnInsert: {
      sessionId,
      name: name || 'RentPi Conversation',
      createdAt: new Date()
    }
  };

  await Session.findOneAndUpdate({ sessionId }, update, { upsert: true, new: true });
}

class ChatController {
  async handleChat(req, res) {
    try {
      const { sessionId, message } = req.body;

      if (!sessionId || !message || typeof message !== 'string') {
        return res.status(400).json({ error: 'sessionId and message are required' });
      }

      const existingSession = await Session.findOne({ sessionId });
      const previousMessages = await Message.find({ sessionId }).sort({ timestamp: 1 });
      const isNewSession = !existingSession && previousMessages.length === 0;

      if (!isRentPiRelated(message)) {
        const reply = 'I can only assist with RentPi platform questions about rentals, products, categories, pricing, availability, users, discounts, trends, and recommendations.';
        await saveExchange(sessionId, message, reply, isNewSession, false);
        return res.status(200).json({ sessionId, reply });
      }

      const intent = classifyIntent(message);

      if (intent.type === 'missing') {
        await saveExchange(sessionId, message, intent.reply, isNewSession, true);
        return res.status(200).json({ sessionId, reply: intent.reply });
      }

      if (intent.type === 'general') {
        const reply = fallbackReply(intent, { ok: true, type: 'general', data: null });
        await saveExchange(sessionId, message, reply, isNewSession, true);
        return res.status(200).json({ sessionId, reply });
      }

      const grounding = await fetchGrounding(intent);
      let reply;

      if (!grounding.ok || dataLooksEmpty(grounding)) {
        reply = fallbackReply(intent, grounding);
      } else {
        try {
          reply = await generateWithGemini(message, previousMessages, grounding);
        } catch (error) {
          console.warn('Gemini reply failed, using grounded fallback:', error.message);
          reply = fallbackReply(intent, grounding);
        }
      }

      await saveExchange(sessionId, message, reply, isNewSession, true);
      return res.status(200).json({ sessionId, reply });
    } catch (error) {
      console.error('Agentic Service Error:', error);
      return res.status(500).json({ error: 'Internal server error in chat service.' });
    }
  }

  async getSessions(req, res) {
    try {
      const sessions = await Session.find().sort({ lastMessageAt: -1 }).select('-_id sessionId name lastMessageAt');
      return res.json({ sessions });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal server error.' });
    }
  }

  async getHistory(req, res) {
    try {
      const { sessionId } = req.params;
      const session = await Session.findOne({ sessionId });
      if (!session) return res.status(404).json({ error: 'Session not found' });

      const messages = await Message.find({ sessionId }).sort({ timestamp: 1 }).select('-_id role content timestamp');
      return res.json({
        sessionId: session.sessionId,
        name: session.name,
        messages
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal server error.' });
    }
  }

  async deleteSession(req, res) {
    try {
      const { sessionId } = req.params;
      await Session.deleteOne({ sessionId });
      await Message.deleteMany({ sessionId });
      return res.json({ success: true });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal server error.' });
    }
  }
}

module.exports = new ChatController();
