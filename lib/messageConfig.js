import { NEWSLETTER_CHANNEL, NEWSLETTER_JID, NEWSLETTER_NAME, SERVER_MESSAGE_ID } from './channelConfig.js';

export const channelInfo = {
  contextInfo: {
    forwardingScore: 999,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
      newsletterJid: NEWSLETTER_JID,
      newsletterName: NEWSLETTER_NAME,
      serverMessageId: SERVER_MESSAGE_ID
    }
  }
};

export async function messageHandler(msg, sock) {
    try {
        const messageType = Object.keys(msg.message || {})[0];
        
        if (messageType === 'protocolMessage') {
            return;
        }

        let body = '';
        switch (messageType) {
            case 'conversation':
                body = msg.message.conversation;
                break;
            case 'extendedTextMessage':
                body = msg.message.extendedTextMessage.text;
                break;
            case 'imageMessage':
                body = msg.message.imageMessage.caption || '';
                break;
            case 'videoMessage':
                body = msg.message.videoMessage.caption || '';
                break;
            case 'stickerMessage':
                body = '';
                break;
            default:
                body = '';
        }

        const isGroup = msg.key.remoteJid && (msg.key.remoteJid.endsWith('@g.us') || msg.key.remoteJid.toString().includes('group'));
        const senderJid = isGroup ? msg.key.participant : msg.key.remoteJid;
        
        if (body) {
            console.log(`[MESSAGE] ${isGroup ? 'GROUP' : 'DM'} - ${senderJid}: ${body}`);
        }

        return true;
    } catch (error) {
        console.error('Error in messageHandler:', error);
        return false;
    }
}

export default { 
  messageHandler,
  NEWSLETTER_CHANNEL,
  channelInfo
};
