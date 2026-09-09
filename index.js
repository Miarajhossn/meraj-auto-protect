const fs = require('fs');

// একই message event বারবার এলে আটকানোর জন্য
const processedMessages = new Set();

// ===============================
// sent_users.json থেকে user data load
// ===============================
let sentUsers = {};
function loadSentUsers() {
    try {
        if (fs.existsSync('sent_users.json')) {
            const data = fs.readFileSync('sent_users.json', 'utf8').trim();
            if (data) {
                const parsed = JSON.parse(data);
                if (parsed && typeof parsed === 'object') {
                    sentUsers = parsed;
                } else {
                    sentUsers = {};
                }
            }
        }
    } catch (error) {
        console.error('sent_users.json load error:', error);
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
            'sent_users.json',
            JSON.stringify(sentUsers, null, 2),
            'utf8'
        );
    } catch (error) {
        console.error('sent_users.json save error:', error);
    }
}

// ===============================
// Message Handler
// ===============================
sock.ev.on('messages.upsert', async (m) => {
    try {
        // কোনো message না থাকলে return
        if (!m.messages || !m.messages.length) return;
        const msg = m.messages[0];

        // Message content না থাকলে return
        if (!msg.message) return;

        // ===============================
        // Duplicate message event protection
        // ===============================
        const messageId = msg.key?.id;
        if (!messageId) return;

        if (processedMessages.has(messageId)) {
            return;
        }
        processedMessages.add(messageId);

        // ১ মিনিট পরে memory থেকে ID delete
        setTimeout(() => {
            processedMessages.delete(messageId);
        }, 60000);

        // ===============================
        // Sender ID
        // ===============================
        const senderId = msg.key?.remoteJid;
        if (!senderId) return;

        // ===============================
        // Group message বাদ
        // ===============================
        const isGroup = senderId.endsWith('@g.us');
        if (isGroup) return;

        // ===============================
        // নিজের পাঠানো message বাদ
        // ===============================
        if (msg.key.fromMe) return;

        // ===============================
        // Message text বের করা
        // ===============================
        const textRaw = (
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            ''
        ).trim();
        const textLower = textRaw.toLowerCase();

        // ===============================
        // 1️⃣ পরিচয়
        // ===============================
        if (
            textLower === '1' ||
            textLower.includes('পরিচয়') ||
            textLower.includes('গ্রুপ সম্পর্কে') ||
            textLower.includes('বিশ্বস্ততা')
        ) {
            const info = `📌 *DEFENCE SELL BAZAR - এর পরিচয় ও বিশ্বস্ততা* 🛡️\n\nডিফেন্স সেল বাজার বাংলাদেশের অন্যতম একটি বিশ্বস্ত, নিরাপদ ও ভেরিফাইড অনলাইন প্ল্যাটফর্ম।\n\n🤝 *কেন আমরা বিশ্বস্ত?*\n✅ *আইনশৃঙ্খলা ও সিকিউরিটি:* গ্রুপের নিরাপত্তা ও কার্যক্রম নিয়মিত মনিটরিং করা হয়।\n✅ *নিরাপদ লেনদেন:* লেনদেনের ক্ষেত্রে সতর্কতা ও যাচাই প্রক্রিয়া অনুসরণ করা হয়।\n✅ *ভেরিফাইড মেম্বার:* সদস্য অন্তর্ভুক্তির ক্ষেত্রে প্রয়োজনীয় তথ্য যাচাই করা হয়।\n\nনিরাপদ ও নির্ভরযোগ্য প্ল্যাটফর্মে আপনাকে স্বাগতম! 🤝`;

            await sock.sendMessage(
                senderId,
                { text: info },
                { quoted: msg }
            );
            return;
        }

        // ===============================
        // 2️⃣ Fee
        // ===============================
        if (
            textLower === '2' ||
            textLower.includes('ফি')
        ) {
            const feeText = `💰 *DEFENCE SELL BAZAR - মেম্বারশিপ ফি ও বিশেষ ছাড় প্যাকেজ* 🚀\n\nআমাদের ভেরিফাইড গ্রুপগুলোতে যুক্ত হওয়ার জন্য ফি:\n\n1️⃣ *১ নং প্রিমিয়াম গ্রুপ*\n• মেম্বার সংখ্যা: ৯০০+\n• এন্ট্রি ফি: *৪০০ টাকা*\n\n2️⃣ *২ নং এক্সক্লুসিভ গ্রুপ*\n• মেম্বার সংখ্যা: ৫০০+\n• এন্ট্রি ফি: *২০০ টাকা*\n\n🔥 *সুপার সেভার অফার:*\nএকসাথে *১ নং ও ২ নং উভয় গ্রুপে* যুক্ত হতে চাইলে মোট ফি মাত্র *৪৫০ টাকা*!`;

            await sock.sendMessage(
                senderId,
                { text: feeText },
                { quoted: msg }
            );
            return;
        }

        // ===============================
        // 3️⃣ Join
        // ===============================
        if (
            textLower === '3' ||
            textLower.includes('এড হতে চাই') ||
            textLower.includes('যুক্ত')
        ) {
            const joinText = `🌟 *DEFENCE SELL BAZAR - এ আপনাকে স্বাগতম!* 🤝\n\n🚀 *গ্রুপে যুক্ত হওয়ার নিয়ম:*\n1️⃣ ইনবক্সে *4* লিখে অফিসিয়াল ভেরিফিকেশন ফরম সংগ্রহ করুন।\n2️⃣ ফরমের প্রতিটি তথ্য সঠিকভাবে পূরণ করুন।\n3️⃣ প্রয়োজনীয় ডকুমেন্টস প্রস্তুত রাখুন।\n4️⃣ পূরণকৃত ফরম ও প্রয়োজনীয় ডকুমেন্টস নির্ধারিত অফিসিয়াল নম্বরে পাঠান।\n\n⏳ যাচাই-বাছাই শেষে আপনার আবেদন প্রসেস করা হবে।`;

            await sock.sendMessage(
                senderId,
                { text: joinText },
                { quoted: msg }
            );
            return;
        }

        // ===============================
        // 4️⃣ Form
        // ===============================
        if (
            textLower === '4' ||
            textLower.includes('ফরম') ||
            textLower.includes('নম্বর পরিবর্তন')
        ) {
            const fullForm = `🔥 *DEFENCE SELL BAZAR* ১০০% ভেরিফাইড গ্রুপের অফিসিয়াল ফর্ম ✅\n\n1️⃣ আপনার নামঃ\n2️⃣ আপনার NID নাম্বারঃ\n3️⃣ পেশাঃ\n4️⃣ আপনার Facebook ID লিংকঃ\n5️⃣ আপনার সচল মোবাইল নাম্বারঃ\n6️⃣ আপনার WhatsApp নম্বরঃ\n\n🔄 *নম্বর পরিবর্তনের কারণ (যদি প্রযোজ্য):*\n\n7️⃣ বর্তমান ঠিকানাঃ\n8️⃣ আপনার পেমেন্ট একাউন্টের তথ্যঃ\n9️⃣ পিতার নাম ও পেশাঃ\n🔟 পিতার মোবাইল নম্বরঃ\n1️⃣1️⃣ মাতার নাম ও নম্বরঃ\n1️⃣2️⃣ ভাই/বোনের সচল নাম্বারঃ\n1️⃣3️⃣ দুইজন বন্ধুর নাম ও নাম্বারঃ\n1️⃣4️⃣ আত্মীয়ের নাম ও নাম্বারঃ\n1️⃣5️⃣ দুইজন প্রতিবেশীর নাম ও নাম্বারঃ\n\n🔰 *প্রয়োজনীয় ডকুমেন্টস:*\n• নিজের NID/প্রযোজ্য পরিচয়পত্র\n• বর্তমান ঠিকানার প্রমাণ\n• নিজের সাম্প্রতিক ছবি\n• প্রয়োজনীয় অন্যান্য যাচাই তথ্য\n\n📌 *ফরম জমা দেওয়ার নিয়ম:*\nপূর্ণাঙ্গ ফরম ও প্রয়োজনীয় তথ্য অফিসিয়াল যোগাযোগ নম্বরে জমা দিন।\n\n⚠️ ব্যক্তিগত NID, ছবি বা আর্থিক তথ্য পাঠানোর আগে অবশ্যই প্রাপকের পরিচয় ও অফিসিয়াল যোগাযোগের সত্যতা যাচাই করুন।`;

            await sock.sendMessage(
                senderId,
                { text: fullForm },
                { quoted: msg }
            );
            return;
        }

        // ===============================
        // 5️⃣ Hotline
        // ===============================
        if (
            textLower === '5' ||
            textLower.includes('হটলাইন') ||
            textLower.includes('নম্বর')
        ) {
            const hotlineText = `📞 *হটলাইন নাম্বার:* 01970693119\nযেকোনো প্রয়োজনে যোগাযোগ করুন।`;

            await sock.sendMessage(
                senderId,
                { text: hotlineText },
                { quoted: msg }
            );
            return;
        }

        // ===============================
        // 6️⃣ Admin
        // ===============================
        if (
            textLower === '6' ||
            textLower.includes('এডমিন') ||
            textLower.includes('কে')
        ) {
            const adminText = `👑 *প্রধান এডমিন পরিচিতি* 🛡️\n\nএস, আই মেহেদী হাসান\nসরকারি কর্মকর্তা, কক্সবাজার ও ঢাকা`;

            await sock.sendMessage(
                senderId,
                { text: adminText },
                { quoted: msg }
            );
            return;
        }

        // ==================================================
        // সাধারণ Welcome Message
        // একজন user-কে জীবনে প্রথমবার মাত্র ১ বার
        // ==================================================
        if (!sentUsers[senderId]) {
            const welcome = `আসসালামু আলাইকুম ওয়া রাহমাতুল্লাহ! 🌹\n\n🛡️ *DEFENCE SELL BAZAR Assistant* 🤝\n\nসঠিক তথ্য জানতে নিচের নম্বরগুলো পাঠান:\n1️⃣ গ্রুপের পরিচয় ও বিশ্বস্ততা\n2️⃣ গ্রুপের ফি\n3️⃣ আমি গ্রুপে এড হতে চাই\n4️⃣ গ্রুপের ফরম\n5️⃣ গ্রুপের হটলাইন নাম্বার\n6️⃣ গ্রুপের মেইন এডমিন কে`;

            await sock.sendMessage(
                senderId,
                { text: welcome },
                { quoted: msg }
            );

            // প্রথমবার Welcome পাঠানোর পর user save
            sentUsers[senderId] = {
                welcomed: true,
                firstMessageAt: new Date().toISOString()
            };
            saveSentUsers();
            console.log(`Welcome sent to: ${senderId}`);
        }

    } catch (error) {
        console.error('Message processing error:', error);
    }
});

