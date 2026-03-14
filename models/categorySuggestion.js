import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const categorySuggestionSchema = new Schema(
  {
    label: {
      type: String,
      required: true,
      trim: true,
    },
    normalizedLabel: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    usageCount: {
      type: Number,
      default: 1,
    },
    suggestedBy: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Profile' }],
      default: [],
    },
    firstSuggestedAt: {
      type: Date,
      default: Date.now,
    },
    lastSuggestedAt: {
      type: Date,
      default: Date.now,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Profile',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    promoted: {
      type: Boolean,
      default: false,
      index: true,
    },
    promotedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Profile',
      default: null,
    },
    promotedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

const CategorySuggestion = mongoose.model(
  'CategorySuggestion',
  categorySuggestionSchema,
);

export { CategorySuggestion };
