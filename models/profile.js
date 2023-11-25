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
    description: String,
    location: String,
    website: String,
    social: {
      facebook: String,
      twitter: String,
      linkedin: String,
      instagram: String,
      youtube: String,
      snapchat: String,
      pinterest: String,
      reddit: String,
      tiktok: String,
      twitch: String,
      discord: String,
      github: String,
      other: String,
    },
    skills: {
      type: [
        {
          type: String,
          enum: [
            '3DPrinting',
            'Art',
            'Automotive',
            'Beekeeping',
            'CandleMaking',
            'Coding',
            'Cosplay',
            'Crafts',
            'Crochet',
            'DIYBeautyAndSkincare',
            'DIYEducationalToys',
            'DIYElectronicsKits',
            'DIYFurniture',
            'DIYGiftsAndHandmadeCards',
            'DIYHomeDecor',
            'Electronics',
            'Fashion',
            'Food',
            'GameDevelopment',
            'Gardening',
            'GraphicDesign',
            'HomeImprovement',
            'Jewelry',
            'Knitting',
            'Leatherworking',
            'Metalworking',
            'ModelBuilding',
            'Music',
            'Other',
            'Painting',
            'Photography',
            'Pottery',
            'Quilting',
            'Robotics',
            'Sculpture',
            'Sewing',
            'Soapmaking',
            'Taxidermy',
            'Upcycling',
            'VideoProduction',
            'Weaving',
            'Woodworking',
          ],
        },
      ],
    },
  },
  {
    timestamps: true,
  }
);

const Profile = mongoose.model('Profile', profileSchema);

export { Profile };
