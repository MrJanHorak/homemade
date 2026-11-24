import { notFound } from 'next/navigation';
import ProjectDetailView from './project-detail-view';
import { fetchForViewer } from '@/lib/server-api';
import { resolveInstructionImageIndexes } from '@/lib/project-images';
import { parseInstruction } from '@/lib/project-instructions';
import { sanitizeRichText } from '../../../../lib/rich-text.js';

export const dynamic = 'force-dynamic';

const ProjectDetailPage = async ({ params }) => {
  const { id } = await params;
  const response = await fetchForViewer(`/api/projects/${encodeURIComponent(id)}`);

  if (response.status === 404) {
    notFound();
  }

  if (!response.ok) {
    throw new Error('Unable to load project');
  }

  const { project } = await response.json();
  const pictures = project.buildPictures || [];
  const parsedInstructions = (project.buildInstructions || []).map((entry) => {
    const parsed = parseInstruction(entry);
    const stepImages = resolveInstructionImageIndexes(parsed, pictures).map((index) => pictures[index]);

    return {
      ...parsed,
      content: sanitizeRichText(parsed.content),
      images: Array.from(new Set(stepImages)),
    };
  });

  return (
    <ProjectDetailView
      project={{ ...project, description: sanitizeRichText(project.description) }}
      parsedInstructions={parsedInstructions}
    />
  );
};

export default ProjectDetailPage;
