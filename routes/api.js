import { Router } from 'express';
import * as apiCtrl from '../controllers/api.js';
import { isApiLoggedIn } from '../middleware/middleware.js';
import multer from 'multer';

const router = Router();
const storage = multer.memoryStorage();
const upload = multer({ storage }).array('buildPictures', 12);

router.get('/health', apiCtrl.healthcheck);
router.get('/session/current', apiCtrl.getSession);

router.get('/projects', apiCtrl.getProjects);
router.post('/projects', isApiLoggedIn, upload, apiCtrl.createProject);
router.get('/projects/:id', apiCtrl.getProject);
router.post('/projects/:id/comments', isApiLoggedIn, apiCtrl.addProjectComment);

router.get('/profiles', apiCtrl.getProfiles);
router.get('/profiles/:id', apiCtrl.getProfile);

router.get('/search', apiCtrl.searchProjects);

router.get('/chats', isApiLoggedIn, apiCtrl.getChats);
router.get('/chats/:chatId', isApiLoggedIn, apiCtrl.getChat);
router.post('/chats', isApiLoggedIn, apiCtrl.createChat);

export { router };
