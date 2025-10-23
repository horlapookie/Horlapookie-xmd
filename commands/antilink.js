
import { setAntilinkSetting, getAntilinkSetting } from '../lib/antilinkSettings.js';
import isAdmin from '../lib/isAdmin.js';
import fs from 'fs';
import path from 'path';

// Simple antilink data store
const antilinkData = {};

function setAntilink(chatId, status, action) {
    if (!antilinkData[chatId]) {
        antilinkData[chatId] = {};
    }
    antilinkData[chatId].enabled = status === 'on';
    antilinkData[chatId].action = action;
    
    // Also update the settings file
    setAntilinkSetting(chatId, action);
    return true;
}

function getAntilink(chatId, status) {
    const stored = antilinkData[chatId];
    if (stored) return stored;
    
    // Check settings file
    const setting = getAntilinkSetting(chatId);
    if (setting !== 'off') {
        return { enabled: true, action: setting };
    }
    return null;
}

function removeAntilink(chatId, status) {
    if (antilinkData[chatId]) {
        delete antilinkData[chatId];
    }
    setAntilinkSetting(chatId, 'off');
    return true;
}

async function handleAntilinkCommand(sock, chatId, userMessage, senderId, isSenderAdmin, bot) {
    try {
        if (!isSenderAdmin) {
            await sock.sendMessage(chatId, { text: '```For Group Admins Only!```' });
            return;
        }

        const prefix = global.COMMAND_PREFIX || '/';
        const args = userMessage.slice(prefix.length + 8).toLowerCase().trim().split(' ');
        const action = args[0];

        if (!action) {
            const usage = `\`\`\`ANTILINK SETUP\n\n${prefix}antilink on\n${prefix}antilink set delete | kick | warn\n${prefix}antilink off\n\`\`\``;
            await sock.sendMessage(chatId, { text: usage });
            return;
        }

        switch (action) {
            case 'on':
                const existingConfig = getAntilink(chatId, 'on');
                if (existingConfig?.enabled) {
                    await sock.sendMessage(chatId, { text: '*_Antilink is already on_*' });
                    return;
                }
                const result = setAntilink(chatId, 'on', 'delete');
                await sock.sendMessage(chatId, { 
                    text: result ? '*_Antilink has been turned ON_*' : '*_Failed to turn on Antilink_*' 
                });
                break;

            case 'off':
                removeAntilink(chatId, 'on');
                await sock.sendMessage(chatId, { text: '*_Antilink has been turned OFF_*' });
                break;

            case 'set':
                if (args.length < 2) {
                    await sock.sendMessage(chatId, { 
                        text: `*_Please specify an action: ${prefix}antilink set delete | kick | warn_*` 
                    });
                    return;
                }
                const setAction = args[1];
                if (!['delete', 'kick', 'warn'].includes(setAction)) {
                    await sock.sendMessage(chatId, { 
                        text: '*_Invalid action. Choose delete, kick, or warn._*' 
                    });
                    return;
                }
                const setResult = setAntilink(chatId, 'on', setAction);
                await sock.sendMessage(chatId, { 
                    text: setResult ? `*_Antilink action set to ${setAction}_*` : '*_Failed to set Antilink action_*' 
                });
                break;

            case 'get':
                const status = getAntilink(chatId, 'on');
                const actionConfig = getAntilink(chatId, 'on');
                await sock.sendMessage(chatId, { 
                    text: `*_Antilink Configuration:_*\nStatus: ${status ? 'ON' : 'OFF'}\nAction: ${actionConfig ? actionConfig.action : 'Not set'}` 
                });
                break;

            default:
                await sock.sendMessage(chatId, { text: `*_Use ${prefix}antilink for usage._*` });
        }
    } catch (error) {
        console.error('Error in antilink command:', error);
        await sock.sendMessage(chatId, { text: '*_Error processing antilink command_*' });
    }
}

async function handleLinkDetection(sock, chatId, message, userMessage, senderId, bot) {
    try {
        const config = getAntilink(chatId, 'on');
        if (!config || !config.enabled) return;

        console.log(`Antilink enabled for ${chatId}: ${config.action}`);
        console.log(`Checking message for links: ${userMessage}`);

        const linkPatterns = [
            /https?:\/\/[^\s]+/gi,                               // HTTP/HTTPS links
            /www\.[^\s]+/gi,                                     // www links
            /chat\.whatsapp\.com\/[A-Za-z0-9]{20,}/gi,          // WhatsApp group links
            /wa\.me\/[+0-9]+/gi,                                // WhatsApp links
            /t\.me\/[A-Za-z0-9_]+/gi,                           // Telegram links
        ];

        const containsLink = linkPatterns.some(pattern => pattern.test(userMessage));

        if (containsLink) {
            console.log(`Link detected in message from ${senderId}`);

            // Check if sender is admin (Telegram)
            if (bot) {
                try {
                    const chatIdNum = parseInt(chatId);
                    const userIdNum = parseInt(senderId);
                    const chatMember = await bot.getChatMember(chatIdNum, userIdNum);
                    const isUserAdmin = chatMember.status === 'administrator' || chatMember.status === 'creator';
                    
                    if (isUserAdmin) {
                        console.log('Sender is admin, skipping antilink action');
                        return;
                    }

                    // Delete the message
                    try {
                        await bot.deleteMessage(chatIdNum, message.key.id);
                        console.log(`Message deleted successfully`);
                    } catch (deleteError) {
                        console.error('Failed to delete message:', deleteError);
                    }

                    const action = config.action || 'delete';
                    const username = chatMember.user.username || chatMember.user.first_name || 'User';

                    switch (action) {
                        case 'kick':
                            try {
                                await bot.banChatMember(chatIdNum, userIdNum);
                                await bot.unbanChatMember(chatIdNum, userIdNum);
                                await sock.sendMessage(chatId, {
                                    text: `🚫 ${username} has been kicked for sending links!`
                                });
                            } catch (kickError) {
                                console.error('Failed to kick user:', kickError);
                                await sock.sendMessage(chatId, {
                                    text: `⚠️ ${username}, links are not allowed here!`
                                });
                            }
                            break;

                        case 'warn':
                            if (!global.antilinkWarnings) global.antilinkWarnings = {};
                            if (!global.antilinkWarnings[chatId]) global.antilinkWarnings[chatId] = {};

                            const warnings = global.antilinkWarnings[chatId][senderId] || 0;
                            const newWarnings = warnings + 1;
                            global.antilinkWarnings[chatId][senderId] = newWarnings;

                            if (newWarnings >= 3) {
                                try {
                                    await bot.banChatMember(chatIdNum, userIdNum);
                                    await bot.unbanChatMember(chatIdNum, userIdNum);
                                    delete global.antilinkWarnings[chatId][senderId];
                                    await sock.sendMessage(chatId, {
                                        text: `🚫 ${username} has been kicked after 3 warnings for sending links!`
                                    });
                                } catch (kickError) {
                                    console.error('Failed to kick user after warnings:', kickError);
                                }
                            } else {
                                await sock.sendMessage(chatId, {
                                    text: `⚠️ ${username} warning ${newWarnings}/3 for sending links!`
                                });
                            }
                            break;

                        default: // 'delete'
                            await sock.sendMessage(chatId, {
                                text: `⚠️ ${username}, links are not allowed in this group!`
                            });
                            break;
                    }
                } catch (error) {
                    console.error('Telegram antilink error:', error);
                }
            }
        }
    } catch (error) {
        console.error('Error in handleLinkDetection:', error);
    }
}

export default {
    name: 'antilink',
    description: 'Configure antilink settings for the group',
    async execute(msg, { sock, bot, args }) {
        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || msg.key.remoteJid;
        const userMessage = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
        
        let isSenderAdmin = false;
        
        // Check if Telegram
        if (bot) {
            try {
                const chatIdNum = parseInt(chatId);
                const userIdNum = parseInt(senderId);
                const chatMember = await bot.getChatMember(chatIdNum, userIdNum);
                isSenderAdmin = chatMember.status === 'administrator' || chatMember.status === 'creator';
            } catch (error) {
                console.error('Admin check error:', error);
            }
        } else {
            const adminCheck = await isAdmin(sock, chatId, senderId);
            isSenderAdmin = adminCheck.isSenderAdmin;
        }
        
        await handleAntilinkCommand(sock, chatId, userMessage, senderId, isSenderAdmin, bot);
    }
};

export {
    handleAntilinkCommand,
    handleLinkDetection,
};
