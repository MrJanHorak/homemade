import EditProjectForm from './project-edit-form';

export const dynamic = 'force-dynamic';

const EditProjectPage = async ({ params }) => {
  const { id } = await params;

  return <EditProjectForm projectId={id} />;
};

export default EditProjectPage;
