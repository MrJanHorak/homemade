import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from 'uuid';

// Set the AWS region
const REGION = "us-east-1"; //e.g. "us-east-1"

const projectPicstoS3 = async (files) => {
  console.log('uploading to s3', files)
  const s3 = new S3Client({
    region: REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  });

  const params = files.map((file) => ({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: `projects/${uuidv4()}-${file.originalname}`,
    Body: file.buffer,
  }));

  const uploadPromises = params.map((param) => s3.upload(param).promise());
  const results = await Promise.all(uploadPromises);

  return results.map((result) => result.Location);
};

const profilePicstoS3 = async (file) => {
  console.log('uploading to s3', file)
  const s3 = new S3Client({
    region: REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  });

  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: `profiles/${uuidv4()}-${file.originalname}`,
    Body: file.buffer
  };

  const command = new PutObjectCommand(params);
  const result = await s3.send(command);

  return result.Location;
};


export { projectPicstoS3, profilePicstoS3 };
