// Step indexes include existing project images before newly selected files.
const removeSelectedImage = (form, existingCount, index) => {
  if (index < 0 || index >= form.buildPictures.length) return form;
  const removedIndex = existingCount + index;
  return {
    ...form,
    buildPictures: form.buildPictures.filter((_, current) => current !== index),
    buildSteps: form.buildSteps.map((step) => ({
      ...step,
      imageIndexes: step.imageIndexes
        .filter((value) => value !== removedIndex)
        .map((value) => value > removedIndex ? value - 1 : value),
    })),
  };
};

const moveSelectedImage = (form, existingCount, from, to) => {
  if (from < 0 || to < 0 || from >= form.buildPictures.length || to >= form.buildPictures.length || from === to) return form;
  const pictures = [...form.buildPictures];
  const [file] = pictures.splice(from, 1);
  pictures.splice(to, 0, file);
  const remap = (value) => {
    const index = value - existingCount;
    if (index < 0) return value;
    if (index === from) return existingCount + to;
    if (from < to && index > from && index <= to) return value - 1;
    if (to < from && index >= to && index < from) return value + 1;
    return value;
  };
  return {
    ...form,
    buildPictures: pictures,
    buildSteps: form.buildSteps.map((step) => ({ ...step, imageIndexes: step.imageIndexes.map(remap) })),
  };
};

const clearMissingDraftAttachments = (steps) => steps.map((step) => ({
  ...step,
  imageIndexes: [],
}));

export { clearMissingDraftAttachments, moveSelectedImage, removeSelectedImage };
