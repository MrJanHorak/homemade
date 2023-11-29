import multer from 'multer';
import aws from 'aws-sdk';
import path from 'path';
import fs from 'fs';
import { projectPicstoS3, profilePicstoS3} from s3Service.js;
import dotenv from 'dotenv';
dotenv.config();

const s3 = new aws.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const storage = multer.memoryStorage()




// configure the keys for accessing AWS
// AWS.config.update({
//     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
// });

// // multer upload function
// const upload = multer({
//     storage: multer.memoryStorage(),
//     limits: {
//         fileSize: 5 * 1024 * 1024 // no larger than 5mb
//     }
// });

// Path: routes/s3photo.js
// create a route to upload multiple files to s3 bucket

// rupload.array('myFiles', 12), (req, res, next) => {
//     const files = req.files
//     if (!files) {
//         const error = new Error('Please choose files')
//         error.httpStatusCode = 400
//         return next(error)
//     }
//     // res.send(files)
//     res.redirect('/')
// })