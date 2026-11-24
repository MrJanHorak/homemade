import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const chatMessageSchema = new Schema({
  chat: { type: Schema.Types.ObjectId, ref: 'Chat', required: true },
  user: { type: Schema.Types.ObjectId, ref: 'Profile' },
  message: { type: String, required: true, maxlength: 4000 },
  timestamp: { type: Date, default: Date.now },
  edited: { type: Boolean, default: false },
  editedAt: Date,
}, { timestamps: true });

chatMessageSchema.index({ chat: 1, _id: -1 });

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

export { ChatMessage };
