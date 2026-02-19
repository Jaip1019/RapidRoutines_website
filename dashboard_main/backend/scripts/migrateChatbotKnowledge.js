try {
  require('dotenv').config();
} catch (e) {
  // ignore dotenv load failures in environments that inject vars
}

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const ChatbotKnowledge = require('../models/chatbotKnowledge');

const SOURCE_FILE = path.join(__dirname, '..', 'data', 'chatbot-knowledge-base.json');

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

async function run() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is required.');
  }

  if (!fs.existsSync(SOURCE_FILE)) {
    throw new Error(`Source file not found: ${SOURCE_FILE}`);
  }

  const raw = fs.readFileSync(SOURCE_FILE, 'utf8');
  const docs = JSON.parse(raw);
  if (!Array.isArray(docs)) {
    throw new Error('Knowledge base JSON must be an array.');
  }

  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const operations = docs
    .map((item, index) => {
      const content = String(item?.content || '').trim();
      if (!content) return null;
      const docId = String(item?.id || `doc-${index}`).trim();

      return {
        updateOne: {
          filter: { docId },
          update: {
            $set: {
              docId,
              content,
              tokens: tokenize(content),
            },
          },
          upsert: true,
        },
      };
    })
    .filter(Boolean);

  if (operations.length === 0) {
    console.log('No valid records found to migrate.');
    await mongoose.disconnect();
    return;
  }

  const result = await ChatbotKnowledge.bulkWrite(operations, { ordered: false });
  console.log('Migration complete');
  console.log(`Matched: ${result.matchedCount || 0}`);
  console.log(`Modified: ${result.modifiedCount || 0}`);
  console.log(`Upserted: ${result.upsertedCount || 0}`);
  console.log(`Processed: ${operations.length}`);

  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error('Migration failed:', error.message);
  try {
    await mongoose.disconnect();
  } catch (e) {
    // ignore
  }
  process.exit(1);
});
