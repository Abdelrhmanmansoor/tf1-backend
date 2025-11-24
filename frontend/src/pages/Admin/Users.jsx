import { useEffect, useState } from 'react';
import { getUsers, blockUser } from '../../services/adminService';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await getUsers();
        setUsers(data.data);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, []);

  const handleBlock = async (userId) => {
    const reason = prompt('Block reason:');
    if (!reason) return;

    try {
      await blockUser(userId, reason);
      alert('✅ User blocked!');
      setUsers(users.map((u) =>
        u._id === userId ? { ...u, isBlocked: true } : u
      ));
    } catch (error) {
      alert('Error blocking user');
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="users-page">
      <h1>👥 Users Management</h1>

      <table className="users-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user._id}>
              <td>
                {user.firstName} {user.lastName}
              </td>
              <td>{user.email}</td>
              <td>
                <span className={`badge role-${user.role}`}>{user.role}</span>
              </td>
              <td>
                {user.isBlocked ? (
                  <span className="status blocked">🚫 Blocked</span>
                ) : (
                  <span className="status active">✅ Active</span>
                )}
              </td>
              <td>
                {!user.isBlocked && (
                  <button
                    onClick={() => handleBlock(user._id)}
                    className="btn-block"
                  >
                    Block
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
