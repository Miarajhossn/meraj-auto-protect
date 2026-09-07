const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const axios = require('axios');
const cron = require("node-cron");

const SPREADSHEET_ID = '15dv3JFmGykNo-GP1vxDr7j4Zy0oYwIcDIzKHp-FqNUc';
const TARGET_PHONE_NUMBER = '8801884913535';
const PRIMARY_GROUP_ID = '120363303388070671@g.us';

let cachedRows = null;
let lastFetchTime = 0;
const CACHE_TTL = 120000;

function normalizePhoneNumber(phoneStr) {
    if (!phoneStr) return '';
    return phoneStr.toString().replace(/[^0-9]/g, '');
}

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
                console.log('বট লগআউট হয়ে গেছে।');
            }
        } else if (connection === 'open') {
            console.log('বট সফলভাবে সংযুক্ত এবং সচল রয়েছে! ✅');
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const senderId = msg.key.remoteJid;
        const isGroup = senderId.endsWith('@g.us');
        const incomingText = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        const textLower = incomingText.trim();

        // ১. গ্রুপের আইডি চেক করার কমান্ড (যেকোনো গ্রুপে বা ইনবক্সে কাজ করবে)
        if (textLower === '!groupid' || textLower === 'গ্রুপ আইডি') {
            if (isGroup) {
                await sock.sendMessage(senderId, { text: `📌 এই গ্রুপের আইডি হলো:\n\`${senderId}\`` }, { quoted: msg });
            } else {
                await sock.sendMessage(senderId, { text: `📌 প্রধান গ্রুপের আইডি হলো:\n\`${PRIMARY_GROUP_ID}\`` }, { quoted: msg });
            }
            return;
        }

        // ২. গ্রুপের মেম্বার ও তাদের আইডি/জিডি লিস্ট দেখার কমান্ড (শুধু গ্রুপে কাজ করবে)
        if (isGroup && (textLower === '!gdid' || textLower === '!members' || textLower === 'আইডি')) {
            try {
                const groupMetadata = await sock.groupMetadata(senderId);
                const participants = groupMetadata.participants;

                let memberListText = `📋 *${groupMetadata.subject}* গ্রুপের মেম্বার ও আইডি লিস্ট:\n\n`;
                
                participants.forEach((p, index) => {
                    let roleInfo = p.admin ? ` [Admin: ${p.admin}]` : '';
                    memberListText += `${index + 1}. WaID: ${p.id}${roleInfo}\n`;
                });

                await sock.sendMessage(senderId, { text: memberListText }, { quoted: msg });
            } catch (err) {
                console.error('গ্রুপ মেম্বার ফেচ করতে সমস্যা:', err.message);
                await sock.sendMessage(senderId, { text: 'গ্রুপের মেম্বার লিস্ট পাওয়া যায়নি! বট কি গ্রুপে এডমিন আছে?' }, { quoted: msg });
            }
            return;
        }

        // ৩. ইনবক্স অটোমেশন (ব্যক্তিগত চ্যাট)
        if (!isGroup) {
            if (textLower === '1' || textLower.includes('গ্রুপে এড') || textLower.includes('গ্রুপ')) {
                const groupInfoMessage = [
                    "ডিফেন্স সেল বাজার বাংলাদেশের অন্যতম অনলাইন প্ল্যাটফর্ম, সরকারি কর্মকর্তা দ্বারা পরিচালিত। 🤝",
                    "",
                    "জি অবশ্যই! আমাদের গ্রুপ ২টি:",
                    "",
                    "1️⃣ ১ নং গ্রুপ:",
                    "* মেম্বার সংখ্যা: ৯০০+",
                    "* এড ফি: ৪০০৳",
                    "",
                    "2️⃣ ২ নং গ্রুপ:",
                    "* মেম্বার সংখ্যা: ৫০০+",
                    "* এড ফি: ২০০৳",
                    "",
                    "✨ বিশেষ অফার: দুই গ্রুপ একসাথে এড হলে মোট এড ফি: ৪৫০৳",
                    "",
                    "-----------------------------------",
                    "",
                    "🔥 ডিফেন্স সেল বাজার 👈 ১০০% ভেরিফাই নিড গ্রুপ এর অফিসিয়াল ফর্ম ✅",
                    "100% ভেরিফাই গ্রুপ এ এড হতে এই ডকুমেন্ট গুলো লাগবে।",
                    "",
                    "1️⃣। আপনার নামঃ",
                    "2️⃣। আপনার (NID) নাম্বারঃ",
                    "3️⃣। পেশাঃ {বাধ্যতামূলক}",
                    "4️⃣। আপনার ফেইজবুক আইডি লিংক:",
                    "5️⃣। আপনার সচল ৩টি মোবাইল নাম্বার :",
                    "১/ ",
                    "২/ ",
                    "৩/ ",
                    "",
                    "6️⃣। আপনার whatsapp নাম্বারঃ",
                    "",
                    "7️⃣। আপনার বর্তমান ঠিকানা",
                    "গ্রামঃ",
                    "পোঃ",
                    "থানাঃ",
                    "জেলাঃ",
                    "",
                    "8️⃣। আপনার একাউন্ট নাম্বার এবং এগুলো একাউন্টের স্ক্রীনশট দিবেন কার নামে উল্লেখ্য করে দিবেন।",
                    "✅ বিকাশ =",
                    "✅ নগদ =",
                    "✅ রকেট =",
                    "✅ সেলфин =",
                    "",
                    "9️⃣। পিতার নামঃ",
                    "★★পেশাঃ",
                    "1️⃣0️⃣। পিতার মোবাইল নম্বরঃ",
                    "1️⃣1️⃣। মাতার নামঃ",
                    "1️⃣2️⃣। মাতার মোবাইল নম্বরঃ",
                    "",
                    "1️⃣3️⃣। নিজের ভাই বা বোনের সচল দুইটি নাম্বার",
                    "১/ = (বোন)",
                    "২/ = (ভাই)",
                    "(বাধ্যতামূলক)",
                    "",
                    "1️⃣4️⃣। দুই জন বন্ধুর নাম সহ নাম্বার",
                    "১।",
                    "২।",
                    "",
                    "1️⃣5️⃣। চাচা ও মামা নাম সহ নাম্বার /শ্বশুর _শ্বাশুড়ি",
                    "১।",
                    "২।",
                    "৩।",
                    "",
                    "1️⃣6️⃣। দুইজন প্রতিবেশীর নাম সহ নাম্বার",
                    "১।",
                    "২।",
                    "",
                    "1️⃣7️⃣। যে সকল গ্রুপে এড আছেন একটি স্ক্রিনশট দেন",
                    "",
                    "1️⃣8️⃣। যে কোন একটা ভেরিফাই গ্রুপের এডমিনের নাম সহ নাম্বারঃ",
                    "1️⃣9️⃣। রেফারেন্সকারীর নাম সহ নাম্বারঃ",
                    "",
                    "ডকুমেন্টস যেগুলো দিবেন:",
                    "🔰🔰 নিজ এবং বাবা/মা NID/জন্ম সনদ/ বিদ্যুৎ বিলের কপি এর ছবিঃ (উভয় পৃষ্ঠা) নিজের সদ্য তোলা একটি ছবি (বাধ্যতা মূলক) ✅🆗✅",
                    "",
                    "📌 ফরম জমা দেওয়ার নিয়ম:",
                    "পূর্ণাঙ্গ ফরমটি পূরণ করে সরাসরি 01406356574 এই নাম্বারে জমা দিন। সকল ডকুমেন্টস ঠিক থাকলে ২৪ ঘন্টার মধ্যে আপনাকে ভেরিফাই করে এড করা হবে।"
                ].join("\n");
                
                await sock.sendMessage(senderId, { text: groupInfoMessage }, { quoted: msg }).catch(() => {});
                return;
            }

            if (textLower === '3' || textLower.includes('যোগাযোগ') || textLower.includes('এডমিন')) {
                const contactMessage = "📞 যে কোনো প্রয়োজনে যোগাযোগ করুন:\n\n📱 হটলাইন নাম্বার: 01970693119\n\nআমাদের সাথে যোগাযোগ করার জন্য ধন্যবাদ!";
                await sock.sendMessage(senderId, { text: contactMessage }, { quoted: msg }).catch(() => {});
                return;
            }

            const welcomeMessage = "আসসালামু আলাইকুম ওয়া রাহমাতুল্লাহ! 🌹\n\n*𝐌𝐄𝐑𝐀𝐉𝐔𝐋 𝐇𝐀𝐐𝐔𝐄*\nAdmin, Defence Sell Bazar\n\nনিচের অপশনগুলো থেকে আপনার প্রয়োজনীয় সেবাটি বেছে নিন:\n\n1️⃣ গ্রুপে এড হতে চাই (প্রাই্স ও ফরম)\n2️⃣ পেমেন্ট স্ট্যাটাস চেক করুন\n3️⃣ এডমিনের সাথে যোগাযোগ\n\nদয়া করে আপনার পছন্দের নম্বরটি (যেমন: 1 বা 3) লিখে পাঠান।";
            
            await sock.sendMessage(senderId, { text: welcomeMessage }, { quoted: msg }).catch(() => {});
            return;
        }
    });
}

startBot();


