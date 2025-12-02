import { useAuth } from '../context/AuthContext';
import PlayerProfile from './PlayerProfile';
import CoachProfile from './CoachProfile';

const Profile = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="profile-page">
        <p>يجب تسجيل الدخول لعرض الملف الشخصي</p>
      </div>
    );
  }

  if (user.role === 'coach') {
    return <CoachProfile />;
  }

  return <PlayerProfile />;
};

export default Profile;
