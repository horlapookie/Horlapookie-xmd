import { horla } from '../lib/horla.js';
import OpenAI from 'openai';
import config from '../config.js';

const openai = new OpenAI({
  apiKey: config.openaiApiKey,
});

export default horla({
  nomCom: "ai2",
  aliases: ["chatgpt2", "gpt2"],
  reaction: "🤖",
  categorie: "AI"
}, async (msg, { sock, args, settings, bot }) => {
  const from = msg.key.remoteJid;

  if (!args || args.length === 0) {
    const text = "❌ Please provide a question for AI.\n\nExample: /ai2 What is the weather like?";
    if (bot) {
      return await bot.sendMessage(parseInt(from), text);
    }
    return await sock.sendMessage(from, { text }, { quoted: msg });
  }

  // Check if OpenAI API key is available
  if (!config.openaiApiKey) {
    return repondre('❌ OpenAI API key is not configured. Please contact admin.');
  }

  try {
    const prompt = args.join(' ');
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
    });

    const answer = response.choices[0].message.content;
    const responseText = `🤖 *AI2 Response:*\n\n${answer}`;
    
    if (bot) {
      await bot.sendMessage(parseInt(from), responseText, { parse_mode: 'Markdown' });
    } else {
      await sock.sendMessage(from, { text: responseText }, { quoted: msg });
    }

  } catch (error) {
    console.error('[ai2] OpenAI error:', error);
    
    let errorMessage = '❌ Sorry, something went wrong with the AI. Please try again later.';
    
    if (error.status === 401) {
      errorMessage = '❌ AI service is not properly configured. Please contact admin.';
    } else if (error.status === 429) {
      errorMessage = '❌ AI service is busy. Please try again in a few minutes.';
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      errorMessage = '❌ AI service is currently unavailable. Please try again later.';
    }
    
    if (bot) {
      await bot.sendMessage(parseInt(from), errorMessage);
    } else {
      await sock.sendMessage(from, { text: errorMessage }, { quoted: msg });
    }
  }
});