import { Chat } from '../models/chat.js';
import { Profile } from '../models/profile.js';
import { Project } from '../models/project.js';
import { profilePicstoS3, projectPicstoS3 } from '../services/s3Service.js';
import {
  serializeChat,
  serializeProfile,
  serializeProject,
} from '../lib/serializers.js';

const getArrayField = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string' && value.length) {
    return [value];
  }

  return [];
};

const cleanStringArray = (value) =>
  getArrayField(value)
    .map((entry) => entry?.trim())
    .filter(Boolean);

const parseOptionalNumber = (value) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseJsonObject = (value) => {
  if (typeof value !== 'string' || !value.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
};

const getBackendBaseUrl = (req) =>
  process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}`;

const getSession = (req, res) => {
  const authenticated = req.isAuthenticated();

  res.json({
    authenticated,
    user: authenticated
      ? {
          id: req.user._id.toString(),
          email: req.user.email,
          profile: {
            id: req.user.profile._id.toString(),
            name: req.user.profile.name,
            avatar: req.user.profile.avatar,
          },
        }
      : null,
    links: {
      login: `${getBackendBaseUrl(req)}/auth/google`,
      logout: `${getBackendBaseUrl(req)}/auth/logout`,
    },
  });
};

const getProjects = async (req, res) => {
  const limit = Number.parseInt(req.query.limit, 10);
  const sort = req.query.sort === 'latest' ? { createdAt: -1 } : { title: 1 };

  const query = Project.find({ visible: true }).sort(sort);
  if (Number.isInteger(limit) && limit > 0) {
    query.limit(limit);
  }

  const projects = await query.exec();

  res.json({
    projects: projects.map((project) => serializeProject(project)),
  });
};

const getProject = async (req, res) => {
  const project = await Project.findById(req.params.id).exec();

  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  res.json({
    project: serializeProject(project, { includeComments: true }),
  });
};

const createProject = async (req, res) => {
  const profile = await Profile.findById(req.user.profile._id).exec();

  if (!profile) {
    res.status(404).json({ error: 'Profile not found' });
    return;
  }

  const title = req.body.title?.trim();
  const description = req.body.description?.trim();
  const categories = cleanStringArray(req.body.categories);
  const buildInstructions = cleanStringArray(req.body.buildInstructions);

  if (
    !title ||
    !description ||
    !categories.length ||
    !buildInstructions.length
  ) {
    res.status(400).json({
      error:
        'Title, description, at least one category, and at least one build instruction are required',
    });
    return;
  }

  let buildPictures = [];
  if (req.files?.length) {
    buildPictures = await projectPicstoS3(req.files);
  }

  const project = await Project.create({
    title,
    description,
    categories,
    buildInstructions,
    materialsNeeded: cleanStringArray(req.body.materialsNeeded),
    toolsNeeded: cleanStringArray(req.body.toolsNeeded),
    externalLinks: cleanStringArray(req.body.externalLinks),
    buildPictures,
    buildTime: parseOptionalNumber(req.body.buildTime),
    difficulty: parseOptionalNumber(req.body.difficulty),
    estimatedCost: parseOptionalNumber(req.body.estimatedCost),
    owner: profile._id,
    ownerName: profile.name,
    ownerAvatar: profile.avatar,
    visible: req.body.visible !== 'false',
  });

  res.status(201).json({
    project: serializeProject(project),
  });
};

const updateProject = async (req, res) => {
  const project = await Project.findById(req.params.id).exec();

  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  if (!project.owner?.equals(req.user.profile._id)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const title = req.body.title?.trim();
  const description = req.body.description?.trim();
  const categories = cleanStringArray(req.body.categories);
  const buildInstructions = cleanStringArray(req.body.buildInstructions);

  if (
    !title ||
    !description ||
    !categories.length ||
    !buildInstructions.length
  ) {
    res.status(400).json({
      error:
        'Title, description, at least one category, and at least one build instruction are required',
    });
    return;
  }

  let buildPictures = project.buildPictures || [];
  if (req.files?.length) {
    const uploadedPictures = await projectPicstoS3(req.files);
    buildPictures = [...buildPictures, ...uploadedPictures];
  }

  project.title = title;
  project.description = description;
  project.categories = categories;
  project.buildInstructions = buildInstructions;
  project.materialsNeeded = cleanStringArray(req.body.materialsNeeded);
  project.toolsNeeded = cleanStringArray(req.body.toolsNeeded);
  project.externalLinks = cleanStringArray(req.body.externalLinks);
  project.buildPictures = buildPictures;
  project.buildTime = parseOptionalNumber(req.body.buildTime);
  project.difficulty = parseOptionalNumber(req.body.difficulty);
  project.estimatedCost = parseOptionalNumber(req.body.estimatedCost);
  project.visible = req.body.visible !== 'false';

  await project.save();

  res.json({
    project: serializeProject(project, { includeComments: true }),
  });
};

const addProjectComment = async (req, res) => {
  const project = await Project.findById(req.params.id).exec();

  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  const content = req.body.content?.trim();
  const rating = Number.parseInt(req.body.rating, 10);

  if (!content && !Number.isInteger(rating)) {
    res.status(400).json({ error: 'A rating or comment is required' });
    return;
  }

  const currentProfile = await Profile.findById(req.user.profile._id).exec();

  if (!currentProfile) {
    res.status(404).json({ error: 'Profile not found' });
    return;
  }

  if (Number.isInteger(rating) && rating >= 1 && rating <= 5) {
    project.rating.push(rating);
  }

  if (content) {
    project.comments.push({
      owner: currentProfile._id,
      name: currentProfile.name,
      avatar: currentProfile.avatar,
      content,
    });
  }

  await project.save();

  res.status(201).json({
    project: serializeProject(project, { includeComments: true }),
  });
};

const getProfiles = async (req, res) => {
  const profiles = await Profile.find({}).sort({ name: 1 }).exec();
  const visibleProjects = await Project.find({ visible: true })
    .select('owner')
    .exec();
  const projectCounts = visibleProjects.reduce((counts, project) => {
    const ownerId = project.owner?.toString();
    if (!ownerId) {
      return counts;
    }

    counts.set(ownerId, (counts.get(ownerId) || 0) + 1);
    return counts;
  }, new Map());

  res.json({
    profiles: profiles.map((profile) =>
      serializeProfile(profile, {
        projectCount: projectCounts.get(profile._id.toString()) || 0,
      }),
    ),
  });
};

const getProfile = async (req, res) => {
  const profile = await Profile.findById(req.params.id).exec();

  if (!profile) {
    res.status(404).json({ error: 'Profile not found' });
    return;
  }

  const projects = await Project.find({
    owner: req.params.id,
    visible: true,
  })
    .sort({ title: 1 })
    .exec();

  const authenticated = req.isAuthenticated();
  const isSelf = authenticated && req.user.profile._id.equals(profile._id);

  res.json({
    profile: serializeProfile(profile, { projectCount: projects.length }),
    projects: projects.map((project) => serializeProject(project)),
    isSelf,
  });
};

const updateProfile = async (req, res) => {
  const profile = await Profile.findById(req.params.id).exec();

  if (!profile) {
    res.status(404).json({ error: 'Profile not found' });
    return;
  }

  if (!req.user.profile._id.equals(profile._id)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const name = req.body.name?.trim();

  if (!name) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }

  if (req.file) {
    const avatarFileName = await profilePicstoS3(req.file);
    profile.avatar = `https://homemadesocialsite.s3.amazonaws.com/profiles/${avatarFileName}`;
  }

  const social = parseJsonObject(req.body.social);

  profile.name = name;
  profile.description = req.body.description?.trim() || '';
  profile.location = req.body.location?.trim() || '';
  profile.website = req.body.website?.trim() || '';
  profile.skills = cleanStringArray(req.body.skills);
  profile.social = {
    facebook: social.facebook?.trim() || '',
    twitter: social.twitter?.trim() || '',
    linkedin: social.linkedin?.trim() || '',
    instagram: social.instagram?.trim() || '',
    youtube: social.youtube?.trim() || '',
    pinterest: social.pinterest?.trim() || '',
    reddit: social.reddit?.trim() || '',
    tiktok: social.tiktok?.trim() || '',
    discord: social.discord?.trim() || '',
    github: social.github?.trim() || '',
    other: social.other?.trim() || '',
  };

  await profile.save();

  res.json({
    profile: serializeProfile(profile),
  });
};

const searchProjects = async (req, res) => {
  const query = req.query.query?.trim();

  if (!query) {
    res.json({ results: [], query: '' });
    return;
  }

  const results = await Project.find({
    visible: true,
    $or: [
      { title: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } },
    ],
  })
    .sort({ title: 1 })
    .exec();

  res.json({
    query,
    results: results.map((project) => serializeProject(project)),
  });
};

const getChats = async (req, res) => {
  const currentProfileId = req.user.profile._id.toString();
  const chats = await Chat.find({
    $or: [{ user1: req.user.profile._id }, { user2: req.user.profile._id }],
  })
    .populate('user1', 'name avatar')
    .populate('user2', 'name avatar')
    .sort({ updatedAt: -1 })
    .exec();

  res.json({
    chats: chats.map((chat) => serializeChat(chat, currentProfileId)),
  });
};

const getChat = async (req, res) => {
  const chat = await Chat.findById(req.params.chatId)
    .populate('user1', 'name avatar')
    .populate('user2', 'name avatar')
    .populate({
      path: 'messages.user',
      select: 'name avatar',
    })
    .exec();

  if (!chat) {
    res.status(404).json({ error: 'Chat not found' });
    return;
  }

  const currentProfileId = req.user.profile._id.toString();
  const isParticipant = [
    chat.user1?._id.toString(),
    chat.user2?._id.toString(),
  ].includes(currentProfileId);

  if (!isParticipant) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  res.json({
    chat: serializeChat(chat, currentProfileId),
  });
};

const createChat = async (req, res) => {
  const user1Id = req.user.profile._id;
  const user2Id = req.body.user2;

  if (!user2Id) {
    res.status(400).json({ error: 'user2 is required' });
    return;
  }

  const existingChat = await Chat.findOne({
    $or: [
      { user1: user1Id, user2: user2Id },
      { user1: user2Id, user2: user1Id },
    ],
  })
    .populate('user1', 'name avatar')
    .populate('user2', 'name avatar')
    .exec();

  if (existingChat) {
    res.json({ chat: serializeChat(existingChat, user1Id.toString()) });
    return;
  }

  const chat = await Chat.create({ user1: user1Id, user2: user2Id });
  const populatedChat = await Chat.findById(chat._id)
    .populate('user1', 'name avatar')
    .populate('user2', 'name avatar')
    .exec();

  res.status(201).json({
    chat: serializeChat(populatedChat, user1Id.toString()),
  });
};

const addChatMessage = async (req, res) => {
  const chat = await Chat.findById(req.params.chatId).exec();

  if (!chat) {
    res.status(404).json({ error: 'Chat not found' });
    return;
  }

  const currentProfileId = req.user.profile._id;
  const isParticipant =
    chat.user1?.equals(currentProfileId) ||
    chat.user2?.equals(currentProfileId);

  if (!isParticipant) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const message = req.body.message?.trim();

  if (!message) {
    res.status(400).json({ error: 'Message is required' });
    return;
  }

  chat.messages.push({
    user: currentProfileId,
    message,
    timestamp: new Date(),
  });

  await chat.save();

  const populatedChat = await Chat.findById(chat._id)
    .populate('user1', 'name avatar')
    .populate('user2', 'name avatar')
    .populate({
      path: 'messages.user',
      select: 'name avatar',
    })
    .exec();

  res.status(201).json({
    chat: serializeChat(populatedChat, currentProfileId.toString()),
  });
};

const healthcheck = (req, res) => {
  res.json({ ok: true });
};

export {
  addProjectComment,
  addChatMessage,
  createChat,
  createProject,
  getChat,
  getChats,
  getProfile,
  getProfiles,
  getProject,
  getProjects,
  getSession,
  healthcheck,
  searchProjects,
  updateProject,
  updateProfile,
};
