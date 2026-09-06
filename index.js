const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const pino = require('pino');

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' })
    });

    sock.ev.on('creds.update', saveCreds);

    if (!sock.authState.creds.registered) {
        const phoneNumber = "88017XXXXXXXXX"; // এখানে আপনার হোয়াটসঅ্যাপ নম্বরটি লিখবেন
        setTimeout(async () => {
            let code = await sock.requestPairingCode(phoneNumber);
            console.log(`আপনার পেয়ারিং কোড হলো: ${code}`);
        }, 3000);
    }
}

startBot();
