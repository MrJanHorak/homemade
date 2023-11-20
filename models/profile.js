import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const profileSchema = new Schema(
  {
    name: String,
    avatar: String,
    role: { type: String, default: 'user' },
    projects: [{ type: Schema.Types.ObjectId, ref: 'Project' }],
    likes: [{ type: Schema.Types.ObjectId, ref: 'Project' }],
    follows: [{ type: Schema.Types.ObjectId, ref: 'Profile' }],
    comments: [{ type: Schema.Types.ObjectId, ref: 'Comment' }],
    saves: [{ type: Schema.Types.ObjectId, ref: 'Project' }],
    chats: [{ type: Schema.Types.ObjectId, ref: 'Chat' }],
  },
  {
    timestamps: true,
  }
);

const Profile = mongoose.model('Profile', profileSchema);

export { Profile };
