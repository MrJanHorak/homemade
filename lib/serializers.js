const roundToOneDecimal = (value) => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.round(value * 10) / 10;
};

const getAverageRating = (ratings = []) => {
  if (!ratings.length) {
    return 0;
  }

  const total = ratings.reduce((sum, rating) => sum + rating, 0);
  return roundToOneDecimal(total / ratings.length);
};

const normalizeRatings = (source = {}) => {
  const legacy = Array.isArray(source.rating)
    ? source.rating
        .map((entry) => Number(entry))
        .filter((entry) => Number.isFinite(entry) && entry >= 1 && entry <= 5)
    : [];

  const structured = Array.isArray(source.ratings)
    ? source.ratings
        .map((entry) => Number(entry?.value))
        .filter((entry) => Number.isFinite(entry) && entry >= 1 && entry <= 5)
    : [];

  return [...legacy, ...structured];
};

const serializeProjectComment = (comment) => ({
  id: comment._id.toString(),
  owner: comment.owner?.toString() || null,
  name: comment.name,
  avatar: comment.avatar,
  content: comment.content,
  createdAt: comment.createdAt,
  updatedAt: comment.updatedAt,
});

const serializeProject = (project, options = {}) => {
  const source = project.toObject ? project.toObject() : project;
  const includeComments = options.includeComments ?? false;
  const ratings = normalizeRatings(source);

  return {
    id: source._id.toString(),
    title: source.title,
    description: source.description,
    categories: source.categories || [],
    otherCategory: source.otherCategory || [],
    buildPictures: source.buildPictures || [],
    materialsNeeded: source.materialsNeeded || [],
    estimatedCost: source.estimatedCost ?? null,
    toolsNeeded: source.toolsNeeded || [],
    externalLinks: source.externalLinks || [],
    buildInstructions: source.buildInstructions || [],
    buildTime: source.buildTime ?? null,
    difficulty: source.difficulty ?? null,
    owner: source.owner?.toString() || null,
    ownerName: source.ownerName || null,
    ownerAvatar: source.ownerAvatar || null,
    dateBuilt: source.dateBuilt || null,
    visible: Boolean(source.visible),
    likesCount: source.likes?.length || 0,
    ratingCount: ratings.length,
    averageRating: getAverageRating(ratings),
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
    comments: includeComments
      ? (source.comments || []).map(serializeProjectComment)
      : undefined,
  };
};

const serializeProfile = (profile, options = {}) => {
  const source = profile.toObject ? profile.toObject() : profile;

  return {
    id: source._id.toString(),
    name: source.name,
    avatar: source.avatar,
    role: source.role,
    description: source.description || '',
    location: source.location || '',
    website: source.website || '',
    social: source.social || {},
    skills: source.skills || [],
    projectCount: options.projectCount ?? 0,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
};

const serializeChat = (chat, currentProfileId) => {
  const user1 = chat.user1
    ? {
        id: chat.user1._id.toString(),
        name: chat.user1.name,
        avatar: chat.user1.avatar,
      }
    : null;
  const user2 = chat.user2
    ? {
        id: chat.user2._id.toString(),
        name: chat.user2.name,
        avatar: chat.user2.avatar,
      }
    : null;
  const otherUser = user1?.id === currentProfileId ? user2 : user1;

  return {
    id: chat._id.toString(),
    user1,
    user2,
    otherUser,
    project: chat.project?.toString() || null,
    messages: (chat.messages || []).map((message) => ({
      id: message._id.toString(),
      user: message.user
        ? {
            id: message.user._id.toString(),
            name: message.user.name,
            avatar: message.user.avatar,
          }
        : null,
      message: message.message,
      timestamp: message.timestamp,
      edited: message.edited || false,
      editedAt: message.editedAt || null,
    })),
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt,
  };
};

export { getAverageRating, serializeChat, serializeProfile, serializeProject };
