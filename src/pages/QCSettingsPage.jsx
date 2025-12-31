import React, { useState, useEffect, memo } from 'react';
import { Helmet } from 'react-helmet';
import { useQCData } from '@/contexts/QCDataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { useToast } from '@/components/ui/use-toast';
import { 
  Plus, Check, Save, ChevronDown, ChevronUp, Sliders, 
  Thermometer, Microscope, Beaker, PackagePlus, Loader2, 
  Activity, Droplets, Syringe, Building2, Trash2
} from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';

// --- Constants & Helpers ---

const TYPE_ICONS = {
  'Contador hematologico': <Microscope className="w-4 h-4 mr-2" />,
  'Quimica Clinica': <Beaker className="w-4 h-4 mr-2" />,
  'Ionograma': <Activity className="w-4 h-4 mr-2" />,
  'Acido Base': <Thermometer className="w-4 h-4 mr-2" />,
  'Coagulometria': <Droplets className="w-4 h-4 mr-2" />,
  'default': <Sliders className="w-4 h-4 mr-2" />,
};

const getIconForType = (typeName) => {
    if (!typeName) return TYPE_ICONS['default'];
    return TYPE_ICONS[typeName] || TYPE_ICONS['default'];
};

// --- Sub-Components ---

const UnitSelector = memo(({ value, onChange, disabled, dbUnits }) => {
  const selectedUnitId = dbUnits.find(u => u.name === value)?.id || '';

  return (
    <Select 
      onValueChange={(id) => {
        const unitName = dbUnits.find(u => u.id === id)?.name || '';
        onChange(unitName);
      }} 
      value={selectedUnitId} 
      disabled={disabled}
    >
        <SelectTrigger className="h-8 w-full min-w-[80px] text-xs">
            <SelectValue placeholder="Unidad" />
        </SelectTrigger>
        <SelectContent>
            {dbUnits.map(unit => (
                <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>
            ))}
        </SelectContent>
    </Select>
  );
});

const AddEquipmentDialog = ({ 
    isOpen, 
    onOpenChange, 
    onAdd, 
    isProcessing, 
    equipmentTypes, 
    laboratories, 
    currentLabId 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    model: '',
    serial: '',
    typeId: '',
    typeName: '',
    laboratoryId: '',
    maintenanceDue: '',
  });

  useEffect(() => {
    if (isOpen) {
        setFormData(prev => ({
            ...prev,
            laboratoryId: currentLabId !== 'all' ? currentLabId : '',
            typeId: '',
            typeName: '',
            name: '',
            model: '',
            serial: '',
            maintenanceDue: ''
        }));
    }
  }, [isOpen, currentLabId]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTypeChange = (typeId) => {
      const selectedType = equipmentTypes.find(t => t.id === typeId);
      setFormData(prev => ({
          ...prev,
          typeId: typeId,
          typeName: selectedType ? selectedType.name : ''
      }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.typeId) return; 
    
    if (currentLabId === 'all' && !formData.laboratoryId) {
        return; 
    }

    onAdd({
        ...formData,
        type: formData.typeName 
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Agregar Nuevo Equipo</DialogTitle>
          <DialogDescription>
            Ingrese los detalles del nuevo equipo de laboratorio.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label className="text-right text-sm font-medium">Nombre</label>
            <Input 
              value={formData.name} 
              onChange={e => handleChange('name', e.target.value)} 
              className="col-span-3" 
              placeholder="ej. Cell-Dyn Ruby" 
              required
            />
          </div>
          
          {currentLabId === 'all' && (
            <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-right text-sm font-medium">Laboratorio</label>
                <div className="col-span-3">
                    <Select 
                        value={formData.laboratoryId} 
                        onValueChange={(val) => handleChange('laboratoryId', val)}
                        required
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Seleccionar Laboratorio" />
                        </SelectTrigger>
                        <SelectContent>
                            {laboratories.map(lab => (
                                <SelectItem key={lab.id} value={lab.id}>{lab.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
          )}

          <div className="grid grid-cols-4 items-center gap-4">
            <label className="text-right text-sm font-medium">Modelo</label>
            <Input 
              value={formData.model} 
              onChange={e => handleChange('model', e.target.value)} 
              className="col-span-3" 
              placeholder="ej. Ruby" 
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label className="text-right text-sm font-medium">Serie</label>
            <Input 
              value={formData.serial} 
              onChange={e => handleChange('serial', e.target.value)} 
              className="col-span-3" 
              placeholder="ej. SN12345" 
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label className="text-right text-sm font-medium">Tipo</label>
            <div className="col-span-3">
              <Select value={formData.typeId} onValueChange={handleTypeChange} required>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  {equipmentTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      <div className="flex items-center">
                        {getIconForType(type.name)}
                        {type.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label className="text-right text-sm font-medium">Mantenimiento</label>
            <Input 
              type="date" 
              value={formData.maintenanceDue} 
              onChange={e => handleChange('maintenanceDue', e.target.value)} 
              className="col-span-3" 
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isProcessing} className="medical-gradient text-white">
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Agregar Equipo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Lot Editing Component
const EditableLot = ({ lot, equipment, onSave, isAdmin, dbUnits, isProcessing, availableParameters }) => {
    const [editableLot, setEditableLot] = useState(JSON.parse(JSON.stringify(lot)));
    
    // Filter params for this equipment type
    const eqTypeId = equipment.equipment_type_id || equipment.typeId; // Handling different naming
    const filteredParams = availableParameters.filter(p => p.equipment_type_id === eqTypeId);

    useEffect(() => {
        if(lot.id !== editableLot.id) {
             setEditableLot(JSON.parse(JSON.stringify(lot)));
        }
    }, [lot.id]); 

    const handleParamChange = (level, paramName, field, value) => {
        setEditableLot(prev => {
            const newLot = JSON.parse(JSON.stringify(prev));
            if(newLot.qc_params?.[level]?.[paramName]) {
                newLot.qc_params[level][paramName][field] = value;
            }
            return newLot;
        });
    };
    
    const handleAddLevel = () => {
        setEditableLot(prev => {
            const newLot = JSON.parse(JSON.stringify(prev));
            const levelCount = Object.keys(newLot.qc_params).length;
            const newLevelName = `Control Nivel ${levelCount + 1}`;
            newLot.qc_params[newLevelName] = {};
            return newLot;
        });
    };

    const handleAddParamToLevel = (level) => {
         setEditableLot(prev => {
             const newLot = JSON.parse(JSON.stringify(prev));
             const tempName = `Nuevo Param ${Object.keys(newLot.qc_params[level]).length + 1}`;
             newLot.qc_params[level][tempName] = { mean: '', sd: '', unit: '' };
             return newLot;
        });
    };

    const handleSelectParam = (level, currentName, newParamId) => {
        const paramObj = availableParameters.find(p => p.id === newParamId);
        if (!paramObj) return;

        setEditableLot(prev => {
            const newLot = JSON.parse(JSON.stringify(prev));
            // Remove old key
            const oldData = newLot.qc_params[level][currentName]; // preserve if needed, but we overwrite
            delete newLot.qc_params[level][currentName];
            
            // Add new key with defaults
            newLot.qc_params[level][paramObj.name] = {
                mean: paramObj.default_mean || oldData?.mean || '',
                sd: paramObj.default_sd || oldData?.sd || '',
                unit: paramObj.unitName || oldData?.unit || ''
            };
            return newLot;
        });
    };
    
    const removeParam = (level, paramName) => {
         setEditableLot(prev => {
            const newLot = JSON.parse(JSON.stringify(prev));
            delete newLot.qc_params[level][paramName];
            return newLot;
         });
    };

    return (
        <div className="space-y-6">
            {Object.entries(editableLot.qc_params).map(([level, params]) => (
                <div key={level} className="p-4 border rounded-lg bg-gray-50/50">
                    <div className="flex justify-between items-center mb-3">
                        <h5 className="font-semibold text-gray-800">{level}</h5>
                        {isAdmin && (
                            <Button variant="ghost" size="sm" onClick={() => handleAddParamToLevel(level)} className="text-blue-600">
                                <Plus className="w-3 h-3 mr-1" /> Agregar Parámetro
                            </Button>
                        )}
                    </div>
                    <div className="space-y-2">
                        <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 mb-1 px-1">
                            <div className="col-span-4 md:col-span-3">Parámetro</div>
                            <div className="col-span-3 md:col-span-3">Media</div>
                            <div className="col-span-3 md:col-span-3">SD</div>
                            <div className="col-span-2 md:col-span-2">Unidad</div>
                            <div className="col-span-1"></div>
                        </div>
                        {Object.entries(params).map(([paramName, paramData]) => (
                             <div key={`${level}-${paramName}`} className="grid grid-cols-12 gap-2 items-center">
                                <div className="col-span-4 md:col-span-3">
                                  {/* Parameter Selector */}
                                  {isAdmin ? (
                                     <Select 
                                        value={filteredParams.find(p => p.name === paramName)?.id || 'custom'} 
                                        onValueChange={(val) => {
                                            if(val !== 'custom') handleSelectParam(level, paramName, val);
                                        }}
                                     >
                                        <SelectTrigger className="h-8 text-xs">
                                            <SelectValue>{paramName}</SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="custom" disabled>Seleccionar...</SelectItem>
                                            {filteredParams.map(p => (
                                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                            ))}
                                            {!filteredParams.some(p => p.name === paramName) && (
                                                <SelectItem value="custom_display" disabled>{paramName} (Personalizado)</SelectItem>
                                            )}
                                        </SelectContent>
                                     </Select>
                                  ) : (
                                      <Input value={paramName} readOnly className="h-8 bg-gray-100 text-xs" />
                                  )}
                                </div>
                                <div className="col-span-3 md:col-span-3">
                                  <Input 
                                    type="number" step="any" 
                                    value={paramData.mean || ''} 
                                    onChange={e => handleParamChange(level, paramName, 'mean', e.target.value)} 
                                    className="h-8 text-xs"
                                    disabled={!isAdmin || isProcessing}
                                  />
                                </div>
                                <div className="col-span-3 md:col-span-3">
                                  <Input 
                                    type="number" step="any" 
                                    value={paramData.sd || ''} 
                                    onChange={e => handleParamChange(level, paramName, 'sd', e.target.value)} 
                                    className="h-8 text-xs"
                                    disabled={!isAdmin || isProcessing}
                                  />
                                </div>
                                <div className="col-span-2 md:col-span-2">
                                  <UnitSelector 
                                    value={paramData.unit || ''}
                                    onChange={(val) => handleParamChange(level, paramName, 'unit', val)}
                                    disabled={!isAdmin || isProcessing}
                                    dbUnits={dbUnits}
                                  />
                                </div>
                                <div className="col-span-1 flex justify-center">
                                    {isAdmin && (
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => removeParam(level, paramName)}>
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
             {isAdmin && <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={handleAddLevel} disabled={isProcessing}>
                    <Plus className="w-4 h-4 mr-2" /> Agregar Nivel
                </Button>
                <Button size="sm" onClick={() => onSave(equipment.id, editableLot.id, editableLot)} disabled={isProcessing} className="medical-gradient text-white">
                    {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Guardar Parámetros
                </Button>
             </div>}
        </div>
    );
};

// Row Component for the main table
const EquipmentRow = ({ eq, isAdmin, isExpanded, toggleExpand, onActivateLot, onAddLot, onUpdateLot, dbUnits, isProcessing, showLabName, availableParameters }) => {
    const [newLotForm, setNewLotForm] = useState({ 
        lotNumber: '', 
        expirationDate: '', 
        qc_params: { 'Control Nivel 1': {} } 
    });

    const handleNewLotSubmit = (e) => {
        e.preventDefault();
        onAddLot(eq.id, newLotForm);
        setNewLotForm({ lotNumber: '', expirationDate: '', qc_params: { 'Control Nivel 1': {} } });
    };

    return (
        <>
            <TableRow>
                <TableCell className="font-medium">
                    <div className="flex items-center">
                        <div className={`p-2 rounded-full mr-3 bg-blue-50 text-blue-600`}>
                            {getIconForType(eq.typeName || eq.equipment_type)}
                        </div>
                        <div>
                            <div className="font-bold text-gray-900">{eq.name}</div>
                            <div className="text-xs text-gray-500">{eq.typeName || eq.equipment_type}</div>
                        </div>
                    </div>
                </TableCell>
                {showLabName && (
                  <TableCell>
                    <div className="flex items-center text-sm text-gray-600">
                      <Building2 className="w-3 h-3 mr-1" />
                      {eq.laboratoryName || 'Laboratorio Desconocido'}
                    </div>
                  </TableCell>
                )}
                <TableCell>{eq.model}</TableCell>
                <TableCell className="font-mono text-xs">{eq.serial}</TableCell>
                <TableCell>
                    {eq.maintenanceDue ? new Date(eq.maintenanceDue).toLocaleDateString('es-ES') : 'N/A'}
                </TableCell>
                <TableCell>
                    {eq.lots?.some(l => l.isActive) 
                        ? <Badge variant="success">Lote Activo</Badge> 
                        : <Badge variant="warning">Sin Lote Activo</Badge>
                    }
                </TableCell>
                <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => toggleExpand(eq.id)}>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        <span className="ml-2">Gestionar Lotes</span>
                    </Button>
                </TableCell>
            </TableRow>
            
            {isExpanded && (
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableCell colSpan={showLabName ? 7 : 6} className="p-0">
                        <div className="p-6 space-y-6 animate-in slide-in-from-top-2 duration-200">
                            
                            {/* Active Lot Section */}
                            <div className="border rounded-lg bg-white overflow-hidden shadow-sm">
                                <div className="bg-green-50 px-4 py-3 border-b flex justify-between items-center">
                                    <h4 className="font-semibold text-green-800 flex items-center">
                                        <Activity className="w-4 h-4 mr-2" /> Lote de QC Activo
                                    </h4>
                                    {eq.lots?.find(l => l.isActive) && (
                                        <Badge variant="outline" className="bg-white">
                                            {eq.lots.find(l => l.isActive).lotNumber}
                                        </Badge>
                                    )}
                                </div>
                                <div className="p-4">
                                    {eq.lots?.find(l => l.isActive) ? (
                                        <EditableLot 
                                            lot={eq.lots.find(l => l.isActive)} 
                                            equipment={eq} 
                                            onSave={onUpdateLot} 
                                            isAdmin={isAdmin} 
                                            dbUnits={dbUnits} 
                                            isProcessing={isProcessing}
                                            availableParameters={availableParameters}
                                        />
                                    ) : (
                                        <div className="text-center py-8 text-gray-500">
                                            No hay lote activo seleccionado. Por favor active un lote abajo o cree uno nuevo.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Inactive Lots List */}
                            {eq.lots?.filter(l => !l.isActive).length > 0 && (
                                <div className="border rounded-lg bg-white overflow-hidden shadow-sm">
                                    <div className="bg-gray-50 px-4 py-3 border-b">
                                        <h4 className="font-semibold text-gray-700">Lotes Inactivos</h4>
                                    </div>
                                    <div className="divide-y">
                                        {eq.lots.filter(l => !l.isActive).map(lot => (
                                            <div key={lot.id} className="p-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                                <div>
                                                    <span className="font-medium mr-2">{lot.lotNumber}</span>
                                                    <span className="text-xs text-gray-500">Expira: {new Date(lot.expirationDate).toLocaleDateString('es-ES')}</span>
                                                </div>
                                                <Button size="sm" variant="outline" onClick={() => onActivateLot(eq.id, lot.id)} disabled={isProcessing}>
                                                    <Check className="w-3 h-3 mr-1" /> Activar
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Add New Lot Section */}
                            {isAdmin && (
                                <div className="border rounded-lg bg-white overflow-hidden shadow-sm">
                                    <div className="bg-blue-50 px-4 py-3 border-b">
                                        <h4 className="font-semibold text-blue-800 flex items-center">
                                            <PackagePlus className="w-4 h-4 mr-2" /> Crear Nuevo Lote
                                        </h4>
                                    </div>
                                    <div className="p-4">
                                        <form onSubmit={handleNewLotSubmit} className="flex flex-col sm:flex-row gap-4 items-end">
                                            <div className="flex-1 space-y-2 w-full">
                                                <label className="text-sm font-medium">Número de Lote</label>
                                                <Input 
                                                    value={newLotForm.lotNumber} 
                                                    onChange={e => setNewLotForm({...newLotForm, lotNumber: e.target.value})}
                                                    placeholder="Ingrese número de lote..."
                                                    required 
                                                />
                                            </div>
                                            <div className="flex-1 space-y-2 w-full">
                                                <label className="text-sm font-medium">Fecha de Expiración</label>
                                                <Input 
                                                    type="date" 
                                                    value={newLotForm.expirationDate} 
                                                    onChange={e => setNewLotForm({...newLotForm, expirationDate: e.target.value})}
                                                    required 
                                                />
                                            </div>
                                            <Button type="submit" disabled={isProcessing} className="w-full sm:w-auto">
                                                <Plus className="w-4 h-4 mr-2" /> Crear Lote
                                            </Button>
                                        </form>
                                        <p className="text-xs text-gray-500 mt-2">
                                            Nota: Los parámetros pueden configurarse después de crear el lote.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </TableCell>
                </TableRow>
            )}
        </>
    );
};


// --- Main Page Component ---

const QCSettingsPage = ({ isTab = false }) => {
  const { 
    equipment, 
    addEquipment, 
    addLot, 
    activateLot, 
    updateLotParams, 
    loading: qcContextLoading,
    equipmentTypes,
    laboratories,
    currentLabId,
    parameters
  } = useQCData();
  const { user } = useAuth();
  const { toast } = useToast();

  const isAdmin = user?.user_metadata?.role === 'admin' || user?.user_metadata?.role === 'superadmin';
  const [expandedEqId, setExpandedEqId] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Database Data (Units)
  const [dbUnits, setDbUnits] = useState([]);
  const [loadingDbData, setLoadingDbData] = useState(true);

  // Fetch Master Data
  useEffect(() => {
    const fetchDbData = async () => {
      if (!user) return;
      setLoadingDbData(true);
      try {
        const { data: units } = await supabase.from('units').select('id, name').eq('is_active', true);
        setDbUnits(units || []);
      } catch (error) {
        toast({ title: 'Error', description: 'No se pudieron cargar los datos del sistema.', variant: 'destructive' });
      } finally {
        setLoadingDbData(false);
      }
    };
    fetchDbData();
  }, [user, toast]);

  const handleAddEquipment = async (formData) => {
    setIsProcessing(true);
    try {
        await addEquipment({
            ...formData,
            dailyDeviationThreshold: 2 
        });
        setIsAddModalOpen(false);
        toast({ title: 'Éxito', description: 'Equipo agregado correctamente.' });
    } catch (err) {
        toast({ title: 'Error', description: 'Error al agregar el equipo.', variant: 'destructive' });
    } finally {
        setIsProcessing(false);
    }
  };

  const handleAddLot = async (eqId, lotData) => {
    if (!lotData.qc_params['Control Nivel 1']) {
        lotData.qc_params['Control Nivel 1'] = {};
    }
    
    setIsProcessing(true);
    try {
        await addLot(eqId, lotData);
        toast({ title: 'Éxito', description: 'Nuevo lote creado. Por favor configure los parámetros.' });
    } catch (err) {
        toast({ title: 'Error', description: 'Error al crear el lote.', variant: 'destructive' });
    } finally {
        setIsProcessing(false);
    }
  };

  const handleActivateLot = async (eqId, lotId) => {
    setIsProcessing(true);
    try {
        await activateLot(eqId, lotId);
        toast({ title: 'Éxito', description: 'Lote activado.' });
    } catch (err) {
        toast({ title: 'Error', description: 'Error al activar el lote.', variant: 'destructive' });
    } finally {
        setIsProcessing(false);
    }
  };

  const handleUpdateLot = async (eqId, lotId, lotData) => {
      setIsProcessing(true);
      try {
          await updateLotParams(eqId, lotId, lotData);
          toast({ title: 'Guardado', description: 'Parámetros de QC actualizados correctamente.' });
      } catch (err) {
          toast({ title: 'Error', description: 'Error al guardar parámetros.', variant: 'destructive' });
      } finally {
          setIsProcessing(false);
      }
  };

  const toggleExpand = (id) => {
      setExpandedEqId(prev => prev === id ? null : id);
  };

  if (qcContextLoading || loadingDbData) {
      return <div className="h-64 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const filteredEquipment = currentLabId === 'all' 
    ? equipment 
    : equipment.filter(e => e.laboratory_id === currentLabId);

  return (
    <div className="space-y-6">
      {!isTab && <Helmet><title>Equipos - DIMMA QC</title></Helmet>}
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           {!isTab && <h1 className="text-2xl font-bold tracking-tight">Gestión de Equipos</h1>}
           <p className="text-muted-foreground">Administre sus analizadores de laboratorio y lotes de control de calidad.</p>
        </div>
        {isAdmin && (
            <Button onClick={() => setIsAddModalOpen(true)} className="medical-gradient text-white shadow-md">
                <Plus className="w-4 h-4 mr-2" /> Agregar Equipo
            </Button>
        )}
      </div>

      {/* Equipment List Table */}
      <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
          <Table>
              <TableHeader className="bg-gray-50/50">
                  <TableRow>
                      <TableHead className="w-[300px]">Nombre</TableHead>
                      {currentLabId === 'all' && <TableHead>Laboratorio</TableHead>}
                      <TableHead>Modelo</TableHead>
                      <TableHead>Serie</TableHead>
                      <TableHead>Mantenimiento</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                  {filteredEquipment.length === 0 ? (
                      <TableRow>
                          <TableCell colSpan={currentLabId === 'all' ? 7 : 6} className="text-center h-32 text-muted-foreground">
                              No se encontraron equipos para este laboratorio. Haga clic en "Agregar Equipo" para comenzar.
                          </TableCell>
                      </TableRow>
                  ) : (
                      filteredEquipment.map(eq => (
                          <EquipmentRow 
                              key={eq.id} 
                              eq={eq} 
                              isAdmin={isAdmin}
                              isExpanded={expandedEqId === eq.id}
                              toggleExpand={toggleExpand}
                              onActivateLot={handleActivateLot}
                              onAddLot={handleAddLot}
                              onUpdateLot={handleUpdateLot}
                              dbUnits={dbUnits}
                              isProcessing={isProcessing}
                              showLabName={currentLabId === 'all'}
                              availableParameters={parameters}
                          />
                      ))
                  )}
              </TableBody>
          </Table>
      </div>

      {/* Add Equipment Modal */}
      <AddEquipmentDialog 
          isOpen={isAddModalOpen} 
          onOpenChange={setIsAddModalOpen} 
          onAdd={handleAddEquipment} 
          isProcessing={isProcessing}
          equipmentTypes={equipmentTypes}
          laboratories={laboratories}
          currentLabId={currentLabId}
      />
    </div>
  );
};

export default QCSettingsPage;