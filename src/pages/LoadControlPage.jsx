import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { useLocation } from 'react-router-dom';
import { useQCData } from '@/contexts/QCDataContext';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Save, AlertTriangle, CheckCircle, Sliders, ChevronDown, Plus, X } from 'lucide-react';
import { predefinedParams } from '@/lib/parameters';

const LoadControlPage = () => {
    const { equipment, qcReports, addQCReport } = useQCData();
    const { user } = useAuth();
    const { toast } = useToast();
    const location = useLocation();

    const [selectedEquipmentId, setSelectedEquipmentId] = useState('');
    const [selectedLevel, setSelectedLevel] = useState('');
    const [formParams, setFormParams] = useState({});
    const [inputValues, setInputValues] = useState({});

    const currentEquipment = useMemo(() => equipment.find(e => e.id === selectedEquipmentId), [equipment, selectedEquipmentId]);
    const activeLot = useMemo(() => currentEquipment?.lots?.find(l => l.isActive), [currentEquipment]);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const equipmentIdFromQuery = params.get('equipmentId');
        if (equipmentIdFromQuery && equipment.some(e => e.id === equipmentIdFromQuery)) {
            setSelectedEquipmentId(equipmentIdFromQuery);
        } else if (equipment.length > 0) {
            setSelectedEquipmentId(equipment[0].id);
        }
    }, [location.search, equipment]);
    
    useEffect(() => {
        if (activeLot && activeLot.qc_params) {
            const firstLevel = Object.keys(activeLot.qc_params)[0] || '';
            setSelectedLevel(firstLevel);
        } else {
            setSelectedLevel('');
        }
    }, [activeLot]);

    useEffect(() => {
        if (currentEquipment && selectedLevel) {
            const lotParams = activeLot?.qc_params?.[selectedLevel] || {};
            const equipmentTypeParams = predefinedParams[currentEquipment.type]?.params || {};
            const combinedParams = { ...equipmentTypeParams, ...lotParams };
            setFormParams(combinedParams);
            setInputValues({});
        } else {
            setFormParams({});
            setInputValues({});
        }
    }, [currentEquipment, selectedLevel, activeLot]);

    const handleInputChange = (param, value) => {
        setInputValues(prev => ({ ...prev, [param]: value }));
    };

    const handleAddManualParam = () => {
        const newParamName = `Manual_${Date.now()}`;
        setFormParams(prev => ({ ...prev, [newParamName]: { mean: 0, sd: 0, unit: '' } }));
    };

    const handleRemoveParam = (paramName) => {
        setFormParams(prev => {
            const newParams = { ...prev };
            delete newParams[paramName];
            return newParams;
        });
        setInputValues(prev => {
            const newValues = { ...prev };
            delete newValues[paramName];
            return newValues;
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const report = {
            equipmentId: selectedEquipmentId,
            lotNumber: activeLot.lotNumber,
            date: new Date().toISOString(),
            technician: user?.user_metadata?.full_name || 'Anonymous User',
            level: selectedLevel,
            values: Object.fromEntries(Object.entries(inputValues).map(([k, v]) => [k, parseFloat(v) || null])),
            dailyDeviationThreshold: currentEquipment.dailyDeviationThreshold || 2,
        };
        
        const newReport = addQCReport(report);

        if (newReport) {
            toast({
                title: "QC Report Saved",
                description: `The control for ${currentEquipment.name} has been registered.`,
                variant: newReport.status === 'error' ? 'destructive' : 'default',
            });
            setInputValues({});
        } else {
            toast({
                title: "Save Error",
                description: "No valid values were entered. The report was not saved.",
                variant: 'destructive',
            });
        }
    };

    const canSubmit = Object.values(inputValues).some(v => v && v.trim() !== '');

    const lastReportForLevel = useMemo(() => {
        return qcReports
            .filter(r => r.equipmentId === selectedEquipmentId && r.level === selectedLevel)
            .sort((a,b) => new Date(b.date) - new Date(a.date))[0];
    }, [qcReports, selectedEquipmentId, selectedLevel]);

    return (
        <>
            <Helmet>
                <title>Load Daily Control - DIMMA QC</title>
            </Helmet>
            <div className="max-w-4xl mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Daily Control Loading</h1>
                    <p className="text-gray-600 mt-1">Select an equipment and register the quality control values.</p>
                </div>

                <div className="medical-card rounded-xl p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">1. Select Equipment</label>
                        <div className="relative">
                            <select 
                                value={selectedEquipmentId} 
                                onChange={e => setSelectedEquipmentId(e.target.value)} 
                                className="w-full p-3 border rounded-md appearance-none"
                            >
                                {equipment.map(eq => <option key={eq.id} value={eq.id}>{eq.name} ({eq.model})</option>)}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                        </div>
                    </div>

                    {currentEquipment && (
                        <div>
                            {activeLot ? (
                                <div className="flex items-center gap-2 text-sm bg-green-100 text-green-800 p-2 rounded-md">
                                    <CheckCircle className="w-5 h-5" />
                                    <span>Active Lot: <span className="font-bold">{activeLot.lotNumber}</span> (Expires: {new Date(activeLot.expirationDate).toLocaleDateString('en-CA')})</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-sm bg-red-100 text-red-800 p-2 rounded-md">
                                    <AlertTriangle className="w-5 h-5" />
                                    <span>No active lot. Activate a lot in settings to continue.</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {activeLot && (
                    <form onSubmit={handleSubmit} className="medical-card rounded-xl p-6 space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">2. Select Control Level</label>
                            <div className="flex flex-wrap gap-2">
                                {Object.keys(activeLot.qc_params).map(level => (
                                    <Button key={level} type="button" variant={selectedLevel === level ? 'default' : 'outline'} onClick={() => setSelectedLevel(level)}>{level}</Button>
                                ))}
                            </div>
                        </div>

                        {selectedLevel ? (
                            <div className="space-y-4">
                               <h3 className="font-semibold text-lg">3. Enter Measured Values</h3>
                               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {Object.entries(formParams).map(([param, {mean, sd, unit}]) => {
                                    const numMean = parseFloat(mean);
                                    const numSd = parseFloat(sd);
                                    const lastValue = lastReportForLevel?.values[param];
                                    return (
                                        <div key={param} className="relative group">
                                            <label className="block text-sm font-medium text-gray-700">{param} <span className="text-gray-500">({unit})</span></label>
                                            <p className="text-xs text-muted-foreground">
                                            Range 2SD: {(!isNaN(numMean) && !isNaN(numSd) && numSd > 0) ? `${(numMean - 2 * numSd).toFixed(2)} - ${(numMean + 2 * numSd).toFixed(2)}` : 'N/A'}
                                            {lastValue !== undefined && ` | Last: ${lastValue}`}
                                            </p>
                                            <input type="number" step="any" value={inputValues[param] || ''} onChange={(e) => handleInputChange(param, e.target.value)} className="mt-1 w-full p-2 border border-border rounded-md" placeholder={`Value for ${param}`} />
                                            <Button type="button" variant="ghost" size="icon" className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleRemoveParam(param)}><X className="w-4 h-4 text-red-500" /></Button>
                                        </div>
                                    );
                                })}
                               </div>
                               <div className="pt-4 border-t flex flex-col sm:flex-row gap-2">
                                <Button type="submit" disabled={!canSubmit} className="w-full sm:w-auto flex-grow medical-gradient text-white">
                                    <Save className="w-4 h-4 mr-2" /> Save Control
                                </Button>
                                <Button type="button" variant="outline" onClick={handleAddManualParam} className="w-full sm:w-auto">
                                    <Plus className="w-4 h-4 mr-2" /> Add Parameter
                                </Button>
                               </div>
                            </div>
                        ) : (
                            <div className="text-center text-muted-foreground py-8">
                                <Sliders className="mx-auto w-12 h-12 text-gray-300 mb-4" />
                                <p>Select a level to view parameters.</p>
                            </div>
                        )}
                    </form>
                )}
            </div>
        </>
    );
};

export default LoadControlPage;