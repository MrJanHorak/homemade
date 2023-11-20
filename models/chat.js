// creating a schema for a socketIo chat between two users
// this is a one to one chat
const mongoose = require('mongoose');

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
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Chat = mongoose.model('Chat', chatSchema);
module.exports = Chat;
