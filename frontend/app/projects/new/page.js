import ProjectFormPage from './project-form';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'New Project | Homemade',
  description: 'Create and publish a new maker project on Homemade.',
};

const NewProjectPage = () => {
  return <ProjectFormPage />;
};

export default NewProjectPage;
