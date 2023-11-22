import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const projectComment = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'Profile' },
    name: String,
    avatar: String,
    content: String,
  },
  {
    timestamps: true,
  }
);

const projectSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    categories: {
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
            'OutdoorAndSurvivalSkills',
            'Papercrafts',
            'Photography',
            'Pottery',
            'Printmaking',
            'Quilting',
            'Recycling',
            'Repurposing',
            'Robotics',
            'Sculpture',
            'Sewing',
            'Upcycling',
            'VirtualRealityCreations',
            'Weaving',
            'Woodcarving',
            'Woodturning',
            'Woodworking',
          ],
        },
      ],
      required: true,
    },
    otherCategory: [String],
    buildPictures: [String],
    materialsNeeded: [String],
    toolsNeeded: [String],
    externalLinks: [String],
    buildInstructions: {
      type: [String],
      required: true,
    },
    buildTime: Number,
    difficulty: Number,
    comments: [projectComment],
    owner: { type: Schema.Types.ObjectId, ref: 'Profile' },
    ownerName: String,
    ownerAvatar: String,
    dateBuilt: Date,
    likes: [{ type: Schema.Types.ObjectId, ref: 'Profile' }],
    rating: [Number],
    visible: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

const Project = mongoose.model('Project', projectSchema);
export { Project };
