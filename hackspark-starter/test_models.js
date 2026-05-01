require("dotenv").config({ path: ".env" });
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function testModel(modelName) {
    try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("hello");
        console.log(`${modelName}: SUCCESS`);
    } catch (e) {
        console.log(`${modelName}: FAILED - ${e.message.split('\n')[0]}`);
    }
}

async function run() {
    await testModel("gemini-1.5-flash-latest");
    await testModel("gemini-1.5-flash-8b");
    await testModel("gemini-1.5-pro-latest");
    await testModel("gemini-1.0-pro");
}

run();
