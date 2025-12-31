import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, Edit, X, Beaker, Trash2, Microscope } from 'lucide-react';
import { useQCData } from '@/contexts/QCDataContext';

const ParametrosPorEquipoPage = () => {
  const { equipmentTypes, units, parameters, refreshParameters } = useQCData();
  const [selectedType, setSelectedType] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingParam, setEditingParam] = useState(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    unit_id: '',
    default_mean: '',
    default_sd: ''
  });

  useEffect(() => {
    if (equipmentTypes.length > 0 && !selectedType) {
      setSelectedType(equipmentTypes[0]);
    }
  }, [equipmentTypes, selectedType]);

  const filteredParams = parameters.filter(p => p.equipment_type_id === selectedType?.id);

  const handleOpenDialog = (param = null) => {
    if (param) {
      setEditingParam(param);
      setFormData({
        code: param.code || '',
        name: param.name || '',
        unit_id: param.default_unit_id || '',
        default_mean: param.default_mean || '',
        default_sd: param.default_sd || ''
      });
    } else {
      setEditingParam(null);
      setFormData({
        code: '',
        name: '',
        unit_id: '',
        default_mean: '',
        default_sd: ''
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !selectedType) return;
    setLoading(true);

    // The 'equipment_type' column (text) is NOT NULL in database schema.
    // It's often redundant with 'equipment_type_id' but required by legacy schema.
    // We use the selectedType.name as the value.
    const payload = {
      code: formData.code,
      name: formData.name,
      default_unit_id: formData.unit_id || null,
      equipment_type_id: selectedType.id,
      equipment_type: selectedType.name, // Fixing the NOT NULL constraint error
      default_mean: formData.default_mean ? parseFloat(formData.default_mean) : null,
      default_sd: formData.default_sd ? parseFloat(formData.default_sd) : null,
      is_active: true
    };

    let error;
    if (editingParam) {
      const { error: updateError } = await supabase
        .from('parameters')
        .update(payload)
        .eq('id', editingParam.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('parameters')
        .insert(payload);
      error = insertError;
    }

    if (error) {
      console.error(error);
      toast({ title: "Error", description: "Error al guardar el parámetro: " + error.message, variant: "destructive" });
    } else {
      toast({ title: "Éxito", description: "Parámetro guardado correctamente" });
      setIsDialogOpen(false);
      refreshParameters();
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este parámetro?')) return;
    const { error } = await supabase.from('parameters').delete().eq('id', id);
    if (error) {
       toast({ title: "Error", description: "No se pudo eliminar.", variant: "destructive" });
    } else {
       toast({ title: "Eliminado", description: "Parámetro eliminado." });
       refreshParameters();
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-200px)]">
      {/* Sidebar List */}
      <div className="w-full md:w-1/4 border rounded-lg bg-white overflow-hidden flex flex-col">
        <div className="p-4 bg-gray-50 border-b font-semibold flex items-center">
            <Microscope className="w-4 h-4 mr-2" /> Tipos de Equipo
        </div>
        <div className="overflow-y-auto flex-1 p-2 space-y-1">
            {equipmentTypes.map(type => (
                <button
                    key={type.id}
                    onClick={() => setSelectedType(type)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        selectedType?.id === type.id 
                        ? 'bg-primary/10 text-primary' 
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                >
                    {type.name}
                </button>
            ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 border rounded-lg bg-white flex flex-col">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
            <div>
                <h2 className="text-lg font-bold">{selectedType?.name || 'Seleccione un tipo'}</h2>
                <p className="text-sm text-gray-500">Gestión de parámetros asociados</p>
            </div>
            <Button onClick={() => handleOpenDialog()} disabled={!selectedType} size="sm">
                <Plus className="w-4 h-4 mr-2" /> Agregar Parámetro
            </Button>
        </div>

        <div className="flex-1 overflow-auto p-4">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Unidad</TableHead>
                        <TableHead>Media Ref.</TableHead>
                        <TableHead>SD Ref.</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredParams.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                                No hay parámetros definidos para este tipo de equipo.
                            </TableCell>
                        </TableRow>
                    ) : (
                        filteredParams.map(param => (
                            <TableRow key={param.id}>
                                <TableCell className="font-mono text-xs">{param.code}</TableCell>
                                <TableCell className="font-medium">{param.name}</TableCell>
                                <TableCell>{param.unitName}</TableCell>
                                <TableCell>{param.default_mean || '-'}</TableCell>
                                <TableCell>{param.default_sd || '-'}</TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(param)}>
                                            <Edit className="w-4 h-4 text-gray-600" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(param.id)}>
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingParam ? 'Editar Parámetro' : 'Nuevo Parámetro'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
             {selectedType && (
                <div className="p-3 bg-blue-50 text-blue-800 rounded-md text-sm mb-2">
                    Agregando parámetro para: <strong>{selectedType.name}</strong>
                </div>
            )}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Código</label>
                    <Input 
                        placeholder="Ej. GLU" 
                        value={formData.code} 
                        onChange={e => setFormData({...formData, code: e.target.value})}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Nombre</label>
                    <Input 
                        placeholder="Ej. Glucosa" 
                        value={formData.name} 
                        onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                </div>
            </div>
            
            <div className="space-y-2">
                <label className="text-sm font-medium">Unidad por Defecto</label>
                <Select value={formData.unit_id} onValueChange={val => setFormData({...formData, unit_id: val})}>
                    <SelectTrigger>
                        <SelectValue placeholder="Seleccionar Unidad" />
                    </SelectTrigger>
                    <SelectContent>
                        {units.map(u => (
                            <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Media Sugerida</label>
                    <Input 
                        type="number" 
                        step="any"
                        placeholder="0.00" 
                        value={formData.default_mean} 
                        onChange={e => setFormData({...formData, default_mean: e.target.value})}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">SD Sugerido</label>
                    <Input 
                        type="number" 
                        step="any"
                        placeholder="0.00" 
                        value={formData.default_sd} 
                        onChange={e => setFormData({...formData, default_sd: e.target.value})}
                    />
                </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ParametrosPorEquipoPage;