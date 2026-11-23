import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';

const uploadImages = async (prefix, files) => {
  const region = process.env.AWS_REGION || 'us-east-1';
  const bucket = process.env.S3_BUCKET || process.env.AWS_BUCKET_NAME;
  if (!bucket) throw new Error('S3 bucket is not configured');

  const s3 = new S3Client({ region });
  try {
    const attempts = await Promise.allSettled(files.map(async (file) => {
      const name = `${randomUUID()}-${file.originalname}`;
      await s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: `${prefix}/${name}`,
        Body: file.buffer,
        ContentType: file.mimetype,
      }));

      const domain = region === 'us-east-1' ? 's3.amazonaws.com' : `s3.${region}.amazonaws.com`;
      return `https://${bucket}.${domain}/${prefix}/${encodeURIComponent(name)}`;
    }));
    return attempts.map((attempt) => {
      if (attempt.status === 'rejected') throw attempt.reason;
      return attempt.value;
    });
  } finally {
    s3.destroy();
  }
};

const projectPicstoS3 = (files) => uploadImages('projects', files);
const profilePicstoS3 = async (file) => (await uploadImages('profiles', [file]))[0];

export { projectPicstoS3, profilePicstoS3 };
