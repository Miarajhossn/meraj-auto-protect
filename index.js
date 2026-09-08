const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');

const TARGET_PHONE_NUMBER = '8801884913535';
const PRIMARY_GROUP_ID = '120363303388070671@g.us';

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
                console.log(`\n🔑 পেয়ারিং কোড: ${code}\n`);
            } catch (err) {
                console.error('পেয়ারিং কোড এরর:', err.message);
            }
        }, 3000);
    }

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log('বট সফলভাবে সংযুক্ত হয়েছে! ✅');
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const senderId = msg.key.remoteJid;
        const isGroup = senderId.endsWith('@g.us');
        const textLower = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').trim();

        if (textLower === '!groupid' || textLower === 'গ্রুপ আইডি') {
            const idText = isGroup ? `📌 এই গ্রুপের আইডি:\n${senderId}` : `📌 প্রধান গ্রুপের আইডি:\n${PRIMARY_GROUP_ID}`;
            await sock.sendMessage(senderId, { text: idText }, { quoted: msg });
            return;
        }

        if (isGroup && (textLower === '!gdid' || textLower === '!members' || textLower === 'আইডি')) {
            try {
                const groupMetadata = await sock.groupMetadata(senderId);
                let list = `📋 ${groupMetadata.subject} গ্রুপের মেম্বার লিস্ট:\n\n`;
                groupMetadata.participants.forEach((p, i) => {
                    list += `${i + 1}. ${p.id} ${p.admin ? '[Admin]' : ''}\n`;
                });
                await sock.sendMessage(senderId, { text: list }, { quoted: msg });
            } catch (err) {
                await sock.sendMessage(senderId, { text: 'মেম্বার লিস্ট পাওয়া যায়নি! বট কি এডমিন আছে?' }, { quoted: msg });
            }
            return;
        }

        if (!isGroup) {
            if (textLower === '1' || textLower.includes('পরিচয়') || textLower.includes('গ্রুপ সম্পর্কে') || textLower.includes('বিশ্বস্ত')) {
                let info = "📌 *ডিফেন্স সেল বাজার - এর পরিচয় ও বিশ্বস্ততা* 🛡️\n\nডিফেন্স সেল বাজার বাংলাদেশের অন্যতম একটি বিশ্বস্ত, নিরাপদ ও ভেরিফাইড অনলাইন প্ল্যাটফর্ম। এটি সম্পূর্ণ সরকারি কর্মকর্তা দ্বারা পরিচালিত হওয়ায় এখানে প্রতিটি লেনদেন এবং সদস্য অন্তর্ভুক্তি অত্যন্ত কড়াকড়ি ও নিরাপত্তার সাথে পরিচালনা করা হয়।\n\n🤝 *কেন আমরা শতভাগ বিশ্বস্ত?*\n✅ *আইনশৃঙ্খলা ও সিকিউরিটি:* গ্রুপটি সরকারি কর্মকর্তা দ্বারা সরাসরি মনিটরিং করা হয়, ফলে এখানে প্রতারণার কোনো সুযোগ নেই।\n✅ *নিরাপদ লেনদেন:* আমাদের গ্রুপের প্রতিটি লেনদেন সম্পূর্ণ স্বচ্ছ এবং বিশ্বস্ততার সাথে সম্পন্ন করা হয়। টাকা পেমেন্ট করার পর সঠিক স্ক্রিনশট ও তথ্য প্রদান করলে তা যাচাই করে দ্রুত আপডেট করা হয়।\n✅ *ভেরিফাইড মেম্বার:* প্রতিটি সদস্যকে ১৯ পয়েন্টের কঠোর ভেরিফিকেশন ফরম এবং NID ও ছবি যাচাই করে গ্রুপে যুক্ত করা হয়। কোনো অপরিচিত বা ভুয়া আইডি এখানে প্রবেশের সুযোগ পায় না।\n✅ *সরাসরি মনিটরিং:* যেকোনো লেনদেন বা সমস্যা সমাধানের জন্য আমাদের হটলাইন ও সরাসরি এডমিনের সার্বক্ষণিক তদারকি রয়েছে।\n\nনিরাপদ ও নির্ভরযোগ্য প্ল্যাটফর্মে আপনাকে স্বাগতম! 🤝";
                await sock.sendMessage(senderId, { text: info }, { quoted: msg });
                return;
            }

            if (textLower === '2' || textLower.includes('ফি')) {
                let feeText = "💰 *ডিফেন্স সেল বাজার - মেম্বারশিপ ফি ও বিশেষ ছাড় প্যাকেজ* 🚀\n\nআমাদের ভেরিফাইড গ্রুপগুলোতে যুক্ত হওয়ার মাধ্যমেই আপনি পাচ্ছেন শতভাগ নিরাপদ ও বিশ্বস্ত প্ল্যাটফর্মের সুবিধা। আপনাদের সুবিধার্থে ফি এর তালিকা নিচে দেওয়া হলো:\n\n1️⃣ *১ নং প্রিমিয়াম গ্রুপ*\n* মেম্বার সংখ্যা: ৯০০+ সক্রিয় ও বিশ্বস্ত সদস্য\n* এন্ট্রি ফি: *৪০০ টাকা*\n\n2️⃣ *২ নং এক্সক্লুসিভ গ্রুপ*\n* মেম্বার সংখ্যা: ৫০০+ সক্রিয় ও বিশ্বস্ত সদস্য\n* এন্ট্রি ফি: *২০০ টাকা*\n\n🔥 *সুপার সেভার অফার (কম্বো প্যাক):*\nএকসাথে *১ নং ও ২ নং উভয় গ্রুপে* যুক্ত হতে চাইলে মোট ফি মাত্র *৪৫০ টাকা*! (এতে আপনার ১৫০ টাকা সাশ্রয় হচ্ছে)।\n\n💡 গ্রুপে এড হতে চাইলে ইনবক্সে *৪* লিখে ফরমটি সংগ্রহ করুন এবং তা পূরণ করে নির্দিষ্ট নাম্বারে পাঠিয়ে দিন।";
                await sock.sendMessage(senderId, { text: feeText }, { quoted: msg });
                return;
            }

            if (textLower === '3' || textLower.includes('এড হতে চাই') || textLower.includes('যুক্ত')) {
                let joinText = "🌟 *'ডিফেন্স সেল বাজার' - এ আপনাকে স্বাগতম!* 🤝\n\nআমাদের এই এক্সক্লুসিভ ও শতভাগ ভেরিফাইড গ্রুপে যুক্ত হয়ে আপনিও হতে পারেন আমাদের এই নিরাপদ পরিবারের একজন গর্বিত সদস্য। ১০০% সিকিউরিটি এবং সরকারি কর্মকর্তা দ্বারা পরিচালিত হওয়ায় এখানে আপনার প্রতিটি লেনদেন ও তথ্য সম্পূর্ণ সুরক্ষিত থাকে।\n\n🚀 *গ্রুপে খুব সহজেই যুক্ত হওয়ার নিয়ম:*\n\n1️⃣ ইনবক্সে *4* লিখে আমাদের অফিশিয়াল *১৯ পয়েন্টের ভেরিফিকেশন ফরমটি* দ্রুত সংগ্রহ করে নিন।\n2️⃣ ফরমের প্রতিটি তথ্য (আপনার নাম, NID নম্বর, সচল মোবাইল নম্বর, বিকাশ/নগদ অ্যাকাউন্ট ইত্যাদি) খুব যত্নসহকারে এবং সঠিকভাবে পূরণ করুন।\n3️⃣ আপনার নিজ ও বাবা/মায়ের NID কার্ড বা জন্ম সনদের কপি এবং আপনার নিজের একটি স্পষ্ট সদ্য তোলা ছবি প্রস্তুত রাখুন।\n4️⃣ সম্পূর্ণ পূরণকৃত ফরম ও ডকুমেন্টসগুলো সরাসরি *01406356574* এই নাম্বারে পাঠিয়ে দিন।\n\n⏳ সমস্ত ডকুমেন্টস ও তথ্য যাচাই-বাছাই করে সর্বোচ্চ ২৪ ঘণ্টার মধ্যে আপনাকে আমাদের অফিশিয়াল ভেরিফাইড গ্রুপে যুক্ত করে নেওয়া হবে।\n\nআজই ফরম সংগ্রহ করে যুক্ত হয়ে যান দেশের সবচেয়ে নিরাপদ ও বিশ্বস্ত প্ল্যাটফর্মে! 🛡️✨";
                await sock.sendMessage(senderId, { text: joinText }, { quoted: msg });
                return;
            }

            if (textLower === '4' || textLower.includes('ফরম')) {
                let fullForm = "🔥 ডিফেন্স সেল বাজার 👈 ১০০% ভেরিফাই নিড গ্রুপ এর অফিসিয়াল ফর্ম ✅\n100% ভেরিফাই গ্রুপ এ এড হতে এই ডকুমেন্ট গুলো লাগবে।\n\n1️⃣। আপনার নামঃ\n2️⃣। আপনার (NID) নাম্বারঃ\n3️⃣। পেশাঃ {বাধ্যতামূলক}\n4️⃣। আপনার ফেইজবুক আইডি লিংক:\n5️⃣। আপনার সচল ৩টি মোবাইল নাম্বার :\n১/ \n২/ \n৩/ \n\n6️⃣। আপনার whatsapp নাম্বারঃ\n\n7️⃣। আপনার বর্তমান ঠিকানা\nগ্রামঃ\nপোঃ\nথানাঃ\nজেলাঃ\n\n8️⃣। আপনার একাউন্ট নাম্বার এবং এগুলো একাউন্টের স্ক্রীনশট দিবেন কার নামে উল্লেখ্য করে দিবেন।\n✅ বিকাশ =\n✅ নগদ =\n✅ রকেট =\n✅ সেলфин =\n\n9️⃣। পিতার নামঃ\n★★পেশাঃ\n1️⃣0️⃣। পিতার মোবাইল নম্বরঃ\n1️⃣1️⃣। মাতার নামঃ\n1️⃣2️⃣। মাতার নম্বরঃ\n\n1️⃣3️⃣। নিজের ভাই বা বোনের সচল দুইটি নাম্বার\n১/ = (বোন)\n২/ = (ভাই)\n{বাধ্যতামূলক}\n\n1️⃣4️⃣। দুই জন বন্ধুর নাম সহ নাম্বার\n১।\n২।\n\n1️⃣5️⃣। চাচা ও মামা নাম সহ নাম্বার /শ্বশুর _শ্বাশুড়ি\n১।\n২।\n৩।\n\n1️⃣6️⃣। দুইজন প্রতিবেশীর নাম সহ নাম্বার\n১।\n২।\n\n1️⃣7️⃣। যে সকল গ্রুপে এড আছেন একটি স্ক্রিনশট দেন\n\n1️⃣8️⃣। যে কোন একটা ভেরিফাই গ্রুপের এডমিনের নাম সহ নাম্বারঃ\n1️⃣9️⃣। রেফারেন্সকারীর নাম সহ নাম্বারঃ\n\nডকুমেন্টস যেগুলো দিবেন:\n🔰🔰 নিজ এবং বাবা/মা NID/জন্ম সনদ/ বিদ্যুৎ বিলের কপি এর ছবিঃ (উভয় পৃষ্ঠা) নিজের সদ্য তোলা একটি ছবি (বাধ্যতামূলক) ✅🆗✅\n\n📌 ফরম জমা দেওয়ার নিয়ম:\nপূর্ণাঙ্গ ফরমটি পূরণ করে সরাসরি 01406356574 এই নাম্বারে জমা দিন। সকল ডকুমেন্টস ঠিক থাকলে ২৪ ঘন্টার মধ্যে আপনাকে ভেরিফাই করে এড করা হবে।";
                await sock.sendMessage(senderId, { text: fullForm }, { quoted: msg });
                return;
            }

            if (textLower === '5' || textLower.includes('হটলাইন') || textLower.includes('নম্বর')) {
                let hotlineText = "📞 *হটলাইন নাম্বার:* 01970693119\nযেকোনো প্রয়োজনে যোগাযোগ করুন।";
                await sock.sendMessage(senderId, { text: hotlineText }, { quoted: msg });
                return;
            }

            if (textLower === '6' || textLower.includes('এডমিন') || textLower.includes('কে')) {
                let adminText = "👑 *প্রধান এডমিন পরিচিতি* 🛡️\n\nএস, আই মেহেদী হাসান\nসরকারি কর্মকর্তা, কক্সবাজার ও ঢাকা\n\nআমাদের এই শতভাগ নিরাপদ ও বিশ্বস্ত প্ল্যাটফর্মের সার্বিক ব্যবস্থাপনা ও প্রশাসনিক কার্যক্রম সরাসরি তাঁর কঠোর তত্ত্বাবধানে পরিচালিত হয়।";
                await sock.sendMessage(senderId, { text: adminText }, { quoted: msg });
                return;
            }

            let welcome = "আসসালামু আলাইকুম ওয়া রাহমাতুল্লাহ! 🌹\n\n🛡️ *Defence Sell Bazar Assistant* 🤝\n\nসঠিক তথ্য জানতে নিচের নম্বরগুলো পাঠান:\n1️⃣ গ্রুপের পরিচয় ও বিশ্বস্ততা\n2️⃣ গ্রুপের ফি\n3️⃣ আমি গ্রুপে এড হতে চাই\n4️⃣ গ্রুপের ফরম\n5️⃣ গ্রুপের হট লাইন নাম্বার\n6️⃣ গ্রুপের মেইন এডমিন কে";
            await sock.sendMessage(senderId, { text: welcome }, { quoted: msg });
            return;
        }
    });
}

startBot();

