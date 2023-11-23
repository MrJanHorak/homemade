import { Router } from 'express';
import * as projectCtrl from '../controllers/projects.js';
import { isLoggedIn, passUserToView } from '../middleware/middleware.js';

const router = Router();

router.get('/new', isLoggedIn, projectCtrl.new);
router.get('/:id/edit', isLoggedIn, projectCtrl.edit);
router.get('/:id', projectCtrl.show);
router.get('/', projectCtrl.index);
router.put('/:id', isLoggedIn, projectCtrl.update);
router.post('/', isLoggedIn, projectCtrl.create);
router.delete('/:id', isLoggedIn, projectCtrl.delete);
router.delete(
  '/:id/comments/:commentId',
  isLoggedIn,
  projectCtrl.deleteComment
);
router.post('/:id/comments', isLoggedIn, projectCtrl.addComment);

export { router };
