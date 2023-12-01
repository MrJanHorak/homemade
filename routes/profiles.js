import { Router } from 'express';
import * as profilesCtrl from '../controllers/profiles.js';
import { isLoggedIn } from '../middleware/middleware.js';
import multer from 'multer';

const router = Router();

const storage = multer.memoryStorage();
const upload = multer({ storage }).single('avatar');

router.get('/', profilesCtrl.index);
router.get('/:id', profilesCtrl.show);
router.get('/:id/edit', isLoggedIn, profilesCtrl.edit);
router.put('/:id', isLoggedIn, upload, profilesCtrl.update);

export { router };
