import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';

const uploadImages = async (prefix, files, options = {}) => {
  const region = process.env.AWS_REGION || 'us-east-1';
  const bucket = process.env.S3_BUCKET || process.env.AWS_BUCKET_NAME;
  if (!bucket) throw new Error('S3 bucket is not configured');

  const s3 = options.client || new S3Client({ region });
  const names = files.map((file) => `${(options.createId || randomUUID)()}-${file.originalname}`);
  try {
    const attempts = await Promise.allSettled(files.map(async (file, index) => {
      const name = names[index];
      await s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: `${prefix}/${name}`,
        Body: file.buffer,
        ContentType: file.mimetype,
      }));

      const domain = region === 'us-east-1' ? 's3.amazonaws.com' : `s3.${region}.amazonaws.com`;
      return `https://${bucket}.${domain}/${prefix}/${encodeURIComponent(name)}`;
    }));
    const failure = attempts.find((attempt) => attempt.status === 'rejected');
    if (failure) {
      // A failed request may still have reached S3, so delete every attempted key.
      const cleanup = await Promise.allSettled(names.map(async (name) => s3.send(new DeleteObjectCommand({
        Bucket: bucket,
        Key: `${prefix}/${name}`,
      }))));
      if (cleanup.some((result) => result.status === 'rejected')) {
        console.warn('Unable to clean up an incomplete image upload batch.');
      }
      throw failure.reason;
    }
    return attempts.map((attempt) => attempt.value);
  } finally {
    s3.destroy();
  }
};

const projectPicstoS3 = (files) => uploadImages('projects', files);
const profilePicstoS3 = async (file) => (await uploadImages('profiles', [file]))[0];

export { uploadImages, projectPicstoS3, profilePicstoS3 };
