import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const chatSchema = new Schema(
  {
    user1: { type: Schema.Types.ObjectId, ref: 'Profile' },
    user2: { type: Schema.Types.ObjectId, ref: 'Profile' },
    project: { type: Schema.Types.ObjectId, ref: 'Project' },
    messages: [
      {
        user: { type: Schema.Types.ObjectId, ref: 'Profile' },
        message: String,
        timestamp: Date,
        edited: { type: Boolean, default: false },
        editedAt: Date,
      },
    ],
    hiddenBy: [{ type: Schema.Types.ObjectId, ref: 'Profile' }],
  },
  {
    timestamps: true,
  }
);

const Chat = mongoose.model('Chat', chatSchema);

export { Chat };
