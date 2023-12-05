import { Router } from 'express';
import * as searchController from '../controllers/search.js';

const router = Router();

router.get('/', searchController.searchProjects);

export { router };