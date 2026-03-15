import { Router } from 'express';
import * as apiCtrl from '../controllers/api.js';
import { isApiAdmin, isApiLoggedIn } from '../middleware/middleware.js';
import multer from 'multer';

const router = Router();
const storage = multer.memoryStorage();
const upload = multer({ storage }).array('buildPictures', 12);
const profileUpload = multer({ storage }).single('avatar');

router.get('/health', apiCtrl.healthcheck);
router.get('/session/current', apiCtrl.getSession);
router.get('/categories', apiCtrl.getCategories);

router.get('/projects', apiCtrl.getProjects);
router.post('/projects', isApiLoggedIn, upload, apiCtrl.createProject);
router.get('/projects/draft', isApiLoggedIn, apiCtrl.getProjectDraft);
router.put('/projects/draft', isApiLoggedIn, apiCtrl.saveProjectDraft);
router.delete('/projects/draft', isApiLoggedIn, apiCtrl.deleteProjectDraft);
router.get('/projects/:id', apiCtrl.getProject);
router.put('/projects/:id', isApiLoggedIn, upload, apiCtrl.updateProject);
router.post('/projects/:id/comments', isApiLoggedIn, apiCtrl.addProjectComment);

router.get('/profiles', apiCtrl.getProfiles);
router.get('/profiles/:id', apiCtrl.getProfile);
router.put(
  '/profiles/:id',
  isApiLoggedIn,
  profileUpload,
  apiCtrl.updateProfile,
);

router.get('/search', apiCtrl.searchProjects);

router.get(
  '/admin/category-suggestions',
  isApiAdmin,
  apiCtrl.getCategorySuggestions,
);
router.put(
  '/admin/category-suggestions/:id',
  isApiAdmin,
  apiCtrl.updateCategorySuggestionStatus,
);
router.post(
  '/admin/category-suggestions/:id/promote',
  isApiAdmin,
  apiCtrl.promoteCategorySuggestion,
);
router.post(
  '/admin/category-suggestions/:id/demote',
  isApiAdmin,
  apiCtrl.demoteCategorySuggestion,
);

router.get('/chats', isApiLoggedIn, apiCtrl.getChats);
router.get('/chats/:chatId', isApiLoggedIn, apiCtrl.getChat);
router.post('/chats', isApiLoggedIn, apiCtrl.createChat);
router.post('/chats/:chatId/hide', isApiLoggedIn, apiCtrl.hideChat);
router.post('/chats/:chatId/messages', isApiLoggedIn, apiCtrl.addChatMessage);
router.put('/chats/:chatId/messages/:messageId', isApiLoggedIn, apiCtrl.editChatMessage);

export { router };
