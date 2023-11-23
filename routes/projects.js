import { Router } from 'express';
import * as projectCtrl from '../controllers/projects.js';
import { isLoggedIn, passUserToView } from '../middleware/middleware.js';

const router = Router();

router.get('/new', isLoggedIn, projectCtrl.new);
router.post('/', isLoggedIn, projectCtrl.create);
router.get('/:id/edit', isLoggedIn, projectCtrl.edit);
router.put('/:id', isLoggedIn, projectCtrl.update);
router.delete('/:id', isLoggedIn, projectCtrl.delete);
router.delete(
  '/:id/comments/:commentId',
  isLoggedIn,
  projectCtrl.deleteComment
);
router.post('/:id/comments', isLoggedIn, projectCtrl.addComment);
router.get('/:id', projectCtrl.show); // Moved the /:id route to the end
router.get('/', projectCtrl.index);

export { router };
