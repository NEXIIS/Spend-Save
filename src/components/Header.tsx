import { useState } from 'react';
import { Wallet, Bell, Settings, Circle } from 'lucide-react';
import type { Notification } from '../types';

interface HeaderProps {
  onOpenSettings: () => void;
  name: string;
  // We added these two props to receive the data from your dashboard!
  notifications?: Notification[];
  markAsRead?: (id: string) => void;
}

export function Header({ name, onOpenSettings, notifications = [], markAsRead }: HeaderProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const initial = name.charAt(0).toUpperCase();

  // Calculate unread count
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const getGreeting = () => {
    const currentHour = new Date().getHours();
    if (currentHour >= 0 && currentHour < 12) return "Good morning";
    if (currentHour >= 12 && currentHour < 17) return "Good afternoon";
    return "Good evening";
  };

  const handleNotificationClick = (id: string) => {
    if (markAsRead) {
      markAsRead(id);
    }
  };

  return (
    <header className="flex items-center justify-between py-5 px-1 relative z-50">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/30">
          <Wallet size={16} className="text-white" />
        </div>
        <div>
          <p className="text-gray-400 text-sm">{getGreeting()}</p>
          <p className="text-sm font-semibold text-white leading-tight">{name}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 relative">
        {/* Notification Bell Wrapper */}
        <div className="relative">
          <button 
            onClick={() => setShowDropdown(!showDropdown)}
            className="relative p-2 text-slate-400 hover:text-slate-300 transition"
          >
            <Bell className="w-5 h-5" />
            
            {/* The Pinging Red Dot Badge */}
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
              </span>
            )}
          </button>

          {/* Notification Dropdown Menu */}
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
                <h3 className="text-white font-semibold text-sm">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">
                    {unreadCount} New
                  </span>
                )}
              </div>
              
              <div className="max-h-80 overflow-y-auto custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-slate-400 text-sm">You're all caught up!</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div 
                      key={notif.id} 
                      onClick={() => handleNotificationClick(notif.id)}
                      className={`p-4 border-b border-slate-800/50 cursor-pointer transition-colors flex gap-3
                        ${!notif.is_read ? 'bg-slate-800/30 hover:bg-slate-800/50' : 'hover:bg-slate-800/30'}
                      `}
                    >
                      <div className="mt-1 flex-shrink-0">
                        {!notif.is_read ? (
                          <Circle className="w-2.5 h-2.5 fill-blue-500 text-blue-500" />
                        ) : (
                          <Circle className="w-2.5 h-2.5 text-slate-700" />
                        )}
                      </div>
                      <div>
                        <h4 className={`text-sm ${!notif.is_read ? 'text-white font-medium' : 'text-slate-300'}`}>
                          {notif.title}
                        </h4>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                          {notif.message}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <button 
          onClick={onOpenSettings}
          className="p-2 bg-slate-800/50 hover:bg-slate-800 rounded-full text-slate-300 transition"
        >
         <Settings size={20} />
        </button>       
        
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 text-sm font-bold">
          {initial}
        </div>
      </div>
    </header>
  );
}