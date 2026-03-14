import ProjectForm from '@/app/projects/new/project-form';

export const dynamic = 'force-dynamic';

const EditProjectPage = async ({ params }) => {
  const { id } = await params;

  return <ProjectForm mode='edit' projectId={id} />;
};

export default EditProjectPage;
