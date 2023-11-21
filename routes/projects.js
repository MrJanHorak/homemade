import { Router } from 'express';
import * as projectCtrl from '../controllers/projects.js';
import { isLoggedIn } from '../middleware/middleware.js';

const router = Router();

router.get('/', projectCtrl.index);
router.get('/new', isLoggedIn, projectCtrl.new);
router.get('/:id', projectCtrl.show);
router.get('/:id/edit', isLoggedIn, projectCtrl.edit);
router.post('/', isLoggedIn, projectCtrl.create);
router.post('/:id/comments', isLoggedIn, projectCtrl.addComment);
router.put('/:id', isLoggedIn, projectCtrl.update);
router.delete('/:id', isLoggedIn, projectCtrl.delete);
router.delete(
  '/:id/comments/:commentId',
  isLoggedIn,
  projectCtrl.deleteComment
);

export { router };
