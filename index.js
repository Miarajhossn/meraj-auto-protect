const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, useSingleFileAuthState } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const axios = require('axios');
const cron = require("node-cron");

// নতুন গুগল শিটের আইডি
const SPREADSHEET_ID = '15dv3JFmGykNo-GP1vxDr7j4Zy0oYwIcDIzKHp-FqNUc';

// নির্ধারিত হোয়াটসঅ্যাপ নম্বর (পেয়ারিং কোডের জন্য)
const TARGET_PHONE_NUMBER = '8801884913535';

// প্রধান গ্রুপের আইডি
const PRIMARY_GROUP_ID = '120363303388070671@g.us';

// সুপার-ফাস্ট ক্যাশিং ভেরিয়েবল
let cachedRows = null;
let lastFetchTime = 0;
const CACHE_TTL = 120000; // ২ মিনিট ক্যাশ ভ্যালিড থাকবে

// যেকোনো ফরম্যাটের ফোন নাম্বারকে এক সমতায় নিয়ে আসার হেল্পার ফাংশন
function normalizePhoneNumber(phoneStr) {
    if (!phoneStr) return '';
    return phoneStr.toString().replace(/[^0-9]/g, '');
}

// গুগল শিট থেকে সুপার-ফাস্ট ডাটা ফেচ করার ফাংশন
async function getSheetRows() {
    const now = Date.now();
    if (cachedRows && (now - lastFetchTime < CACHE_TTL)) {
        return cachedRows; 
    }

    try {
        const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&cacheBust=${now}`;
        const response = await axios.get(url, { timeout: 3000 });
        cachedRows = response.data.split('\n').map(row => row.split(',').map(cell => cell.trim().replace(/^"|"$/g, '')));
        lastFetchTime = now;
        return cachedRows;
    } catch (error) {
        console.error('শিট ফেচ করতে সমস্যা:', error.message);
        return cachedRows || [];
    }
}

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' })
    });

    sock.ev.on('creds.update', saveCreds);

    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(TARGET_PHONE_NUMBER);
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                console.log(`\n========================================`);
                console.log(`🔑 আপনার হোয়াটসঅ্যাপ পেয়ারিং কোড: ${code}`);
                console.log(`========================================\n`);
            } catch (err) {
                console.error('পেয়ারিং কোড জেনারেট করতে সমস্যা হয়েছে:', err.message);
            }
        }, 3000);
    }

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                startBot();
            } else {
                console.log('বট লগআউট হয়ে গেছে। সেশন ফোল্ডার মুছে আবার রান করুন।');
            }
        } else if (connection === 'open') {
            console.log('বট সফলভাবে সংযুক্ত এবং সুপার-ফাস্ট মোডে সচল রয়েছে! ✅');
        }
    });

    // মেসেজ হ্যান্ডলার
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const senderId = msg.key.remoteJid;
        const isGroup = senderId.endsWith('@g.us');
        const incomingText = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        const textLower = incomingText.trim();

        // ১. ইনবক্স চ্যাট হ্যান্ডলার (মেনু, ফরম, যোগাযোগ)
        if (!isGroup) {
            // অপশন ১: গ্রুপে এড হওয়ার তথ্য ও ফরম
            if (textLower === '1' || textLower.includes('গ্রুপে এড') || textLower.includes('গ্রুপ')) {
                let groupInfoMessage = `ডিফেন্স সেল বাজার বাংলাদেশের অন্যতম অনলাইন প্ল্যাটফর্ম, সরকারি কর্মকর্তা দ্বারা পরিচালিত। 🤝\n\nজি অবশ্যই! আমাদের গ্রুপ ২টি:\n\n1️⃣ **১ নং গ্রুপ:**\n* মেম্বার সংখ্যা: ৯০০+\n* এড ফি: ৪০০৳\n\n2️⃣ **২ নং গ্রুপ:**\n* মেম্বার সংখ্যা: ৫০০+\n* এড ফি: ২০০৳\n\n✨ **বিশেষ অফার:** দুই গ্রুপ একসাথে এড হলে মোট এড ফি: **৪৫০৳**\n\n-----------------------------------\n\n*🔥 ডিফেন্স সেল বাজার* 👈 ১০০% ভেরিফাই নিড গ্রুপ এর অফিসিয়াল ফর্ম ✅\n100% ভেরিফাই গ্রুপ এ এড হতে এই ডুকুমেন্ট গুলো লাগবে। \n\n1️⃣। আপনার নামঃ\n2️⃣। আপনার (NID) নাম্বারঃ\n3️⃣। পেশাঃ {বাধ্যতামূলক}\n4️⃣। আপনার ফেইজবুক আইডি লিংক:\n5️⃣। আপনার সচল ৩টি মোবাইল নাম্বার :\n১/ \n২/ \n৩/ \n\n6️⃣। আপনার whatsapp নাম্বারঃ \n\n7️⃣। আপনার বর্তমান ঠিকানা\nগ্রামঃ\nপোঃ\nথানাঃ\nজেলাঃ\n\n8️⃣। আপনার একাউন্ট নাম্বার এবং এগুলো একাউন্টের স্ক্রীনশট দিবেন কার নামে উল্লেখ্য করে দিবেন।\n✅ বিকাশ =\n✅ নগদ =\n✅ রকেট =\n✅ সেলফিন = \n\n9️⃣। পিতার নামঃ\n★★পেশাঃ\n1️⃣0️⃣। পিতার মোবাইল নম্বরঃ\n1️⃣1️⃣। মাতার নামঃ\n1️⃣2️⃣। মাতার মোবাইল নম্বরঃ\n\n1️⃣3️⃣। নিজের ভাই বা বোনের সচল দুইটি নাম্বার \n১/ = (বোন)\n২/ = (ভাই)\n(বাধ্যতামূলক)\n\n1️⃣4️⃣। দুই জন বন্ধুর নাম সহ নাম্বার \n১। \n২।\n\n1️⃣5️⃣। চাচা ও মামা নাম সহ নাম্বার /শ্বশুর _শ্বাশুড়ি \n১।\n২।\n৩।\n\n1️⃣6️⃣। দুইজন প্রতিবেশীর নাম সহ নাম্বার \n১।\n২।\n\n1️⃣7️⃣। যে সকল গ্রুপে এড আছেন একটি স্ক্রিনশট দেন\n\n1️⃣8️⃣। যে কোন একটা ভেরিফাই গ্রুপের এডমিনের নাম সহ নাম্বারঃ\n1️⃣9️⃣। রেফারেন্সকারীর নাম সহ নাম্বারঃ\n\n`ডকুমেন্টস যেগুলো দিবেন`\n🔰🔰 *নিজ এবং বাবা/মা NID/জন্ম সনদ/ বিদ্যুৎ বিলের কপি এর ছবিঃ (উভয় পৃষ্ঠা) নিজের সদ্য তোলা একটি ছবি (বাধ্যতা মূলক) ✅🆗✅*\n\n📌 *ফরম জমা দেওয়ার নিয়ম:* \nপূর্ণাঙ্গ ফরমটি পূরণ করে সরাসরি **01406356574** এই নাম্বারে জমা দিন। সকল ডকুমেন্টস ঠিক থাকলে ২৪ ঘন্টার মধ্যে আপনাকে ভেরিফাই করে এড করা হবে।`;
                
                await sock.sendMessage(senderId, { text: groupInfoMessage }, { quoted: msg }).catch(() => {});
                return;
            }

            // অপশন ৩: এডমিনের সাথে যোগাযোগ / হেল্পলাইন
            if (textLower === '3' || textLower.includes('যোগাযোগ') || textLower.includes('এডমিন')) {
                let contactMessage = `📞 যে কোনো প্রয়োজনে যোগাযোগ করুন:\n\n📱 **হটলাইন নাম্বার:** 01970693119\n\nআমাদের সাথে যোগাযোগ করার জন্য ধন্যবাদ!`;
                await sock.sendMessage(senderId, { text: contactMessage }, { quoted: msg }).catch(() => {});
                return;
            }

            // মূল ওয়েলকাম মেনু
            let welcomeMessage = `আসসালামু আলাইকুম ওয়া রাহমাতুল্লাহ! 🌹\n\n*𝐌𝐄𝐑𝐀𝐉𝐔𝐋 𝐇𝐀𝐐𝐔𝐄*\nAdmin, Defence Sell Bazar\n\nনিচের অপশনগুলো থেকে আপনার প্রয়োজনীয় সেবাটি বেছে নিন:\n\n1️⃣ গ্রুপে এড হতে চাই (প্রাই্স ও ফরম)\n2️⃣ পেমেন্ট স্ট্যাটাস চেক করুন\n3️⃣ এডমিনের সাথে যোগাযোগ\n\nদয়া করে আপনার পছন্দের নম্বরটি (যেমন: 1 বা 3) লিখে পাঠান।`;
            
            await sock.sendMessage(senderId, { text: welcomeMessage }, { quoted: msg }).catch(() => {});
            return;
        }
    });
}

startBot();

