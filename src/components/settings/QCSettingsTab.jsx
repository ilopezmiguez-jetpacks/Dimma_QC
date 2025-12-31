import React, { useState } from 'react';
import { useQCData } from '@/contexts/QCDataContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Save, Plus, ChevronDown, ChevronUp } from 'lucide-react';

const QCSettingsTab = () => {
  const { equipment, updateEquipmentDetails } = useQCData();
  const [editableEquipment, setEditableEquipment] = useState(JSON.parse(JSON.stringify(equipment)));
  const [openLotId, setOpenLotId] = useState(null);
  const { toast } = useToast();

  const handleEquipmentChange = (eqId, field, value) => {
    setEditableEquipment(prev =>
      prev.map(eq => (eq.id === eqId ? { ...eq, [field]: value } : eq))
    );
  };

  const handleLotChange = (eqId, lotId, field, value) => {
    setEditableEquipment(prev =>
      prev.map(eq => {
        if (eq.id === eqId) {
          const newLots = eq.lots.map(lot => lot.id === lotId ? { ...lot, [field]: value } : lot);
          return { ...eq, lots: newLots };
        }
        return eq;
      })
    );
  };
  
  const handleParamChange = (eqId, lotId, level, param, field, value) => {
    setEditableEquipment(prev =>
      prev.map(eq => {
        if (eq.id === eqId) {
          const newLots = eq.lots.map(lot => {
            if (lot.id === lotId) {
              const newLot = { ...lot };
              newLot.qc_params[level][param][field] = parseFloat(value) || 0;
              return newLot;
            }
            return lot;
          });
          return { ...eq, lots: newLots };
        }
        return eq;
      })
    );
  };

  const handleAddNewLot = (eqId) => {
    setEditableEquipment(prev =>
      prev.map(eq => {
        if (eq.id === eqId) {
          const lastLot = eq.lots[eq.lots.length - 1];
          const newLot = JSON.parse(JSON.stringify(lastLot || { qc_params: { 'Control Level 1': {} } })); // Deep copy or create from scratch
          newLot.id = `lot-${Date.now()}`;
          newLot.lotNumber = `LOT-${Date.now().toString().slice(-5)}`;
          newLot.expirationDate = new Date().toISOString().split('T')[0];
          newLot.isActive = false;
          return { ...eq, lots: [...(eq.lots || []), newLot] };
        }
        return eq;
      })
    );
  };

  const handleActivateLot = (eqId, lotIdToActivate) => {
     setEditableEquipment(prev =>
      prev.map(eq => {
        if (eq.id === eqId) {
          const newLots = eq.lots.map((lot) => ({
            ...lot,
            isActive: lot.id === lotIdToActivate
          }));
          return { ...eq, lots: newLots };
        }
        return eq;
      })
    );
  };

  const handleSaveChanges = (eqId) => {
    const equipmentToSave = editableEquipment.find(eq => eq.id === eqId);
    updateEquipmentDetails(eqId, equipmentToSave);
    toast({
      title: 'Saved',
      description: `Parameters for ${equipmentToSave.name} have been updated.`,
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Quality Control Parameters</h2>
      {editableEquipment.map(eq => (
        <div key={eq.id} className="medical-card rounded-xl p-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-gray-800">{eq.name}</h3>
            <Button onClick={() => handleSaveChanges(eq.id)}><Save className="w-4 h-4 mr-2" />Save Changes</Button>
          </div>
          
          <div className="mt-4 pt-4 border-t">
            <h4 className="text-lg font-semibold text-gray-700 mb-2">Control Lots</h4>
            {(eq.lots || []).map((lot) => (
              <div key={lot.id} className="border rounded-lg p-4 mb-4">
                <div className="flex justify-between items-center">
                  <div className="font-bold">{lot.lotNumber} {lot.isActive && <span className="text-green-600">(Active)</span>}</div>
                  {!lot.isActive && <Button size="sm" onClick={() => handleActivateLot(eq.id, lot.id)}>Activate Lot</Button>}
                </div>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <label className="text-sm">Lot No.</label>
                    <input type="text" value={lot.lotNumber} onChange={e => handleLotChange(eq.id, lot.id, 'lotNumber', e.target.value)} className="w-full p-2 border rounded-md" />
                  </div>
                  <div>
                    <label className="text-sm">Expiration</label>
                    <input type="date" value={lot.expirationDate.split('T')[0]} onChange={e => handleLotChange(eq.id, lot.id, 'expirationDate', e.target.value)} className="w-full p-2 border rounded-md" />
                  </div>
                </div>
                <div className="mt-4">
                  <button onClick={() => setOpenLotId(openLotId === lot.id ? null : lot.id)} className="text-sm font-semibold text-blue-600 flex items-center gap-1">
                    Show/Hide Parameters {openLotId === lot.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  {openLotId === lot.id && Object.entries(lot.qc_params).map(([level, params]) => (
                    <div key={level} className="mt-2 pl-4 border-l-2">
                      <p className="font-semibold">{level}</p>
                      {Object.entries(params).map(([param, values]) => (
                        <div key={param} className="grid grid-cols-3 gap-2 items-center mt-1">
                          <label className="text-sm">{param}</label>
                          <input type="number" step="any" value={values.mean} onChange={e => handleParamChange(eq.id, lot.id, level, param, 'mean', e.target.value)} className="w-full p-1 border rounded-md" placeholder="Mean" />
                          <input type="number" step="any" value={values.sd} onChange={e => handleParamChange(eq.id, lot.id, level, param, 'sd', e.target.value)} className="w-full p-1 border rounded-md" placeholder="SD" />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <Button variant="outline" onClick={() => handleAddNewLot(eq.id)}><Plus className="w-4 h-4 mr-2" />Add New Lot</Button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default QCSettingsTab;