import axios from 'axios';
import fs from 'fs';
import path from 'path';

export async function downloadTelegramMedia(bot, msg, fileId) {
  try {
    if (!fileId) {
      console.error('[DOWNLOAD] No file ID provided');
      return null;
    }

    const file = await bot.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${bot.token}/${file.file_path}`;
    
    const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
    return Buffer.from(response.data);
  } catch (error) {
    console.error('[DOWNLOAD] Error downloading media:', error.message);
    return null;
  }
}

export async function downloadReplyMedia(bot, msg) {
  try {
    if (!msg.reply_to_message) {
      console.error('[DOWNLOAD] No reply message found');
      return null;
    }

    const replyMsg = msg.reply_to_message;
    let fileId = null;

    if (replyMsg.photo && replyMsg.photo.length > 0) {
      fileId = replyMsg.photo[replyMsg.photo.length - 1].file_id;
    } else if (replyMsg.document) {
      fileId = replyMsg.document.file_id;
    } else if (replyMsg.sticker) {
      fileId = replyMsg.sticker.file_id;
    } else if (replyMsg.audio) {
      fileId = replyMsg.audio.file_id;
    } else if (replyMsg.voice) {
      fileId = replyMsg.voice.file_id;
    } else if (replyMsg.video) {
      fileId = replyMsg.video.file_id;
    } else if (replyMsg.video_note) {
      fileId = replyMsg.video_note.file_id;
    }

    if (!fileId) {
      console.error('[DOWNLOAD] No media found in reply');
      return null;
    }

    return await downloadTelegramMedia(bot, msg, fileId);
  } catch (error) {
    console.error('[DOWNLOAD] Error in downloadReplyMedia:', error.message);
    return null;
  }
}

export async function downloadMediaFromMessage(bot, msg) {
  try {
    let fileId = null;

    if (msg.photo && msg.photo.length > 0) {
      fileId = msg.photo[msg.photo.length - 1].file_id;
    } else if (msg.document) {
      fileId = msg.document.file_id;
    } else if (msg.sticker) {
      fileId = msg.sticker.file_id;
    } else if (msg.audio) {
      fileId = msg.audio.file_id;
    } else if (msg.voice) {
      fileId = msg.voice.file_id;
    } else if (msg.video) {
      fileId = msg.video.file_id;
    } else if (msg.video_note) {
      fileId = msg.video_note.file_id;
    }

    if (!fileId) {
      console.error('[DOWNLOAD] No media found in message');
      return null;
    }

    return await downloadTelegramMedia(bot, msg, fileId);
  } catch (error) {
    console.error('[DOWNLOAD] Error in downloadMediaFromMessage:', error.message);
    return null;
  }
}
