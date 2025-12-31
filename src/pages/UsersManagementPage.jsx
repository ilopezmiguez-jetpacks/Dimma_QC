import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Loader2, UserPlus, CheckCircle, XCircle, Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const UsersManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [labs, setLabs] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { session } = useAuth();
  const { toast } = useToast();

  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'technician',
    laboratoryId: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Labs
      const { data: labsData } = await supabase.from('laboratories').select('id, name').eq('is_active', true);
      setLabs(labsData || []);

      // 2. Fetch Profiles to map User IDs to Labs
      const { data: profilesData } = await supabase.from('profiles').select('id, laboratory_id');
      const profilesMap = (profilesData || []).reduce((acc, curr) => {
        acc[curr.id] = curr.laboratory_id;
        return acc;
      }, {});
      setProfiles(profilesMap);

      // 3. Fetch Users (Using Edge Function)
      const { data: userData, error } = await supabase.functions.invoke('get-users', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (error) throw error;
      setUsers(userData.users || []);

    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load data' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if(session) fetchData();
  }, [session]);

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.laboratoryId) {
      toast({ variant: 'destructive', title: "Validation Error", description: "Email, Password and Lab are required" });
      return;
    }

    try {
      // 1. Create User via Edge Function
      const { data, error } = await supabase.functions.invoke('create-user', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        body: {
          email: newUser.email,
          password: newUser.password,
          fullName: newUser.fullName,
          role: newUser.role,
        }
      });

      if (error || data.error) throw new Error(error?.message || data.error);

      // 2. Link User to Laboratory (Update Profile)
      const newUserId = data.user?.id || data.id; 
      
      if (newUserId) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ laboratory_id: newUser.laboratoryId })
          .eq('id', newUserId);
          
        if (profileError) console.error("Failed to link lab to profile", profileError);
      }

      toast({ title: "User Created", description: "User successfully created and assigned to lab." });
      setIsDialogOpen(false);
      setNewUser({ email: '', password: '', fullName: '', role: 'technician', laboratoryId: '' });
      fetchData();

    } catch (error) {
      toast({ variant: 'destructive', title: "Error", description: error.message });
    }
  };

  const getLabName = (userId) => {
    const labId = profiles[userId];
    if (!labId) return <span className="text-gray-400 italic">No Lab Assigned</span>;
    const lab = labs.find(l => l.id === labId);
    return lab ? (
        <span className="flex items-center text-blue-700 bg-blue-50 px-2 py-1 rounded-md text-xs font-medium">
            <Building2 className="w-3 h-3 mr-1" />
            {lab.name}
        </span>
    ) : <span className="text-gray-400">Unknown Lab</span>;
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">User Management</h2>
          <p className="text-muted-foreground">Create users and assign them to laboratories.</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <UserPlus className="w-4 h-4 mr-2" /> Create User
        </Button>
      </div>

      <div className="border rounded-md bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>Name/Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Assigned Laboratory</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map(u => (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="font-medium text-gray-900">{u.user_metadata?.full_name || 'No Name'}</div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {u.user_metadata?.role || 'user'}
                  </Badge>
                </TableCell>
                <TableCell>
                   {getLabName(u.id)}
                </TableCell>
                <TableCell>
                  {u.email_confirmed_at ? 
                    <span className="flex items-center text-green-600 text-xs font-medium"><CheckCircle className="w-3 h-3 mr-1"/> Confirmed</span> : 
                    <span className="flex items-center text-yellow-600 text-xs font-medium"><XCircle className="w-3 h-3 mr-1"/> Pending</span>
                  }
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 && (
                <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                        No users found.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>Add a new employee and assign them to a laboratory.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input 
              placeholder="Full Name" 
              value={newUser.fullName} 
              onChange={e => setNewUser({...newUser, fullName: e.target.value})} 
            />
            <Input 
              placeholder="Email" 
              type="email"
              value={newUser.email} 
              onChange={e => setNewUser({...newUser, email: e.target.value})} 
            />
            <Input 
              placeholder="Password" 
              type="password"
              value={newUser.password} 
              onChange={e => setNewUser({...newUser, password: e.target.value})} 
            />
            
            <div className="grid grid-cols-2 gap-4">
              <Select value={newUser.role} onValueChange={(val) => setNewUser({...newUser, role: val})}>
                <SelectTrigger><SelectValue placeholder="Role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="technician">Technician</SelectItem>
                  <SelectItem value="biochemist">Biochemist</SelectItem>
                  <SelectItem value="admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>

              <Select value={newUser.laboratoryId} onValueChange={(val) => setNewUser({...newUser, laboratoryId: val})}>
                <SelectTrigger><SelectValue placeholder="Select Laboratory" /></SelectTrigger>
                <SelectContent>
                  {labs.map(lab => (
                    <SelectItem key={lab.id} value={lab.id}>{lab.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateUser}>Create User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersManagementPage;