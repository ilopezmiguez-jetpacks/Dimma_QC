import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Save, Trash2, Edit } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ParameterProfilesTab = () => {
    const [profiles, setProfiles] = useState([]);
    const [parameters, setParameters] = useState([]);
    const [units, setUnits] = useState([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentProfile, setCurrentProfile] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [profilesRes, paramsRes, unitsRes] = await Promise.all([
                supabase.from('predefined_params').select('*, parameter:parameters(id, name), unit:units(id, name)'),
                supabase.from('parameters').select('id, code, name').eq('is_active', true),
                supabase.from('units').select('id, name').eq('is_active', true)
            ]);

            if (profilesRes.error) throw profilesRes.error;
            if (paramsRes.error) throw paramsRes.error;
            if (unitsRes.error) throw unitsRes.error;

            setProfiles(profilesRes.data || []);
            setParameters(paramsRes.data || []);
            setUnits(unitsRes.data || []);

        } catch (error) {
            console.error("Error fetching data for profiles tab:", error);
            toast({ title: 'Error', description: 'Could not load profiles.', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleOpenModal = (profile = null) => {
        setCurrentProfile(profile ? 
            {
                id: profile.id,
                code: profile.code,
                name: profile.name,
                value: profile.value,
                parameter_id: profile.parameter?.id || null,
                unit_id: profile.unit?.id || null
            } : 
            { code: '', name: '', value: '', parameter_id: null, unit_id: null }
        );
        setIsModalOpen(true);
    };

    const handleSaveProfile = async () => {
        if (!currentProfile.code || !currentProfile.name || !currentProfile.parameter_id) {
            toast({ title: 'Error', description: 'Code, Name, and Base Parameter are required.', variant: 'destructive' });
            return;
        }

        const { error } = await supabase.rpc('upsert_predefined_parameter', {
            p_code: currentProfile.code,
            p_name: currentProfile.name,
            p_value: currentProfile.value,
            p_parameter_id: currentProfile.parameter_id,
            p_unit_id: currentProfile.unit_id
        });

        if (error) {
            console.error("Error saving profile:", error);
            toast({ title: 'Error', description: 'Could not save the profile.', variant: 'destructive' });
        } else {
            toast({ title: 'Success', description: `Profile '${currentProfile.name}' saved successfully.` });
            setIsModalOpen(false);
            setCurrentProfile(null);
            await fetchData(); // Refresh data
        }
    };

    const handleDeleteProfile = async (profileId) => {
        // This is a soft delete for safety
        const { error } = await supabase.from('predefined_params').update({ is_active: false }).eq('id', profileId);

        if (error) {
             console.error("Error deleting profile:", error);
            toast({ title: 'Error', description: 'Could not delete the profile.', variant: 'destructive' });
        } else {
            toast({ title: 'Success', description: 'Profile deleted (deactivated).' });
            await fetchData();
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center h-48"><Loader2 className="w-8 h-8 animate-spin" /></div>;
    }
    
    const activeProfiles = profiles.filter(p => p.is_active !== false);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Parameter Profiles</h2>
                    <p className="text-muted-foreground">Create and manage predefined profiles for loading into lots.</p>
                </div>
                <Button onClick={() => handleOpenModal()}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Profile
                </Button>
            </div>

            <div className="border rounded-lg">
                <div className="grid grid-cols-[1fr,1fr,1fr,auto] gap-4 p-4 font-semibold bg-secondary rounded-t-lg text-sm">
                    <span>Profile Name</span>
                    <span>Base Parameter</span>
                    <span>Default Value</span>
                    <span>Actions</span>
                </div>
                <div className="divide-y">
                {activeProfiles.map(profile => (
                    <div key={profile.id} className="grid grid-cols-[1fr,1fr,1fr,auto] gap-4 p-4 items-center">
                        <div>
                            <p className="font-semibold">{profile.name}</p>
                            <p className="text-xs text-muted-foreground">{profile.code}</p>
                        </div>
                        <p>{profile.parameter?.name || 'N/A'}</p>
                        <p>{profile.value} {profile.unit?.name || ''}</p>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleOpenModal(profile)}><Edit className="w-4 h-4 mr-1" />Edit</Button>
                            <Button variant="destructive" size="sm" onClick={() => handleDeleteProfile(profile.id)}>
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                ))}
                </div>
            </div>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{currentProfile?.id ? 'Edit' : 'Create'} Parameter Profile</DialogTitle>
                        <DialogDescription>
                            Configure a predefined profile for use in lot creation.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <input placeholder="Code (e.g. GLU_FASTING)" value={currentProfile?.code || ''} onChange={e => setCurrentProfile({...currentProfile, code: e.target.value})} className="p-2 border rounded-md" />
                        <input placeholder="Name (e.g. Glucose Fasting)" value={currentProfile?.name || ''} onChange={e => setCurrentProfile({...currentProfile, name: e.target.value})} className="p-2 border rounded-md" />
                        <Select onValueChange={value => setCurrentProfile({...currentProfile, parameter_id: value})} value={currentProfile?.parameter_id || ''}>
                            <SelectTrigger><SelectValue placeholder="Select Base Parameter" /></SelectTrigger>
                            <SelectContent>
                                {parameters.map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.code})</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <div className="grid grid-cols-2 gap-4">
                            <input type="text" placeholder="Default Value (optional)" value={currentProfile?.value || ''} onChange={e => setCurrentProfile({...currentProfile, value: e.target.value})} className="p-2 border rounded-md" />
                            <Select onValueChange={value => setCurrentProfile({...currentProfile, unit_id: value})} value={currentProfile?.unit_id || ''}>
                                <SelectTrigger><SelectValue placeholder="Unit (optional)" /></SelectTrigger>
                                <SelectContent>
                                    {units.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveProfile}><Save className="w-4 h-4 mr-2" />Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ParameterProfilesTab;