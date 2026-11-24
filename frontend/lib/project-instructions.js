export const parseInstruction = (instruction) => {
  const raw = `${instruction || ''}`.trim();

  if (!raw) {
    return {
      label: '',
      content: '',
      imageNames: [],
      imageIndexes: null,
      imagePosition: 'after',
      type: 'instruction',
    };
  }

  const metadataMatch = raw.match(/\s*\(([^)]*)\)\s*$/);
  const metadataRaw = metadataMatch?.[1] || '';
  const hasImageMetadata = /(^|;)\s*images\s*:/i.test(metadataRaw);
  const imagesMatch = metadataRaw.match(/(^|;)\s*images\s*:\s*([^;]*)/i);
  const positionMatch = metadataRaw.match(
    /(^|;)\s*position\s*:\s*(before|after)\s*($|;)/i,
  );
  const indexesMatch = metadataRaw.match(/(^|;)\s*indexes\s*:\s*([\d,\s]*)(?=;|$)/i);
  const imageIndexes = indexesMatch
    ? [...new Set(indexesMatch[2].split(',').map((entry) => entry.trim()).filter(Boolean).map(Number).filter(Number.isSafeInteger))]
    : null;

  const imageNames = imagesMatch?.[2]
    ? imagesMatch[2]
        .split(',')
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean)
    : [];
  const imagePosition = positionMatch?.[2]
    ? positionMatch[2].toLowerCase()
    : 'after';

  const withoutImages =
    hasImageMetadata && metadataMatch
      ? raw.slice(0, metadataMatch.index).trim()
      : raw;
  const typeMatch = withoutImages.match(/^\[(TIP|WARNING|CHECKPOINT)\]\s*/i);
  const type = typeMatch ? typeMatch[1].toLowerCase() : 'instruction';
  const withoutType = typeMatch
    ? withoutImages.slice(typeMatch[0].length)
    : withoutImages;
  const separator = withoutType.indexOf(':');

  if (separator > 0 && !withoutType.slice(0, separator).includes('<')) {
    return {
      label: withoutType.slice(0, separator).trim(),
      content: withoutType.slice(separator + 1).trim(),
      imageNames,
      imageIndexes,
      imagePosition,
      type,
    };
  }

  return {
    label: '',
    content: withoutType,
    imageNames,
    imageIndexes,
    imagePosition,
    type,
  };
};
