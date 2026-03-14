import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const draftStepSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['instruction', 'tip', 'warning', 'checkpoint'],
      default: 'instruction',
    },
    title: {
      type: String,
      default: '',
    },
    content: {
      type: String,
      default: '',
    },
    imageIndexes: {
      type: [Number],
      default: [],
    },
  },
  { _id: false },
);

const projectDraftSchema = new Schema(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      default: '',
    },
    buildTime: {
      type: Number,
      default: undefined,
    },
    difficulty: {
      type: Number,
      default: undefined,
    },
    estimatedCost: {
      type: Number,
      default: undefined,
    },
    categories: {
      type: [String],
      default: [],
    },
    otherCategory: {
      type: [String],
      default: [],
    },
    materialsNeeded: {
      type: [String],
      default: [''],
    },
    toolsNeeded: {
      type: [String],
      default: [''],
    },
    externalLinks: {
      type: [String],
      default: [''],
    },
    visible: {
      type: Boolean,
      default: true,
    },
    buildSteps: {
      type: [draftStepSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

const ProjectDraft = mongoose.model('ProjectDraft', projectDraftSchema);

export { ProjectDraft };
