import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { SlidersHorizontal, CheckCircle, AlertTriangle, Wrench, Plus, Search, Upload, Pencil, Save, Loader2 } from 'lucide-react';
import { useQCData } from '@/contexts/QCDataContext';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';

const EquipmentPage = () => {
  const { equipment, currentLabId, laboratories, updateEquipmentDetails } = useQCData();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Edit State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState(null);
  const [equipmentTypes, setEquipmentTypes] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingCounts, setPendingCounts] = useState({});

  const isAdmin = user?.user_metadata?.role === 'admin';

  const params = new URLSearchParams(window.location.search);
  const initialStatus = params.get('status');

  useEffect(() => {
    if (initialStatus) {
      if (initialStatus === 'issue') {
        setStatusFilter('issue');
      } else {
        setStatusFilter(initialStatus);
      }
    }
  }, [initialStatus]);

  useEffect(() => {
    if (isAdmin) {
      const fetchTypes = async () => {
        const { data, error } = await supabase.from('equipment_types').select('*');
        if (!error && data) {
          setEquipmentTypes(data);
        }
      };
      fetchTypes();
    }
  }, [isAdmin]);

  useEffect(() => {
    const fetchPendingCounts = async () => {
      const { data } = await supabase
        .from('qc_reports')
        .select('equipment_id')
        .eq('is_validated', false);

      if (data) {
        // Aggregate counts locally
        const counts = data.reduce((acc, curr) => {
          acc[curr.equipment_id] = (acc[curr.equipment_id] || 0) + 1;
          return acc;
        }, {});
        setPendingCounts(counts);
      }
    };
    fetchPendingCounts();
  }, []);

  const filteredEquipment = equipment.filter(eq => {
    const matchesSearch = eq.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eq.model.toLowerCase().includes(searchTerm.toLowerCase());

    if (statusFilter === 'all') return matchesSearch;
    if (statusFilter === 'issue') return matchesSearch && (eq.status === 'warning' || eq.status === 'error');
    if (statusFilter === 'maintenance') {
      const maintenanceDate = new Date(eq.maintenanceDue);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return matchesSearch && maintenanceDate < today;
    }
    return matchesSearch && eq.status === statusFilter;
  });

  const getStatusInfo = (status) => {
    switch (status) {
      case 'ok': return { text: 'OK', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' };
      case 'warning': return { text: 'Advertencia', icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-100' };
      case 'error': return { text: 'Error', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100' };
      default: return { text: 'Desconocido', icon: Wrench, color: 'text-gray-600', bg: 'bg-gray-100' };
    }
  };

  const handleAddEquipment = () => {
    navigate('/settings?tab=equipos-lotes');
  };

  const handleEditClick = (e, eq) => {
    e.stopPropagation(); // Prevent navigation
    setEditingEquipment({
      id: eq.id,
      name: eq.name,
      model: eq.model || '',
      serial: eq.serial || '',
      equipment_type_id: eq.equipment_type_id || eq.equipmentTypeId || '', // Handle diverse naming if needed
      laboratory_id: eq.laboratory_id || eq.laboratoryId || '' // Handle diverse naming
    });
    setIsEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingEquipment) return;
    setIsSaving(true);
    try {
      // Get type name for text field consistency
      const selectedType = equipmentTypes.find(t => t.id === editingEquipment.equipment_type_id);

      const updates = {
        name: editingEquipment.name,
        model: editingEquipment.model,
        serial: editingEquipment.serial,
        // Use || null to ensure empty strings become null, which is valid for UUID columns
        equipment_type_id: editingEquipment.equipment_type_id || null,
        equipment_type: selectedType ? selectedType.name : undefined,
        laboratory_id: editingEquipment.laboratory_id || null
      };

      if (updateEquipmentDetails) {
        await updateEquipmentDetails(editingEquipment.id, updates);
      } else {
        const { error } = await supabase
          .from('equipment')
          .update(updates)
          .eq('id', editingEquipment.id);
        if (error) throw error;
        // Force reload if we updated directly bypassing context
        window.location.reload();
      }

      toast({
        title: "Equipo actualizado",
        description: "Los datos del equipo han sido modificados correctamente.",
      });
      setIsEditOpen(false);
      setEditingEquipment(null);
    } catch (error) {
      console.error("Error updating equipment:", error);
      toast({
        variant: "destructive",
        title: "Error al guardar",
        description: "No se pudo actualizar el equipo.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const currentLabName = currentLabId === 'all'
    ? 'Todos los laboratorios'
    : laboratories.find(l => l.id === currentLabId)?.name || 'Laboratorio';

  const EquipmentCard = ({ eq }) => {
    const statusInfo = getStatusInfo(eq.status);
    const Icon = statusInfo.icon;
    const maintenanceDate = new Date(eq.maintenanceDue);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maintenanceDue = maintenanceDate < today;
    const pendingCount = pendingCounts[eq.id] || 0;

    return (
      <div
        className="equipment-card medical-card rounded-xl p-6 flex flex-col justify-between hover:shadow-lg transition-all duration-300"
      >
        <div>
          <div
            className="flex items-start justify-between mb-4 cursor-pointer group"
            onClick={() => navigate(`/equipment/${eq.id}`)}
          >
            <div>
              <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">{eq.name}</h3>
              <p className="text-sm text-muted-foreground">{eq.model}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2 ${statusInfo.bg} ${statusInfo.color}`}>
                <Icon className="w-4 h-4" />
                {statusInfo.text}
              </span>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-gray-100"
                  onClick={(e) => handleEditClick(e, eq)}
                >
                  <Pencil className="w-3 h-3 text-gray-500" />
                </Button>
              )}
            </div>
          </div>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p><strong>N/S:</strong> {eq.serial}</p>
            <div className={`flex items-center gap-2 p-2 rounded-md ${maintenanceDue ? 'bg-red-50 text-red-700' : 'bg-secondary'}`}>
              <Wrench className="w-4 h-4" />
              <span>Mantenimiento: {new Date(eq.maintenanceDue).toLocaleDateString('es-ES')}</span>
              {maintenanceDue && <span className="font-bold">(VENCIDO)</span>}
            </div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
          <div className="flex-grow">
            {pendingCount > 0 && (
              <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-100 border-none px-2 py-0.5 text-[10px] sm:text-xs">
                {pendingCount} Pendiente{pendingCount > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          <Button onClick={() => navigate(`/load-control?equipmentId=${eq.id}`)} size="sm">
            <Upload className="w-4 h-4 mr-2" />
            Cargar
          </Button>
        </div>
      </div>
    );
  };

  return (
    <>
      <Helmet>
        <title>Equipos - DIMMA QC</title>
        <meta name="description" content="Gestión y monitoreo de equipos de laboratorio." />
      </Helmet>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Equipos</h1>
            <p className="text-muted-foreground mt-1">Monitorea y gestiona los controles de calidad de {currentLabName}.</p>
          </div>
          {isAdmin && (
            <Button onClick={handleAddEquipment} className="mt-4 sm:mt-0 medical-gradient text-white">
              <Plus className="w-4 h-4 mr-2" />
              Agregar Equipo
            </Button>
          )}
        </div>

        <div className="medical-card rounded-xl p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar por nombre o modelo..."
                className="pl-10 w-full px-4 py-3 border border-border rounded-lg"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 p-1 bg-secondary rounded-lg">
              <Button size="sm" variant={statusFilter === 'all' ? 'default' : 'ghost'} onClick={() => setStatusFilter('all')}>Todos</Button>
              <Button size="sm" variant={statusFilter === 'ok' ? 'default' : 'ghost'} onClick={() => setStatusFilter('ok')}>OK</Button>
              <Button size="sm" variant={statusFilter === 'issue' ? 'default' : 'ghost'} onClick={() => setStatusFilter('issue')}>Con Alertas</Button>
              <Button size="sm" variant={statusFilter === 'maintenance' ? 'default' : 'ghost'} onClick={() => setStatusFilter('maintenance')}>Mantenimiento</Button>
            </div>
          </div>
        </div>

        {filteredEquipment.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredEquipment.map((eq) => <EquipmentCard key={eq.id} eq={eq} />)}
          </div>
        ) : (
          <div className="medical-card rounded-xl p-12 text-center">
            <SlidersHorizontal className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground">No se encontraron equipos</h3>
            <p className="text-muted-foreground">No hay equipos que coincidan con los filtros seleccionados.</p>
          </div>
        )}
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Equipo</DialogTitle>
            <DialogDescription>
              Modifique los detalles del equipo. Haga clic en guardar cuando termine.
            </DialogDescription>
          </DialogHeader>
          {editingEquipment && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Nombre</Label>
                <Input
                  id="name"
                  value={editingEquipment.name}
                  onChange={(e) => setEditingEquipment({ ...editingEquipment, name: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="model" className="text-right">Modelo</Label>
                <Input
                  id="model"
                  value={editingEquipment.model}
                  onChange={(e) => setEditingEquipment({ ...editingEquipment, model: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="serial" className="text-right">Serie</Label>
                <Input
                  id="serial"
                  value={editingEquipment.serial}
                  onChange={(e) => setEditingEquipment({ ...editingEquipment, serial: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="type" className="text-right">Tipo</Label>
                <Select
                  value={editingEquipment.equipment_type_id}
                  onValueChange={(val) => setEditingEquipment({ ...editingEquipment, equipment_type_id: val })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Seleccione tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {equipmentTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="lab" className="text-right">Laboratorio</Label>
                <Select
                  value={editingEquipment.laboratory_id}
                  onValueChange={(val) => setEditingEquipment({ ...editingEquipment, laboratory_id: val })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Seleccione laboratorio" />
                  </SelectTrigger>
                  <SelectContent>
                    {laboratories.map((lab) => (
                      <SelectItem key={lab.id} value={lab.id}>
                        {lab.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EquipmentPage;