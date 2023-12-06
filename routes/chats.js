// routes for chat is ES6 syntax
import { Router } from 'express';
import * as chatsRouter from '../controllers/chats.js';

const router = Router();

router.get('/', chatsRouter.getChats);
router.get('/:chatId', chatsRouter.getChat);
router.post('/', chatsRouter.sendMessage);
router.post('/', chatsRouter.createChat);
router.post('/:chatId', chatsRouter.sendTyping);

export { router };
