import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Plus, Edit, X } from 'lucide-react';

const EquipmentTypesPage = () => {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({ name: '', parameters: [] });

  const fetchTypes = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('equipment_types').select('*').order('name');
    if (error) {
      toast({ title: "Error", description: "Error al cargar tipos de equipo", variant: "destructive" });
    } else {
      setTypes(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTypes();
  }, []);

  const handleOpenDialog = (type = null) => {
    if (type) {
      setEditingType(type);
      setFormData({ name: type.name, parameters: type.parameters || [] });
    } else {
      setEditingType(null);
      setFormData({ name: '', parameters: [] });
    }
    setIsDialogOpen(true);
  };

  const handleAddParam = () => {
    setFormData(prev => ({
      ...prev,
      parameters: [...prev.parameters, { name: '', unit: '' }]
    }));
  };

  const handleParamChange = (index, field, value) => {
    const newParams = [...formData.parameters];
    newParams[index][field] = value;
    setFormData(prev => ({ ...prev, parameters: newParams }));
  };

  const handleRemoveParam = (index) => {
    const newParams = formData.parameters.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, parameters: newParams }));
  };

  const handleSave = async () => {
    if (!formData.name) return;

    const payload = {
      name: formData.name,
      parameters: formData.parameters
    };

    let error;
    if (editingType) {
      const { error: updateError } = await supabase
        .from('equipment_types')
        .update(payload)
        .eq('id', editingType.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('equipment_types')
        .insert(payload);
      error = insertError;
    }

    if (error) {
      toast({ title: "Error", description: "Error al guardar el tipo de equipo", variant: "destructive" });
    } else {
      toast({ title: "Éxito", description: "Tipo de equipo guardado correctamente" });
      setIsDialogOpen(false);
      fetchTypes();
    }
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Tipos de Equipo</h2>
          <p className="text-muted-foreground">Defina plantillas para diferentes modelos de analizadores.</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" /> Agregar Tipo
        </Button>
      </div>

      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre del Tipo</TableHead>
              <TableHead>Cant. Parámetros</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {types.map(type => (
              <TableRow key={type.id}>
                <TableCell className="font-medium">{type.name}</TableCell>
                <TableCell>{type.parameters?.length || 0}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(type)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingType ? 'Editar Tipo' : 'Crear Tipo de Equipo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Nombre del Tipo</label>
              <Input 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="ej. Hematología 5-Partes"
              />
            </div>
            
            <div className="border rounded-md p-4 bg-gray-50">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-semibold">Parámetros</h4>
                <Button variant="outline" size="sm" onClick={handleAddParam}>
                  <Plus className="w-3 h-3 mr-1" /> Agregar
                </Button>
              </div>
              <div className="space-y-2">
                {formData.parameters.map((param, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <Input 
                      placeholder="Parámetro (ej. WBC)" 
                      value={param.name} 
                      onChange={e => handleParamChange(idx, 'name', e.target.value)}
                    />
                    <Input 
                      placeholder="Unidad (ej. x10^3/uL)" 
                      value={param.unit} 
                      onChange={e => handleParamChange(idx, 'unit', e.target.value)}
                    />
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveParam(idx)}>
                      <X className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Guardar Tipo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EquipmentTypesPage;