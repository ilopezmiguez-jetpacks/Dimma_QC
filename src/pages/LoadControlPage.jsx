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
    const { equipment, addQCReport } = useQCData();
    const { user } = useAuth();
    const { toast } = useToast();
    const location = useLocation();

    const [selectedEquipmentId, setSelectedEquipmentId] = useState('');
    const [selectedLevel, setSelectedLevel] = useState('');
    const [formParams, setFormParams] = useState({});
    const [inputValues, setInputValues] = useState({});
    const [lastReport, setLastReport] = useState(null);

    const currentEquipment = useMemo(() => equipment.find(e => e.id === selectedEquipmentId), [equipment, selectedEquipmentId]);
    const activeLot = useMemo(() => currentEquipment?.lots?.find(l => l.isActive), [currentEquipment]);

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


    const handleSubmit = (e) => {
        e.preventDefault();

        // Validation: Every parameter in formParams must have a non-empty value in inputValues
        const missingFields = Object.keys(formParams).some(param => !inputValues[param] || inputValues[param].toString().trim() === '');

        if (missingFields) {
            toast({
                title: "Error de Validación",
                description: "Todos los parámetros son obligatorios. Por favor complete todos los campos.",
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
            values: Object.fromEntries(Object.entries(inputValues).map(([k, v]) => [k, parseFloat(v) || null])),
            dailyDeviationThreshold: currentEquipment.dailyDeviationThreshold || 2,
        };

        const newReport = addQCReport(report);

        if (newReport) {
            toast({
                title: "Reporte QC Guardado",
                description: `El control para ${currentEquipment.name} ha sido registrado.`,
                variant: newReport.status === 'error' ? 'destructive' : 'default',
            });
            setInputValues({});
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

                    {currentEquipment && (
                        <div>
                            {activeLot ? (
                                <div className="flex items-center gap-2 text-sm bg-green-100 text-green-800 p-2 rounded-md">
                                    <CheckCircle className="w-5 h-5" />
                                    <span>Lote Activo: <span className="font-bold">{activeLot.lotNumber}</span> (Vence: {new Date(activeLot.expirationDate).toLocaleDateString('en-CA')})</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-sm bg-red-100 text-red-800 p-2 rounded-md">
                                    <AlertTriangle className="w-5 h-5" />
                                    <span>No hay lote activo. Active un lote en la configuración para continuar.</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {activeLot && (
                    <form onSubmit={handleSubmit} className="medical-card rounded-xl p-6 space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">2. Seleccionar Nivel de Control</label>
                            <div className="flex flex-wrap gap-2">
                                {Object.keys(activeLot.qc_params).map(level => (
                                    <Button key={level} type="button" variant={selectedLevel === level ? 'default' : 'outline'} onClick={() => setSelectedLevel(level)}>{level}</Button>
                                ))}
                            </div>
                        </div>

                        {selectedLevel ? (
                            <div className="space-y-4">
                                <h3 className="font-semibold text-lg">3. Ingresar Valores Medidos</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {Object.entries(formParams).map(([param, { mean, sd, unit }]) => {
                                        const numMean = parseFloat(mean);
                                        const numSd = parseFloat(sd);
                                        const lastValue = lastReport?.values?.[param];
                                        return (
                                            <div key={param} className="relative group">
                                                <label className="block text-sm font-medium text-gray-700">{param} <span className="text-gray-500">({unit})</span></label>
                                                <p className="text-xs text-muted-foreground">
                                                    Rango 2SD: {(!isNaN(numMean) && !isNaN(numSd) && numSd > 0) ? `${(numMean - 2 * numSd).toFixed(2)} - ${(numMean + 2 * numSd).toFixed(2)}` : 'N/A'}
                                                    {lastValue !== undefined && ` | Último: ${lastValue}`}
                                                </p>
                                                <input type="number" step="any" value={inputValues[param] || ''} onChange={(e) => handleInputChange(param, e.target.value)} className="mt-1 w-full p-2 border border-border rounded-md" placeholder={`Valor para ${param}`} />
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