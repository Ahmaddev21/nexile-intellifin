
import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Table2,
  BrainCircuit,
  Briefcase,
  PieChart as ReportIcon,
  Settings,
  LogOut,
  Bell,
  User,
  Menu,
  X,
  Sun,
  Moon,
  Clock as ClockIcon,
  Camera,
  Loader2
} from 'lucide-react';
import { uploadAvatar, updateProfileAvatar, getProfile, getMe } from '../services/auth';

interface LayoutProps {
  children: React.ReactNode;
  activeView: string;
  onViewChange: (view: string) => void;
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
  userName: string;
  onLogout: () => void;
}

const DigitalClock: React.FC = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-mono text-sm bg-slate-100 dark:bg-slate-800/50 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
      <ClockIcon className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
      <span>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
    </div>
  );
};

const Layout: React.FC<LayoutProps> = ({ children, activeView, onViewChange, theme, onThemeToggle, userName, onLogout }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const user = await getMe();
        if (user) {
          setUserId(user.id);
          // Try fetching profile
          const profile = await getProfile(user.id);
          if (profile && profile.avatar_url) {
            setAvatarUrl(profile.avatar_url);
          }
        }
      } catch (e) {
        console.error("Error loading profile", e);
      }
    };
    loadProfile();
  }, [userName]); // Reload if userName changes (e.g. login)

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !userId) return;

    setIsUploading(true);
    try {
      const publicUrl = await uploadAvatar(file);
      await updateProfileAvatar(userId, publicUrl);
      setAvatarUrl(publicUrl);
      // alert("Avatar updated!");
    } catch (error) {
      console.error("Error uploading avatar:", error);
      alert("Failed to upload avatar.");
    } finally {
      setIsUploading(false);
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Intelligence', icon: LayoutDashboard },
    { id: 'workspace', label: 'Workspace', icon: Table2 },
    { id: 'projects', label: 'Projects', icon: Briefcase },
    { id: 'ai-analyst', label: 'AI Analyst', icon: BrainCircuit },
    { id: 'team', label: 'Team Access', icon: User },
    { id: 'reports', label: 'Reports', icon: ReportIcon },
  ];

  const firstName = userName.split(' ')[0] || 'User';

  return (
    <div className={`flex min-h-screen transition-colors duration-500 ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 transition-all duration-300 transform ${isSidebarOpen ? 'w-72' : 'w-20'} bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 hidden md:block shadow-2xl shadow-slate-200 dark:shadow-none`}>
        <div className="flex flex-col h-full">
          <div className="p-8 flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 shrink-0">
                <BrainCircuit className="w-6 h-6 text-white" />
              </div>
              {isSidebarOpen && (
                <h1 className="font-heading font-bold text-xl text-slate-900 dark:text-white tracking-tight animate-in fade-in slide-in-from-left-4 duration-500">
                  Nexile
                </h1>
              )}
            </div>
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 px-4 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl font-bold text-sm transition-all group ${activeView === item.id
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                  : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }`}
              >
                <item.icon className={`w-5 h-5 ${activeView === item.id ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600'}`} />
                <span className={`${!isSidebarOpen && 'hidden'}`}>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="p-4 mt-auto">
            <div className={`bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-4 mb-4 ${!isSidebarOpen && 'hidden'}`}>
              <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">User</div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-slate-900 dark:text-white truncate">{firstName}</span>
                <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-bold">Pro</span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 w-3/4"></div>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl font-bold text-sm text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 transition-all"
            >
              <LogOut className="w-5 h-5" />
              <span className={`${!isSidebarOpen && 'hidden'}`}>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'md:ml-72' : 'md:ml-20'}`}>
        <header className="h-20 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md sticky top-0 z-40 border-b border-slate-100 dark:border-slate-800 px-8 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className={`transition-all duration-300 ${isSidebarOpen ? 'md:hidden opacity-0 w-0' : 'md:flex opacity-100 w-auto'} flex items-center gap-3`}>
              <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                <BrainCircuit className="w-6 h-6 text-white" />
              </div>
              <h1 className="font-heading font-bold text-xl text-slate-900 dark:text-white tracking-tight hidden sm:block">Nexile</h1>
            </div>
            {!isSidebarOpen && <div className="hidden md:block h-8 w-[1px] bg-slate-100 dark:bg-slate-800 mx-2"></div>}
            <DigitalClock />
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={onThemeToggle}
              className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all shadow-sm border border-slate-200 dark:border-slate-700"
              title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>

            <button
              onClick={() => alert('Notifications feature coming soon!')}
              className="relative p-2.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700"
              title="View Notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
            </button>

            <div className="h-8 w-[1px] bg-slate-100 dark:bg-slate-800 mx-2"></div>

            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{userName || 'Financial User'}</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Command Center</div>
              </div>
              <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900 rounded-2xl flex items-center justify-center border-2 border-white dark:border-slate-800 shadow-sm overflow-hidden ring-2 ring-indigo-500/20 relative group cursor-pointer" onClick={handleAvatarClick}>
                {isUploading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-600 dark:text-indigo-400" />
                ) : (
                  <>
                    <img
                      src={avatarUrl || `https://picsum.photos/seed/${userName || 'Sarah'}/100/100`}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30 hidden group-hover:flex items-center justify-center transition-all">
                      <Camera className="w-4 h-4 text-white opacity-80" />
                    </div>
                  </>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </div>
            </div>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
