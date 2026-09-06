const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys");
const pino = require('pino');
const axios = require('axios');
const cron = require("node-cron");

// নতুন গুগল শিটের আইডি
const SPREADSHEET_ID = '15dv3JFmGykNo-GP1vxDr7j4Zy0oYwIcDIzKHp-FqNUc';

// নির্ধারিত হোয়াটসঅ্যাপ নম্বর (পেয়ারিং কোডের জন্য)
const TARGET_PHONE_NUMBER = '8801884913535';

// প্রধান গ্রুপের আইডি (যে গ্রুপে প্রতি ১০ মিনিট পর পর নোটিশ যাবে)
const PRIMARY_GROUP_ID = '120363303388070671@g.us';

// সুপার-ফাস্ট ক্যাশিং ভেরিয়েবল
let cachedRows = null;
let lastFetchTime = 0;
const CACHE_TTL = 120000; // ২ মিনিট ক্যাশ ভ্যালিড থাকবে

// যেকোনো ফরম্যাটের ফোন নাম্বারকে এক সমতায় নিয়ে আসার হেল্পার ফাংশন
function normalizePhoneNumber(phoneStr) {
    if (!phoneStr) return '';
    return phoneStr.toString().replace(/[^0-9]/g, '').replace(/^88/, '').replace(/^0/, '');
}

// সুপার-ফাস্ট গুগল শিট ডাটা ক্যাশিং ফাংশন
async function getSheetRows() {
    const now = Date.now();
    if (cachedRows && (now - lastFetchTime < CACHE_TTL)) {
        return cachedRows; // ইনস্ট্যান্ট ক্যাশ থেকে রিটার্ন করবে (০ সেকেন্ড ল্যাগ)
    }

    try {
        const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&cacheBust=${now}`;
        const response = await axios.get(url, { timeout: 5000 });
        cachedRows = response.data.split('\n').map(row => row.split(',').map(cell => cell.trim().replace(/^"|"$/g, '')));
        lastFetchTime = now;
        return cachedRows;
    } catch (error) {
        console.error('গুগল শিট ফেচ করতে সমস্যা হয়েছে:', error.message);
        return cachedRows || []; // ফেল করলে পুরনো ক্যাশ ডাটা ব্যাকআপ হিসেবে ব্যবহার করবে
    }
}

// সুপার-ফাস্ট পেমেন্ট চেক ফাংশন
async function checkUserPaymentStatus(userPhone) {
    try {
        const rows = await getSheetRows();
        const cleanUserPhone = normalizePhoneNumber(userPhone);

        for (let i = 1; i < rows.length; i++) {
            let row = rows[i];
            if (row.length >= 3) {
                let name = row[1];       
                let rawPhone = row[2];     
                let cleanSheetPhone = normalizePhoneNumber(rawPhone);

                if (cleanSheetPhone && cleanSheetPhone === cleanUserPhone) {
                    let isPaid = true;
                    for (let j = 3; j < row.length; j++) {
                        let cellValue = row[j] ? row[j].toLowerCase() : '';
                        if (cellValue.includes('unpaid') || cellValue === '') {
                            isPaid = false;
                            break;
                        }
                    }
                    return { found: true, name: name, isPaid: isPaid };
                }
            }
        }
        return { found: false };
    } catch (error) {
        return { found: false };
    }
}

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state,
        syncFullHistory: false
    });

    if (!sock.authState.creds.registered) {
        let phoneNumber = TARGET_PHONE_NUMBER.replace(/[^0-9]/g, '');
        console.log(`পেয়ারিং কোডের জন্য রিকোয়েস্ট পাঠানো হচ্ছে: ${phoneNumber}`);
        
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(phoneNumber);
                console.log(`আপনার পেয়ারিং কোডটি হলো: ${code}`);
            } catch (err) {
                console.log('পেয়ারিং কোড নিতে সমস্যা হয়েছে:', err.message);
            }
        }, 4000);
    }

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) connectToWhatsApp();
        } else if (connection === 'open') {
            console.log('হোয়াটসঅ্যাপ সুপার-ফাস্ট মোডে কানেক্ট হয়েছে!');

            // প্রতি ১০ মিনিট পর পর নোটিশ পাঠানোর শিডিউল
            cron.schedule('*/10 * * * *', async () => {
                try {
                    const metadata = await sock.groupMetadata(PRIMARY_GROUP_ID);
                    const participants = metadata.participants.map(p => p.id);

                    const noticeText = `*⚠️ গুরুত্বপূর্ণ নোটিশ*\n\n*আসসালামু আলাইকুম.*\n*"ডিফেন্স সেল বাজার" গ্রুপের রিজার্ভ ফান্ডের জন্য নতুন-পুরাতন সকল সদস্যকে ৩ মাসের জন্য ৫০ টাকা প্রদান করতে হবে.*\n\n*📅 সেপ্টেম্বর • অক্টোবর • নভেম্বর*\n\n\`বি:দ্র: ১ বছরে ১৫০৳ যারা পারেন মাসিক চার্জ ক্লিয়ার করেন\` \n\n* _👉*মানি একচেঞ্জ গ্রুপের সদস্যদের এই ডিসকাউন্ট গ্রহনযোগ্য নয়*_\n\n*💳 বিকাশ/রকেট/নগদ/সেলফিন:*\n*👉 01896299765*\n\n*📸 টাকা পাঠিয়ে শেষের নাম্বার ও স্ক্রিনশট শুধুমাত্র নিচের* *WhatsApp-এ দিন: (https://wa.me/8801950007415)*\n\n*গ্রুপের উন্নয়নের স্বার্থে সবার সহযোগিতা কাম্য। 🤝*`;

                    await sock.sendMessage(PRIMARY_GROUP_ID, { text: noticeText, mentions: participants });
                } catch (error) {}
            }, { timezone: "Asia/Dhaka" });
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // সুপার-ফাস্ট রিয়েল-টাইম মেসেজ হ্যান্ডলার
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe || msg.key.remoteJid === 'status@broadcast') return;

        const senderId = msg.key.remoteJid; 
        const isGroup = senderId.endsWith('@g.us');
        
        // ১. ইনবক্স ওয়েলকাম মেসেজ (ইনস্ট্যান্ট)
        if (!isGroup) {
            let welcomeMessage = `আসসালামু আলাইকুম ওয়া রাহমাতুল্লাহ! 🌹\n\n*𝐌𝐄𝐑𝐀𝐉𝐔𝐋 𝐇𝐀𝐐𝐔𝐄*\nAdmin, Defence Sell Bazar\n\nআপনার ইনবক্সে স্বাগতম! বলুন, আপনাকে কীভাবে সাহায্য করতে পারি?`;
            await sock.sendMessage(senderId, { text: welcomeMessage }, { quoted: msg }).catch(() => {});
            return;
        }

        // ২. গ্রুপ পেমেন্ট চেকিং (সুপার-ফাস্ট ব্যাকগ্রাউন্ড প্রসেসিং)
        const currentDate = new Date();
        const month = currentDate.getMonth() + 1; 
        const dayOfMonth = currentDate.getDate(); 
        const targetMonths = [3, 6, 9, 12]; 

        if (targetMonths.includes(month) && dayOfMonth >= 10) {
            const participant = msg.key.participant || msg.participant;
            if (participant) {
                let userPhone = participant.split('@')[0];
                
                // ব্যাকগ্রাউন্ডে সুপার-ফাস্ট স্ট্যাটাস যাচাই
                checkUserPaymentStatus(userPhone).then(async (checkStatus) => {
                    if (checkStatus.found && !checkStatus.isPaid) {
                        let userJid = `${userPhone}@s.whatsapp.net`;
                        let userName = checkStatus.name || userPhone;

                        // একসাথে ডিলিট ও ওয়ার্নিং রিকোয়েস্ট ফায়ার করা (৩ সেকেন্ডের মধ্যে কার্যকর হবে)
                        await Promise.all([
                            sock.sendMessage(senderId, { delete: msg.key }).catch(() => {}),
                            sock.sendMessage(senderId, { 
                                text: `⚠️ @${userPhone} (${userName})\n\nআপনার মাসিক চার্জ ক্লিয়ার করা নাই! দয়া করে দ্রুত আপনার মাসিক চার্জ ক্লিয়ার করুন, অন্যথায় গ্রুপ থেকে রিমোভ করা হবে।`, 
                                mentions: [userJid] 
                            }).catch(() => {}),
                            sock.sendMessage(userJid, { 
                                text: `হ্যালো ${userName},\n\nআপনার চলতি মাসের চার্জ ক্লিয়ার করা নাই। গ্রুপে আপনার মেসেজ সেবা সাময়িকভাবে বন্ধ রাখা হয়েছে। দয়া করে দ্রুত পেমেন্ট ক্লিয়ার করুন, অন্যথায় গ্রুপ থেকে রিমোভ করা হতে পারে। ধন্যবাদ!` 
                            }).catch(() => {})
                        ]);
                    }
                });
            }
        }
    });
}

connectToWhatsApp();

