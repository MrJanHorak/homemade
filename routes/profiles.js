import { Router } from 'express';
import * as profilesCtrl from '../controllers/profiles.js';
import { isLoggedIn } from '../middleware/middleware.js';

const router = Router();

router.get('/', profilesCtrl.index);
router.get('/:id', profilesCtrl.show);
router.get('/:id/edit', isLoggedIn, profilesCtrl.edit);
router.put('/:id', isLoggedIn, profilesCtrl.update);

export { router };
