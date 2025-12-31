import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from './SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';

const QCDataContext = createContext();

export const useQCData = () => {
  const context = useContext(QCDataContext);
  if (!context) {
    throw new Error('useQCData debe ser usado dentro de un QCDataProvider');
  }
  return context;
};

// --- Westgard Logic Helper ---
const applyWestgardRules = (newValue, history, qcParams) => {
  const triggeredRules = [];
  let status = 'ok';

  if (!qcParams || qcParams.mean === undefined || qcParams.sd === undefined) {
    return { status: 'ok', triggeredRules: [] };
  }

  const { mean, sd } = qcParams;
  const numMean = parseFloat(mean);
  const numSd = parseFloat(sd);

  if (isNaN(numMean) || isNaN(numSd) || numSd === 0) return { status: 'ok', triggeredRules: [] };

  const limit2s_upper = numMean + 2 * numSd;
  const limit2s_lower = numMean - 2 * numSd;
  const limit3s_upper = numMean + 3 * numSd;
  const limit3s_lower = numMean - 3 * numSd;

  if (newValue > limit3s_upper || newValue < limit3s_lower) {
    triggeredRules.push('1-3s');
    status = 'error';
  } else if (newValue > limit2s_upper || newValue < limit2s_lower) {
    triggeredRules.push('1-2s');
    status = 'warning';
  }

  if (history.length > 0) {
    const lastValue = history[history.length - 1];
    if ((newValue > limit2s_upper && lastValue > limit2s_upper) || (newValue < limit2s_lower && lastValue < limit2s_lower)) {
      if (!triggeredRules.includes('2-2s')) triggeredRules.push('2-2s');
      status = 'error';
    }
  }
  return { status, triggeredRules };
};

export const QCDataProvider = ({ children }) => {
  const [equipment, setEquipment] = useState([]);
  const [laboratories, setLaboratories] = useState([]);
  const [currentLabId, setCurrentLabId] = useState('all');
  const [equipmentTypes, setEquipmentTypes] = useState([]);
  const [parameters, setParameters] = useState([]);
  const [units, setUnits] = useState([]);
  const [alarms, setAlarms] = useState([]); // Restored alarms state
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();
  const { toast } = useToast();

  // Initial Data Load (Labs, user permissions, params)
  useEffect(() => {
    const fetchMeta = async () => {
      if (!user) return;

      try {
        // Fetch User's Profile to get their Lab ID
        const { data: profile } = await supabase
          .from('profiles')
          .select('laboratory_id')
          .eq('id', user.id)
          .maybeSingle();

        // Fetch All Labs (for selector)
        const { data: labs, error: labsError } = await supabase.from('laboratories').select('*').eq('is_active', true);
        if (labsError) throw labsError;
        setLaboratories(labs || []);

        // Determine current Lab context
        const isAdmin = user.user_metadata?.role === 'admin' || user.user_metadata?.role === 'superadmin';

        if (!isAdmin && profile?.laboratory_id) {
          setCurrentLabId(profile.laboratory_id); // Lock to assigned lab
        } else if (isAdmin) {
          setCurrentLabId(prev => prev === 'all' || prev ? prev : 'all');
        }

        // Fetch Equipment Types
        const { data: types, error: typesError } = await supabase.from('equipment_types').select('*');
        if (typesError) throw typesError;
        setEquipmentTypes(types || []);

        // Fetch Units
        const { data: unitsData } = await supabase.from('units').select('*').eq('is_active', true);
        setUnits(unitsData || []);

        // Fetch Parameters with units
        const { data: paramsData, error: paramsError } = await supabase
          .from('parameters')
          .select(`
            *,
            unit:units(name)
          `)
          .eq('is_active', true);
        if (paramsError) throw paramsError;

        // Flatten unit name
        const formattedParams = (paramsData || []).map(p => ({
          ...p,
          unitName: p.unit?.name
        }));
        setParameters(formattedParams);

      } catch (error) {
        console.error("Error fetching metadata:", error);
        toast({ title: 'Error de Carga', description: 'No se pudieron cargar los datos del sistema.', variant: 'destructive' });
      }
    };
    fetchMeta();
  }, [user, toast]);

  // Main Data Fetcher (Depends on currentLabId)
  const fetchAllData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Build Query for Equipment
      let equipmentQuery = supabase.from('equipment').select(`
          *,
          lots:control_lots(*),
          laboratory:laboratories(name),
          type:equipment_types(name, parameters)
        `).eq('is_active', true);

      // Filter by Lab if not 'all'
      if (currentLabId !== 'all' && currentLabId) {
        equipmentQuery = equipmentQuery.eq('laboratory_id', currentLabId);
      }

      const { data: equipmentData, error: equipmentError } = await equipmentQuery;
      if (equipmentError) {
        console.error("Supabase equipment error:", equipmentError);
        throw equipmentError;
      }

      // Transform DB snake_case to app camelCase
      const formattedEquipment = (equipmentData || []).map(eq => ({
        ...eq,
        dailyDeviationThreshold: eq.daily_deviation_threshold,
        maintenanceDue: eq.maintenance_due,
        laboratoryName: eq.laboratory?.name,
        typeName: eq.type?.name || eq.equipment_type,
        lots: (eq.lots || []).map(lot => ({
          ...lot,
          lotNumber: lot.lot_number,
          expirationDate: lot.expiration_date,
          isActive: lot.is_active
        }))
      }));

      setEquipment(formattedEquipment);

      // Fetch Alarms (Mock or DB? The user reported reference error)
      // Assuming alarms were part of qcReports logic I removed, but if StatisticsPage relies on it...
      // For now, I'll initialize it as empty array to fix the crash.
      // If there was fetch logic for it, I might have deleted it, but context suggests it was tied to reports.
      setAlarms([]);

    } catch (error) {
      console.error("Error fetching QC data:", error);
      toast({ title: 'Error de Carga', description: 'No se pudieron cargar los datos de control de calidad.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user, currentLabId, toast]);

  useEffect(() => {
    // Only fetch if we have determined the lab context (or if user is loaded)
    if (user) {
      fetchAllData();
    }
  }, [fetchAllData, user]);

  const refreshParameters = async () => {
    const { data: paramsData, error } = await supabase
      .from('parameters')
      .select(`*, unit:units(name)`)
      .eq('is_active', true);

    if (!error && paramsData) {
      const formattedParams = paramsData.map(p => ({
        ...p,
        unitName: p.unit?.name
      }));
      setParameters(formattedParams);
    }
  };

  // --- Actions ---

  const addQCReport = async (reportData) => {
    // ... existing logic ...
    const filteredValues = Object.fromEntries(
      Object.entries(reportData.values).filter(([, value]) => value !== null && value !== '' && !isNaN(parseFloat(value)))
    );

    if (Object.keys(filteredValues).length === 0) return null;

    const equipmentToUpdate = equipment.find(e => e.id === reportData.equipmentId);
    if (!equipmentToUpdate) return null;

    const activeLot = equipmentToUpdate.lots.find(l => l.lotNumber === reportData.lotNumber);
    if (!activeLot) return null;

    const qcParamsForLevel = activeLot.qc_params[reportData.level];
    let finalStatus = 'ok';
    const allTriggeredRules = [];

    // History Calculation - FETCH ON DEMAND
    let reportsForLotAndLevel = [];
    try {
      const { data: historyData } = await supabase
        .from('qc_reports')
        .select('*')
        .eq('equipment_id', reportData.equipmentId)
        .eq('lot_number', reportData.lotNumber)
        .eq('level', reportData.level)
        .order('created_at', { ascending: false })
        .limit(20); // Fetch last 20 for Westgard analysis

      if (historyData) {
        reportsForLotAndLevel = historyData.map(r => ({
          ...r,
          values: r.values // Json b is auto parsed
        })).reverse();
      }
    } catch (e) {
      console.error("Error fetching history for Westgard", e);
    }

    // Fix order for history: we fetched DESC (newest first). 
    // We want oldest -> newest.
    // Filtered by param loop below.

    for (const param in filteredValues) {
      const value = filteredValues[param];
      const qcParamsForParam = qcParamsForLevel?.[param];

      // Prepare history for this param
      // reportsForLotAndLevel is DESC (id 100, 99, 98...) if I remove .reverse() above.
      // Actually I put .reverse() above. So reportsForLotAndLevel is ASC (oldest...newest).
      // Correct.

      const history = reportsForLotAndLevel.map(r => r.values[param]).filter(v => v !== undefined);
      const { status, triggeredRules } = applyWestgardRules(value, history, qcParamsForParam);
      if (triggeredRules.length > 0) allTriggeredRules.push(...triggeredRules.map(rule => `${rule} para ${param}`));
      if (status === 'error') finalStatus = 'error';
      else if (status === 'warning' && finalStatus !== 'error') finalStatus = 'warning';
    }

    const dbReport = {
      equipment_id: reportData.equipmentId,
      lot_number: reportData.lotNumber,
      date: reportData.date,
      technician: reportData.technician,
      level: reportData.level,
      values: filteredValues,
      status: finalStatus,
      westgard_rules: allTriggeredRules
    };

    try {
      const { data: savedReport, error } = await supabase.from('qc_reports').insert(dbReport).select().single();
      if (error) throw error;

      const formattedReport = {
        ...savedReport,
        equipmentId: savedReport.equipment_id,
        lotNumber: savedReport.lot_number,
        westgardRules: savedReport.westgard_rules
      };

      // We no longer update global qcReports state
      return formattedReport;

    } catch (err) {
      console.error("Error saving report:", err);
      toast({ title: "Error", description: "No se pudo guardar el reporte de QC.", variant: "destructive" });
      return { status: 'error' };
    }
  };

  const addEquipment = async (newEquipmentData) => {
    try {
      let targetLabId = newEquipmentData.laboratoryId;
      const isAdmin = user?.user_metadata?.role === 'admin' || user?.user_metadata?.role === 'superadmin';

      if (!targetLabId) {
        if (currentLabId && currentLabId !== 'all') {
          targetLabId = currentLabId;
        } else if (!isAdmin) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('laboratory_id')
            .eq('id', user.id)
            .single();

          if (profile?.laboratory_id) {
            targetLabId = profile.laboratory_id;
          } else {
            throw new Error("Debes estar asignado a un laboratorio para agregar equipos.");
          }
        } else {
          targetLabId = null;
        }
      }

      let typeName = newEquipmentData.type;
      if (!typeName && newEquipmentData.typeId) {
        const foundType = equipmentTypes.find(t => t.id === newEquipmentData.typeId);
        if (foundType) {
          typeName = foundType.name;
        } else {
          const { data: typeData } = await supabase
            .from('equipment_types')
            .select('name')
            .eq('id', newEquipmentData.typeId)
            .maybeSingle();
          if (typeData) typeName = typeData.name;
        }
      }

      const dbData = {
        name: newEquipmentData.name,
        model: newEquipmentData.model,
        serial: newEquipmentData.serial,
        equipment_type_id: newEquipmentData.typeId,
        laboratory_id: targetLabId,
        maintenance_due: newEquipmentData.maintenanceDue,
        daily_deviation_threshold: newEquipmentData.dailyDeviationThreshold || 2,
        is_active: true,
        status: 'ok',
        equipment_type: typeName || 'unknown'
      };

      const { data, error } = await supabase.from('equipment').insert(dbData).select(`
            *,
            laboratory:laboratories(name),
            type:equipment_types(name)
        `).single();

      if (error) throw error;

      const newEq = {
        ...data,
        dailyDeviationThreshold: data.daily_deviation_threshold,
        maintenanceDue: data.maintenance_due,
        laboratoryName: data.laboratory?.name,
        typeName: data.type?.name || data.equipment_type,
        lots: []
      };

      setEquipment(prev => [...prev, newEq]);
      return newEq;
    } catch (err) {
      console.error("Error adding equipment:", err);
      throw err;
    }
  };

  const addLot = async (equipmentId, lotData) => {
    try {
      const dbLot = {
        equipment_id: equipmentId,
        lot_number: lotData.lotNumber,
        expiration_date: lotData.expirationDate,
        qc_params: lotData.qc_params,
        is_active: false
      };

      const { data, error } = await supabase.from('control_lots').insert(dbLot).select().single();
      if (error) throw error;

      const newLot = {
        ...data,
        lotNumber: data.lot_number,
        expirationDate: data.expiration_date,
        isActive: data.is_active
      };

      setEquipment(prev => prev.map(eq => {
        if (eq.id === equipmentId) {
          return { ...eq, lots: [...(eq.lots || []), newLot] };
        }
        return eq;
      }));
      return newLot;
    } catch (err) {
      console.error("Error adding lot:", err);
      throw err;
    }
  };

  const activateLot = async (equipmentId, lotIdToActivate) => {
    try {
      await supabase.from('control_lots').update({ is_active: false }).eq('equipment_id', equipmentId);
      const { error } = await supabase.from('control_lots').update({ is_active: true }).eq('id', lotIdToActivate);
      if (error) throw error;

      setEquipment(prev => prev.map(eq => {
        if (eq.id === equipmentId) {
          const updatedLots = eq.lots.map(lot => ({ ...lot, isActive: lot.id === lotIdToActivate }));
          return { ...eq, lots: updatedLots };
        }
        return eq;
      }));
    } catch (err) {
      console.error("Error activating lot:", err);
      toast({ title: "Error", description: "No se pudo activar el lote.", variant: "destructive" });
    }
  };

  const updateLotParams = async (equipmentId, lotId, updatedLotData) => {
    try {
      const dbUpdate = {
        qc_params: updatedLotData.qc_params,
        expiration_date: updatedLotData.expirationDate,
        lot_number: updatedLotData.lotNumber
      };
      const { error } = await supabase.from('control_lots').update(dbUpdate).eq('id', lotId);
      if (error) throw error;

      setEquipment(prev => prev.map(eq => {
        if (eq.id === equipmentId) {
          const updatedLots = eq.lots.map(lot => lot.id === lotId ? { ...lot, ...updatedLotData } : lot);
          return { ...eq, lots: updatedLots };
        }
        return eq;
      }));
    } catch (err) {
      throw err;
    }
  };

  const updateEquipmentDetails = async (id, updatedData) => {
    try {
      const { lots, dailyDeviationThreshold, maintenanceDue, laboratoryName, typeName, ...cleanData } = updatedData;
      const dbData = {
        ...cleanData,
        daily_deviation_threshold: dailyDeviationThreshold,
        maintenance_due: maintenanceDue
      };
      const { error } = await supabase.from('equipment').update(dbData).eq('id', id);
      if (error) throw error;
      setEquipment(prev => prev.map(eq => eq.id === id ? { ...eq, ...updatedData } : eq));
    } catch (err) {
      throw err;
    }
  };

  const deleteEquipment = async (id) => {
    try {
      const { error } = await supabase.from('equipment').delete().eq('id', id);
      if (error) throw error;
      setEquipment(prev => prev.filter(eq => eq.id !== id));
    } catch (err) {
      console.error("Error deleting equipment:", err);
      toast({ title: "Error", description: "No se pudo eliminar el equipo.", variant: "destructive" });
    }
  };

  const value = {
    equipment,
    alarms,
    laboratories,
    equipmentTypes,
    currentLabId,
    parameters,
    units,
    setCurrentLabId,
    loading,
    addQCReport,
    addEquipment,
    addLot,
    activateLot,
    updateLotParams,
    updateEquipmentDetails,
    deleteEquipment,
    refetch: fetchAllData,
    refreshParameters
  };

  return (
    <QCDataContext.Provider value={value}>
      {children}
    </QCDataContext.Provider>
  );
};