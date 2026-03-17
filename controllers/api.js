import { Chat } from '../models/chat.js';
import passport from 'passport';
import sanitizeHtml from 'sanitize-html';
import { Profile } from '../models/profile.js';
import { Project } from '../models/project.js';
import { ProjectDraft } from '../models/projectDraft.js';
import { CategorySuggestion } from '../models/categorySuggestion.js';
import { profilePicstoS3, projectPicstoS3 } from '../services/s3Service.js';
import categoryCatalog from '../data/categories.js';
import {
  serializeChat,
  serializeProfile,
  serializeProject,
} from '../lib/serializers.js';

const CATEGORY_BLOCKLIST = ['porn', 'xxx', 'nsfw', 'racist', 'hate', 'nazi'];
const CATEGORY_ALLOWED_CHARS = /^[a-z0-9][a-z0-9 &+/'-]{1,38}$/i;
const CATEGORY_VALUE_SET = new Set(categoryCatalog.map((entry) => entry.value));
const CATEGORY_LABEL_SET = new Set(
  categoryCatalog.map((entry) => entry.label.toLowerCase()),
);
const RICH_TEXT_ALLOWED_TAGS = [
  'a',
  'blockquote',
  'br',
  'code',
  'em',
  'h2',
  'h3',
  'li',
  'ol',
  'p',
  'pre',
  's',
  'strong',
  'table',
  'tbody',
  'td',
  'th',
  'thead',
  'tr',
  'ul',
];
const RICH_TEXT_ALLOWED_ATTRIBUTES = {
  a: ['href', 'target', 'rel'],
  code: ['class'],
  pre: ['class'],
  td: ['colspan', 'rowspan'],
  th: ['colspan', 'rowspan'],
};

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

const sanitizeRichText = (value) =>
  sanitizeHtml(`${value || ''}`, {
    allowedTags: RICH_TEXT_ALLOWED_TAGS,
    allowedAttributes: RICH_TEXT_ALLOWED_ATTRIBUTES,
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesAppliedToAttributes: ['href'],
  }).trim();

const getPlainTextFromRichText = (value) =>
  sanitizeHtml(`${value || ''}`, {
    allowedTags: [],
    allowedAttributes: {},
  })
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const cleanRichTextArray = (value) =>
  getArrayField(value)
    .map((entry) => sanitizeRichText(entry))
    .filter((entry) => getPlainTextFromRichText(entry));

const cleanValidCategoryValues = (value) =>
  cleanStringArray(value).filter((entry) => CATEGORY_VALUE_SET.has(entry));

const cleanCustomCategories = (value) => {
  const unique = new Set();
  const rejected = [];

  cleanStringArray(value).forEach((rawEntry) => {
    const entry = rawEntry.trim();
    const normalized = entry.toLowerCase();

    if (CATEGORY_LABEL_SET.has(normalized)) {
      return;
    }

    if (!CATEGORY_ALLOWED_CHARS.test(entry)) {
      rejected.push(entry);
      return;
    }

    if (CATEGORY_BLOCKLIST.some((word) => normalized.includes(word))) {
      rejected.push(entry);
      return;
    }

    unique.add(entry);
  });

  return {
    accepted: Array.from(unique).slice(0, 12),
    rejected,
  };
};

const normalizeCategoryLabel = (value) =>
  value.toLowerCase().replace(/\s+/g, ' ').trim();

const serializeCategorySuggestion = (suggestion) => ({
  id: suggestion._id.toString(),
  label: suggestion.label,
  normalizedLabel: suggestion.normalizedLabel,
  status: suggestion.status,
  promoted: Boolean(suggestion.promoted),
  promotedAt: suggestion.promotedAt || null,
  promotedBy: suggestion.promotedBy?.toString() || null,
  usageCount: suggestion.usageCount || 0,
  uniqueSuggesterCount: suggestion.suggestedBy?.length || 0,
  firstSuggestedAt: suggestion.firstSuggestedAt,
  lastSuggestedAt: suggestion.lastSuggestedAt,
  reviewedBy: suggestion.reviewedBy?.toString() || null,
  reviewedAt: suggestion.reviewedAt || null,
  autoPromoteCandidate:
    suggestion.status === 'pending' && (suggestion.usageCount || 0) >= 5,
});

const getCategories = async (req, res) => {
  const promotedSuggestions = await CategorySuggestion.find({
    promoted: true,
    status: 'approved',
  })
    .sort({ label: 1 })
    .select('label normalizedLabel')
    .lean()
    .exec();

  res.json({
    categories: categoryCatalog.map((entry) => ({
      type: 'standard',
      value: entry.value,
      label: entry.label,
    })),
    promotedCategories: promotedSuggestions.map((entry) => ({
      type: 'promoted',
      value: entry.normalizedLabel,
      label: entry.label,
    })),
  });
};

const recordCustomCategorySuggestions = async (profileId, categories) => {
  const now = new Date();

  await Promise.all(
    categories.map((label) => {
      const normalized = normalizeCategoryLabel(label);

      return CategorySuggestion.findOneAndUpdate(
        { normalizedLabel: normalized },
        {
          $setOnInsert: {
            label,
            normalizedLabel: normalized,
            status: 'pending',
            firstSuggestedAt: now,
          },
          $set: {
            lastSuggestedAt: now,
          },
          $inc: {
            usageCount: 1,
          },
          $addToSet: {
            suggestedBy: profileId,
          },
        },
        {
          upsert: true,
        },
      ).exec();
    }),
  );
};

const parseOptionalNumber = (value) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseBoolean = (value, defaultValue = true) => {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    return value !== 'false';
  }

  return Boolean(value);
};

const cleanDraftSteps = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((step) => {
      const type =
        step?.type === 'tip' ||
        step?.type === 'warning' ||
        step?.type === 'checkpoint'
          ? step.type
          : 'instruction';

      const title = typeof step?.title === 'string' ? step.title.trim() : '';
      const content = sanitizeRichText(step?.content);
      const imageIndexes = Array.isArray(step?.imageIndexes)
        ? step.imageIndexes
            .map((entry) => Number.parseInt(entry, 10))
            .filter((entry) => Number.isInteger(entry) && entry >= 0)
        : [];

      return {
        type,
        title,
        content,
        imageIndexes,
      };
    })
    .filter(
      (step) =>
        step.title ||
        getPlainTextFromRichText(step.content) ||
        step.imageIndexes.length,
    );
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

const getEnabledAuthProviders = (req) => {
  const backendBaseUrl = getBackendBaseUrl(req);
  const providers = {
    google: {
      enabled: Boolean(passport._strategy('google')),
      href: `${backendBaseUrl}/auth/google`,
    },
    github: {
      enabled: Boolean(passport._strategy('github')),
      href: `${backendBaseUrl}/auth/github`,
    },
    microsoft: {
      enabled: Boolean(passport._strategy('microsoft')),
      href: `${backendBaseUrl}/auth/microsoft`,
    },
    apple: {
      enabled: Boolean(passport._strategy('apple')),
      href: `${backendBaseUrl}/auth/apple`,
    },
  };

  return providers;
};

const getAuthProviders = (req, res) => {
  res.json({
    providers: getEnabledAuthProviders(req),
  });
};

const getSession = (req, res) => {
  const authenticated = req.isAuthenticated();
  const backendBaseUrl = getBackendBaseUrl(req);
  const providers = getEnabledAuthProviders(req);

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
            role: req.user.profile.role,
          },
        }
      : null,
    links: {
      login: `${backendBaseUrl}/auth/google`,
      logout: `${backendBaseUrl}/auth/logout`,
      googleLogin: `${backendBaseUrl}/auth/google`,
      githubLogin: `${backendBaseUrl}/auth/github`,
      microsoftLogin: `${backendBaseUrl}/auth/microsoft`,
      appleLogin: `${backendBaseUrl}/auth/apple`,
      emailLogin: `${backendBaseUrl}/auth/login`,
      signup: `${backendBaseUrl}/auth/signup`,
      verifyEmail: `${backendBaseUrl}/auth/verify-email`,
      requestMagicLink: `${backendBaseUrl}/auth/magic-link/request`,
      consumeMagicLink: `${backendBaseUrl}/auth/magic-link/consume`,
    },
    providers,
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

const getProjectDraft = async (req, res) => {
  const draft = await ProjectDraft.findOne({
    owner: req.user.profile._id,
  })
    .lean()
    .exec();

  if (!draft) {
    res.json({
      draft: null,
    });
    return;
  }

  res.json({
    draft: {
      title: draft.title || '',
      description: draft.description || '',
      buildTime:
        draft.buildTime === undefined || draft.buildTime === null
          ? ''
          : String(draft.buildTime),
      difficulty:
        draft.difficulty === undefined || draft.difficulty === null
          ? ''
          : String(draft.difficulty),
      estimatedCost:
        draft.estimatedCost === undefined || draft.estimatedCost === null
          ? ''
          : String(draft.estimatedCost),
      categories: Array.isArray(draft.categories) ? draft.categories : [],
      otherCategory: Array.isArray(draft.otherCategory)
        ? draft.otherCategory
        : [],
      materialsNeeded:
        Array.isArray(draft.materialsNeeded) && draft.materialsNeeded.length
          ? draft.materialsNeeded
          : [''],
      toolsNeeded:
        Array.isArray(draft.toolsNeeded) && draft.toolsNeeded.length
          ? draft.toolsNeeded
          : [''],
      externalLinks:
        Array.isArray(draft.externalLinks) && draft.externalLinks.length
          ? draft.externalLinks
          : [''],
      visible: parseBoolean(draft.visible, true),
      buildSteps: Array.isArray(draft.buildSteps) ? draft.buildSteps : [],
      buildPictures: [],
    },
  });
};

const saveProjectDraft = async (req, res) => {
  const customCategories = cleanCustomCategories(req.body.otherCategory);

  if (customCategories.rejected.length) {
    res.status(400).json({
      error:
        'One or more custom categories are invalid or not allowed by safety policy.',
      rejectedCategories: customCategories.rejected,
    });
    return;
  }

  const draftPayload = {
    title: req.body.title?.trim() || '',
    description: sanitizeRichText(req.body.description),
    buildTime: parseOptionalNumber(req.body.buildTime),
    difficulty: parseOptionalNumber(req.body.difficulty),
    estimatedCost: parseOptionalNumber(req.body.estimatedCost),
    categories: cleanValidCategoryValues(req.body.categories),
    otherCategory: customCategories.accepted,
    materialsNeeded: getArrayField(req.body.materialsNeeded).map(
      (entry) => `${entry ?? ''}`,
    ),
    toolsNeeded: getArrayField(req.body.toolsNeeded).map(
      (entry) => `${entry ?? ''}`,
    ),
    externalLinks: getArrayField(req.body.externalLinks).map(
      (entry) => `${entry ?? ''}`,
    ),
    visible: parseBoolean(req.body.visible, true),
    buildSteps: cleanDraftSteps(req.body.buildSteps),
  };

  const draft = await ProjectDraft.findOneAndUpdate(
    { owner: req.user.profile._id },
    {
      $set: {
        owner: req.user.profile._id,
        ...draftPayload,
      },
    },
    {
      upsert: true,
      new: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  )
    .lean()
    .exec();

  res.json({
    draft: {
      id: draft._id.toString(),
      updatedAt: draft.updatedAt,
    },
  });
};

const deleteProjectDraft = async (req, res) => {
  await ProjectDraft.deleteOne({ owner: req.user.profile._id }).exec();

  res.status(204).send();
};

const getCategorySuggestions = async (req, res) => {
  const requestedStatus = req.query.status?.trim();
  const promotedOnly = req.query.promoted === 'true';
  const statusFilter =
    requestedStatus === 'approved' ||
    requestedStatus === 'rejected' ||
    requestedStatus === 'pending'
      ? requestedStatus
      : null;

  const filter = statusFilter ? { status: statusFilter } : {};

  if (promotedOnly) {
    filter.promoted = true;
  }

  const suggestions = await CategorySuggestion.find(filter)
    .sort({ usageCount: -1, lastSuggestedAt: -1 })
    .limit(250)
    .exec();

  res.json({
    suggestions: suggestions.map(serializeCategorySuggestion),
  });
};

const updateCategorySuggestionStatus = async (req, res) => {
  const status = req.body.status?.trim();

  if (status !== 'approved' && status !== 'rejected' && status !== 'pending') {
    res.status(400).json({
      error: 'status must be one of: pending, approved, rejected',
    });
    return;
  }

  const suggestion = await CategorySuggestion.findById(req.params.id).exec();

  if (!suggestion) {
    res.status(404).json({ error: 'Category suggestion not found' });
    return;
  }

  suggestion.status = status;
  if (status !== 'approved') {
    suggestion.promoted = false;
    suggestion.promotedBy = null;
    suggestion.promotedAt = null;
  }
  suggestion.reviewedBy = req.user.profile._id;
  suggestion.reviewedAt = new Date();

  await suggestion.save();

  res.json({
    suggestion: serializeCategorySuggestion(suggestion),
  });
};

const promoteCategorySuggestion = async (req, res) => {
  const suggestion = await CategorySuggestion.findById(req.params.id).exec();

  if (!suggestion) {
    res.status(404).json({ error: 'Category suggestion not found' });
    return;
  }

  suggestion.status = 'approved';
  suggestion.promoted = true;
  suggestion.promotedBy = req.user.profile._id;
  suggestion.promotedAt = new Date();
  suggestion.reviewedBy = req.user.profile._id;
  suggestion.reviewedAt = new Date();

  await suggestion.save();

  res.json({
    suggestion: serializeCategorySuggestion(suggestion),
  });
};

const demoteCategorySuggestion = async (req, res) => {
  const suggestion = await CategorySuggestion.findById(req.params.id).exec();

  if (!suggestion) {
    res.status(404).json({ error: 'Category suggestion not found' });
    return;
  }

  suggestion.promoted = false;
  suggestion.promotedBy = null;
  suggestion.promotedAt = null;
  suggestion.reviewedBy = req.user.profile._id;
  suggestion.reviewedAt = new Date();

  await suggestion.save();

  res.json({
    suggestion: serializeCategorySuggestion(suggestion),
  });
};

const createProject = async (req, res) => {
  const profile = await Profile.findById(req.user.profile._id).exec();

  if (!profile) {
    res.status(404).json({ error: 'Profile not found' });
    return;
  }

  const title = req.body.title?.trim();
  const description = sanitizeRichText(req.body.description);
  const categories = cleanValidCategoryValues(req.body.categories);
  const customCategories = cleanCustomCategories(req.body.otherCategory);
  const buildInstructions = cleanRichTextArray(req.body.buildInstructions);

  if (customCategories.rejected.length) {
    res.status(400).json({
      error:
        'One or more custom categories are invalid or not allowed by safety policy.',
      rejectedCategories: customCategories.rejected,
    });
    return;
  }

  if (
    !title ||
    !getPlainTextFromRichText(description) ||
    (!categories.length && !customCategories.accepted.length) ||
    !buildInstructions.length
  ) {
    res.status(400).json({
      error:
        'Title, description, at least one category (standard or custom), and at least one build instruction are required',
    });
    return;
  }

  let buildPictures = [];
  if (req.files?.length) {
    buildPictures = await projectPicstoS3(req.files);
  }

  const normalizedCategories =
    categories.length || !customCategories.accepted.length
      ? categories
      : ['Other'];

  const project = await Project.create({
    title,
    description,
    categories: normalizedCategories,
    otherCategory: customCategories.accepted,
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

  if (customCategories.accepted.length) {
    await recordCustomCategorySuggestions(
      req.user.profile._id,
      customCategories.accepted,
    );
  }

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
  const description = sanitizeRichText(req.body.description);
  const categories = cleanValidCategoryValues(req.body.categories);
  const customCategories = cleanCustomCategories(req.body.otherCategory);
  const buildInstructions = cleanRichTextArray(req.body.buildInstructions);

  if (customCategories.rejected.length) {
    res.status(400).json({
      error:
        'One or more custom categories are invalid or not allowed by safety policy.',
      rejectedCategories: customCategories.rejected,
    });
    return;
  }

  if (
    !title ||
    !getPlainTextFromRichText(description) ||
    (!categories.length && !customCategories.accepted.length) ||
    !buildInstructions.length
  ) {
    res.status(400).json({
      error:
        'Title, description, at least one category (standard or custom), and at least one build instruction are required',
    });
    return;
  }

  let buildPictures = project.buildPictures || [];
  if (req.files?.length) {
    const uploadedPictures = await projectPicstoS3(req.files);
    buildPictures = [...buildPictures, ...uploadedPictures];
  }

  const normalizedCategories =
    categories.length || !customCategories.accepted.length
      ? categories
      : ['Other'];

  project.title = title;
  project.description = description;
  project.categories = normalizedCategories;
  project.otherCategory = customCategories.accepted;
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

  if (customCategories.accepted.length) {
    await recordCustomCategorySuggestions(
      req.user.profile._id,
      customCategories.accepted,
    );
  }

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
    hiddenBy: { $nin: [req.user.profile._id] },
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

  // Unhide chat for the recipient so it reappears in their inbox
  const recipientId = chat.user1?.equals(currentProfileId)
    ? chat.user2
    : chat.user1;
  if (recipientId && chat.hiddenBy?.length) {
    chat.hiddenBy = chat.hiddenBy.filter((id) => !id.equals(recipientId));
  }

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

const hideChat = async (req, res) => {
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

  const alreadyHidden = (chat.hiddenBy || []).some((id) =>
    id.equals(currentProfileId),
  );

  if (!alreadyHidden) {
    chat.hiddenBy.push(currentProfileId);
    await chat.save();
  }

  res.json({ ok: true });
};

const editChatMessage = async (req, res) => {
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

  const msg = chat.messages.id(req.params.messageId);

  if (!msg) {
    res.status(404).json({ error: 'Message not found' });
    return;
  }

  if (!msg.user?.equals(currentProfileId)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const newText = req.body.message?.trim();

  if (!newText) {
    res.status(400).json({ error: 'Message is required' });
    return;
  }

  msg.message = newText;
  msg.edited = true;
  msg.editedAt = new Date();

  await chat.save();

  const populatedChat = await Chat.findById(chat._id)
    .populate('user1', 'name avatar')
    .populate('user2', 'name avatar')
    .populate({ path: 'messages.user', select: 'name avatar' })
    .exec();

  res.json({ chat: serializeChat(populatedChat, currentProfileId.toString()) });
};

const healthcheck = (req, res) => {
  res.json({ ok: true });
};

export {
  addProjectComment,
  addChatMessage,
  createChat,
  editChatMessage,
  hideChat,
  createProject,
  deleteProjectDraft,
  getChat,
  getCategories,
  getAuthProviders,
  getCategorySuggestions,
  demoteCategorySuggestion,
  getChats,
  getProfile,
  getProfiles,
  getProjectDraft,
  getProject,
  getProjects,
  getSession,
  healthcheck,
  promoteCategorySuggestion,
  saveProjectDraft,
  searchProjects,
  updateCategorySuggestionStatus,
  updateProject,
  updateProfile,
};
