import { S3 } from 'aws-sdk';
import uuid from 'uuid/v4';

const projectPicstoS3 = async (files) => {
  const s3 = new S3({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  });

  const params = files.map((file) => ({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: `/projects/${uuid()}-${file.originalname}`,
    Body: file.buffer,
    ACL: 'public-read',
  }));

  const uploadPromises = params.map((param) => s3.upload(param).promise());
  const results = await Promise.all(uploadPromises);

  return results.map((result) => result.Location);
};

const profilePicstoS3 = async (file) => {
  const s3 = new S3({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  });

  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: `/profiles/${uuid()}-${file.originalname}`,
    Body: file.buffer,
    ACL: 'public-read',
  };

  const result = await s3.upload(params).promise();

  return result.Location;
};

export { projectPicstoS3, profilePicstoS3 };
