import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Loader2, Plus, Edit, Building2, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const LaboratoriesPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  // State
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  // CRUD Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLab, setEditingLab] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    business_name: '',
    address: '',
    phone: '',
    manager_name: '',
    contact_email: ''
  });

  // View Users Dialog State
  const [isUsersDialogOpen, setIsUsersDialogOpen] = useState(false);
  const [selectedLabUsers, setSelectedLabUsers] = useState([]);
  const [selectedLabName, setSelectedLabName] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);

  // Admin Check (Consolidated)
  const isAdmin = user?.user_metadata?.role === 'admin';

  const fetchLabs = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('laboratories').select('*').order('created_at');
    if (error) {
      toast({ title: "Error", description: "Error al cargar laboratorios", variant: "destructive" });
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
      toast({ title: "Error", description: "No se pudo guardar el laboratorio", variant: "destructive" });
    } else {
      toast({ title: "Éxito", description: "Laboratorio guardado correctamente" });
      setIsDialogOpen(false);
      fetchLabs();
    }
  };

  const handleViewUsers = async (lab) => {
    setSelectedLabName(lab.name);
    setUsersLoading(true);
    setIsUsersDialogOpen(true);
    // Fetch users assigned to this lab
    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, email, role')
      .eq('laboratory_id', lab.id);

    if (error) {
      toast({ title: "Error", description: "No se pudieron cargar los usuarios", variant: "destructive" });
      setSelectedLabUsers([]);
    } else {
      setSelectedLabUsers(data || []);
    }
    setUsersLoading(false);
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Laboratorios</h2>
          <p className="text-muted-foreground">Gestionar las sedes y laboratorios del sistema.</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="medical-gradient text-white">
          <Plus className="w-4 h-4 mr-2" /> Agregar Laboratorio
        </Button>
      </div>

      <div className="border rounded-md bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50/50">
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Razón Social</TableHead>
              <TableHead>Gerente</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
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
                    {lab.is_active ? 'Activo' : 'Inactivo'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {isAdmin && (
                      <Button variant="ghost" size="icon" onClick={() => handleViewUsers(lab)} title="Ver Usuarios">
                        <Users className="w-4 h-4 text-blue-600" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(lab)} title="Editar">
                      <Edit className="w-4 h-4 text-gray-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {labs.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No hay laboratorios registrados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLab ? 'Editar Laboratorio' : 'Crear Laboratorio'}</DialogTitle>
            <DialogDescription>Ingrese los datos del laboratorio.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre del Laboratorio</label>
              <Input
                placeholder="Nombre del Laboratorio"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Razón Social</label>
              <Input
                placeholder="Razón Social"
                value={formData.business_name}
                onChange={e => setFormData({ ...formData, business_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Dirección</label>
              <Input
                placeholder="Dirección"
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre del Gerente</label>
              <Input
                placeholder="Nombre del Gerente"
                value={formData.manager_name}
                onChange={e => setFormData({ ...formData, manager_name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Teléfono</label>
                <Input
                  placeholder="Teléfono"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email de Contacto</label>
                <Input
                  placeholder="Email"
                  type="email"
                  value={formData.contact_email}
                  onChange={e => setFormData({ ...formData, contact_email: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} className="medical-gradient text-white">Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Users Dialog */}
      <Dialog open={isUsersDialogOpen} onOpenChange={setIsUsersDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Usuarios en {selectedLabName}</DialogTitle>
            <DialogDescription>Lista de usuarios asignados a esta sede.</DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {usersLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>
            ) : selectedLabUsers.length > 0 ? (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {selectedLabUsers.map((u, i) => (
                  <div key={i} className="flex justify-between items-center p-3 border rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-colors shadow-sm">
                    <div className="min-w-0 flex-1 mr-3">
                      <p className="font-semibold text-sm truncate">{u.full_name || 'Sin Nombre'}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                    <Badge variant="secondary" className="capitalize whitespace-nowrap">
                      {u.role === 'admin' ? 'Admin' : u.role === 'biochemist' ? 'Bioquímico' : 'Técnico'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 px-4 border-2 border-dashed rounded-xl">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-muted-foreground">No hay usuarios asignados a este laboratorio.</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsUsersDialogOpen(false)} className="w-full">Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LaboratoriesPage;