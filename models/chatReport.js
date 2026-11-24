import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const chatReportSchema = new Schema({
  chat: { type: Schema.Types.ObjectId, ref: 'Chat', required: true },
  message: { type: Schema.Types.ObjectId, required: true },
  reporter: { type: Schema.Types.ObjectId, ref: 'Profile', required: true },
  reportedProfile: { type: Schema.Types.ObjectId, ref: 'Profile', required: true },
  reason: { type: String, enum: ['harassment', 'spam', 'unsafe', 'other'], required: true },
  details: { type: String, maxlength: 500, default: '' },
  messageSnapshot: { type: String, required: true, maxlength: 4000 },
  status: { type: String, enum: ['open', 'reviewed', 'dismissed'], default: 'open' },
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'Profile' },
  reviewedAt: Date,
}, { timestamps: true });

chatReportSchema.index({ reporter: 1, message: 1 }, { unique: true });
chatReportSchema.index({ status: 1, createdAt: -1 });

const ChatReport = mongoose.model('ChatReport', chatReportSchema);

export { ChatReport };
