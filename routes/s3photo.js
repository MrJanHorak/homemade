import { Router } from 'express';
import * as s3Ctrl from '../controllers/s3upload.js';

const router = Router();

router.post('/projectPics', s3Ctrl.uploadMultiple);
router.post('/profilePics', s3Ctrl.uploadProfilePic);

export {router}
