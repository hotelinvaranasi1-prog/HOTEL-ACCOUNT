import React, { useState, useEffect } from 'react';
import { Send, Bell, Shield, Save, Loader2, CheckCircle2, Hotel, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { getSettings, saveSettings } from '../services/firebaseService';

export default function Settings() {
  const [settings, setSettings] = useState({
    telegram_enabled: 'false',
    telegram_bot_token: '',
    telegram_chat_id: '',
    hotel_name: '',
    hotel_address: '',
    hotel_phone: '',
    hotel_email: '',
    hotel_logo: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const fetchSettingsData = async () => {
      try {
        const data = await getSettings();
        setSettings(prev => ({ ...prev, ...data }));
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettingsData();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveSettings(settings);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500">Configure notifications and system preferences.</p>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 space-y-12">
          {/* Hotel Details Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-50 p-2 rounded-xl">
                <Hotel className="w-6 h-6 text-indigo-600" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Hotel Profile</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Hotel Name</label>
                <input
                  type="text"
                  value={settings.hotel_name}
                  onChange={e => setSettings({ ...settings, hotel_name: e.target.value })}
                  placeholder="e.g. Grand Vista Hotel"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Hotel Address</label>
                <textarea
                  value={settings.hotel_address}
                  onChange={e => setSettings({ ...settings, hotel_address: e.target.value })}
                  placeholder="Full business address"
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Phone Number</label>
                <input
                  type="text"
                  value={settings.hotel_phone}
                  onChange={e => setSettings({ ...settings, hotel_phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Email Address</label>
                <input
                  type="email"
                  value={settings.hotel_email}
                  onChange={e => setSettings({ ...settings, hotel_email: e.target.value })}
                  placeholder="contact@hotel.com"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Hotel Logo URL</label>
                <div className="flex items-center gap-4">
                  <input
                    type="text"
                    value={settings.hotel_logo}
                    onChange={e => setSettings({ ...settings, hotel_logo: e.target.value })}
                    placeholder="https://example.com/logo.png (or base64)"
                    className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                  />
                  {settings.hotel_logo && (
                    <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 flex items-center justify-center">
                      <img src={settings.hotel_logo} alt="Logo Preview" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-100" />

          {/* Telegram Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="bg-blue-50 p-2 rounded-xl">
                <Send className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Telegram Notifications</h2>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
              <div>
                <p className="font-bold text-slate-900">Enable Notifications</p>
                <p className="text-xs text-slate-500">Send a message when a new booking is added.</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, telegram_enabled: settings.telegram_enabled === 'true' ? 'false' : 'true' })}
                className={cn(
                  "w-14 h-8 rounded-full transition-all relative",
                  settings.telegram_enabled === 'true' ? "bg-indigo-600" : "bg-slate-300"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-sm",
                  settings.telegram_enabled === 'true' ? "left-7" : "left-1"
                )} />
              </button>
            </div>

            {settings.telegram_enabled === 'true' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Bot Token</label>
                  <input
                    type="text"
                    value={settings.telegram_bot_token}
                    onChange={e => setSettings({ ...settings, telegram_bot_token: e.target.value })}
                    placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Chat ID</label>
                  <input
                    type="text"
                    value={settings.telegram_chat_id}
                    onChange={e => setSettings({ ...settings, telegram_chat_id: e.target.value })}
                    placeholder="-100123456789"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
                  />
                </div>
              </motion.div>
            )}
          </div>

          <div className="h-px bg-slate-100" />

          {/* Email Integration Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-50 p-2 rounded-xl">
                <Send className="w-6 h-6 text-emerald-600" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Email (Gmail) Integration</h2>
            </div>
            
            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200">
              <p className="text-sm text-slate-600 leading-relaxed">
                To send invoices directly from the app via your Gmail account, you need to configure environment variables in your deployment platform:
              </p>
              <ul className="mt-4 space-y-3">
                <li className="flex items-start gap-3">
                  <div className="mt-1 w-5 h-5 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-400">1</div>
                  <p className="text-xs text-slate-600">Set <code className="bg-white px-2 py-0.5 rounded border border-slate-200 font-mono text-indigo-600">GMAIL_USER</code> to your Gmail address.</p>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 w-5 h-5 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-400">2</div>
                  <p className="text-xs text-slate-600">Set <code className="bg-white px-2 py-0.5 rounded border border-slate-200 font-mono text-indigo-600">GMAIL_APP_PASSWORD</code> to a 16-character App Password (not your regular password).</p>
                </li>
              </ul>
              <div className="mt-6 p-4 bg-white rounded-2xl border border-indigo-100 flex items-center gap-3">
                <div className="p-2 bg-indigo-50 rounded-lg">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                </div>
                <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-tight">Pro Tip: Generate an App Password in your Google Account Security settings under "2-Step Verification".</p>
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-100" />
          <div className="space-y-6 opacity-50 pointer-events-none">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-50 p-2 rounded-xl">
                <Shield className="w-6 h-6 text-indigo-600" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Security</h2>
            </div>
            <p className="text-sm text-slate-500 italic">Advanced security settings are coming soon.</p>
          </div>
        </div>

        <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {showSuccess && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 text-emerald-600 font-bold text-sm"
              >
                <CheckCircle2 className="w-4 h-4" />
                Settings saved successfully!
              </motion.div>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 disabled:opacity-70 transition-all"
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Save Changes</>}
          </button>
        </div>
      </div>
    </div>
  );
}
