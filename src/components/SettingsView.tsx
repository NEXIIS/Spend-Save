import { useState } from 'react';
import { ArrowLeft, User, Mail, LogOut, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import type { Session } from '@supabase/supabase-js';
import type { UserWallet } from '../types';

interface SettingsViewProps {
  onClose: () => void;
  session: Session;
  wallet: UserWallet | null;
  onRefetch: () => void; // So we can tell App.tsx to reload the new username
}

export function SettingsView({ onClose, session, wallet, onRefetch }: SettingsViewProps) {
  const [username, setUsername] = useState(wallet?.username || '');
  const [isSaving, setIsSaving] = useState(false);

  // 1. Save the new username to Supabase
  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ username: username })
        .eq('id', session.user.id);

      if (error) throw error;
      
      toast.success('Profile updated successfully!');
      onRefetch(); // Tell App to pull the fresh data
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  // 2. Kill the session
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right-8 duration-300 pb-10">
      {/* Header Row */}
      <div className="flex items-center gap-3">
        <button 
          onClick={onClose}
          className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-300 transition"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-2xl font-bold text-white">Settings</h2>
      </div>

      {/* Profile Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
        <h3 className="text-lg font-semibold text-white border-b border-slate-800 pb-4">Profile</h3>
        
        <div className="space-y-4">
          {/* Read-only Email */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-2">Account Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="text"
                disabled
                value={session?.user?.email || ''}
                className="w-full rounded-2xl bg-slate-800/50 border border-slate-700 pl-11 pr-4 py-3.5 text-slate-400 cursor-not-allowed"
              />
            </div>
          </div>

          {/* Editable Username */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-2">Display Name</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter a username..."
                className="w-full rounded-2xl bg-slate-800 border border-slate-700 pl-11 pr-4 py-3.5 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 transition"
              />
            </div>
          </div>

          <button
            onClick={handleSaveProfile}
            disabled={isSaving || username === wallet?.username}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3.5 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            <Save size={18} />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="pt-4">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-red-500/10 border border-red-500/20 py-4 font-semibold text-red-500 transition hover:bg-red-500/20"
        >
          <LogOut size={18} />
          Sign Out of FinTrack
        </button>
      </div>
    </div>
  );
}