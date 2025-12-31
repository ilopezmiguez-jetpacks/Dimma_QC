import React, { useState } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Lock, Shield, Save } from 'lucide-react';

const SecuritySettingsTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: 'Error',
        description: 'New password and confirmation do not match.',
        variant: 'destructive',
      });
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast({
        title: 'Error',
        description: 'New password must be at least 6 characters long.',
        variant: 'destructive',
      });
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: passwordData.newPassword });

    if (!error) {
      toast({
        title: 'Success',
        description: 'Your password has been updated.',
      });
      setPasswordData({ newPassword: '', confirmPassword: '' });
    } else {
      toast({
        title: 'Error updating password',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-8">
      <div className="medical-card rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Lock className="w-5 h-5" />
          Change Password
        </h3>
        <form onSubmit={handleSavePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">New Password</label>
            <input 
              type="password"
              name="newPassword"
              value={passwordData.newPassword}
              onChange={handlePasswordChange}
              className="mt-1 w-full p-2 border rounded-md" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
            <input 
              type="password"
              name="confirmPassword"
              value={passwordData.confirmPassword}
              onChange={handlePasswordChange}
              className="mt-1 w-full p-2 border rounded-md" 
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" className="medical-gradient text-white">
              <Save className="w-4 h-4 mr-2" /> Save Password
            </Button>
          </div>
        </form>
      </div>

      <div className="medical-card rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Two-Factor Authentication (2FA)
        </h3>
        <div className="flex items-center justify-between">
            <p className="text-gray-600">
                Add an extra layer of security to your account.
            </p>
            <Button 
                onClick={() => toast({ title: "🚧 Coming Soon", description: "Two-factor authentication will be available soon."})}
                variant="outline"
            >
                Activate 2FA
            </Button>
        </div>
      </div>
    </div>
  );
};

export default SecuritySettingsTab;