const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const fs = require('fs');
const gTTS = require('gtts');

// 🔐 Load from environment (for Render) or fallback (for Termux)
const TOKEN = process.env.TOKEN || "8608903561:AAGAKizi5TB3JK3v-UZUsHo9guTzedk5Rmw";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "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";

// 🤖 Create bot
const bot = new TelegramBot(TOKEN, { polling: true });

// 🧠 Personality
const SYSTEM_PROMPT = `
You are CharlesGPT🤖 Ai.

Tone:
- Smart, calm, confident (campus vibe)
- Sounds human, not robotic

Style:
- Short, clear, engaging replies
- Simple English
- Slightly casual + friendly
- Use small emojis sometimes

Behavior:
- Match user's tone
- Ask follow-up questions occasionally
- Explain simply when needed

Goal:
Make conversations feel real and natural.
`;

// 🧠 Memory setup
const MEMORY_FILE = 'memory.json';
let memory = {};

// Load memory file
if (fs.existsSync(MEMORY_FILE)) {
    memory = JSON.parse(fs.readFileSync(MEMORY_FILE));
}

// 🚀 Start command
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, "Yo 👋 I'm CharlesGPT🤖 Ai. Talk to me.");
});

// 💬 Main message handler
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text || text.startsWith('/start')) return;

    // Create memory for user
    if (!memory[chatId]) {
        memory[chatId] = [];
    }

    // Save user message
    memory[chatId].push({ role: "user", content: text });

    // Limit memory (last 6 messages)
    memory[chatId] = memory[chatId].slice(-6);

    try {
        const res = await axios.post(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                model: "openai/gpt-3.5-turbo",
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    ...memory[chatId]
                ]
            },
            {
                headers: {
                    "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://localhost",
                    "X-Title": "CharlesGPT Bot"
                }
            }
        );

        const reply = res.data.choices[0].message.content;

        // Save bot reply
        memory[chatId].push({ role: "assistant", content: reply });

        // Save memory to file
        fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2));

        // ✅ Send text reply
        await bot.sendMessage(chatId, reply);

        // 🎤 Voice reply
        const filePath = `voice_${chatId}.mp3`;
        const tts = new gTTS(reply, 'en');

        tts.save(filePath, async function () {
            await bot.sendVoice(chatId, filePath);

            // Delete file after sending
            fs.unlinkSync(filePath);
        });

    } catch (err) {
        console.log("ERROR:", err.response?.data || err.message);
        bot.sendMessage(chatId, "⚠️ AI error, try again.");
    }
});

// ✅ Log
console.log("CharlesGPT🤖 is running...");
