require("dotenv").config({ path: "../.env" });
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function run() {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
        const result = await model.generateContent("hello");
        console.log(`gemini-flash-latest: SUCCESS - ${result.response.text()}`);
    } catch (e) {
        console.log(`gemini-flash-latest: FAILED - ${e.message.split('\n')[0]}`);
    }
}

run();
