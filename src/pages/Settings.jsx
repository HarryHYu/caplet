import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Settings = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (!isAuthenticated) {
    navigate('/');
    return null;
  }

  const navItems = [
    { path: '/settings/profile', label: 'Profile', description: 'Name, email, password, bio' },
    { path: '/settings/account', label: 'Account', description: 'Role, preferences' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Settings</h1>
        <div className="flex flex-col md:flex-row gap-8">
          <nav className="w-full md:w-56 flex-shrink-0" aria-label="Settings">
            <ul className="space-y-1">
              {navItems.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.path === '/settings/profile'}
                    className={({ isActive }) =>
                      `block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`
                    }
                  >
                    <span className="block">{item.label}</span>
                    <span className="block text-xs font-normal text-gray-500 dark:text-gray-400 mt-0.5">
                      {item.description}
                    </span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default Settings;
