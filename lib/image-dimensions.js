const MAX_IMAGE_SIDE = 10000;
const MAX_IMAGE_PIXELS = 40_000_000;
const PNG_SIGNATURE = Buffer.from('89504e470d0a1a0a', 'hex');
const JPEG_START = Buffer.from('ffd8', 'hex');
const SOF_MARKERS = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);

const pngDimensions = (buffer) => {
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE) ||
      buffer.readUInt32BE(8) !== 13 || buffer.toString('ascii', 12, 16) !== 'IHDR') return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
};

const jpegDimensions = (buffer) => {
  if (buffer.length < 4 || !buffer.subarray(0, 2).equals(JPEG_START)) return null;
  let cursor = 2;
  while (cursor < buffer.length) {
    if (buffer[cursor++] !== 0xff) return null;
    while (cursor < buffer.length && buffer[cursor] === 0xff) cursor += 1;
    if (cursor >= buffer.length) return null;
    const marker = buffer[cursor++];
    if (marker === 0xd9 || marker === 0xda || marker === 0x00) return null;
    if (marker === 0x01 || marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (cursor + 2 > buffer.length) return null;
    const length = buffer.readUInt16BE(cursor);
    if (length < 2 || cursor + length > buffer.length) return null;
    if (SOF_MARKERS.has(marker)) {
      if (length < 8) return null;
      return { height: buffer.readUInt16BE(cursor + 3), width: buffer.readUInt16BE(cursor + 5) };
    }
    cursor += length;
  }
  return null;
};

const validateImageDimensions = (buffer, mimetype) => {
  if (!Buffer.isBuffer(buffer)) return false;
  const dimensions = mimetype === 'image/png' ? pngDimensions(buffer)
    : mimetype === 'image/jpeg' ? jpegDimensions(buffer) : null;
  return Boolean(dimensions && dimensions.width > 0 && dimensions.height > 0 &&
    dimensions.width <= MAX_IMAGE_SIDE && dimensions.height <= MAX_IMAGE_SIDE &&
    dimensions.width * dimensions.height <= MAX_IMAGE_PIXELS);
};

export { MAX_IMAGE_PIXELS, MAX_IMAGE_SIDE, validateImageDimensions };
