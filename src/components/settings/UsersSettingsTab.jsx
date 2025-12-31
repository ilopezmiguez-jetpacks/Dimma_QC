import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { UserPlus, Trash2, Edit, CheckCircle, RefreshCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogHeader,
    AlertDialogFooter,
    AlertDialogTitle,
    AlertDialogTrigger,
  } from "@/components/ui/alert-dialog";

const UsersSettingsTab = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newUser, setNewUser] = useState({ fullName: '', email: '', password: '', role: 'technician' });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const { session, user } = useAuth();

  const fetchUsers = useCallback(async () => {
    if (user?.user_metadata?.role !== 'admin' && user?.user_metadata?.role !== 'superadmin') {
      setLoading(false);
      return;
    }
  
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-users', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
  
      if (error) throw error;
      
      if(data.error){
          throw new Error(data.error);
      }
  
      setUsers(data.users || []);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error loading users',
        description: error.message,
      });
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [session, toast, user]);

  useEffect(() => {
    if (session) {
      fetchUsers();
    }
  }, [fetchUsers, session]);

  const handleCreateUser = async () => {
    if (!newUser.fullName || !newUser.email || !newUser.password) {
      toast({ variant: 'destructive', title: 'Required fields', description: 'Please fill out all fields.' });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          },
          body: newUser,
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      toast({ title: 'User Created', description: `User ${newUser.fullName} has been created. Authorization required.` });
      setNewUser({ fullName: '', email: '', password: '', role: 'technician' });
      setIsDialogOpen(false);
      fetchUsers();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error creating user', description: error.message });
    }
  };

  const handleAuthorizeUser = async (userId, email) => {
    try {
        const { data, error } = await supabase.functions.invoke('authorize-user', {
            headers: {
                'Authorization': `Bearer ${session.access_token}`
            },
            body: { userId },
        });

        if (error) throw error;
        if (data.error) throw new Error(data.error);

        toast({ title: "User Authorized", description: `User ${email} has been authorized.`});
        fetchUsers();

    } catch(error) {
        toast({ variant: "destructive", title: "Authorization Error", description: error.message });
    }
  };

  const getRoleText = (role) => {
    switch (role) {
      case 'admin': return 'Super User';
      case 'superadmin': return 'Super User';
      case 'technician': return 'Technician';
      case 'biochemist': return 'Biochemist';
      default: return 'User';
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewUser(prev => ({ ...prev, [name]: value }));
  };

  if (user?.user_metadata?.role !== 'admin' && user?.user_metadata?.role !== 'superadmin') {
    return (
        <div>
            <h2 className="text-2xl font-bold text-foreground">User Management</h2>
            <p className="text-muted-foreground mt-4">You do not have permission to access this section.</p>
        </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-foreground">User Management</h2>
        <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={fetchUsers} disabled={loading}>
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                <Button>
                <UserPlus className="w-4 h-4 mr-2" />
                Create User
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>
                    Fill in the details to add a new team member.
                </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                <input type="text" name="fullName" placeholder="Full Name" value={newUser.fullName} onChange={handleInputChange} className="w-full p-2 border rounded" />
                <input type="email" name="email" placeholder="Email" value={newUser.email} onChange={handleInputChange} className="w-full p-2 border rounded" />
                <input type="password" name="password" placeholder="Password" value={newUser.password} onChange={handleInputChange} className="w-full p-2 border rounded" />
                <select name="role" value={newUser.role} onChange={handleInputChange} className="w-full p-2 border rounded">
                    <option value="technician">Technician</option>
                    <option value="biochemist">Biochemist</option>
                    <option value="superadmin">Super User</option>
                </select>
                </div>
                <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateUser}>Create</Button>
                </DialogFooter>
            </DialogContent>
            </Dialog>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <p>Loading users...</p>
        ) : (
          users.map(user => (
            <div key={user.id} className="flex items-center justify-between p-4 bg-secondary rounded-lg">
              <div>
                <p className="font-semibold">{user.user_metadata?.full_name || user.email}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className={`text-sm font-medium px-2 py-1 rounded-md ${!user.email_confirmed_at ? 'bg-yellow-100 text-yellow-800' : 'bg-primary/10 text-primary'}`}>
                  {getRoleText(user.user_metadata?.role)} {!user.email_confirmed_at ? '(Pending)' : ''}
                </span>

                {!user.email_confirmed_at && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm"><CheckCircle className="w-4 h-4 mr-2" />Authorize</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Confirm Authorization?</AlertDialogTitle>
                            <AlertDialogDescription>
                                You are about to authorize the user {user.email}. Once authorized, they will be able to access the system.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleAuthorizeUser(user.id, user.email)}>Authorize</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                
                <Button variant="ghost" size="icon" onClick={() => toast({ title: '🚧 Coming Soon', description: 'User editing will be available soon.' })}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button variant="destructive" size="icon" onClick={() => toast({ title: '🚧 Coming Soon', description: 'User deletion will be available soon.' })}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default UsersSettingsTab;