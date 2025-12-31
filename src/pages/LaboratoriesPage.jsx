import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Plus, Edit, Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const LaboratoriesPage = () => {
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLab, setEditingLab] = useState(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({ 
    name: '', 
    business_name: '',
    address: '', 
    phone: '', 
    manager_name: '', 
    contact_email: '' 
  });

  const fetchLabs = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('laboratories').select('*').order('created_at');
    if (error) {
      toast({ title: "Error", description: "Failed to load laboratories", variant: "destructive" });
    } else {
      setLabs(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLabs();
  }, []);

  const handleOpenDialog = (lab = null) => {
    if (lab) {
      setEditingLab(lab);
      setFormData({ 
        name: lab.name, 
        business_name: lab.business_name || '',
        address: lab.address || '', 
        phone: lab.phone || '',
        manager_name: lab.manager_name || '',
        contact_email: lab.contact_email || ''
      });
    } else {
      setEditingLab(null);
      setFormData({ name: '', business_name: '', address: '', phone: '', manager_name: '', contact_email: '' });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name) return;

    let error;
    if (editingLab) {
      const { error: updateError } = await supabase
        .from('laboratories')
        .update(formData)
        .eq('id', editingLab.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('laboratories')
        .insert(formData);
      error = insertError;
    }

    if (error) {
      toast({ title: "Error", description: "Failed to save laboratory", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Laboratory saved successfully" });
      setIsDialogOpen(false);
      fetchLabs();
    }
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Laboratories</h2>
          <p className="text-muted-foreground">Manage your lab locations and details.</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" /> Add Laboratory
        </Button>
      </div>

      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lab Name</TableHead>
              <TableHead>Business Name</TableHead>
              <TableHead>Manager</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {labs.map(lab => (
              <TableRow key={lab.id}>
                <TableCell className="font-medium flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-500" />
                  {lab.name}
                </TableCell>
                <TableCell>{lab.business_name || '-'}</TableCell>
                <TableCell>{lab.manager_name || '-'}</TableCell>
                <TableCell>{lab.contact_email || '-'}</TableCell>
                <TableCell>
                  <Badge variant={lab.is_active ? 'success' : 'secondary'}>
                    {lab.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(lab)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLab ? 'Edit Laboratory' : 'Create Laboratory'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input 
              placeholder="Laboratory Name" 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
            <Input 
              placeholder="Business Name (Razon Social)" 
              value={formData.business_name} 
              onChange={e => setFormData({...formData, business_name: e.target.value})}
            />
            <Input 
              placeholder="Address" 
              value={formData.address} 
              onChange={e => setFormData({...formData, address: e.target.value})}
            />
            <Input 
              placeholder="Manager Name" 
              value={formData.manager_name} 
              onChange={e => setFormData({...formData, manager_name: e.target.value})}
            />
            <div className="grid grid-cols-2 gap-4">
                <Input 
                    placeholder="Phone" 
                    value={formData.phone} 
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                />
                <Input 
                    placeholder="Email" 
                    type="email"
                    value={formData.contact_email} 
                    onChange={e => setFormData({...formData, contact_email: e.target.value})}
                />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LaboratoriesPage;