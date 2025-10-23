import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

// Load emojis
const emojisPath = path.join(process.cwd(), 'data', 'emojis.json');
const emojis = JSON.parse(fs.readFileSync(emojisPath, 'utf8'));

export default {
  name: "hentaivid",
  description: "Sends a random NSFW hentai video (group only).",
  category: "NSFW",

  async execute(msg, { sock: zk }) {
    const dest = msg.key.remoteJid;
    const isGroup = dest.toString().includes('@g.us') || dest.toString().startsWith('-');

    if (!isGroup) {
      await zk.sendMessage(dest, {
        text: `${emojis.error} This command can only be used in group chats.`,
      }, { quoted: msg });
      return;
    }

    try {
      await zk.sendMessage(dest, {
        react: { text: emojis.processing, key: msg.key }
      });

      const videos = await fetchHentaiVideos();
      // The index was previously fixed to 10, now it's random within the min of videos.length and 10
      const index = Math.floor(Math.random() * Math.min(videos.length, 10));
      const selected = videos[index];
      const videoUrl = selected.video_1 || selected.video_2;
      const caption = `*Title:* ${selected.title}\n*Category:* ${selected.category}`;
      const chatId = parseInt(dest) || dest;

      await zk.sendVideo(chatId, videoUrl, {
        caption: caption
      });

      await zk.sendMessage(dest, {
        react: { text: emojis.success, key: msg.key }
      });

    } catch (error) {
      console.error("Hentai video fetch error:", error); // Log the error for debugging
      await zk.sendMessage(dest, {
        text: `${emojis.error} Failed to fetch hentai video.\n\nError: ${error.message}`,
      }, { quoted: msg });
    }
  }
};

async function fetchHentaiVideos() {
  return new Promise((resolve, reject) => {
    // Increased the range of pages to fetch from, to get more variety
    const page = Math.floor(Math.random() * 1153) + 1; // Ensure page number is at least 1
    axios.get(`https://sfmcompile.club/page/${page}`)
      .then((response) => {
        const $ = cheerio.load(response.data);
        const results = [];

        $('#primary > div > div > ul > li > article').each((i, el) => {
          const title = $(el).find('header > h2').text();
          const link = $(el).find('header > h2 > a').attr('href');
          const category = $(el).find('header > div.entry-before-title > span > span').text().replace('in ', '');
          const share_count = $(el).find('header > div.entry-after-title > p > span.entry-shares').text();
          const views_count = $(el).find('header > div.entry-after-title > p > span.entry-views').text();
          const type = $(el).find('source').attr('type') || 'video/mp4';
          const video_1 = $(el).find('source').attr('src') || $(el).find('img').attr('data-src');
          const video_2 = $(el).find('video > a').attr('href') || '';

          // Ensure we have a valid video URL before pushing
          if (video_1 || video_2) {
            results.push({
              title,
              link,
              category,
              share_count,
              views_count,
              type,
              video_1: video_1 || '', // Default to empty string if not found
              video_2: video_2 || ''
            });
          }
        });

        if (results.length === 0) {
          // If no results, try fetching again or reject with a specific error
          reject(new Error('No hentai videos found on the fetched page.'));
        } else {
          resolve(results);
        }
      })
      .catch(reject);
  });
}