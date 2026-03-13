import ProfileEditForm from './profile-edit-form';

export const dynamic = 'force-dynamic';

const EditProfilePage = async ({ params }) => {
  const { id } = await params;

  return <ProfileEditForm profileId={id} />;
};

export default EditProfilePage;
