import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import { useLocation } from 'react-router-dom';
import { useQCData } from '@/contexts/QCDataContext';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Save, AlertTriangle, CheckCircle, Sliders, ChevronDown } from 'lucide-react';
import { predefinedParams } from '@/lib/parameters';

const LoadControlPage = () => {
    const { equipment, addQCReport, parameters } = useQCData();
    const { user } = useAuth();
    const { toast } = useToast();
    const location = useLocation();

    const [selectedEquipmentId, setSelectedEquipmentId] = useState('');
    const [selectedLotId, setSelectedLotId] = useState('');
    const [selectedLevel, setSelectedLevel] = useState('');
    const [formParams, setFormParams] = useState({});
    const [allLevelsData, setAllLevelsData] = useState({});
    const [allLevelsNoAplica, setAllLevelsNoAplica] = useState({});
    const [lastReport, setLastReport] = useState(null);

    const currentEquipment = useMemo(() => equipment.find(e => e.id === selectedEquipmentId), [equipment, selectedEquipmentId]);
    const activeLots = useMemo(() => currentEquipment?.lots?.filter(l => l.isActive) || [], [currentEquipment]);
    const activeLot = useMemo(() => activeLots.find(l => l.id === selectedLotId), [activeLots, selectedLotId]);

    useEffect(() => {
        const fetchLastReport = async () => {
            if (selectedEquipmentId && activeLot && selectedLevel) {
                const { data } = await supabase
                    .from('qc_reports')
                    .select('values, date')
                    .eq('equipment_id', selectedEquipmentId)
                    .eq('lot_number', activeLot.lotNumber)
                    .eq('level', selectedLevel)
                    .order('date', { ascending: false })
                    .limit(1)
                    .maybeSingle();
                setLastReport(data || null);
            } else {
                setLastReport(null);
            }
        };
        fetchLastReport();
    }, [selectedEquipmentId, activeLot, selectedLevel]);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const equipmentIdFromQuery = params.get('equipmentId');
        if (equipmentIdFromQuery && equipment.some(e => e.id === equipmentIdFromQuery)) {
            setSelectedEquipmentId(equipmentIdFromQuery);
        } else if (equipment.length > 0) {
            setSelectedEquipmentId(equipment[0].id);
        }
    }, [location.search, equipment]);

    // Auto-select lot if there's only one active lot
    // Handle stale data: reset and alert if selected lot is no longer active
    useEffect(() => {
        if (activeLots.length === 1) {
            // Single lot: auto-select
            setSelectedLotId(activeLots[0].id);
        } else if (activeLots.length > 1) {
            // Multiple lots: check if current selection is still valid
            if (selectedLotId && !activeLots.some(lot => lot.id === selectedLotId)) {
                // Selected lot is no longer active - alert and reset
                toast({
                    title: "Lote Desactivado",
                    description: "El lote seleccionado ya no está activo. Por favor seleccione otro lote.",
                    variant: "destructive"
                });
                setSelectedLotId('');
            }
            // If no selection or selection is still valid, do nothing (user can choose)
        } else {
            // No active lots: reset selection
            setSelectedLotId('');
        }
    }, [activeLots, selectedLotId, toast]);

    useEffect(() => {
        if (activeLot && activeLot.qc_params) {
            const firstLevel = Object.keys(activeLot.qc_params)[0] || '';
            setSelectedLevel(firstLevel);
        } else {
            setSelectedLevel('');
        }
    }, [activeLot]);

    // Effect A: Update form schema when level changes (does NOT reset data)
    useEffect(() => {
        if (currentEquipment && selectedLevel && activeLot) {
            const lotParams = activeLot?.qc_params?.[selectedLevel] || {};
            const equipmentTypeParams = predefinedParams[currentEquipment.type]?.params || {};
            const combinedParams = { ...equipmentTypeParams, ...lotParams };
            setFormParams(combinedParams);
        } else {
            setFormParams({});
        }
    }, [currentEquipment, selectedLevel, activeLot]);

    // Effect B: Reset all data when equipment or lot changes
    useEffect(() => {
        setAllLevelsData({});
        setAllLevelsNoAplica({});
    }, [currentEquipment?.id, activeLot?.lotNumber]);

    const handleInputChange = (param, value) => {
        setAllLevelsData(prev => ({
            ...prev,
            [selectedLevel]: {
                ...prev[selectedLevel],
                [param]: value
            }
        }));
    };

    const handleNoAplicaChange = (param, isChecked) => {
        setAllLevelsNoAplica(prev => ({
            ...prev,
            [selectedLevel]: {
                ...prev[selectedLevel],
                [param]: isChecked
            }
        }));

        if (isChecked) {
            // Set value to 'N/A' when checkbox is checked
            setAllLevelsData(prev => ({
                ...prev,
                [selectedLevel]: {
                    ...prev[selectedLevel],
                    [param]: 'N/A'
                }
            }));
        } else {
            // Clear value when checkbox is unchecked
            setAllLevelsData(prev => ({
                ...prev,
                [selectedLevel]: {
                    ...prev[selectedLevel],
                    [param]: ''
                }
            }));
        }
    };


    const handleSubmit = async (e) => {
        e.preventDefault();

        const currentLevelData = allLevelsData[selectedLevel] || {};

        // Validation: Every parameter in formParams must have a non-empty value OR be 'N/A'
        const missingFields = Object.keys(formParams).some(param => {
            const value = currentLevelData[param];
            return !value || (value.toString().trim() === '' && value !== 'N/A');
        });

        if (missingFields) {
            toast({
                title: "Error de Validación",
                description: "Todos los parámetros son obligatorios. Por favor complete todos los campos o márquelos como 'No aplica'.",
                variant: 'destructive',
            });
            return;
        }

        const report = {
            equipmentId: selectedEquipmentId,
            lotNumber: activeLot.lotNumber,
            date: new Date().toISOString(),
            technician: user?.user_metadata?.full_name || 'Usuario Anónimo',
            level: selectedLevel,
            values: Object.fromEntries(Object.entries(currentLevelData).map(([k, v]) => [k, v === 'N/A' ? 'N/A' : (parseFloat(v) || null)])),
            dailyDeviationThreshold: currentEquipment.dailyDeviationThreshold || 2,
        };

        const newReport = await addQCReport(report);

        if (newReport) {
            if (newReport.status === 'ok') {
                toast({
                    title: "Reporte QC Guardado",
                    description: `El control para ${currentEquipment.name} ha sido registrado.`,
                    variant: 'default',
                });
            } else if (newReport.status === 'warning' || newReport.status === 'error') {
                toast({
                    title: "Control saved with Errors",
                    description: "Validation is blocked until corrected.",
                    variant: 'destructive',
                });
            }
            // Clear only the current level's data, preserving other levels
            setAllLevelsData(prev => ({ ...prev, [selectedLevel]: {} }));
            setAllLevelsNoAplica(prev => ({ ...prev, [selectedLevel]: {} }));
        } else {
            toast({
                title: "Error al Guardar",
                description: "No se ingresaron valores válidos. El reporte no fue guardado.",
                variant: 'destructive',
            });
        }
    };

    const canSubmit = Object.keys(formParams).length > 0;

    // Removed lastReportForLevel logic as we now fetch it on demand into 'lastReport' state

    return (
        <>
            <Helmet>
                <title>Load Daily Control - DIMMA QC</title>
            </Helmet>
            <div className="max-w-4xl mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Carga de Control Diario</h1>
                    <p className="text-gray-600 mt-1">Seleccione un equipo y registre los valores de control de calidad.</p>
                </div>

                <div className="medical-card rounded-xl p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">1. Seleccionar Equipo</label>
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

                    {currentEquipment && activeLots.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">2. Seleccionar Lote</label>
                            <div className="relative">
                                <select
                                    value={selectedLotId}
                                    onChange={e => setSelectedLotId(e.target.value)}
                                    className="w-full p-3 border rounded-md appearance-none"
                                >
                                    {activeLots.length > 1 && <option value="">-- Seleccione un lote --</option>}
                                    {activeLots.map(lot => (
                                        <option key={lot.id} value={lot.id}>
                                            {lot.lotNumber} (Vence: {new Date(lot.expirationDate).toLocaleDateString('es-ES')})
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                    )}

                    {currentEquipment && (
                        <div>
                            {activeLots.length > 0 ? (
                                selectedLotId && activeLot ? (
                                    <div className="flex items-center gap-2 text-sm bg-green-100 text-green-800 p-2 rounded-md">
                                        <CheckCircle className="w-5 h-5" />
                                        <span>Lote Seleccionado: <span className="font-bold">{activeLot.lotNumber}</span> (Vence: {new Date(activeLot.expirationDate).toLocaleDateString('es-ES')})</span>
                                    </div>
                                ) : (
                                    activeLots.length > 1 && (
                                        <div className="flex items-center gap-2 text-sm bg-yellow-100 text-yellow-800 p-2 rounded-md">
                                            <AlertTriangle className="w-5 h-5" />
                                            <span>Por favor seleccione un lote para continuar.</span>
                                        </div>
                                    )
                                )
                            ) : (
                                <div className="flex items-center gap-2 text-sm bg-red-100 text-red-800 p-2 rounded-md">
                                    <AlertTriangle className="w-5 h-5" />
                                    <span>No hay lote activo. Active un lote en la configuración para continuar.</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {activeLot && selectedLotId && (
                    <form onSubmit={handleSubmit} className="medical-card rounded-xl p-6 space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">3. Seleccionar Nivel de Control</label>
                            <div className="flex flex-wrap gap-2">
                                {Object.keys(activeLot.qc_params).map(level => (
                                    <Button key={level} type="button" variant={selectedLevel === level ? 'default' : 'outline'} onClick={() => setSelectedLevel(level)}>{level}</Button>
                                ))}
                            </div>
                        </div>

                        {selectedLevel ? (
                            <div className="space-y-4">
                                <h3 className="font-semibold text-lg">4. Ingresar Valores Medidos</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {parameters.filter(p => formParams[p.name]).map(p => {
                                        const param = p.name;
                                        const { mean, sd, unit } = formParams[param];
                                        const numMean = parseFloat(mean);
                                        const numSd = parseFloat(sd);
                                        const lastValue = lastReport?.values?.[param];
                                        const currentLevelData = allLevelsData[selectedLevel] || {};
                                        const currentLevelNoAplica = allLevelsNoAplica[selectedLevel] || {};
                                        const isNoAplica = currentLevelNoAplica[param] || false;
                                        return (
                                            <div key={param} className="relative group">
                                                <label className="block text-sm font-medium text-gray-700">{param} <span className="text-gray-500">({unit})</span></label>
                                                <p className="text-xs text-muted-foreground">
                                                    Rango 2SD: {(!isNaN(numMean) && !isNaN(numSd) && numSd > 0) ? `${(numMean - 2 * numSd).toFixed(2)} - ${(numMean + 2 * numSd).toFixed(2)}` : 'N/A'}
                                                    {lastValue !== undefined && ` | Último: ${lastValue}`}
                                                </p>
                                                <input
                                                    type="number"
                                                    step="any"
                                                    value={currentLevelData[param] || ''}
                                                    onChange={(e) => handleInputChange(param, e.target.value)}
                                                    disabled={isNoAplica}
                                                    className={`mt-1 w-full p-2 border border-border rounded-md ${isNoAplica ? 'opacity-50 bg-gray-100 cursor-not-allowed' : ''}`}
                                                    placeholder={`Valor para ${param}`}
                                                />
                                                <div className="flex items-center gap-2 mt-2">
                                                    <input
                                                        type="checkbox"
                                                        id={`noaplica-${selectedLevel}-${param}`}
                                                        checked={isNoAplica}
                                                        onChange={(e) => handleNoAplicaChange(param, e.target.checked)}
                                                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                                                    />
                                                    <label
                                                        htmlFor={`noaplica-${selectedLevel}-${param}`}
                                                        className="text-sm text-gray-600 cursor-pointer"
                                                    >
                                                        No aplica
                                                    </label>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="pt-4 border-t flex flex-col sm:flex-row gap-2">
                                    <Button type="submit" disabled={!canSubmit} className="w-full sm:w-auto flex-grow medical-gradient text-white">
                                        <Save className="w-4 h-4 mr-2" /> Guardar Control
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-muted-foreground py-8">
                                <Sliders className="mx-auto w-12 h-12 text-gray-300 mb-4" />
                                <p>Seleccione un nivel para ver los parámetros.</p>
                            </div>
                        )}
                    </form>
                )}
            </div>
        </>
    );
};

export default LoadControlPage;