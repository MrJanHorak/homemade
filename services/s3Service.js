import aws from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

const projectPicstoS3 = async (files) => {
  console.log('uploading to s3', files)
  const s3 = new aws.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  });

  const params = files.map((file) => ({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: `/projects/${uuidv4()}-${file.originalname}`,
    Body: file.buffer,
    ACL: 'public-read',
  }));

  const uploadPromises = params.map((param) => s3.upload(param).promise());
  const results = await Promise.all(uploadPromises);

  return results.map((result) => result.Location);
};

const profilePicstoS3 = async (file) => {
  const s3 = new aws.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  });

  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: `/profiles/${uuidv4()}-${file.originalname}`,
    Body: file.buffer,
    ACL: 'public-read',
  };

  const result = await s3.upload(params).promise();

  return result.Location;
};

export { projectPicstoS3, profilePicstoS3 };
