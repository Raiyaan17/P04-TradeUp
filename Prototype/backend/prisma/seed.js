const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

const FEATURED_SYMBOLS = [
  'ABL', 'ABOT', 'AGP', 'AHCL', 'AICL', 'AIRLINK', 'AKBL', 'APL', 'ATLH', 'ATRL',
  'BAFL', 'BAHL', 'BNWM', 'BOP', 'BWCL', 'CHCC', 'CNERGY', 'COLG', 'CPHL', 'DCR',
  'DGKC', 'EFERT', 'ENGROH', 'FABL', 'FATIMA', 'FCCL', 'FFC', 'FFL', 'FHAM', 'GADT',
  'GAL', 'GHGL', 'GHNI', 'GLAXO', 'HALEON', 'HBL', 'HCAR', 'HINOON', 'HMB', 'HUBC',
  'HUMNL', 'IBFL', 'ILP', 'INDU', 'INIL', 'ISL', 'JDWS', 'JVDC', 'KAPCO', 'KEL',
  'KOHC', 'KTML', 'LCI', 'LOTCHEM', 'LUCK', 'MARI', 'MCB', 'MEBL', 'MEHT', 'MLCF',
  'MTL', 'MUREB', 'NATF', 'NBP', 'NESTLE', 'NML', 'NPL', 'OGDC', 'PABC', 'PAEL',
  'PAKT', 'PGLC', 'PIBTL', 'PIOC', 'PKGS', 'POL', 'POWER', 'PPL', 'PSEL', 'PSO',
  'PSX', 'PTC', 'RMPL', 'SAZEW', 'SCBPL', 'SEARL', 'SHFA', 'SNGP', 'SRVI', 'SSGC',
  'SSOM', 'SYS', 'TGL', 'THALL', 'TPLRF1', 'TRG', 'UBL', 'UPFL', 'YOUW',
];

const SYMBOL_NAME_MAP = {
  ABL: 'Allied Bank Ltd.',
  ABOT: 'Abbott Laboratories (Pak) Ltd.',
  AGP: 'AGP Ltd.',
  AHCL: 'Arif Habib Corporation Ltd.',
  AICL: 'Adamjee Insurance Company Ltd.',
  AIRLINK: 'Air Link Communication Ltd',
  AKBL: 'Askari Bank Ltd.',
  APL: 'Attock Petroleum Ltd.',
  ATLH: 'Atlas Honda Ltd.',
  ATRL: 'Attock Refinery Ltd.',
  BAFL: 'Bank Alfalah Ltd.',
  BAHL: 'Bank AL-Habib Ltd.',
  BNWM: 'Bannu Woollen Mills Ltd.',
  BOP: 'The Bank Of Punjab',
  BWCL: 'Bestway Cement Ltd',
  CHCC: 'Cherat Cement Company Ltd.',
  CNERGY: 'Cnergyico Pk Ltd.',
  COLG: 'Colgate Palmolive (Pak) Ltd.',
  CPHL: 'Citi Pharma Ltd.',
  DCR: 'Dolmen City Reit',
  DGKC: 'D. G. Khan Cement Company Ltd.',
  EFERT: 'Engro Fertilizers Ltd.',
  ENGROH: 'Engro Holding Ltd.',
  FABL: 'Faysal Bank Ltd.',
  FATIMA: 'Fatima Fertilizer Company Ltd.',
  FCCL: 'Fauji Cement Company Ltd.',
  FFC: 'Fauji Fertilizer Company Ltd.',
  FFL: 'Fauji Foods Ltd.',
  FHAM: 'First Habib Modarba Ltd.',
  GADT: 'Gadoon Textile Mills Ltd.',
  GAL: 'Ghandhara Automobiles Ltd.',
  GHGL: 'Ghani Glass Ltd.',
  GHNI: 'Ghandhara Industries Ltd.',
  GLAXO: 'Glaxosmithkline (Pak) Ltd.',
  HALEON: 'Haleon Pakistan Ltd.',
  HBL: 'Habib Bank Ltd.',
  HCAR: 'Honda Atlas Cars (Pakistan) Ltd.',
  HINOON: 'Highnoon Laboratories Ltd.',
  HMB: 'Habib Metropolitan Bank Ltd.',
  HUBC: 'The Hub Power Company Ltd.',
  HUMNL: 'Hum Network Ltd.',
  IBFL: 'Ibrahim Fibre Ltd.',
  ILP: 'Interloop Limited',
  INDU: 'Indus Motor Company Ltd.',
  INIL: 'International Industries Ltd.',
  ISL: 'International Steels Ltd.',
  JDWS: 'JDW Sugar Mills Ltd.',
  JVDC: 'Javedan Corporation Ltd.',
  KAPCO: 'Kot Addu Power Company Ltd.',
  KEL: 'K-Electric Ltd.',
  KOHC: 'Kohat Cement Company Ltd.',
  KTML: 'Kohinoor Textile Mills Ltd.',
  LCI: 'Lucky Core Industries Ltd.',
  LOTCHEM: 'Lotte Chemical (Pak) Ltd.',
  LUCK: 'Lucky Cement Ltd.',
  MARI: 'Mari Energies Limited',
  MCB: 'MCB Bank Ltd.',
  MEBL: 'Meezan Bank Ltd.',
  MEHT: 'Mehmood Textile Mills Ltd.',
  MLCF: 'Maple Leaf Cement Factory Ltd.',
  MTL: 'Millat Tractors Ltd.',
  MUREB: 'Murree Brewery Company Ltd.',
  NATF: 'National Foods Ltd.',
  NBP: 'National Bank Of Pakistan',
  NESTLE: 'Nestle Pakistan Ltd.',
  NML: 'Nishat Mills Ltd.',
  NPL: 'Nishat Power Ltd.',
  OGDC: 'Oil & Gas Development Company Ltd.',
  PABC: 'Pakistan Aluminium Beverage Cans Ltd.',
  PAEL: 'Pak Elektron Ltd.',
  PAKT: 'Pakistan Tobacco Company Ltd.',
  PGLC: 'Pak Gulf Leasing Co. Ltd.',
  PIBTL: 'Pakistan International Bulk Terminal Ltd.',
  PIOC: 'Pioneer Cement Ltd.',
  PKGS: 'Packages Ltd.',
  POL: 'Pakistan Oilfields Ltd.',
  POWER: 'Power Cement Ltd.',
  PPL: 'Pakistan Petroleum Ltd.',
  PSEL: 'Pakistan Services Ltd.',
  PSO: 'Pakistan State Oil Company Ltd.',
  PSX: 'Pakistan Stock Exchange Ltd.',
  PTC: 'Pakistan Telecommunication Co. Ltd.',
  RMPL: 'Rafhan Maize Products Co. Ltd.',
  SAZEW: 'Sazgar Engineering Works Ltd.',
  SCBPL: 'Standard Chartered Bank Pakistan Ltd.',
  SEARL: 'The Searle Company Ltd.',
  SHFA: 'Shifa International Hospitals Ltd.',
  SNGP: 'Sui Northern Gas Pipelines Ltd.',
  SRVI: 'Service Industries Ltd.',
  SSGC: 'Sui Southern Gas Company Ltd.',
  SSOM: 'S. S. Oil Mills Ltd.',
  SYS: 'Systems Ltd.',
  TGL: 'Tariq Glass Industries Ltd.',
  THALL: 'Thal Ltd.',
  TPLRF1: 'TPL REIT Fund I',
  TRG: 'TRG Pakistan Ltd.',
  UBL: 'United Bank Ltd.',
  UPFL: 'Unilever Pakistan Foods Ltd.',
  YOUW: 'Yousuf Weaving Mills Ltd.',
};

const pakistaniNames = [
  "Ahmed Khan", "Ali Raza", "Aisha Bibi", "Bilal Tariq", "Fatima Hassan",
  "Hassan Mahmood", "Iqra Shafiq", "Kamran Ali", "Maryam Nawaz", "Muhammad Usman",
  "Nida Yasir", "Omar Farooq", "Qasim Shah", "Rabia Anum", "Saad Baig",
  "Sana Javed", "Tariq Jamil", "Umair Jaswal", "Usman Buzdar", "Waqar Zaka",
  "Zainab Abbas", "Zeeshan Shah", "Zara Noor", "Khadija Shah", "Fahad Mustafa"
];

// Rough price approximations for cost basis
const symbolPrices = {
  LUCK: 900, OGDC: 125, HBL: 110, HUBC: 120, SYS: 450,
  TRG: 70, ENGROH: 300, EFERT: 140, PSO: 160, UBL: 220,
  MCB: 230, MEBL: 210, FFC: 110, POL: 400, PPL: 115,
  NBP: 45, BAHL: 100, FCCL: 18, DGKC: 70, MLCF: 40,
  GADT: 200, NATF: 150, NESTLE: 7000, INDU: 1300, HCAR: 240
};

// Natural PSX Trading Comments
const postTemplates = [
  { title: "$SYMBOL looking bullish today!", content: "Volumes are picking up strongly on $SYMBOL. Looks like a breakout is imminent above resistance. Who else is holding?", tag: "STOCKS" },
  { title: "What are your thoughts on $SYMBOL?", content: "I've been tracking $SYMBOL for a while now. The recent dips make it look attractive, but macro conditions are worrying. Thoughts?", tag: "QUESTION" },
  { title: "Dividend play on $SYMBOL", content: "With the upcoming board meeting, I'm expecting a solid payout. Historically $SYMBOL has been a great dividend stock in my portfolio.", tag: "ANALYSIS" },
  { title: "Took profit on $SYMBOL", content: "Just sold my long position. Might enter again if it corrects 5-10%. Great run!", tag: "GENERAL" },
  { title: "Huge volume on $SYMBOL!", content: "Did anyone catch that spike in volume? Institutional buying maybe?", tag: "STOCKS" },
  { title: "Market sentiments this week", content: "With the recent policy rate decisions, expecting banks like UBL and MEBL to see some movement. Stay sharp.", tag: "NEWS" },
  { title: "$SYMBOL financials look weak", content: "Q3 earnings were below expectations. I'm bearish on $SYMBOL for the next quarter.", tag: "ANALYSIS" },
  { title: "Is it too late to buy $SYMBOL?", content: "Missed the rally this week... is it overbought now or still safe to enter?", tag: "QUESTION" },
];

const commentTemplates = [
  "Agreed, nice catch!",
  "I'm waiting for a dip before entering.",
  "Already loaded up!",
  "Not sure about this, market is too volatile rn.",
  "Technical indicators say otherwise.",
  "Holding for long term, dividends are worth it.",
  "Good analysis 👍",
  "Exactly my thoughts.",
  "Which broker do you use?",
  "I think it goes lower from here.",
];

const reactionTypes = ['LIKE', 'LOVE', 'FIRE', 'BEARISH', 'BULLISH'];
const sellReasons = ['TARGET_HIT', 'PANIC_EMOTION', 'NEEDED_CASH'];

async function main() {
  console.log('Seeding database...');
  const passwordHash = await bcrypt.hash('tradeup123', 10);
  
  // 1. STOCKS
  const stockMap = new Map();
  for (const symbol of FEATURED_SYMBOLS) {
    const name = SYMBOL_NAME_MAP[symbol] || symbol;
    const stock = await prisma.stock.upsert({
      where: { symbol },
      update: { name },
      create: { symbol, name, marketType: 'REG' },
    });
    stockMap.set(symbol, stock);
  }
  console.log('✅ Seeded 100 Stocks');

  // 2. USERS
  const users = [];
  for (let i = 0; i < 25; i++) {
    const name = pakistaniNames[i];
    const username = name.toLowerCase().replace(/\s+/g, '') + (i + 1);
    const email = `${username}@tradeup.com`;
    const balance = Math.floor(Math.random() * 450000) + 50000; // 50k to 500k
    const gender = Math.random() > 0.5 ? 'MALE' : 'FEMALE';
    
    // randomize created at between 1 and 30 days ago
    const createdAt = new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000));

    const user = await prisma.user.upsert({
      where: { email },
      update: { balance, name, username },
      create: {
        email,
        username,
        name,
        passwordHash,
        balance,
        gender,
        role: 'TRADER',
        createdAt
      }
    });
    users.push(user);
  }
  console.log('✅ Seeded 25 Users');

  // 3. PORTFOLIOS, TRANSACTIONS, WATCHLISTS
  for (const user of users) {
    // Watchlist (2-8 stocks)
    const numWatchlist = Math.floor(Math.random() * 7) + 2;
    const shuffledStocks = [...FEATURED_SYMBOLS].sort(() => 0.5 - Math.random());
    const watches = shuffledStocks.slice(0, numWatchlist);
    for (const sym of watches) {
      await prisma.watchlistItem.upsert({
        where: { userId_stockId: { userId: user.id, stockId: stockMap.get(sym).id } },
        update: {},
        create: {
          userId: user.id,
          stockId: stockMap.get(sym).id,
          createdAt: new Date(Date.now() - Math.floor(Math.random() * 10 * 24 * 60 * 60 * 1000))
        }
      });
    }

    // Portfolio (3-12 stocks)
    const numPortfolio = Math.floor(Math.random() * 10) + 3;
    const portStocks = shuffledStocks.slice(numWatchlist, numWatchlist + numPortfolio);
    
    for (const sym of portStocks) {
      const quantity = Math.floor(Math.random() * 495) + 5; // 5-500
      const basePrice = symbolPrices[sym] || (Math.floor(Math.random() * 200) + 20); // fallback price
      // add some variance
      const price = basePrice * (1 + (Math.random() * 0.2 - 0.1)); // +/- 10%
      
      const p = await prisma.portfolio.upsert({
        where: { userId_stockId: { userId: user.id, stockId: stockMap.get(sym).id } },
        update: { quantity, avgPrice: price },
        create: {
          userId: user.id,
          stockId: stockMap.get(sym).id,
          quantity,
          avgPrice: price,
          createdAt: new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000))
        }
      });

      // Buy transaction
      await prisma.transaction.create({
        data: {
          userId: user.id,
          stockId: stockMap.get(sym).id,
          type: 'BUY',
          quantity: quantity + Math.floor(Math.random() * 50), // Overbought and sold some
          price,
          total: price * quantity,
          createdAt: new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000))
        }
      });
      
      // Random Sell transactions
      if (Math.random() > 0.5) {
        const sellQty = Math.floor(Math.random() * 50) + 10;
        const sellPrice = price * (1 + (Math.random() * 0.2 - 0.05));
        const s = await prisma.transaction.create({
          data: {
            userId: user.id,
            stockId: stockMap.get(sym).id,
            type: 'SELL',
            quantity: sellQty,
            price: sellPrice,
            total: sellQty * sellPrice,
            sellReason: sellReasons[Math.floor(Math.random() * sellReasons.length)],
            sellNote: Math.random() > 0.5 ? "Took profits off the table" : null,
            createdAt: new Date(Date.now() - Math.floor(Math.random() * 10 * 24 * 60 * 60 * 1000))
          }
        });
      }
    }
  }
  console.log('✅ Seeded Portfolios, Watchlists, Transactions');

  // 4. FRIENDSHIPS
  // approx 40 friendships
  for (let i = 0; i < 40; i++) {
    const userA = users[Math.floor(Math.random() * users.length)];
    const userB = users[Math.floor(Math.random() * users.length)];
    if (userA.id === userB.id) continue;
    
    // Sort to avoid duplicate pairs in unique constraint
    const [sender, receiver] = userA.id < userB.id ? [userA, userB] : [userB, userA];
    
    await prisma.friendship.upsert({
      where: { senderId_receiverId: { senderId: sender.id, receiverId: receiver.id } },
      update: {},
      create: {
        senderId: sender.id,
        receiverId: receiver.id,
        status: Math.random() > 0.2 ? 'ACCEPTED' : 'PENDING',
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 20 * 24 * 60 * 60 * 1000))
      }
    });
  }
  console.log('✅ Seeded Friendships');

  // Clean old posts to avoid duplicating non-unique content on re-run
  await prisma.comment.deleteMany({});
  await prisma.reaction.deleteMany({});
  await prisma.savedPost.deleteMany({});
  await prisma.post.deleteMany({});

  // 5. POSTS AND REACTIONS
  const createdPosts = [];
  const numPosts = 45;
  const tags = ["GENERAL", "STOCKS", "CRYPTO", "NEWS", "ANALYSIS", "QUESTION"];

  for (let i = 0; i < numPosts; i++) {
    const author = users[Math.floor(Math.random() * users.length)];
    const template = postTemplates[Math.floor(Math.random() * postTemplates.length)];
    const symbol = FEATURED_SYMBOLS[Math.floor(Math.random() * FEATURED_SYMBOLS.length)];
    
    const title = template.title.replace('$SYMBOL', symbol);
    const content = template.content.replace('$SYMBOL', symbol);
    const rawTag = template.tag;
    const finalTag = tags.includes(rawTag) ? rawTag : "GENERAL";
    
    const post = await prisma.post.create({
      data: {
        authorId: author.id,
        title,
        content,
        tag: finalTag,
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 15 * 24 * 60 * 60 * 1000))
      }
    });
    createdPosts.push(post);

    // Add reactions
    const numReactions = Math.floor(Math.random() * 8) + 1; // 1 to 8 reactions per post
    const reactedUsers = new Set();
    for (let r = 0; r < numReactions; r++) {
       const u = users[Math.floor(Math.random() * users.length)];
       if (reactedUsers.has(u.id)) continue;
       reactedUsers.add(u.id);

       await prisma.reaction.create({
         data: {
           postId: post.id,
           userId: u.id,
           type: reactionTypes[Math.floor(Math.random() * reactionTypes.length)],
           createdAt: new Date(post.createdAt.getTime() + Math.random() * 24 * 60 * 60 * 1000)
         }
       });
    }

    // Saved post
    if (Math.random() > 0.5) {
      const u = users[Math.floor(Math.random() * users.length)];
      // use upsert for saved post
      await prisma.savedPost.upsert({
        where: { userId_postId: { userId: u.id, postId: post.id } },
        update: {},
        create: {
          postId: post.id,
          userId: u.id,
        }
      });
    }
  }
  console.log('✅ Seeded Posts, Reactions, SavedPosts');

  // 6. COMMENTS
  for (const post of createdPosts) {
    const numComments = Math.floor(Math.random() * 5); // 0 to 4 comments
    const topLevelComm = [];
    for (let c = 0; c < numComments; c++) {
      const author = users[Math.floor(Math.random() * users.length)];
      const content = commentTemplates[Math.floor(Math.random() * commentTemplates.length)];
      const comm = await prisma.comment.create({
        data: {
          postId: post.id,
          authorId: author.id,
          content,
          createdAt: new Date(post.createdAt.getTime() + Math.random() * 48 * 60 * 60 * 1000)
        }
      });
      topLevelComm.push(comm);
    }
    
    // Replies
    if (topLevelComm.length > 0 && Math.random() > 0.5) {
      const parent = topLevelComm[Math.floor(Math.random() * topLevelComm.length)];
      const author = users[Math.floor(Math.random() * users.length)];
      await prisma.comment.create({
        data: {
          postId: post.id,
          authorId: author.id,
          parentId: parent.id,
          content: "I completely agree with this reply.",
          createdAt: new Date(parent.createdAt.getTime() + Math.random() * 12 * 60 * 60 * 1000)
        }
      });
    }
  }
  console.log('✅ Seeded Comments');
  
  console.log('🎉 Seeding complete successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
