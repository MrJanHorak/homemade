import { Router } from 'express';
import * as projectCtrl from '../controllers/projects.js';
import { isLoggedIn } from '../middleware/middleware.js';
import multer from 'multer';

const router = Router();

const storage = multer.memoryStorage();
const upload = multer({ storage }).array('buildPictures', 12);

router.get('/', projectCtrl.index);
router.get('/new', isLoggedIn, projectCtrl.new);
router.get('/:id', projectCtrl.show);
router.get('/:id/edit', isLoggedIn, projectCtrl.edit);
router.post('/', isLoggedIn, upload, projectCtrl.create);
router.post('/:id/comments', isLoggedIn, projectCtrl.addComment);
router.put('/:id', isLoggedIn, upload, projectCtrl.update);
router.delete('/:id', isLoggedIn, projectCtrl.delete);
router.delete('/:id/comments/:commentId',isLoggedIn,projectCtrl.deleteComment);

export { router };
