import ProjectForm from '@/app/projects/new/project-form';

export const dynamic = 'force-dynamic';

const EditProjectPage = async ({ params, searchParams }) => {
  const [{ id }, query] = await Promise.all([params, searchParams]);

  return <ProjectForm mode='edit' projectId={id} justSavedHidden={query.hidden === '1'} />;
};

export default EditProjectPage;
