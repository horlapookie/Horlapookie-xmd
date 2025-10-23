export default {
  name: 'screenshot',
  aliases: ['ss', 'sshot'],
  description: 'Take a full page screenshot of a website',
  async execute(msg, { sock, args }) {
    const dest = msg.key.remoteJid;
    const from = msg.key.remoteJid; // Use 'from' for message destination in Telegram context
    const bot = sock; // Assuming 'sock' is the bot instance for sending messages

    if (!args[0]) {
      return await sock.sendMessage(dest, {
        text: '❌ Please insert a website link to take a screenshot!\n\nExample: ?screenshot https://google.com'
      }, { quoted: msg });
    }

    try {
      const url = args[0];
      const screenshotUrl = `https://image.thum.io/get/fullpage/${url}`;

      // Send the image - download first for Telegram compatibility
      try {
        const axios = (await import('axios')).default;
        const imageResponse = await axios.get(screenshotUrl, { responseType: 'arraybuffer' });
        const imageBuffer = Buffer.from(imageResponse.data);

        await bot.sendMessage(from, {
          image: { url: screenshotUrl }, // Telegram requires a URL for image sending
          caption: `📸 Screenshot of: ${url}`
        }, { quoted: msg });
      } catch (imgError) {
        // Fallback to URL if buffer fails or if direct URL sending is preferred/necessary
        await bot.sendMessage(from, {
          image: { url: screenshotUrl },
          caption: `📸 Screenshot of: ${url}`
        }, { quoted: msg });
      }

    } catch (error) {
      console.error('Screenshot error:', error);
      await sock.sendMessage(dest, {
        text: `❌ An error occurred while processing the screenshot: ${error.message}`
      }, { quoted: msg });
    }
  }
};