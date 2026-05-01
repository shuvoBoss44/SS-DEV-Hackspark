const { GoogleGenerativeAI } = require('@google/generative-ai');
const Session = require('../models/Session');
const Message = require('../models/Message');

// Check for API Key
if (!process.env.GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY is missing. P15 agentic-service will fail.");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 1. Topic Guard Pre-check
function isRentPiRelated(message) {
    const keywords = ['rent', 'product', 'categor', 'price', 'pricing', 'availab', 'discount', 'peak', 'surge', 'trend', 'recommend'];
    const lower = message.toLowerCase();
    return keywords.some(kw => lower.includes(kw));
}

// 2. Fetchers mapping to the internal microservices
async function fetchData(toolName, args) {
    console.log(`[Tool Call] ${toolName} with args:`, args);
    const CENTRAL_API_URL = process.env.CENTRAL_API_URL;
    const CENTRAL_API_TOKEN = process.env.CENTRAL_API_TOKEN;

    try {
        if (toolName === 'getMostRentedCategory') {
            const res = await fetch(`${CENTRAL_API_URL}/api/data/rentals/stats?group_by=category`, {
                headers: { 'Authorization': `Bearer ${CENTRAL_API_TOKEN}` }
            });
            if (!res.ok) return { error: `Failed to fetch data: ${res.status}` };
            return await res.json();
        }

        if (toolName === 'getProductAvailability') {
            const { productId, from, to } = args;
            const res = await fetch(`http://rental-service:8002/rentals/products/${productId}/availability?from=${from}&to=${to}`);
            if (!res.ok) return { error: `Failed to fetch data: ${res.status}` };
            return await res.json();
        }

        if (toolName === 'getTrendingProducts') {
            const { date, limit = 5 } = args;
            const res = await fetch(`http://analytics-service:8003/analytics/recommendations?date=${date}&limit=${limit}`);
            if (!res.ok) return { error: `Failed to fetch data: ${res.status}` };
            return await res.json();
        }

        if (toolName === 'getPeakRentalPeriod') {
            const { from, to } = args;
            const res = await fetch(`http://analytics-service:8003/analytics/peak-window?from=${from}&to=${to}`);
            if (!res.ok) return { error: `Failed to fetch data: ${res.status}` };
            return await res.json();
        }

        if (toolName === 'getRentalSurgeDays') {
            const { month } = args;
            const res = await fetch(`http://analytics-service:8003/analytics/surge-days?month=${month}`);
            if (!res.ok) return { error: `Failed to fetch data: ${res.status}` };
            return await res.json();
        }
    } catch (e) {
        return { error: `Service unreachable: ${e.message}` };
    }
    
    return { error: `Unknown tool: ${toolName}` };
}

// 3. Tool Declarations for Gemini
const tools = [
    {
        functionDeclarations: [
            {
                name: "getMostRentedCategory",
                description: "Get the most rented categories or category statistics.",
                parameters: {
                    type: "OBJECT",
                    properties: {},
                }
            },
            {
                name: "getProductAvailability",
                description: "Get product availability for a specific date range.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        productId: { type: "INTEGER", description: "The product ID" },
                        from: { type: "STRING", description: "Start date YYYY-MM-DD" },
                        to: { type: "STRING", description: "End date YYYY-MM-DD" }
                    },
                    required: ["productId", "from", "to"]
                }
            },
            {
                name: "getTrendingProducts",
                description: "Get trending or recommended products for a given date.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        date: { type: "STRING", description: "Date YYYY-MM-DD. Use the date explicitly requested or '2024-06-15' as fallback." },
                        limit: { type: "INTEGER", description: "Limit of products, e.g. 5" }
                    },
                    required: ["date", "limit"]
                }
            },
            {
                name: "getPeakRentalPeriod",
                description: "Get the peak rental period (most busy 7 days) within a month range.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        from: { type: "STRING", description: "Start month YYYY-MM" },
                        to: { type: "STRING", description: "End month YYYY-MM" }
                    },
                    required: ["from", "to"]
                }
            },
            {
                name: "getRentalSurgeDays",
                description: "Get the rental surge days for a given month.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        month: { type: "STRING", description: "Target month YYYY-MM" }
                    },
                    required: ["month"]
                }
            }
        ]
    }
];

class ChatController {
    async handleChat(req, res) {
        try {
            const { sessionId, message } = req.body;
            
            if (!sessionId || !message) {
                return res.status(400).json({ error: "sessionId and message are required" });
            }

            // 1. Topic Guard
            if (!isRentPiRelated(message)) {
                return res.json({ 
                    sessionId, 
                    reply: "I can only assist with RentPi platform questions regarding rentals, products, categories, pricing, and availability." 
                });
            }

            const model = genAI.getGenerativeModel({ 
                model: "gemini-flash-latest",
                systemInstruction: "You are RentPi Assistant. You help users with rentals. Use the provided tools to fetch live data to answer questions. If the tool returns an error or empty data, you must explicitly say you do not have the data or it is unavailable. Do NOT invent numbers or hallucinate.",
                tools: tools
            });

            // Retrieve or create session
            let session = await Session.findOne({ sessionId });
            if (!session) {
                const nameModel = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
                try {
                    const nameResult = await nameModel.generateContent(`Given this first user message, reply with ONLY a short 3-5 word title for this conversation. No punctuation.\n\nMessage: ${message}`);
                    const name = nameResult.response.text().trim();
                    session = new Session({ sessionId, name });
                    await session.save();
                } catch(e) {
                    session = new Session({ sessionId, name: "New Conversation" });
                    await session.save();
                }
            }

            // Load message history for Gemini
            const previousMessages = await Message.find({ sessionId }).sort({ timestamp: 1 });
            const history = previousMessages.map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }]
            }));

            // Start chat session with history
            const chat = model.startChat({ history });

            // Send message and get initial response
            let result = await chat.sendMessage(message);
            const call = result.response.functionCalls() && result.response.functionCalls()[0];

            // Handle tool calling if requested by the LLM
            if (call) {
                const toolName = call.name;
                const args = call.args;

                // 2. Data Grounding (Execute internal API)
                const apiResult = await fetchData(toolName, args);

                // 3. Send the result back to Gemini to get the final grounded answer
                result = await chat.sendMessage([{
                    functionResponse: {
                        name: toolName,
                        response: apiResult
                    }
                }]);
            }

            const replyText = result.response.text() || "Sorry, I couldn't generate a response.";

            // Save messages to DB
            await Message.create({ sessionId, role: 'user', content: message });
            await Message.create({ sessionId, role: 'assistant', content: replyText });

            // Update session lastMessageAt
            session.lastMessageAt = new Date();
            await session.save();

            // Return the final LLM text
            return res.status(200).json({
                sessionId,
                reply: replyText
            });

        } catch (error) {
            console.error("Agentic Service Error:", error);
            return res.status(500).json({ error: "Internal server error in AI generation." });
        }
    }

    async getSessions(req, res) {
        try {
            const sessions = await Session.find().sort({ lastMessageAt: -1 }).select('-_id sessionId name lastMessageAt');
            return res.json({ sessions });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: "Internal server error." });
        }
    }

    async getHistory(req, res) {
        try {
            const { sessionId } = req.params;
            const session = await Session.findOne({ sessionId });
            if (!session) return res.status(404).json({ error: "Session not found" });
            const messages = await Message.find({ sessionId }).sort({ timestamp: 1 }).select('-_id role content timestamp');
            return res.json({
                sessionId: session.sessionId,
                name: session.name,
                messages
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: "Internal server error." });
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
            return res.status(500).json({ error: "Internal server error." });
        }
    }
}

module.exports = new ChatController();
