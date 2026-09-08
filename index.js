const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const fs = require('fs');

const TARGET_PHONE_NUMBER = '8801884913535';
const PRIMARY_GROUP_ID = '120363303388070671@g.us';
const SENT_FILE = './sent_users.json';

let sentUsers = {};
if (fs.existsSync(SENT_FILE)) {
    try {
        sentUsers = JSON.parse(fs.readFileSync(SENT_FILE, 'utf-8'));
    } catch (e) {
        sentUsers = {};
    }
}

function saveSentUsers() {
    fs.writeFileSync(SENT_FILE, JSON.stringify(sentUsers, null, 2));
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
            console.log('Meraj Auto Protect বট সফলভাবে সংযুক্ত হয়েছে! ✅');
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const senderId = msg.key.remoteJid;
        const isGroup = senderId.endsWith('@g.us');
        const textRaw = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').trim();
        const textLower = textRaw.toLowerCase();

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
            // "মাসিক চার্জ ডান" বা পেমেন্ট নাম্বার দিয়ে রিসিভ তৈরি করার লজিক
            if (textLower.includes('মাসিক চার্জ ডান') || textLower.includes('monthly charge done') || textLower.includes('01850107340') || textLower.includes('8801850107340')) {
                
                // ইউজারের লেখা থেকে যেকোনো মোবাইল নাম্বার বা সংখ্যা খুঁজে বের করা (যদি থাকে)
                const phoneMatch = textRaw.match(/01[3-9]\d{8}/g);
                const extractedPhone = phoneMatch ? phoneMatch[0] : '__________________';

                // ইউজারের লেখা থেকে টাকার পরিমাণ বা সংখ্যা খুঁজে বের করা (যেমন: ২০০, ৪০০, ৫০০ টাকা)
                const amountMatch = textRaw.match(/\d+/g);
                // যদি মেসেজে শুধু নাম্বার বা পেমেন্ট নাম্বার থাকে, তবে অ্যামাউন্ট ফাকা বা সংখ্যা ধরে বসানো
                let extractedAmount = '__________________';
                if (amountMatch) {
                    // যদি নাম্বারের বাইরে আলাদা কোনো ছোট সংখ্যা বা অ্যামাউন্ট থাকে
                    const possibleAmounts = amountMatch.filter(num => num.length < 10);
                    if (possibleAmounts.length > 0) {
                        extractedAmount = possibleAmounts[possibleAmounts.length - 1];
                    }
                }

                // বটের মাধ্যমে আজকের নির্দিষ্ট তারিখ এবং বর্তমান মাস স্বয়ংক্রিয়ভাবে সেট করা
                const currentDate = new Date().toLocaleDateString('bn-BD');
                const currentMonth = new Date().toLocaleString('bn-BD', { month: 'long', year: 'numeric' });

                let paymentReceipt = `মাসিক চার্জ পরিশোধের তথ্য\n\nপেমেন্ট প্রদানকারীর নাম্বার: ${extractedPhone}\n\nপেমেন্ট গ্রহণকারীর নাম্বার: 01850107340\n\nযে মাসের মাসিক চার্জ পরিশোধ করা হবে: ${currentMonth}\n\nপেমেন্টের তারিখ: ${currentDate}\n\nপরিশোধের পরিমাণ: ৳${extractedAmount}\n\nপেমেন্টের অবস্থা: পরিশোধ সম্পন্ন ✅`;

                await sock.sendMessage(senderId, { text: paymentReceipt }, { quoted: msg });
                return;
            }

            if (textLower === '1' || textLower.includes('পরিচয়') || textLower.includes('গ্রুপ সম্পর্কে') || textLower.includes('বিশ্বস্ত')) {
                let info = "📌 *Meraj Auto Protect - এর পরিচয় ও বিশ্বস্ততা* 🛡️\n\nডিফেন্স সেল বাজার বাংলাদেশের অন্যতম একটি বিশ্বস্ত, নিরাপদ ও ভেরিফাইড অনলাইন প্ল্যাটফর্ম। এটি সম্পূর্ণ সরকারি কর্মকর্তা দ্বারা পরিচালিত হওয়ায় এখানে প্রতিটি লেনদেন এবং সদস্য অন্তর্ভুক্তি অত্যন্ত কড়াকড়ি ও নিরাপত্তার সাথে পরিচালনা করা হয়।\n\n🤝 *কেন আমরা শতভাগ বিশ্বস্ত?*\n✅ *আইনশৃঙ্খলা ও সিকিউরিটি:* গ্রুপটি সরকারি কর্মকর্তা দ্বারা সরাসরি মনিটরিং করা হয়, ফলে এখানে প্রতারণার কোনো সুযোগ নেই।\n✅ *নিরাপদ লেনদেন:* আমাদের গ্রুপের প্রতিটি লেনদেন সম্পূর্ণ স্বচ্ছ এবং বিশ্বস্ততার সাথে সম্পন্ন করা হয়।\n✅ *ভেরিফাইড মেম্বার:* প্রতিটি সদস্যকে কঠোর ভেরিফিকেশন ফরম এবং NID ও ছবি যাচাই করে গ্রুপে যুক্ত করা হয়।\n\nনিরাপদ ও নির্ভরযোগ্য প্ল্যাটফর্মে আপনাকে স্বাগতম! 🤝";
                await sock.sendMessage(senderId, { text: info }, { quoted: msg });
                return;
            }

            if (textLower === '2' || textLower.includes('ফি')) {
                let feeText = "💰 *Meraj Auto Protect - মেম্বারশিপ ফি ও বিশেষ ছাড় প্যাকেজ* 🚀\n\nআমাদের ভেরিফাইড গ্রুপগুলোতে যুক্ত হওয়ার মাধ্যমেই আপনি পাচ্ছেন শতভাগ নিরাপদ ও বিশ্বস্ত প্ল্যাটফর্মের সুবিধা। আপনাদের সুবিধার্থে ফি এর তালিকা নিচে দেওয়া হলো:\n\n1️⃣ *১ নং প্রিমিয়াম গ্রুপ*\n* মেম্বার সংখ্যা: ৯০০+ সক্রিয় ও বিশ্বস্ত সদস্য\n* এন্ট্রি ফি: *৪০০ টাকা*\n\n2️⃣ *২ নং এক্সক্লুসিভ গ্রুপ*\n* মেম্বার সংখ্যা: ৫০০+ সক্রিয় ও বিশ্বস্ত সদস্য\n* এন্ট্রি ফি: *২০০ টাকা*\n\n🔥 *সুপার সেভার অফার (কম্বো প্যাক):*\nএকসাথে *১ নং ও ২ নং উভয় গ্রুপে* যুক্ত হতে চাইলে মোট ফি মাত্র *৪৫০ টাকা*!";
                await sock.sendMessage(senderId, { text: feeText }, { quoted: msg });
                return;
            }

            if (textLower === '3' || textLower.includes('এড হতে চাই') || textLower.includes('যুক্ত')) {
                let joinText = "🌟 *'Meraj Auto Protect' - এ আপনাকে স্বাগতম!* 🤝\n\n🚀 *গ্রুপে খুব সহজেই যুক্ত হওয়ার নিয়ম:*\n\n1️⃣ ইনবক্সে *4* লিখে আমাদের অফিশিয়াল ভেরিফিকেশন ফরমটি দ্রুত সংগ্রহ করে নিন।\n2️⃣ ফরমের প্রতিটি তথ্য খুব যত্নসহকারে এবং সঠিকভাবে পূরণ করুন।\n3️⃣ আপনার নিজ ও বাবা/মায়ের NID কার্ড, বিদ্যুৎ বিলের কাগজ এবং আপনার নিজের একটি স্পষ্ট সদ্য তোলা ছবি প্রস্তুত রাখুন।\n4️⃣ সম্পূর্ণ পূরণকৃত ফরম ও ডকুমেন্টসগুলো সরাসরি *01406356574* এই নাম্বারে পাঠিয়ে দিন।\n\n⏳ সমস্ত ডকুমেন্টস ও তথ্য যাচাই-বাছাই করে সর্বোচ্চ ১২ ঘণ্টার মধ্যে আপনাকে আমাদের অফিশিয়াল ভেরিফাইড গ্রুপে যুক্ত করে নেওয়া হবে।";
                await sock.sendMessage(senderId, { text: joinText }, { quoted: msg });
                return;
            }

            if (textLower === '4' || textLower.includes('ফরম') || textLower.includes('নম্বর পরিবর্তন')) {
                let fullForm = "🔥 Meraj Auto Protect 👈 ১০০% ভেরিফাই নিড গ্রুপ এর অফিসিয়াল ফর্ম ও নম্বর পরিবর্তন ফরম ✅\n\n1️⃣। আপনার নামঃ\n2️⃣। আপনার (NID) নাম্বারঃ\n3️⃣। পেশাঃ {বাধ্যতামূলক}\n4️⃣। আপনার ফেইজবুক আইডি লিংক:\n5️⃣। আপনার সচল ৩টি মোবাইল নাম্বার :\n৬। আপনার WhatsApp নম্বর (বর্তমান ও নতুন যদি পরিবর্তন করতে চান):\n\n🔄 *নম্বর পরিবর্তনের কারণ (যদি প্রযোজ্য হয়):*\n(যেমন: সিম হারিয়ে যাওয়া, নষ্ট হওয়া, নিরাপত্তা ইস্যু বা ব্যক্তিগত কারণ)\n\n7️⃣। আপনার বর্তমান ঠিকানা (গ্রাম, পোঃ, থানা, জেলা)\n8️⃣। আপনার একাউন্ট নাম্বার (বিকাশ/নগদ/রকেট/সেলফিন) এবং স্ক্রিনশট কার নামে আছে উল্লেখ করুন।\n9️⃣। পিতার নাম ও পেশাঃ \n1️⃣0️⃣। পিতার মোবাইল নম্বরঃ\n1️⃣1️⃣। মাতার নাম ও নম্বরঃ\n1️⃣2️⃣। নিজের ভাই বা বোনের সচল দুটি নাম্বার (বোন/ভাই):\n1️⃣3️⃣। দুই জন বন্ধুর নাম সহ নাম্বার:\n1️⃣4️⃣। চাচা/মামা/শ্বশুরবাড়ির নাম ও নাম্বার:\n1️⃣5️⃣। দুইজন প্রতিবেশীর নাম ও নাম্বার:\n\n🔰 *প্রয়োজনীয় ডকুমেন্টস ও শর্তাবলী:*\n• **সিম কার্ডের মালিকানা:** নতুন সিম কার্ডটি অবশ্যই নিজের NID দিয়ে নিবন্ধিত হতে হবে।\n• **বিদ্যুৎ বিল:** বর্তমান ঠিকানার সাম্প্রতিক বিদ্যুৎ বিলের কাগজ।\n• **এনআইডি:** নিজ এবং বাবা/মায়ের NID/জন্ম সনদ ও নিজের সদ্য তোলা ছবি।\n• **এন্ট্রি ফি:** নম্বর পরিবর্তন বা নতুন এড হওয়ার ক্ষেত্রে ১০০৳ ফি (বিকাশ/নগদ);\n\n📌 *ফরম জমা দেওয়ার নিয়ম ও সময়সীমা:*\nপূর্ণাঙ্গ ফরম ও ডকুমেন্টসগুলো সরাসরি **01406356574** এই নাম্বারে জমা দিন। ডকুমেন্টস শতভাগ সঠিক ও বৈধ থাকলে **১২ ঘণ্টার মধ্যে** আপনার আবেদন প্রসেস ও নম্বর আপডেট করা হবে।";
                await sock.sendMessage(senderId, { text: fullForm }, { quoted: msg });
                return;
            }

            if (textLower === '5' || textLower.includes('হটলাইন') || textLower.includes('নম্বর')) {
                let hotlineText = "📞 *হটলাইন নাম্বার:* 01970693119\nযেকোনো প্রয়োজনে যোগাযোগ করুন।";
                await sock.sendMessage(senderId, { text: hotlineText }, { quoted: msg });
                return;
            }

            if (textLower === '6' || textLower.includes('এডমিন') || textLower.includes('কে')) {
                let adminText = "👑 *প্রধান এডমিন পরিচিতি* 🛡️\n\nএস, আই মেহেদী হাসান\nসরকারি কর্মকর্তা, কক্সবাজার ও ঢাকা";
                await sock.sendMessage(senderId, { text: adminText }, { quoted: msg });
                return;
            }

            // সাধারণ ওয়েলকাম মেসেজ লজিক (জীবনে মাত্র ১ বার যাবে)
            if (!sentUsers[senderId]) {
                let welcome = "আসসালামু আলাইকুম ওয়া রাহমাতুল্লাহ! 🌹\n\n🛡️ *Meraj Auto Protect Assistant* 🤝\n\nসঠিক তথ্য জানতে নিচের নম্বরগুলো পাঠান:\n1️⃣ গ্রুপের পরিচয় ও বিশ্বস্ততা\n2️⃣ গ্রুপের ফি\n3️⃣ আমি গ্রুপে এড হতে চাই\n4️⃣ গ্রুপের ফরম ও নম্বর পরিবর্তন\n5️⃣ গ্রুপের হট লাইন নাম্বার\n6️⃣ গ্রুপের মেইন এডমিন কে";
                
                await sock.sendMessage(senderId, { text: welcome }, { quoted: msg });
                
                sentUsers[senderId] = true;
                saveSentUsers();
            }
            return;
        }
    });
}

startBot();

