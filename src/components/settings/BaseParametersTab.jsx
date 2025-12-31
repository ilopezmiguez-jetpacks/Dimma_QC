import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Save, Trash2, Edit, Beaker } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

// Updated to match the 5 strict types in DB
const equipmentTypes = {
  'Contador hematologico': 'Contador hematologico',
  'Quimica Clinica': 'Quimica Clinica',
  'Ionograma': 'Ionograma',
  'Acido Base': 'Acido Base',
  'Coagulometria': 'Coagulometria'
};

const BaseParametersTab = () => {
  const [parameters, setParameters] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentParam, setCurrentParam] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [paramsRes, unitsRes] = await Promise.all([
        supabase.from('parameters').select('*, unit:units(id, name)'),
        supabase.from('units').select('id, name').eq('is_active', true),
      ]);

      if (paramsRes.error) throw paramsRes.error;
      if (unitsRes.error) throw unitsRes.error;

      setParameters(paramsRes.data.filter(p => p.is_active !== false) || []);
      setUnits(unitsRes.data || []);
    } catch (error) {
      console.error("Error fetching base parameters:", error);
      toast({ title: 'Error', description: 'No se pudieron cargar los parámetros.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = (param = null) => {
    setCurrentParam(param ? {
      id: param.id,
      code: param.code,
      name: param.name,
      equipment_type: param.equipment_type,
      default_unit_id: param.unit?.id || null,
    } : {
      code: '',
      name: '',
      equipment_type: 'Quimica Clinica',
      default_unit_id: null,
    });
    setIsModalOpen(true);
  };

  const handleSaveParam = async () => {
    if (!currentParam.code || !currentParam.name) {
      toast({ title: 'Error', description: 'Código y Nombre son obligatorios.', variant: 'destructive' });
      return;
    }

    const { error } = await supabase.rpc('upsert_parameter', {
      p_code: currentParam.code,
      p_name: currentParam.name,
      p_unit_name: units.find(u => u.id === currentParam.default_unit_id)?.name || null,
      p_equipment_type: currentParam.equipment_type,
    });

    if (error) {
      console.error("Error saving parameter:", error);
      toast({ title: 'Error', description: 'No se pudo guardar el parámetro.', variant: 'destructive' });
    } else {
      toast({ title: 'Éxito', description: `Parámetro '${currentParam.name}' guardado.` });
      setIsModalOpen(false);
      await fetchData();
    }
  };

  const handleDeleteParam = async (paramId) => {
    const { error } = await supabase.from('parameters').update({ is_active: false }).eq('id', paramId);
    if (error) {
      toast({ title: 'Error', description: 'No se pudo eliminar el parámetro.', variant: 'destructive' });
    } else {
      toast({ title: 'Éxito', description: 'Parámetro desactivado.' });
      await fetchData();
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-48"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Parámetros Base del Laboratorio</h2>
          <p className="text-muted-foreground">Gestione el catálogo maestro de parámetros y sus unidades.</p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="w-4 h-4 mr-2" />
          Crear Parámetro
        </Button>
      </div>

      <div className="border rounded-lg">
        <div className="grid grid-cols-[auto,1fr,1fr,1fr,auto] gap-4 p-4 font-semibold bg-secondary rounded-t-lg text-sm">
          <Beaker size={16} />
          <span>Nombre del Parámetro</span>
          <span>Tipo de Equipo</span>
          <span>Unidad por Defecto</span>
          <span>Acciones</span>
        </div>
        <div className="divide-y">
          {parameters.map(param => (
            <div key={param.id} className="grid grid-cols-[auto,1fr,1fr,1fr,auto] gap-4 p-4 items-center">
              <Beaker size={16} className="text-gray-500"/>
              <div>
                <p className="font-semibold">{param.name}</p>
                <p className="text-xs text-muted-foreground">{param.code}</p>
              </div>
              <p>{equipmentTypes[param.equipment_type] || param.equipment_type}</p>
              <p>{param.unit?.name || 'N/A'}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleOpenModal(param)}>
                  <Edit className="w-4 h-4 mr-1" /> Editar
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm"><Trash2 className="w-4 h-4" /></Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción desactivará el parámetro '{param.name}'. No se eliminará de la base de datos, pero no estará disponible para nuevos lotes.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteParam(param.id)}>Desactivar</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentParam?.id ? 'Editar' : 'Crear'} Parámetro Base</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <input placeholder="Código (ej. GLU)" value={currentParam?.code || ''} onChange={e => setCurrentParam({ ...currentParam, code: e.target.value })} className="p-2 border rounded-md" />
            <input placeholder="Nombre (ej. Glucosa)" value={currentParam?.name || ''} onChange={e => setCurrentParam({ ...currentParam, name: e.target.value })} className="p-2 border rounded-md" />
            <Select onValueChange={value => setCurrentParam({ ...currentParam, equipment_type: value })} value={currentParam?.equipment_type || ''}>
              <SelectTrigger><SelectValue placeholder="Tipo de Equipo" /></SelectTrigger>
              <SelectContent>
                {Object.entries(equipmentTypes).map(([key, name]) => <SelectItem key={key} value={key}>{name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select onValueChange={value => setCurrentParam({ ...currentParam, default_unit_id: value })} value={currentParam?.default_unit_id || ''}>
              <SelectTrigger><SelectValue placeholder="Unidad por Defecto (opcional)" /></SelectTrigger>
              <SelectContent>
                {units.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveParam}><Save className="w-4 h-4 mr-2" />Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BaseParametersTab;