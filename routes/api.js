import { Router } from 'express';
import * as apiCtrl from '../controllers/api.js';
import { isApiAdmin, isApiLoggedIn } from '../middleware/middleware.js';
import multer from 'multer';

const router = Router();
const storage = multer.memoryStorage();
const imageUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 12, fields: 150, parts: 175 },
  fileFilter(req, file, callback) {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
      callback(null, true);
      return;
    }
    callback(Object.assign(new Error('Upload a JPEG or PNG image.'), { status: 415 }));
  },
});
const upload = imageUpload.array('buildPictures', 12);
const profileUpload = imageUpload.single('avatar');

const pngSignature = Buffer.from('89504e470d0a1a0a', 'hex');
const jpegSignature = Buffer.from('ffd8ff', 'hex');
const validateUploadedImages = (req, res, next) => {
  const files = req.files || (req.file ? [req.file] : []);
  for (const file of files) {
    const signature = file.mimetype === 'image/png' ? pngSignature : jpegSignature;
    if (!file.buffer.subarray(0, signature.length).equals(signature)) {
      res.status(415).json({ error: 'Upload a valid JPEG or PNG image.' });
      return;
    }
  }
  next();
};

const handle = (controller) => (req, res, next) =>
  Promise.resolve().then(() => controller(req, res)).catch(next);

const validateId = (req, res, next, id) => {
  if (!/^[a-f\d]{24}$/i.test(id)) {
    res.status(404).json({ error: 'Resource not found' });
    return;
  }
  next();
};

router.param('id', validateId);
router.param('chatId', validateId);
router.param('messageId', validateId);
router.param('commentId', validateId);

const checkDraftProfile = (req, res, next) => {
  const profile = req.get('X-Draft-Profile');
  if (!profile || req.user.profile._id.equals(profile)) return next();
  res.status(409).json({ error: 'Your account changed. Reopen the project form to continue.' });
};

router.get('/health', handle(apiCtrl.healthcheck));
router.get('/session/current', handle(apiCtrl.getSession));
router.get('/auth/providers', handle(apiCtrl.getAuthProviders));
router.get('/categories', handle(apiCtrl.getCategories));

router.get('/projects', handle(apiCtrl.getProjects));
router.post('/projects', isApiLoggedIn, upload, validateUploadedImages, handle(apiCtrl.createProject));
router.get('/projects/draft', isApiLoggedIn, checkDraftProfile, handle(apiCtrl.getProjectDraft));
router.put('/projects/draft', isApiLoggedIn, checkDraftProfile, handle(apiCtrl.saveProjectDraft));
router.delete('/projects/draft', isApiLoggedIn, checkDraftProfile, handle(apiCtrl.deleteProjectDraft));
router.get('/projects/:id', handle(apiCtrl.getProject));
router.get('/projects/:id/rating', isApiLoggedIn, handle(apiCtrl.getProjectRating));
router.put('/projects/:id', isApiLoggedIn, upload, validateUploadedImages, handle(apiCtrl.updateProject));
router.delete('/projects/:id', isApiLoggedIn, handle(apiCtrl.deleteProject));
router.get(
  '/projects/:id/save-status',
  isApiLoggedIn,
  handle(apiCtrl.getProjectSaveStatus),
);
router.post('/projects/:id/save', isApiLoggedIn, handle(apiCtrl.saveProject));
router.delete('/projects/:id/save', isApiLoggedIn, handle(apiCtrl.unsaveProject));
router.post('/projects/:id/comments', isApiLoggedIn, handle(apiCtrl.addProjectComment));
router.delete('/projects/:id/comments/:commentId', isApiLoggedIn, handle(apiCtrl.deleteProjectComment));

router.get('/profiles', handle(apiCtrl.getProfiles));
router.get(
  '/profiles/me/saved-projects',
  isApiLoggedIn,
  handle(apiCtrl.getSavedProjects),
);
router.get('/profiles/:id', handle(apiCtrl.getProfile));
router.put(
  '/profiles/:id',
  isApiLoggedIn,
  profileUpload,
  validateUploadedImages,
  handle(apiCtrl.updateProfile),
);

router.get('/search', handle(apiCtrl.searchProjects));

router.get(
  '/admin/category-suggestions',
  isApiAdmin,
  handle(apiCtrl.getCategorySuggestions),
);
router.put(
  '/admin/category-suggestions/:id',
  isApiAdmin,
  handle(apiCtrl.updateCategorySuggestionStatus),
);
router.post(
  '/admin/category-suggestions/:id/promote',
  isApiAdmin,
  handle(apiCtrl.promoteCategorySuggestion),
);
router.post(
  '/admin/category-suggestions/:id/demote',
  isApiAdmin,
  handle(apiCtrl.demoteCategorySuggestion),
);

router.get('/chats', isApiLoggedIn, handle(apiCtrl.getChats));
router.get('/chats/:chatId', isApiLoggedIn, handle(apiCtrl.getChat));
router.post('/chats', isApiLoggedIn, handle(apiCtrl.createChat));
router.post('/chats/:chatId/hide', isApiLoggedIn, handle(apiCtrl.hideChat));
router.post('/chats/:chatId/messages', isApiLoggedIn, handle(apiCtrl.addChatMessage));
router.put(
  '/chats/:chatId/messages/:messageId',
  isApiLoggedIn,
  handle(apiCtrl.editChatMessage),
);

export { router };
