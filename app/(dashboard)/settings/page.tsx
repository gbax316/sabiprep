'use client';

import React, { useState } from 'react';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { BottomNav } from '@/components/common/BottomNav';
import { Header } from '@/components/navigation/Header';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Moon,
  Globe,
  Shield,
  HelpCircle,
  Info,
  ChevronRight,
  Smartphone,
  Volume2,
  Eye,
  Trash2,
  LogOut,
} from 'lucide-react';

interface SettingToggleProps {
  label: string;
  description?: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

function SettingToggle({ label, description, enabled, onChange }: SettingToggleProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="font-medium text-slate-900">{label}</p>
        {description && <p className="text-sm text-slate-500">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative w-12 h-7 rounded-full transition-colors ${
          enabled ? 'bg-primary-600' : 'bg-slate-200'
        }`}
      >
        <span
          className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

interface SettingLinkProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  badge?: string;
  onClick?: () => void;
}

function SettingLink({ icon, label, description, badge, onClick }: SettingLinkProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between py-3 hover:bg-slate-50 -mx-4 px-4 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
          {icon}
        </div>
        <div className="text-left">
          <p className="font-medium text-slate-900">{label}</p>
          {description && <p className="text-sm text-slate-500">{description}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {badge && (
          <Badge variant="warning" size="sm">{badge}</Badge>
        )}
        <ChevronRight className="w-5 h-5 text-slate-400" />
      </div>
    </button>
  );
}

export default function SettingsPage() {
  const { signOut } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState(true);
  const [sounds, setSounds] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [haptics, setHaptics] = useState(true);

  const handleLogout = async () => {
    const confirmed = window.confirm('Are you sure you want to log out?');
    if (confirmed) {
      await signOut();
    }
  };

  const handleDeleteAccount = () => {
    alert('Account deletion feature coming soon. Please contact support for assistance.');
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <Header title="Settings" showBack />

      <div className="container-app py-6 space-y-6">
        {/* Notifications */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="font-display text-sm font-semibold text-slate-500 uppercase tracking-wider">
              Notifications
            </h2>
            <button
              onClick={() => router.push('/notifications')}
              className="text-sm text-primary-600 font-medium hover:text-primary-700 transition-colors"
            >
              View All →
            </button>
          </div>
          <Card>
            <SettingToggle
              label="Push Notifications"
              description="Get reminders to study"
              enabled={notifications}
              onChange={setNotifications}
            />
            <div className="border-t border-slate-100" />
            <SettingToggle
              label="Daily Reminder"
              description="Remind me to practice daily"
              enabled={notifications}
              onChange={setNotifications}
            />
            <div className="border-t border-slate-100" />
            <SettingToggle
              label="Achievement Alerts"
              description="Notify when I earn badges"
              enabled={notifications}
              onChange={setNotifications}
            />
          </Card>
        </div>

        {/* Preferences */}
        <div>
          <h2 className="font-display text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 px-1">
            Preferences
          </h2>
          <Card>
            <SettingToggle
              label="Sound Effects"
              description="Play sounds for correct/incorrect answers"
              enabled={sounds}
              onChange={setSounds}
            />
            <div className="border-t border-slate-100" />
            <SettingToggle
              label="Haptic Feedback"
              description="Vibrate on interactions"
              enabled={haptics}
              onChange={setHaptics}
            />
            <div className="border-t border-slate-100" />
            <SettingToggle
              label="Dark Mode"
              description="Use dark theme"
              enabled={darkMode}
              onChange={setDarkMode}
            />
          </Card>
        </div>

        {/* General */}
        <div>
          <h2 className="font-display text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 px-1">
            General
          </h2>
          <Card className="divide-y divide-slate-100">
            <SettingLink
              icon={<Globe className="w-5 h-5" />}
              label="Language"
              description="English"
              onClick={() => alert('Language settings coming soon!')}
            />
            <SettingLink
              icon={<Eye className="w-5 h-5" />}
              label="Accessibility"
              onClick={() => alert('Accessibility settings coming soon!')}
              badge="Coming Soon"
            />
          </Card>
        </div>

        {/* Support */}
        <div>
          <h2 className="font-display text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 px-1">
            Support
          </h2>
          <Card className="divide-y divide-slate-100">
            <SettingLink
              icon={<HelpCircle className="w-5 h-5" />}
              label="Help Center"
              description="FAQs and tutorials"
              onClick={() => router.push('/help')}
            />
            <SettingLink
              icon={<Shield className="w-5 h-5" />}
              label="Privacy Policy"
              onClick={() => alert('Privacy Policy coming soon!')}
            />
            <SettingLink
              icon={<Info className="w-5 h-5" />}
              label="About SabiPrep"
              description="Version 1.0.0"
              onClick={() => alert('About page coming soon!')}
            />
          </Card>
        </div>

        {/* Account Actions */}
        <div>
          <h2 className="font-display text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 px-1">
            Account
          </h2>
          <Card className="divide-y divide-slate-100">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 py-3 text-left hover:bg-slate-50 -mx-4 px-4 transition-colors"
            >
              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                <LogOut className="w-5 h-5 text-slate-600" />
              </div>
              <span className="font-medium text-slate-900">Log Out</span>
            </button>
            <button
              onClick={handleDeleteAccount}
              className="w-full flex items-center gap-3 py-3 text-left hover:bg-red-50 -mx-4 px-4 transition-colors"
            >
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <span className="font-medium text-red-600">Delete Account</span>
            </button>
          </Card>
        </div>

        {/* App Info */}
        <div className="text-center pt-4">
          <p className="text-sm text-slate-400">SabiPrep v1.0.0</p>
          <p className="text-xs text-slate-400 mt-1">Made with ❤️ for Nigerian Students</p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
