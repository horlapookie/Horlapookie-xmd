export default {
  name: 'welcome',
  description: 'Configure welcome and goodbye messages for the group',
  aliases: ['setwelcome', 'welcomeconfig'],
  async execute(msg, { sock, bot, args, settings }) {
    const from = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;

    // Check if Telegram bot
    if (bot) {
      try {
        const chatId = parseInt(from);
        const chat = await bot.getChat(chatId);
        
        // Check if it's a group
        if (chat.type !== 'group' && chat.type !== 'supergroup') {
          return await bot.sendMessage(chatId, '❌ This command only works in groups!');
        }

        // Check if sender is admin
        const admins = await bot.getChatAdministrators(chatId);
        const senderId = msg.key.participant;
        // Normalize sender ID (remove @telegram suffix if present)
        const normalizedSenderId = parseInt(senderId.split('@')[0]);
        const isAdmin = admins.some(admin => admin.user.id === normalizedSenderId);
        
        if (!isAdmin) {
          return await bot.sendMessage(chatId, '❌ Only group admins can configure welcome messages!');
        }

        const fs = await import('fs');
        const path = await import('path');
        const dataDir = path.default.join(process.cwd(), 'data');
        const welcomeConfigPath = path.default.join(dataDir, 'welcomeConfig.json');
        
        if (!fs.default.existsSync(dataDir)) {
          fs.default.mkdirSync(dataDir, { recursive: true });
        }
        
        let welcomeConfig = {};
        if (fs.default.existsSync(welcomeConfigPath)) {
          welcomeConfig = JSON.parse(fs.default.readFileSync(welcomeConfigPath, 'utf8'));
        }

        if (!welcomeConfig[from]) {
          welcomeConfig[from] = {
            enabled: false,
            welcomeMessage: '🎉 Welcome @user to *@group*!\n\n📝 *Group Description:*\n@desc\n\n👥 You are member #@count',
            goodbyeMessage: '👋 @user left *@group*\n\n😢 We will miss you!\n\n👥 Now we have @count members'
          };
        }

        const prefix = settings?.prefix || '/';

        if (!args[0]) {
          const helpText = `🎊 *Welcome Configuration*

*Usage:*
• \`${prefix}welcome on\` - Enable welcome messages
• \`${prefix}welcome off\` - Disable welcome messages  
• \`${prefix}welcome set\` - Set custom messages
• \`${prefix}welcome status\` - Check current settings

*Available placeholders:*
• @user - Mentions the user
• @group - Group name
• @desc - Group description
• @count - Member count`;

          return await bot.sendMessage(chatId, helpText, { parse_mode: 'Markdown' });
        }

        const action = args[0].toLowerCase();
        const memberCount = await bot.getChatMemberCount(chatId);

        switch (action) {
          case 'on':
          case 'enable':
            welcomeConfig[from].enabled = true;
            fs.default.writeFileSync(welcomeConfigPath, JSON.stringify(welcomeConfig, null, 2));
            await bot.sendMessage(chatId, '✅ Welcome messages enabled for this group!');
            break;

          case 'off':
          case 'disable':
            welcomeConfig[from].enabled = false;
            fs.default.writeFileSync(welcomeConfigPath, JSON.stringify(welcomeConfig, null, 2));
            await bot.sendMessage(chatId, '❌ Welcome messages disabled for this group!');
            break;

          case 'set':
            const setHelpText = `📝 *Set Custom Messages*

Reply to this message with your custom welcome message, or type:
• \`${prefix}welcome setwelcome <message>\` - Set welcome message
• \`${prefix}welcome setgoodbye <message>\` - Set goodbye message

*Example:*
\`${prefix}welcome setwelcome 🎉 Hey @user! Welcome to @group! We now have @count members!\`

*Available placeholders:*
• @user - Mentions the user
• @group - Group name  
• @desc - Group description
• @count - Member count`;

            await bot.sendMessage(chatId, setHelpText, { parse_mode: 'Markdown' });
            break;

          case 'setwelcome':
            if (!args[1]) {
              return await bot.sendMessage(chatId, `❌ Please provide a welcome message!\n\nExample: \`${prefix}welcome setwelcome 🎉 Welcome @user to @group!\``, { parse_mode: 'Markdown' });
            }
            
            const welcomeMsg = args.slice(1).join(' ');
            welcomeConfig[from].welcomeMessage = welcomeMsg;
            fs.default.writeFileSync(welcomeConfigPath, JSON.stringify(welcomeConfig, null, 2));
            
            const welcomePreview = welcomeMsg
              .replace('@user', 'NewUser')
              .replace('@group', chat.title)
              .replace('@desc', chat.description || 'No description')
              .replace('@count', memberCount.toString());

            await bot.sendMessage(chatId, `✅ Welcome message updated!\n\n*Preview:*\n${welcomePreview}`, { parse_mode: 'Markdown' });
            break;

          case 'setgoodbye':
            if (!args[1]) {
              return await bot.sendMessage(chatId, `❌ Please provide a goodbye message!\n\nExample: \`${prefix}welcome setgoodbye 👋 Goodbye @user! We will miss you!\``, { parse_mode: 'Markdown' });
            }
            
            const goodbyeMsg = args.slice(1).join(' ');
            welcomeConfig[from].goodbyeMessage = goodbyeMsg;
            fs.default.writeFileSync(welcomeConfigPath, JSON.stringify(welcomeConfig, null, 2));
            
            const goodbyePreview = goodbyeMsg
              .replace('@user', 'ExUser')
              .replace('@group', chat.title)
              .replace('@desc', chat.description || 'No description')
              .replace('@count', memberCount.toString());

            await bot.sendMessage(chatId, `✅ Goodbye message updated!\n\n*Preview:*\n${goodbyePreview}`, { parse_mode: 'Markdown' });
            break;

          case 'status':
          case 'info':
            const config = welcomeConfig[from];
            const statusText = `🎊 *Welcome Configuration for ${chat.title}*

📊 *Status:* ${config.enabled ? '✅ Enabled' : '❌ Disabled'}
👥 *Members:* ${memberCount}

📝 *Welcome Message:*
${config.welcomeMessage}

📝 *Goodbye Message:*  
${config.goodbyeMessage}

💡 *Available Commands:*
• \`${prefix}welcome on/off\` - Toggle messages
• \`${prefix}welcome set\` - Customize messages`;

            await bot.sendMessage(chatId, statusText, { parse_mode: 'Markdown' });
            break;

          default:
            await bot.sendMessage(chatId, `❌ Invalid action! Use \`${prefix}welcome\` to see available options.`, { parse_mode: 'Markdown' });
        }

      } catch (error) {
        console.error('Telegram welcome error:', error);
        await bot.sendMessage(parseInt(from), '❌ Error configuring welcome messages: ' + error.message);
      }
      return;
    }

    // WhatsApp logic
    if (!from.endsWith('@g.us')) {
      return await sock.sendMessage(from, {
        text: '❌ This command only works in groups!'
      }, { quoted: msg });
    }

    try {
      const groupMeta = await sock.groupMetadata(from);
      const senderIsAdmin = groupMeta.participants.find(p => p.id === sender && (p.admin === 'admin' || p.admin === 'superadmin'));
      
      if (!senderIsAdmin) {
        return await sock.sendMessage(from, {
          text: '❌ Only group admins can configure welcome messages!'
        }, { quoted: msg });
      }

      if (!args[0]) {
        return await sock.sendMessage(from, {
          text: `🎊 *Welcome Configuration*

*Usage:*
• \`${settings.prefix}welcome on\` - Enable welcome messages
• \`${settings.prefix}welcome off\` - Disable welcome messages  
• \`${settings.prefix}welcome set\` - Set custom messages
• \`${settings.prefix}welcome status\` - Check current settings

*Available placeholders:*
• @user - Mentions the user
• @group - Group name
• @desc - Group description
• @count - Member count`
        }, { quoted: msg });
      }

      const action = args[0].toLowerCase();

      const fs = await import('fs');
      const path = await import('path');
      const dataDir = path.default.join(process.cwd(), 'data');
      const welcomeConfigPath = path.default.join(dataDir, 'welcomeConfig.json');
      
      if (!fs.default.existsSync(dataDir)) {
        fs.default.mkdirSync(dataDir, { recursive: true });
      }
      
      let welcomeConfig = {};
      if (fs.default.existsSync(welcomeConfigPath)) {
        welcomeConfig = JSON.parse(fs.default.readFileSync(welcomeConfigPath, 'utf8'));
      }

      if (!welcomeConfig[from]) {
        welcomeConfig[from] = {
          enabled: false,
          welcomeMessage: '🎉 Welcome @user to *@group*!\n\n📝 *Group Description:*\n@desc\n\n👥 You are member #@count',
          goodbyeMessage: '👋 @user left *@group*\n\n😢 We will miss you!\n\n👥 Now we have @count members'
        };
      }

      switch (action) {
        case 'on':
        case 'enable':
          welcomeConfig[from].enabled = true;
          fs.default.writeFileSync(welcomeConfigPath, JSON.stringify(welcomeConfig, null, 2));
          await sock.sendMessage(from, {
            text: '✅ Welcome messages enabled for this group!'
          }, { quoted: msg });
          break;

        case 'off':
        case 'disable':
          welcomeConfig[from].enabled = false;
          fs.default.writeFileSync(welcomeConfigPath, JSON.stringify(welcomeConfig, null, 2));
          await sock.sendMessage(from, {
            text: '❌ Welcome messages disabled for this group!'
          }, { quoted: msg });
          break;

        case 'set':
          await sock.sendMessage(from, {
            text: `📝 *Set Custom Messages*

Reply to this message with your custom welcome message, or type:
• \`${settings.prefix}welcome setwelcome <message>\` - Set welcome message
• \`${settings.prefix}welcome setgoodbye <message>\` - Set goodbye message

*Example:*
\`${settings.prefix}welcome setwelcome 🎉 Hey @user! Welcome to @group! We now have @count members!\`

*Available placeholders:*
• @user - Mentions the user
• @group - Group name  
• @desc - Group description
• @count - Member count`
          }, { quoted: msg });
          break;

        case 'setwelcome':
          if (!args[1]) {
            return await sock.sendMessage(from, {
              text: '❌ Please provide a welcome message!\n\nExample: `' + settings.prefix + 'welcome setwelcome 🎉 Welcome @user to @group!`'
            }, { quoted: msg });
          }
          
          const welcomeMsg = args.slice(1).join(' ');
          welcomeConfig[from].welcomeMessage = welcomeMsg;
          fs.default.writeFileSync(welcomeConfigPath, JSON.stringify(welcomeConfig, null, 2));
          
          await sock.sendMessage(from, {
            text: '✅ Welcome message updated!\n\n**Preview:**\n' + welcomeMsg.replace('@user', 'NewUser').replace('@group', groupMeta.subject).replace('@desc', groupMeta.desc || 'No description').replace('@count', groupMeta.participants.length.toString())
          }, { quoted: msg });
          break;

        case 'setgoodbye':
          if (!args[1]) {
            return await sock.sendMessage(from, {
              text: '❌ Please provide a goodbye message!\n\nExample: `' + settings.prefix + 'welcome setgoodbye 👋 Goodbye @user! We will miss you!`'
            }, { quoted: msg });
          }
          
          const goodbyeMsg = args.slice(1).join(' ');
          welcomeConfig[from].goodbyeMessage = goodbyeMsg;
          fs.default.writeFileSync(welcomeConfigPath, JSON.stringify(welcomeConfig, null, 2));
          
          await sock.sendMessage(from, {
            text: '✅ Goodbye message updated!\n\n**Preview:**\n' + goodbyeMsg.replace('@user', 'ExUser').replace('@group', groupMeta.subject).replace('@desc', groupMeta.desc || 'No description').replace('@count', groupMeta.participants.length.toString())
          }, { quoted: msg });
          break;

        case 'status':
        case 'info':
          const config = welcomeConfig[from];
          const statusText = `🎊 *Welcome Configuration for @group*

📊 **Status:** ${config.enabled ? '✅ Enabled' : '❌ Disabled'}
👥 **Members:** ${groupMeta.participants.length}

📝 **Welcome Message:**
${config.welcomeMessage}

📝 **Goodbye Message:**  
${config.goodbyeMessage}

💡 **Available Commands:**
• \`${settings.prefix}welcome on/off\` - Toggle messages
• \`${settings.prefix}welcome set\` - Customize messages`;

          await sock.sendMessage(from, {
            text: statusText.replace('@group', groupMeta.subject)
          }, { quoted: msg });
          break;

        default:
          await sock.sendMessage(from, {
            text: '❌ Invalid action! Use `' + settings.prefix + 'welcome` to see available options.'
          }, { quoted: msg });
      }

    } catch (error) {
      console.error('Welcome command error:', error);
      await sock.sendMessage(from, {
        text: '❌ Error configuring welcome messages: ' + error.message
      }, { quoted: msg });
    }
  }
};
