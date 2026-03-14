import { notFound } from 'next/navigation';
import ProjectDetailView from './project-detail-view';
import { fetchApi } from '@/lib/api';

export const dynamic = 'force-dynamic';

const getUploadedFileName = (url) => {
  if (!url) {
    return '';
  }

  const withoutQuery = url.split('?')[0] || '';
  const key = withoutQuery.split('/').pop() || '';
  const firstDashIndex = key.indexOf('-');
  const rawName = firstDashIndex >= 0 ? key.slice(firstDashIndex + 1) : key;

  try {
    return decodeURIComponent(rawName).toLowerCase();
  } catch {
    return rawName.toLowerCase();
  }
};

const parseInstruction = (instruction) => {
  const raw = `${instruction || ''}`.trim();

  if (!raw) {
    return {
      label: '',
      content: '',
      imageNames: [],
      imagePosition: 'after',
    };
  }

  const metadataMatch = raw.match(/\s*\(([^)]*)\)\s*$/);
  const metadataRaw = metadataMatch?.[1] || '';
  const hasImageMetadata = /(^|;)\s*images\s*:/i.test(metadataRaw);
  const imagesMatch = metadataRaw.match(/(^|;)\s*images\s*:\s*([^;]*)/i);
  const positionMatch = metadataRaw.match(
    /(^|;)\s*position\s*:\s*(before|after)\s*($|;)/i,
  );

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
  const colonIndex = withoutType.indexOf(':');

  if (colonIndex > -1) {
    return {
      label: withoutType.slice(0, colonIndex).trim(),
      content: withoutType.slice(colonIndex + 1).trim(),
      imageNames,
      imagePosition,
      type,
    };
  }

  return {
    label: '',
    content: withoutType,
    imageNames,
    imagePosition,
    type,
  };
};

const ProjectDetailPage = async ({ params }) => {
  const { id } = await params;

  const response = await fetchApi(`/api/projects/${id}`, {
    cache: 'no-store',
  });

  if (response.status === 404) {
    notFound();
  }

  if (!response.ok) {
    throw new Error('Unable to load project');
  }

  const { project } = await response.json();
  const picturesByName = (project.buildPictures || []).reduce((map, url) => {
    const name = getUploadedFileName(url);

    if (!name) {
      return map;
    }

    if (!map.has(name)) {
      map.set(name, []);
    }

    map.get(name).push(url);
    return map;
  }, new Map());
  const parsedInstructions = (project.buildInstructions || []).map((entry) => {
    const parsed = parseInstruction(entry);
    const stepImages = parsed.imageNames.flatMap(
      (imageName) => picturesByName.get(imageName) || [],
    );

    return {
      ...parsed,
      images: Array.from(new Set(stepImages)),
    };
  });

  return (
    <ProjectDetailView
      project={project}
      parsedInstructions={parsedInstructions}
    />
  );
};

export default ProjectDetailPage;
