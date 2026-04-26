const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const fs = require('fs');
const gTTS = require('gtts');

// 🔐 ENV VARIABLES (Render)
const TOKEN = 8608903561:AAGAKizi5TB3JK3v-UZUsHo9guTzedk5Rmw;
const OPENROUTER_API_KEY = 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;

// 🤖 Bot setup
const bot = new TelegramBot(TOKEN, { polling: true });

// 🧠 Personality
const SYSTEM_PROMPT = `
You are CharlesGPT🤖 Ai.

Tone:
- Smart, calm, confident (campus vibe)
- Human-like, not robotic

Style:
- Short, clear, engaging
- Simple English
- Friendly + slightly casual

Behavior:
- Match user vibe
- Ask follow-up questions sometimes
- Explain simply

Goal:
Feel like a real intelligent friend.
`;

// 🧠 Memory
const MEMORY_FILE = 'memory.json';
let memory = {};

if (fs.existsSync(MEMORY_FILE)) {
    memory = JSON.parse(fs.readFileSync(MEMORY_FILE));
}

// 🚀 Start command
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, "Yo 👋 I'm CharlesGPT🤖 Ai.\n\nUse:\n/image prompt → generate image\nOr just chat with me.");
});

// 🖼️ IMAGE GENERATION
bot.onText(/\/image (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const prompt = match[1];

    bot.sendMessage(chatId, "🎨 Creating image...");

    try {
        const res = await axios.post(
            "https://openrouter.ai/api/v1/images/generations",
            {
                model: "stabilityai/stable-diffusion-xl",
                prompt: prompt,
                size: "1024x1024"
            },
            {
                headers: {
                    "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json"
                }
            }
        );

        const imageUrl = res.data.data[0].url;

        await bot.sendPhoto(chatId, imageUrl, {
            caption: `🖼️ Prompt: ${prompt}`
        });

    } catch (err) {
        console.log("IMAGE ERROR:", err.response?.data || err.message);
        bot.sendMessage(chatId, "⚠️ Failed to generate image.");
    }
});

// 💬 CHAT HANDLER
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text || text.startsWith('/')) return;

    if (!memory[chatId]) memory[chatId] = [];

    memory[chatId].push({ role: "user", content: text });
    memory[chatId] = memory[chatId].slice(-6);

    try {
        const res = await axios.post(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                model: "mistralai/mistral-7b-instruct",
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    ...memory[chatId]
                ]
            },
            {
                headers: {
                    "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json"
                }
            }
        );

        const reply = res.data.choices[0].message.content;

        memory[chatId].push({ role: "assistant", content: reply });
        fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2));

        // 📩 Send text
        await bot.sendMessage(chatId, reply);

        // 🎤 Voice reply
        const filePath = `voice_${chatId}.mp3`;
        const tts = new gTTS(reply, 'en');

        tts.save(filePath, async function () {
            await bot.sendVoice(chatId, filePath);
            fs.unlinkSync(filePath);
        });

    } catch (err) {
        console.log("CHAT ERROR:", err.response?.data || err.message);
        bot.sendMessage(chatId, "⚠️ AI error. Check logs.");
    }
});

// ✅ Running log
console.log("CharlesGPT🤖 is running...");
