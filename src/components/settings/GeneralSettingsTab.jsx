import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const GeneralSettingsTab = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [labSettings, setLabSettings] = useState({
    id: null,
    name: '',
    address: '',
    phone: '',
    email: '',
    cuit: '',
    director: '',
    license: ''
  });

  useEffect(() => {
    const fetchLabSettings = async () => {
      setLoading(true);
      try {
        // Fetch the first laboratory record (active or not, we want to see it)
        const { data, error } = await supabase
          .from('laboratories')
          .select('*')
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setLabSettings({
            id: data.id,
            name: data.name || '',
            address: data.address || '',
            phone: data.phone || '',
            email: data.email || '',
            cuit: data.cuit || '',
            director: data.director || '',
            license: data.license_number || ''
          });
        }
      } catch (error) {
        console.error('Error fetching lab settings:', error);
        toast({
          title: "Error",
          description: "Could not load laboratory settings.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchLabSettings();
  }, [toast]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const payload = {
        name: labSettings.name,
        address: labSettings.address,
        phone: labSettings.phone,
        email: labSettings.email,
        cuit: labSettings.cuit,
        director: labSettings.director,
        license_number: labSettings.license,
        is_active: true
      };

      let error;
      if (labSettings.id) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('laboratories')
          .update(payload)
          .eq('id', labSettings.id);
        error = updateError;
      } else {
        // Create new record
        const { data, error: insertError } = await supabase
          .from('laboratories')
          .insert(payload)
          .select()
          .single();
        
        if (data) {
          setLabSettings(prev => ({ ...prev, id: data.id }));
        }
        error = insertError;
      }

      if (error) throw error;

      toast({
        title: "Settings Saved",
        description: "The laboratory information has been updated successfully.",
      });
    } catch (error) {
      console.error('Error saving lab settings:', error);
      toast({
        title: "Error",
        description: `Failed to save settings: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
      return <div className="flex justify-center items-center h-48"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }
  
  return (
    <div className="space-y-6">
      <div className="medical-card rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Laboratory Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Laboratory Name</label>
            <input
              type="text"
              value={labSettings.name}
              onChange={(e) => setLabSettings({...labSettings, name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g. Central Clinical Lab"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tax ID (CUIT)</label>
            <input
              type="text"
              value={labSettings.cuit}
              onChange={(e) => setLabSettings({...labSettings, cuit: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
            <input
              type="text"
              value={labSettings.address}
              onChange={(e) => setLabSettings({...labSettings, address: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
            <input
              type="tel"
              value={labSettings.phone}
              onChange={(e) => setLabSettings({...labSettings, phone: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={labSettings.email}
              onChange={(e) => setLabSettings({...labSettings, email: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Technical Director</label>
            <input
              type="text"
              value={labSettings.director}
              onChange={(e) => setLabSettings({...labSettings, director: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">License Number</label>
            <input
              type="text"
              value={labSettings.license}
              onChange={(e) => setLabSettings({...labSettings, license: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        
        <div className="mt-6">
          <Button onClick={handleSaveSettings} disabled={saving} className="medical-gradient text-white">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GeneralSettingsTab;