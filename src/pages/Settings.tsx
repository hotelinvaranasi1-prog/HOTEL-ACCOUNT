import React, { useState, useEffect, useRef } from 'react';
import { Send, Bell, Shield, Save, Loader2, CheckCircle2, Hotel, Sparkles, Image as ImageIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { getSettings, saveSettings } from '../services/firebaseService';

export default function Settings() {
  const [settings, setSettings] = useState({
    telegram_enabled: 'false',
    telegram_bot_token: '',
    telegram_chat_id: '',
    
    // Hotel Details
    hotel_name: '',
    hotel_address1: '',
    hotel_address2: '',
    hotel_city: '',
    hotel_state: '',
    hotel_pincode: '',
    hotel_country: '',
    hotel_phone: '',
    hotel_whatsapp: '',
    hotel_email: '',
    hotel_website: '',
    hotel_gstin: '',
    hotel_pan: '',
    
    // Media & Links
    hotel_logo: '',
    hotel_instagram: '',
    hotel_facebook: '',
    hotel_twitter: '',
    hotel_google_maps: '',
    
    // Invoice Text & Formatting
    hotel_invoice_terms: '',
    hotel_footer_message: '© 2024 Hotel Name',
    hotel_best_regards: 'Best Regards,\nHotel Name',
    hotel_signature: '',
    
    // Payment
    hotel_upi_id: '',
    hotel_qr: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const fetchSettingsData = async () => {
      try {
        const data = await getSettings();
        // Handle migration from old 'hotel_address' to 'hotel_address1' if necessary
        if (data.hotel_address && !data.hotel_address1) {
          data.hotel_address1 = data.hotel_address;
        }
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings({ ...settings, [field]: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const InputField = ({ label, field, placeholder, type = 'text', colSpan = 1 }: any) => (
    <div className={colSpan === 2 ? "md:col-span-2" : ""}>
      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{label}</label>
      <input
        type={type}
        value={settings[field as keyof typeof settings]}
        onChange={e => setSettings({ ...settings, [field]: e.target.value })}
        placeholder={placeholder}
        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
      />
    </div>
  );

  const TextAreaField = ({ label, field, placeholder, rows = 3, colSpan = 2 }: any) => (
    <div className={colSpan === 2 ? "md:col-span-2" : ""}>
      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{label}</label>
      <textarea
        value={settings[field as keyof typeof settings]}
        onChange={e => setSettings({ ...settings, [field]: e.target.value })}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
      />
    </div>
  );

  const ImageUploadField = ({ label, field }: any) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const value = settings[field as keyof typeof settings] as string;

    return (
      <div className="md:col-span-2">
        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{label}</label>
        <div className="flex items-center gap-4">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={(e) => handleImageUpload(e, field)}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-slate-100 transition-colors flex items-center gap-2 font-bold text-slate-700"
          >
            <ImageIcon className="w-5 h-5" />
            Upload Image
          </button>
          
          <input
            type="text"
            value={value}
            onChange={e => setSettings({ ...settings, [field]: e.target.value })}
            placeholder="Or enter image URL"
            className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm"
          />
          {value && (
            <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 flex items-center justify-center shrink-0">
              <img src={value} alt="Preview" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
            </div>
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500">Configure hotel profile, invoice branding, and system preferences.</p>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 space-y-12">
          
          {/* 1. Hotel Details */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="bg-indigo-50 p-2 rounded-xl">
                <Hotel className="w-6 h-6 text-indigo-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">1. Hotel Information</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputField label="Hotel Name" field="hotel_name" placeholder="Grand Vista Hotel" colSpan={2} />
              <InputField label="Address Line 1" field="hotel_address1" placeholder="123 Main Street" colSpan={2} />
              <InputField label="Address Line 2" field="hotel_address2" placeholder="Suite 100" colSpan={2} />
              <InputField label="City" field="hotel_city" placeholder="Varanasi" />
              <InputField label="State" field="hotel_state" placeholder="Uttar Pradesh" />
              <InputField label="Pincode / Zip Code" field="hotel_pincode" placeholder="221001" />
              <InputField label="Country" field="hotel_country" placeholder="India" />
              
              <InputField label="Phone Number" field="hotel_phone" placeholder="+91 98765 43210" />
              <InputField label="WhatsApp Number" field="hotel_whatsapp" placeholder="+91 98765 43210" />
              <InputField label="Email Address" field="hotel_email" placeholder="contact@hotel.com" type="email" />
              <InputField label="Website" field="hotel_website" placeholder="https://hotel.com" />
              
              <InputField label="GSTIN Number" field="hotel_gstin" placeholder="09AXXXXXX0000X1Z5" />
              <InputField label="PAN Number" field="hotel_pan" placeholder="ABCDE1234F" />
            </div>
          </div>

          {/* 2. Branding & Social */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="bg-pink-50 p-2 rounded-xl">
                <ImageIcon className="w-6 h-6 text-pink-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">2. Branding & Social Links</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ImageUploadField label="Hotel Logo" field="hotel_logo" />
              
              <InputField label="Instagram Link" field="hotel_instagram" placeholder="https://instagram.com/hotel" />
              <InputField label="Facebook Link" field="hotel_facebook" placeholder="https://facebook.com/hotel" />
              <InputField label="X/Twitter Link" field="hotel_twitter" placeholder="https://x.com/hotel" />
              <InputField label="Google Maps Link" field="hotel_google_maps" placeholder="https://maps.app.goo.gl/..." />
            </div>
          </div>

          {/* 3. Invoice Configuration */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="bg-emerald-50 p-2 rounded-xl">
                <Save className="w-6 h-6 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">3. Invoice Content & Payments</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <TextAreaField label="Terms and Conditions" field="hotel_invoice_terms" placeholder="1. Checkout time is 11:00 AM..." rows={4} />
              <InputField label="Footer Message" field="hotel_footer_message" placeholder="© 2024 Hotel Name" colSpan={2} />
              <TextAreaField label="Best Regards Text" field="hotel_best_regards" placeholder="Best Regards,\nHotel Management" rows={3} />
              
              <ImageUploadField label="Signature Image (Optional)" field="hotel_signature" />
              
              <InputField label="UPI ID" field="hotel_upi_id" placeholder="hotel@upi" />
              <ImageUploadField label="Payment QR Code (Optional)" field="hotel_qr" />
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
        </div>

        <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between sticky bottom-0 z-10">
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
