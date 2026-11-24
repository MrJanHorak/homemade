import { uploadImageKeys } from './s3Service.js';

const storageProviders = {
  s3: {
    upload: uploadImageKeys,
    getUrl: (key) => {
      const region = process.env.AWS_REGION || 'us-east-1';
      const bucket = process.env.S3_BUCKET || process.env.AWS_BUCKET_NAME;
      if (!bucket) throw new Error('S3 bucket is not configured');

      const host = region === 'us-east-1'
        ? `${bucket}.s3.amazonaws.com`
        : `${bucket}.s3.${region}.amazonaws.com`;
      const encodedKey = key.split('/').map(encodeURIComponent).join('/');
      return `https://${host}/${encodedKey}`;
    },
  },
};

const getProvider = () => {
  const name = process.env.MEDIA_PROVIDER || 's3';
  const provider = storageProviders[name];
  if (!provider) throw new Error(`Unsupported media provider: ${name}`);
  return provider;
};

const uploadMedia = async (purpose, files) => {
  const provider = getProvider();
  const keys = await provider.upload(purpose, files);
  return keys.map((key) => `media:${key}`);
};

const getMediaUrl = (reference) => {
  if (typeof reference !== 'string' || !reference.startsWith('media:')) return reference || null;
  const key = reference.slice('media:'.length);
  if (!/^(projects|profiles)\/[a-z\d-]+-[^/]+$/i.test(key)) return null;
  return getProvider().getUrl(key);
};

const uploadProjectPictures = (files) => uploadMedia('projects', files);
const uploadProfileAvatar = async (file) => (await uploadMedia('profiles', [file]))[0];

export { getMediaUrl, uploadMedia, uploadProfileAvatar, uploadProjectPictures };
