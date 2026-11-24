const storagePrefix = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}-/i;

const getStoredPictureName = (url, fallback = '') => {
  if (!url) return fallback;
  const key = url.split(/[?#]/, 1)[0].split('/').pop();
  if (!key) return fallback;

  const filename = key.replace(storagePrefix, '');
  try {
    return decodeURIComponent(filename);
  } catch {
    return filename;
  }
};

const resolveInstructionImageIndexes = (instruction, pictures) => {
  if (instruction.imageIndexes !== null && Array.isArray(instruction.imageIndexes)) {
    return instruction.imageIndexes.filter((index) => Number.isSafeInteger(index) && index >= 0 && index < pictures.length);
  }
  const indexes = (instruction.imageNames || []).flatMap((name) =>
    pictures.flatMap((url, index) => getStoredPictureName(url).toLowerCase() === name ? [index] : []),
  );
  return [...new Set(indexes)];
};

export { getStoredPictureName, resolveInstructionImageIndexes };
