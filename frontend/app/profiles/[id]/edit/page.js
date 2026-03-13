import ProfileEditForm from './profile-edit-form';

export const dynamic = 'force-dynamic';

const EditProfilePage = ({ params }) => {
  return <ProfileEditForm profileId={params.id} />;
};

export default EditProfilePage;
