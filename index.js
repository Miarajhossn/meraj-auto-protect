const fs = require('fs');

const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason
} = require('@whiskeysockets/baileys');

const pino = require('pino');

// ===============================
// Settings
// ===============================

const AUTH_FOLDER = 'auth_info';
const SENT_USERS_FILE = 'sent_users.json';

// একই message event বারবার এলে আটকানোর জন্য
const processedMessages = new Set();

let sentUsers = {};

// ===============================
// sent_users.json থেকে user data load
// ===============================

function loadSentUsers() {
    try {
        if (!fs.existsSync(SENT_USERS_FILE)) {
            sentUsers = {};
            return;
        }

        const data = fs
            .readFileSync(SENT_USERS_FILE, 'utf8')
            .trim();

        if (!data) {
            sentUsers = {};
            return;
        }

        const parsed = JSON.parse(data);

        if (
            parsed &&
            typeof parsed === 'object' &&
            !Array.isArray(parsed)
        ) {
            sentUsers = parsed;
        } else {
            sentUsers = {};
        }

    } catch (error) {
        console.error(
            'sent_users.json load error:',
            error
        );

        sentUsers = {};
    }
}

loadSentUsers();

// ===============================
// User data save
// ===============================

function saveSentUsers() {
    try {
        fs.writeFileSync(
            SENT_USERS_FILE,
            JSON.stringify(
                sentUsers,
                null,
                2
            ),
            'utf8'
        );

    } catch (error) {
        console.error(
            'sent_users.json save error:',
            error
        );
    }
}

// ===============================
// Message Send Function
// ===============================

async function sendText(
    sock,
    senderId,
    text,
    msg
) {
    try {
        await sock.sendMessage(
            senderId,
            { text },
            { quoted: msg }
        );

    } catch (error) {
        console.error(
            'Message sending error:',
            error
        );
    }
}

// ===============================
// Welcome Message
// ===============================

function getWelcomeMessage() {
    return `
*আসসালামু আলাইকুম* 🌹

*🛡️ ডিফেন্স সেল বাজার এর পক্ষ থেকে আপনাকে স্বাগতম* 🎉🎉

━━━━━━━━━━━━━━━━━━

*📌 সঠিক তথ্য জানতে নিচের নম্বরগুলো পাঠান:*

*1️⃣ গ্রুপের পরিচয় ও বিশ্বস্ততা*

*2️⃣ মেম্বারশিপ ফি ও বিশেষ ছাড় প্যাকেজ*

*3️⃣ গ্রুপে এড হওয়ার সম্পূর্ণ নিয়ম*

*4️⃣ অফিসিয়াল ভেরিফিকেশন ফর্ম*

*5️⃣ হটলাইন নাম্বার*

*6️⃣ প্রধান এডমিন পরিচিতি*

━━━━━━━━━━━━━━━━━━

*💡 আপনার প্রয়োজনীয় তথ্যের জন্য শুধু সংশ্লিষ্ট নম্বরটি লিখে পাঠান।*

🛡️ *DEFENCE SELL BAZAR* 🇧🇩
`.trim();
}

// ===============================
// 1️⃣ পরিচয় ও বিশ্বস্ততা
// ===============================

function getCommand1() {
    return `
📌 *ডিফেন্স সেল বাজার - এর পরিচয় ও বিশ্বস্ততা* 🛡️

ডিফেন্স সেল বাজার বাংলাদেশের অন্যতম একটি বিশ্বস্ত, নিরাপদ ও ভেরিফাইড অনলাইন প্ল্যাটফর্ম। এটি সরকারি কর্মকর্তা দ্বারা পরিচালিত হওয়ায় এখানে প্রতিটি লেনদেন এবং সদস্য অন্তর্ভুক্তি অত্যন্ত সতর্কতা ও নিরাপত্তার সাথে পরিচালনা করা হয়।

🤝 *কেন আমরা বিশ্বস্ত?*

✅ *আইনশৃঙ্খলা ও সিকিউরিটি:*
গ্রুপটি সরকারি কর্মকর্তা দ্বারা সরাসরি মনিটরিং করা হয়, ফলে নিরাপত্তা ও শৃঙ্খলাকে সর্বোচ্চ গুরুত্ব দেওয়া হয়।

✅ *নিরাপদ লেনদেন:*
গ্রুপের লেনদেন স্বচ্ছতার সাথে সম্পন্ন করার চেষ্টা করা হয়। টাকা পেমেন্ট করার পর সঠিক স্ক্রিনশট ও তথ্য প্রদান করলে তা যাচাই করে আপডেট করা হয়।

✅ *ভেরিফাইড মেম্বার:*
প্রতিটি সদস্যকে ১৯ পয়েন্টের ভেরিফিকেশন ফরম, NID ও ছবি যাচাই করে গ্রুপে যুক্ত করা হয়। ভুয়া বা অননুমোদিত আইডি শনাক্ত হলে প্রয়োজনীয় ব্যবস্থা নেওয়া হয়।

✅ *সরাসরি মনিটরিং:*
যেকোনো লেনদেন বা সমস্যা সমাধানের জন্য আমাদের হটলাইন ও এডমিনের তদারকি রয়েছে।

🤝 *নিরাপদ ও নির্ভরযোগ্য প্ল্যাটফর্মে আপনাকে স্বাগতম!*

🛡️ *DEFENCE SELL BAZAR* 🇧🇩
`.trim();
}

// ===============================
// 2️⃣ Membership Fee
// ===============================

function getCommand2() {
    return `
💰 *ডিফেন্স সেল বাজার - মেম্বারশিপ ফি ও বিশেষ ছাড় প্যাকেজ* 🚀

আমাদের ভেরিফাইড গ্রুপগুলোতে যুক্ত হওয়ার মাধ্যমেই আপনি পাচ্ছেন শতভাগ নিরাপদ ও বিশ্বস্ত প্ল্যাটফর্মের সুবিধা। আপনাদের সুবিধার্থে ফি-এর তালিকা নিচে দেওয়া হলো:

1️⃣ *১ নং প্রিমিয়াম গ্রুপ*
👥 মেম্বার সংখ্যা: ৯০০+ সক্রিয় ও বিশ্বস্ত সদস্য
💳 এন্ট্রি ফি: *৪০০ টাকা*

2️⃣ *২ নং এক্সক্লুসিভ গ্রুপ*
👥 মেম্বার সংখ্যা: ৫০০+ সক্রিয় ও বিশ্বস্ত সদস্য
💳 এন্ট্রি ফি: *২০০ টাকা*

🔥 *সুপার সেভার অফার (কম্বো প্যাক):*

একসাথে *১ নং ও ২ নং উভয় গ্রুপে* যুক্ত হতে চাইলে—

💰 *মোট ফি মাত্র ৪৫০ টাকা!*

🎁 এতে আপনার *১৫০ টাকা সাশ্রয়* হচ্ছে।

💡 *গ্রুপে এড হতে চাইলে:*

ইনবক্সে *৪* লিখে ফরমটি সংগ্রহ করুন এবং ফরমটি পূরণ করে নির্দিষ্ট নাম্বারে পাঠিয়ে দিন।

🛡️ *DEFENCE SELL BAZAR* 🇧🇩
`.trim();
}

// ===============================
// 3️⃣ Group Join Rules
// ===============================

function getCommand3() {
    return `
🚀 *ডিফেন্স সেল বাজার - গ্রুপে এড হওয়ার সম্পূর্ণ নিয়ম* 🛡️🇧🇩

🤝 *গ্রুপে যুক্ত হওয়ার নিয়ম:*

1️⃣ ইনবক্সে *4* লিখে আমাদের আবেদন ফরমটি সংগ্রহ করুন।

2️⃣ ফরমের প্রতিটি তথ্য সঠিক ও নির্ভুলভাবে পূরণ করুন।

3️⃣ প্রয়োজনীয় যাচাইয়ের তথ্য ও ডকুমেন্টস প্রস্তুত রাখুন।

4️⃣ পূরণ করা ফরম নির্ধারিত অফিসিয়াল যোগাযোগ মাধ্যমে পাঠিয়ে দিন।

5️⃣ আপনার দেওয়া তথ্য যাচাই-বাছাই করার পর আবেদনটির পরবর্তী প্রক্রিয়া সম্পন্ন করা হবে।

⏳ *আবেদন যাচাই:*

আপনার তথ্য ও প্রয়োজনীয় ডকুমেন্টস যাচাই সম্পন্ন হওয়ার পর গ্রুপে যুক্ত করার বিষয়ে সিদ্ধান্ত নেওয়া হবে।

⚠️ *গুরুত্বপূর্ণ সতর্কতা:*

NID, ছবি, আর্থিক তথ্য বা অন্য কোনো ব্যক্তিগত তথ্য পাঠানোর আগে অবশ্যই প্রাপক, নম্বর ও যোগাযোগের মাধ্যমের সত্যতা যাচাই করুন।

💡 *ফরম পেতে ইনবক্সে শুধু 4 লিখুন।*

🛡️ *DEFENCE SELL BAZAR* 🇧🇩
`.trim();
}

// ===============================
// 4️⃣ Verification Form
// ===============================

function getCommand4() {
    return `
🔥 *ডিফেন্স সেল বাজার* 🛡️🇧🇩
📋 *অফিশিয়াল ভেরিফিকেশন ফর্ম* ✅
💯 *DEFENCE SELL BAZAR-এর অফিসিয়াল ফর্ম*

গ্রুপে যুক্ত হওয়ার জন্য নিচের তথ্যগুলো সঠিকভাবে পূরণ করুন।

━━━━━━━━━━━━━━━━━━

1️⃣ *নাম*

2️⃣ *NID Number*

3️⃣ *পেশা* — বাধ্যতামূলক

4️⃣ *Facebook ID Link*

5️⃣ *৩টি Active Mobile Number*

6️⃣ *WhatsApp Number*

7️⃣ *বর্তমান ঠিকানা*
গ্রাম / পোস্ট / থানা / জেলা

8️⃣ *bKash / Nagad / Rocket / Selfin Account Number*
সাথে Account Holder-এর নাম ও প্রয়োজনীয় Screenshot

9️⃣ *বাবার নাম ও পেশা*

🔟 *বাবার মোবাইল নম্বর*

1️⃣1️⃣ *মায়ের নাম*

1️⃣2️⃣ *মায়ের মোবাইল নম্বর*

1️⃣3️⃣ *২ জন Active ভাই-বোনের নম্বর*
একজন বোন এবং একজন ভাই — বাধ্যতামূলক

1️⃣4️⃣ *২ জন বন্ধুর নাম ও মোবাইল নম্বর*

1️⃣5️⃣ *চাচা / মামা / শ্বশুরবাড়ির আত্মীয়দের নাম ও নম্বর*
৩টি তথ্য

1️⃣6️⃣ *২ জন প্রতিবেশীর নাম ও মোবাইল নম্বর*

1️⃣7️⃣ *আপনি যে সকল গ্রুপে আছেন, সেসব গ্রুপের Screenshot*

1️⃣8️⃣ *যেকোনো Verified Group-এর Admin-এর নাম ও নম্বর*

1️⃣9️⃣ *যিনি আপনাকে Refer করেছেন তাঁর নাম ও নম্বর*

━━━━━━━━━━━━━━━━━━

📄 *প্রয়োজনীয় ডকুমেন্টস:*

• নিজের NID / জন্মনিবন্ধন / প্রয়োজনীয় পরিচয়পত্রের কপি

• বাবা / মায়ের NID / জন্মনিবন্ধন / প্রয়োজনীয় ডকুমেন্টসের কপি

• প্রয়োজন অনুযায়ী বিদ্যুৎ বিলের কপি

• সাম্প্রতিক ছবি

━━━━━━━━━━━━━━━━━━

⚠️ *গুরুত্বপূর্ণ:*

NID, ছবি, ফোন নম্বর, ঠিকানা বা আর্থিক তথ্য পাঠানোর আগে অবশ্যই প্রাপক ও যোগাযোগের নম্বরের সত্যতা যাচাই করুন।

🛡️ *DEFENCE SELL BAZAR* 🇧🇩
`.trim();
}

// ===============================
// 5️⃣ Hotline
// ===============================

function getCommand5() {
    return `
📞 *ডিফেন্স সেল বাজার - হটলাইন নাম্বার* ☎️

📱 01970693119 — *অফলাইন*

📱 01884913535 — *অনলাইন ও অফলাইন*

🔔 *প্রয়োজনে ফোন দিন।*

🛡️ *DEFENCE SELL BAZAR* 🇧🇩
`.trim();
}

// ===============================
// 6️⃣ Admin
// ===============================

function getCommand6() {
    return `
👑 *প্রধান এডমিন পরিচিতি* 🛡️🇧🇩

━━━━━━━━━━━━━━━━━━

🎖️ *এস, আই মেহেদী হাসান*

🏛️ *সরকারি কর্মকর্তা*

📍 *কক্সবাজার ও ঢাকা*

━━━━━━━━━━━━━━━━━━

🛡️ *প্রধান এডমিনের তত্ত্বাবধানে*

ডিফেন্স সেল বাজারের সার্বিক ব্যবস্থাপনা, সদস্যদের কার্যক্রম এবং প্রশাসনিক বিষয়গুলো তাঁর তত্ত্বাবধানে পরিচালিত হয়।

🤝 *সদস্যদের নিরাপত্তা, শৃঙ্খলা ও সঠিক ব্যবস্থাপনাকে আমরা সর্বোচ্চ গুরুত্ব দিয়ে থাকি।*

━━━━━━━━━━━━━━━━━━

🛡️ *DEFENCE SELL BAZAR* 🇧🇩
`.trim();
}

// ===============================
// START BOT
// ===============================

async function startBot() {

    const {
        state,
        saveCreds
    } = await useMultiFileAuthState(
        AUTH_FOLDER
    );

    const sock = makeWASocket({
        auth: state,

        logger: pino({
            level: 'silent'
        }),

        printQRInTerminal: true,

        browser: [
            'DEFENCE SELL BAZAR',
            'Chrome',
            '1.0.0'
        ]
    });

    // ===============================
    // Save credentials
    // ===============================

    sock.ev.on(
        'creds.update',
        saveCreds
    );

    // ===============================
    // Connection Update
    // ===============================

    sock.ev.on(
        'connection.update',
        async (update) => {

            const {
                connection,
                lastDisconnect
            } = update;

            if (connection === 'open') {

                console.log('');
                console.log(
                    '======================================'
                );
                console.log(
                    '   DEFENCE SELL BAZAR BOT ONLINE'
                );
                console.log(
                    '======================================'
                );
                console.log('');
            }

            if (connection === 'close') {

                const shouldReconnect =
                    lastDisconnect?.error?.output?.statusCode !==
                    DisconnectReason.loggedOut;

                console.log(
                    'WhatsApp connection closed.'
                );

                if (shouldReconnect) {

                    console.log(
                        'Reconnecting...'
                    );

                    setTimeout(() => {
                        startBot();
                    }, 3000);

                } else {

                    console.log(
                        'Logged out. Please login again.'
                    );
                }
            }
        }
    );

    // ===============================
    // Message Handler
    // ===============================

    sock.ev.on(
        'messages.upsert',
        async (m) => {

            try {

                if (
                    !m ||
                    !m.messages ||
                    !m.messages.length
                ) {
                    return;
                }

                // সব message process করা
                for (const msg of m.messages) {

                    // ==========================
                    // নিজের message বাদ
                    // ==========================

                    if (msg.key?.fromMe) {
                        continue;
                    }

                    // ==========================
                    // Sender ID
                    // ==========================

                    const senderId =
                        msg.key?.remoteJid;

                    if (!senderId) {
                        continue;
                    }

                    // ==========================
                    // Group message বাদ
                    // ==========================

                    if (
                        senderId.endsWith('@g.us')
                    ) {
                        continue;
                    }

                    // ==========================
                    // Message ID
                    // ==========================

                    const messageId =
                        msg.key?.id;

                    if (!messageId) {
                        continue;
                    }

                    // ==========================
                    // Duplicate protection
                    // ==========================

                    if (
                        processedMessages.has(
                            messageId
                        )
                    ) {
                        continue;
                    }

                    processedMessages.add(
                        messageId
                    );

                    // ১ মিনিট পরে memory থেকে ID delete
                    setTimeout(() => {

                        processedMessages.delete(
                            messageId
                        );

                    }, 60000);

                    // ==========================
                    // Message content
                    // ==========================

                    if (!msg.message) {
                        continue;
                    }

                    const textRaw = (
                        msg.message.conversation ||
                        msg.message.extendedTextMessage?.text ||
                        msg.message.imageMessage?.caption ||
                        msg.message.videoMessage?.caption ||
                        ''
                    ).trim();

                    if (!textRaw) {
                        continue;
                    }

                    const textLower =
                        textRaw.toLowerCase();

                    // ===============================
                    // 1️⃣ পরিচয়
                    // ===============================

                    if (
                        textLower === '1' ||
                        textLower === '১'
                    ) {

                        await sendText(
                            sock,
                            senderId,
                            getCommand1(),
                            msg
                        );

                        continue;
                    }

                    // ===============================
                    // 2️⃣ Fee
                    // ===============================

                    if (
                        textLower === '2' ||
                        textLower === '২'
                    ) {

                        await sendText(
                            sock,
                            senderId,
                            getCommand2(),
                            msg
                        );

                        continue;
                    }

                    // ===============================
                    // 3️⃣ Join
                    // ===============================

                    if (
                        textLower === '3' ||
                        textLower === '৩'
                    ) {

                        await sendText(
                            sock,
                            senderId,
                            getCommand3(),
                            msg
                        );

                        continue;
                    }

                    // ===============================
                    // 4️⃣ Form
                    // ===============================

                    if (
                        textLower === '4' ||
                        textLower === '৪' ||
                        textLower.includes('ফরম') ||
                        textLower.includes('ফর্ম')
                    ) {

                        await sendText(
                            sock,
                            senderId,
                            getCommand4(),
                            msg
                        );

                        continue;
                    }

                    // ===============================
                    // 5️⃣ Hotline
                    // ===============================

                    if (
                        textLower === '5' ||
                        textLower === '৫' ||
                        textLower === 'হটলাইন' ||
                        textLower === 'হটলাইন নাম্বার'
                    ) {

                        await sendText(
                            sock,
                            senderId,
                            getCommand5(),
                            msg
                        );

                        continue;
                    }

                    // ===============================
                    // 6️⃣ Admin
                    // ===============================

                    if (
                        textLower === '6' ||
                        textLower === '৬' ||
                        textLower === 'এডমিন' ||
                        textLower === 'প্রধান এডমিন'
                    ) {

                        await sendText(
                            sock,
                            senderId,
                            getCommand6(),
                            msg
                        );

                        continue;
                    }

                    // ==================================================
                    // সাধারণ Welcome Message
                    // একজন user-কে প্রথমবার মাত্র ১ বার
                    // ==================================================

                    if (!sentUsers[senderId]) {

                        // আগে save করছি যাতে একই সময়ে
                        // duplicate event এলে Welcome
                        // একাধিকবার না যায়

                        sentUsers[senderId] = {
                            welcomed: true,
                            firstMessageAt:
                                new Date().toISOString()
                        };

                        saveSentUsers();

                        await sendText(
                            sock,
                            senderId,
                            getWelcomeMessage(),
                            msg
                        );

                        console.log(
                            `Welcome sent to: ${senderId}`
                        );
                    }

                }

            } catch (error) {

                console.error(
                    'Message processing error:',
                    error
                );
            }
        }
    );
}

// ===============================
// START
// ===============================

startBot().catch(
    (error) => {

        console.error(
            'Bot start error:',
            error
        );
    }
);
