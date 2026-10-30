const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');

const pino = require('pino');

async function startBot() {

    const { state, saveCreds } = await useMultiFileAuthState('auth_info');

    const sock = makeWASocket({

        logger: pino({ level: 'silent' }),

        auth: state,

        printQRInTerminal: true

    });

    sock.ev.on('connection.update', (update) => {

        const { connection, lastDisconnect } = update;

        if (connection === 'close') {

            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;

            if (shouldReconnect) {

                startBot();

            }

        } else if (connection === 'open') {

            console.log('Bot Successfully Connected!');

        }

    });

    sock.ev.on('creds.update', saveCreds);

    const messageStore = new Map();

    sock.ev.on('messages.upsert', async ({ messages, type }) => {

        if (type !== 'notify') return;

        const msg = messages[0];

        if (!msg.message) return;

        messageStore.set(msg.key.id, msg);

        // Anti-View Once Logic

        const isViewOnce = msg.message.viewOnceMessage || msg.message.viewOnceMessageV2;

        if (isViewOnce) {

            try {

                const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';

                await sock.sendMessage(botNumber, { 

                    text: `👀 **Anti-View Once Detected!**\n\n*Powered with Chathu-MD*` 

                });

                await sock.sendMessage(botNumber, { forward: msg });

            } catch (err) {

                console.log('Error handling view once:', err);

            }

        }

    });

    // Anti-Delete Logic

    sock.ev.on('messages.update', async (updates) => {

        for (const update of updates) {

            if (update.update.message === null || update.update.edit) {

                const deletedMsgId = update.key.id;

                const originalMsg = messageStore.get(deletedMsgId);

                if (originalMsg) {

                    const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';

                    await sock.sendMessage(botNumber, { 

                        text: `⚠️ **Anti-Delete Alert!**\nකෙනෙක් මැසේජ් එකක් ඩිලීට් කළා.\n\n*Powered with Chathu-MD*` 

                    });

                    await sock.sendMessage(botNumber, { forward: originalMsg });

                }

            }

        }

    });

}

startBot();
 
