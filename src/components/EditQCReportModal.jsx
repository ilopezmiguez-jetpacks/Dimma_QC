import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useQCData } from '@/contexts/QCDataContext';
import { useToast } from '@/components/ui/use-toast';
import { Save, Plus, X } from 'lucide-react';
import { commonUnits } from '@/lib/parameters';

const EditQCReportModal = ({ report, isOpen, onClose, qcParams: initialQcParams }) => {
  const [values, setValues] = useState({});
  const [noAplica, setNoAplica] = useState({});
  const [newParams, setNewParams] = useState([]);
  const [currentQcParams, setCurrentQcParams] = useState({});
  const { updateQCReport, updateLotParams } = useQCData();
  const { toast } = useToast();

  useEffect(() => {
    if (report) {
      setValues(report.values);
      setCurrentQcParams(initialQcParams || {});
      setNewParams([]);

      // Initialize noAplica state based on 'N/A' values
      const initialNoAplica = {};
      Object.entries(report.values).forEach(([param, value]) => {
        initialNoAplica[param] = value === 'N/A';
      });
      setNoAplica(initialNoAplica);
    }
  }, [report, initialQcParams]);

  if (!report) return null;

  const handleValueChange = (param, value) => {
    setValues(prev => ({ ...prev, [param]: value }));
  };

  const handleNoAplicaChange = (param, isChecked) => {
    setNoAplica(prev => ({ ...prev, [param]: isChecked }));

    if (isChecked) {
      // Set value to 'N/A' when checkbox is checked
      setValues(prev => ({ ...prev, [param]: 'N/A' }));
    } else {
      // Clear value when checkbox is unchecked
      setValues(prev => ({ ...prev, [param]: '' }));
    }
  };

  const handleNewParamChange = (index, field, value) => {
    const updated = [...newParams];
    updated[index][field] = value;
    setNewParams(updated);
  };

  const addNewParamField = () => {
    setNewParams([...newParams, { name: '', value: '', mean: '', sd: '', unit: '' }]);
  };

  const removeNewParamField = (index) => {
    setNewParams(newParams.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    let combinedValues = { ...values };
    let paramsToAddToLot = {};
    let allNewParamsAreValid = true;

    newParams.forEach(param => {
      if (param.name && param.value && param.mean && param.sd) {
        // Preserve 'N/A' or convert to number
        combinedValues[param.name] = param.value === 'N/A' ? 'N/A' : param.value;
        paramsToAddToLot[param.name] = {
          mean: parseFloat(param.mean),
          sd: parseFloat(param.sd),
          unit: param.unit,
        };
      } else if (param.name || param.value || param.mean || param.sd || param.unit) {
        allNewParamsAreValid = false;
      }
    });

    if (!allNewParamsAreValid) {
      toast({
        title: "Parámetro Incompleto",
        description: "Por favor, complete todos los campos (Nombre, Valor, Media, SD) para cada nuevo parámetro o elimínelo.",
        variant: "destructive",
      });
      return;
    }

    // Note: updateLotParams might need adjustment in QCDataContext to handle new params per level
    if (Object.keys(paramsToAddToLot).length > 0) {
      await updateLotParams(report.equipmentId, report.lotId, paramsToAddToLot);
    }

    // US-03: Preserve 'N/A' values alongside numeric entries
    const processedValues = Object.fromEntries(
      Object.entries(combinedValues).map(([k, v]) => [k, v === 'N/A' ? 'N/A' : (parseFloat(v) || 0)])
    );

    const updatedReport = await updateQCReport(report.id, processedValues);

    onClose();

    if (updatedReport) {
      toast({
        title: 'Reporte Actualizado',
        description: `El control del ${new Date(report.date).toLocaleDateString()} ha sido modificado.`,
        variant: updatedReport.status === 'error' ? 'destructive' : 'default',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Control de Calidad</DialogTitle>
          <DialogDescription>
            Modificando el reporte para el nivel "{report.level}" del {new Date(report.date).toLocaleString()}.
          </DialogDescription>
        </DialogHeader>
        <datalist id="common-units-modal">
          {commonUnits.map(unit => <option key={unit} value={unit} />)}
        </datalist>
        <div className="space-y-4 py-4">
          {Object.keys(values).map(param => {
            const paramData = currentQcParams ? currentQcParams[param] : null;
            const numMean = paramData ? parseFloat(paramData.mean) : 0;
            const numSd = paramData ? parseFloat(paramData.sd) : 0;
            const isNoAplica = noAplica[param] || false;
            return (
              <div key={param}>
                <label className="block text-sm font-medium text-gray-700">{param} ({paramData?.unit || 'N/A'})</label>
                {paramData && (
                  <p className="text-xs text-gray-500">
                    Rango Esperado (2s): {(!isNaN(numMean) && !isNaN(numSd)) ? `${(numMean - 2 * numSd).toFixed(2)} - ${(numMean + 2 * numSd).toFixed(2)}` : 'N/A'}
                  </p>
                )}
                <input
                  type="number"
                  step="any"
                  value={values[param] === 'N/A' ? '' : (values[param] || '')}
                  onChange={e => handleValueChange(param, e.target.value)}
                  disabled={isNoAplica}
                  className={`mt-1 w-full p-2 border rounded-md ${isNoAplica ? 'opacity-50 bg-gray-100 cursor-not-allowed' : ''}`}
                />
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    id={`noaplica-edit-${param}`}
                    checked={isNoAplica}
                    onChange={e => handleNoAplicaChange(param, e.target.checked)}
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                  />
                  <label
                    htmlFor={`noaplica-edit-${param}`}
                    className="text-sm text-gray-600 cursor-pointer"
                  >
                    No aplica
                  </label>
                </div>
              </div>
            );
          })}

          <div className="space-y-2">
            {newParams.map((param, index) => (
              <div key={index} className="p-3 border rounded-md space-y-2 relative bg-gray-50">
                <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => removeNewParamField(index)}>
                  <X className="h-4 w-4" />
                </Button>
                <p className="text-sm font-semibold">Nuevo Parámetro</p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Parámetro (e.g., GLU)"
                    value={param.name}
                    onChange={e => handleNewParamChange(index, 'name', e.target.value)}
                    className="p-2 border rounded-md"
                  />
                  <input
                    type="number"
                    step="any"
                    placeholder="Valor Medido"
                    value={param.value}
                    onChange={e => handleNewParamChange(index, 'value', e.target.value)}
                    className="p-2 border rounded-md"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    step="any"
                    placeholder="Media"
                    value={param.mean}
                    onChange={e => handleNewParamChange(index, 'mean', e.target.value)}
                    className="p-2 border rounded-md"
                  />
                  <input
                    type="number"
                    step="any"
                    placeholder="SD"
                    value={param.sd}
                    onChange={e => handleNewParamChange(index, 'sd', e.target.value)}
                    className="p-2 border rounded-md"
                  />
                  <input
                    type="text"
                    list="common-units-modal"
                    placeholder="Unidad"
                    value={param.unit}
                    onChange={e => handleNewParamChange(index, 'unit', e.target.value)}
                    className="p-2 border rounded-md"
                  />
                </div>
              </div>
            ))}
          </div>

          <Button variant="outline" size="sm" onClick={addNewParamField}>
            <Plus className="w-4 h-4 mr-2" /> Agregar Parámetro
          </Button>

        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} className="medical-gradient text-white">
            <Save className="w-4 h-4 mr-2" /> Guardar Cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditQCReportModal;