import mongoose from 'mongoose';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Chat } from '../models/chat.js';
import { ChatMessage } from '../models/chatMessage.js';

const APPLY = process.argv.includes('--apply');
const ROLLBACK = process.argv.includes('--rollback');
const BATCH_SIZE = 500;
const ROLLBACK_SIZE_LIMIT = 12 * 1024 * 1024;

const ensureDatabaseUrl = () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
  if (APPLY && ROLLBACK) throw new Error('Choose either --apply or --rollback.');
};

const migrateChat = async (chat, apply = APPLY) => {
  const sourceMessages = chat.messages || [];
  const ids = sourceMessages.map((message) => message._id);
  if (new Set(ids.map(String)).size !== ids.length) {
    throw new Error(`Chat ${chat._id} contains duplicate embedded message IDs.`);
  }

  for (let offset = 0; offset < sourceMessages.length; offset += BATCH_SIZE) {
    const batch = sourceMessages.slice(offset, offset + BATCH_SIZE);
    const existing = await ChatMessage.find({ _id: { $in: batch.map((message) => message._id) } })
      .select('_id chat').lean().exec();
    if (existing.some((message) => !message.chat.equals(chat._id))) {
      throw new Error(`Chat ${chat._id} has a message ID already assigned to another chat.`);
    }
    if (apply) {
      await ChatMessage.bulkWrite(batch.map((message) => ({
        updateOne: {
          filter: { _id: message._id },
          update: {
            $set: {
              chat: chat._id,
              user: message.user || null,
              message: message.message || '',
              timestamp: message.timestamp || chat.createdAt || new Date(0),
              edited: Boolean(message.edited),
              editedAt: message.editedAt || null,
            },
          },
          upsert: true,
        },
      })), { ordered: true });
    }
  }

  if (!apply) return sourceMessages.length;
  await ChatMessage.deleteMany({ chat: chat._id, ...(ids.length ? { _id: { $nin: ids } } : {}) }).exec();
  const copiedCount = await ChatMessage.countDocuments({ chat: chat._id }).exec();
  if (copiedCount !== sourceMessages.length) {
    throw new Error(`Chat ${chat._id} verification failed: expected ${sourceMessages.length}, found ${copiedCount}.`);
  }
  if (apply) {
    const result = await Chat.updateOne(
      { _id: chat._id, messagesMigrated: { $ne: true } },
      { $set: { messagesMigrated: true }, $unset: { messages: 1 } },
    ).exec();
    if (result.matchedCount !== 1) throw new Error(`Chat ${chat._id} changed during migration; stop and inspect it.`);
  }
  return sourceMessages.length;
};

const rollbackChat = async (chat, apply = APPLY) => {
  const messages = await ChatMessage.find({ chat: chat._id }).sort({ _id: 1 }).lean().exec();
  const embedded = messages.map(({ _id, user, message, timestamp, edited, editedAt }) => ({
    _id, user, message, timestamp, edited: Boolean(edited), editedAt: editedAt || undefined,
  }));
  if (Buffer.byteLength(JSON.stringify(embedded), 'utf8') > ROLLBACK_SIZE_LIMIT) {
    throw new Error(`Chat ${chat._id} is too large for the conservative embedded rollback limit.`);
  }
  if (apply) {
    const result = await Chat.updateOne(
      { _id: chat._id, messagesMigrated: true },
      { $set: { messages: embedded }, $unset: { messagesMigrated: 1 } },
    ).exec();
    if (result.matchedCount !== 1) throw new Error(`Chat ${chat._id} changed during rollback; stop and inspect it.`);
  }
  return messages.length;
};

const run = async () => {
  await import('dotenv/config');
  ensureDatabaseUrl();
  await mongoose.connect(process.env.DATABASE_URL);
  let chatsSeen = 0;
  let messagesSeen = 0;
  const cursor = ROLLBACK
    ? Chat.find({ messagesMigrated: true }).select('_id').lean().cursor()
    : Chat.find({ messagesMigrated: { $ne: true } }).select('_id messages createdAt').lean().cursor();

  for await (const chat of cursor) {
    chatsSeen += 1;
    messagesSeen += ROLLBACK ? await rollbackChat(chat) : await migrateChat(chat);
  }

  console.log(`${APPLY ? 'Applied' : 'Dry run'} ${ROLLBACK ? 'rollback' : 'migration'} for ${chatsSeen} chats and ${messagesSeen} messages.`);
  if (!APPLY) console.log('No data was changed. Stop application writes before running with --apply.');
  else if (ROLLBACK) console.log('Keep the database backup. External message records remain available after rollback; verify the restored threads before resuming writes.');
  else console.log('Keep the database backup. Embedded arrays were removed after verification; verify migrated threads before resuming writes.');
};

export { migrateChat, rollbackChat };

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  run()
    .catch((error) => {
      console.error(`Chat message migration stopped: ${error.message}`);
      process.exitCode = 1;
    })
    .finally(async () => {
      await mongoose.disconnect();
    });
}
