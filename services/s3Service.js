import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

// Set the AWS region
const REGION = 'us-east-1'; //e.g. "us-east-1"

const projectPicstoS3 = async (files) => {
  console.log('uploading to s3', files);
  let urls = [];

  const s3 = new S3Client({
    region: REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  });

  const uploadPromises = files.map(async (file) => {
    const fileName = `projects/${uuidv4()}-${file.originalname}`;
    urls.push(
      `https://homemadesocialsite.s3.amazonaws.com/${fileName}`
    );
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: fileName,
      Body: file.buffer,
    };

    const command = new PutObjectCommand(params);
    const result = await s3.send(command);

    return result;
  });

  const results = await Promise.all(uploadPromises);

  return urls;
};

const profilePicstoS3 = async (file) => {

  const fileName = `${uuidv4()}-${file.originalname}`;
  const s3 = new S3Client({
    region: REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  });

  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: `profiles/${fileName}`,
    Body: file.buffer,
  };

  const command = new PutObjectCommand(params);
  const result = await s3.send(command);

  return fileName;
};

export { projectPicstoS3, profilePicstoS3 };
