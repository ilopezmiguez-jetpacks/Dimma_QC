import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useQCData } from './QCDataContext';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from './SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';

const DataContext = createContext();

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData debe ser usado dentro de DataProvider');
  }
  return context;
};

export const DataProvider = ({ children }) => {
  const [patients, setPatients] = useState([]);
  const [results, setResults] = useState([]);
  const [parameters, setParameters] = useState([]); // Store fetched parameters
  const [loading, setLoading] = useState(false);

  const { equipment } = useQCData();
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    if (!user) {
      setPatients([]);
      setResults([]);
      setParameters([]);
      return;
    }

    setLoading(true);
    patientsQuery = patientsQuery.eq('laboratory_id', userLabId);
  }

        const { data: patientsData, error: patientsError } = await patientsQuery;

  if (patientsError) throw patientsError;

  // 2. Fetch Results (Filtered by available patients if restricted)
  let resultsQuery = supabase
    .from('analysis_results')
    .select('*')
    .order('createdAt', { ascending: false });

  if (!isAdmin && patientsData?.length > 0) {
    // Only fetch results for the patients we can see
    const patientIds = patientsData.map(p => p.id);
    resultsQuery = resultsQuery.in('patientId', patientIds);
  } else if (!isAdmin) {
    // If no patients found (and not admin), we shouldn't see any results either
    // Or strictly filter by empty set if patientsData is empty
    // However, simplest way effectively is to just return empty results if no patients
    if (!patientsData || patientsData.length === 0) {
      setPatients([]);
      setResults([]);
      setParameters([]); // Or keep params
      return;
    }
  }

  const { data: resultsData, error: resultsError } = await resultsQuery;

  if (resultsError) throw resultsError;

  // Fetch parameters with units
  const { data: paramsData, error: paramsError } = await supabase
    .from('parameters')
    .select('*, units(name)');

  if (paramsError) throw paramsError;

  setPatients(patientsData || []);
  setResults(resultsData || []);
  setParameters(paramsData || []);

} catch (error) {
  console.error("Error fetching clinical data:", error);
  toast({
    variant: "destructive",
    title: "Error cargando datos",
    description: "No se pudieron cargar los datos clínicos.",
  });
} finally {
  setLoading(false);
}
    }, [user, toast]);

useEffect(() => {
  fetchData();
}, [fetchData]);

// Dynamic generateResultData using fetched parameters
const generateResultData = useCallback((type, patientSex = 'male') => {
  const typeParams = parameters.filter(p => p.equipment_type === type);

  const resultData = typeParams.reduce((acc, param) => {
    acc[param.code] = {
      value: '',
      unit: param.units?.name || '',
      ref: param.reference_range || ''
    };
    return acc;
  }, {});

  return resultData;
}, [parameters]);

const addPatient = async (patientData, order) => {
  try {
    const patientToInsert = {
      ...patientData,
      createdAt: new Date().toISOString(),
      status: 'active',
      laboratory_id: user.profile?.laboratory_id // Auto-assign lab
    };

    // Remove id if it's explicitly null/undefined to let DB generate it
    if (!patientToInsert.id) delete patientToInsert.id;

    const { data: newPatient, error: patientError } = await supabase
      .from('patients')
      .insert(patientToInsert)
      .select()
      .single();

    if (patientError) throw patientError;

    setPatients(prev => [newPatient, ...prev]);

    if (order) {
      const newResults = [];

      Object.entries(order).forEach(([type, isOrdered]) => {
        if (type === 'notes' || !isOrdered) return;

        let shouldCreate = false;
        let testType = type;
        if (type === 'Química' && isOrdered.checked) {
          shouldCreate = true;
        } else if (type !== 'Química' && isOrdered) {
          shouldCreate = true;
          if (type === 'Gases') testType = 'Gases en Sangre';
          if (type === 'Hemato') testType = 'Hematología';
        }

        if (shouldCreate) {
          newResults.push({
            patientId: newPatient.id,
            equipmentId: equipment[0]?.id, // Defaulting to first equipment logic from legacy
            testType: testType,
            data: generateResultData(testType, newPatient.sex),
            status: 'pending',
            createdAt: new Date().toISOString(),
            completedAt: null,
            validatedBy: null,
            reviewedBy: null,
            notes: order.notes || '',
            possibleDiagnosis: '',
            sampleExtractedBy: null,
            sampleProcessedBy: null,
          });
        }
      });

      if (newResults.length > 0) {
        const { data: insertedResults, error: resultsError } = await supabase
          .from('analysis_results')
          .insert(newResults)
          .select();

        if (resultsError) throw resultsError;

        setResults(prev => [...prev, ...insertedResults]);
      }
    }

    return newPatient;

  } catch (error) {
    console.error("Error adding patient/results:", error);
    toast({
      variant: "destructive",
      title: "Error al crear",
      description: "Hubo un error al guardar el paciente o sus pedidos.",
    });
    throw error;
  }
};

const updatePatient = async (id, updatedData) => {
  try {
    const { data: updatedPatient, error } = await supabase
      .from('patients')
      .update(updatedData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    setPatients(prev => prev.map(p => p.id === id ? updatedPatient : p));
    return updatedPatient;
  } catch (error) {
    console.error("Error updating patient:", error);
    toast({
      variant: "destructive",
      title: "Error al actualizar",
      description: "No se pudo actualizar el paciente.",
    });
    throw error;
  }
};

const addResult = async (result) => {
  try {
    const resultToInsert = {
      ...result,
      createdAt: new Date().toISOString(),
      status: 'pending',
      possibleDiagnosis: result.possibleDiagnosis || ''
    };
    // Ensure we don't send a fake ID if one was passed locally (or let DB handle it)
    if (!resultToInsert.id) delete resultToInsert.id;

    const { data: newResult, error } = await supabase
      .from('analysis_results')
      .insert(resultToInsert)
      .select()
      .single();

    if (error) throw error;

    setResults(prev => [...prev, newResult]);
    return newResult;
  } catch (error) {
    console.error("Error adding result:", error);
    toast({
      variant: "destructive",
      title: "Error al agregar resultado",
      description: "No se pudo crear el resultado.",
    });
    throw error;
  }
};

const updateResult = async (id, updatedData) => {
  try {
    const { data: updatedResult, error } = await supabase
      .from('analysis_results')
      .update(updatedData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    setResults(prev => prev.map(r => r.id === id ? updatedResult : r));
    return updatedResult;
  } catch (error) {
    console.error("Error updating result:", error);
    toast({
      variant: "destructive",
      title: "Error al actualizar",
      description: "No se pudo actualizar el resultado.",
    });
    throw error;
  }
};

const value = {
  patients,
  results,
  equipment, // Passed through from QCData
  addPatient,
  updatePatient,
  addResult,
  updateResult,
  generateResultData,
  loading
};

return (
  <DataContext.Provider value={value}>
    {children}
  </DataContext.Provider>
);
};