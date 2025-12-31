import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQCData } from './QCDataContext';
import { v4 as uuidv4 } from 'uuid';

const DataContext = createContext();

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData debe ser usado dentro de DataProvider');
  }
  return context;
};

const generateResultData = (type, patientSex = 'male') => {
    switch (type) {
        case 'Hematología':
        case 'Hemato':
            return {
                WBC: { value: '', unit: 'x10³/μL', ref: '4.0-11.0' },
                'LYM%': { value: '', unit: '%', ref: '20-45' },
                'MID%': { value: '', unit: '%', ref: '2-10' },
                'GRAN%': { value: '', unit: '%', ref: '50-75' },
                RBC: { value: '', unit: 'x10⁶/μL', ref: patientSex === 'female' ? '3.80-5.20' : '4.20-5.90' },
                HGB: { value: '', unit: 'g/dL', ref: patientSex === 'female' ? '12.0-16.0' : '13.0-17.0' },
                HCT: { value: '', unit: '%', ref: patientSex === 'female' ? '36.0-46.0' : '39.0-50.0' },
                MCV: { value: '', unit: 'fL', ref: '80.0-100.0' },
                MCH: { value: '', unit: 'pg', ref: '27.0-34.0' },
                MCHC: { value: '', unit: 'g/dL', ref: '32.0-36.0' },
                PLT: { value: '', unit: 'x10³/μL', ref: '150-450' },
                MPV: { value: '', unit: 'fL', ref: '7.4-10.4' },
                PDW: { value: '', unit: '%', ref: '10-18' },
                PCT: { value: '', unit: '%', ref: '0.15-0.40' },
            };
        case 'Iones':
            return {
                'Na+': { value: '', unit: 'mmol/L', ref: '136-145' },
                'K+': { value: '', unit: 'mmol/L', ref: '3.5-5.1' },
                'Cl-': { value: '', unit: 'mmol/L', ref: '98-107' },
                'Ca++': { value: '', unit: 'mg/dL', ref: '8.6-10.3' },
            };
        case 'Gases':
            return {
                pH: { value: '', unit: '', ref: '7.35-7.45' },
                pCO2: { value: '', unit: 'mmHg', ref: '35-45' },
                pO2: { value: '', unit: 'mmHg', ref: '80-100' },
                HCO3: { value: '', unit: 'mEq/L', ref: '22-26' },
            };
        case 'Química':
            return {
                GLU: { value: '', unit: 'mg/dL', ref: '70-110' },
                UREA: { value: '', unit: 'mg/dL', ref: '15-45' },
                CREATI: { value: '', unit: 'mg/dL', ref: '0.6-1.3' },
                COLEST: { value: '', unit: 'mg/dL', ref: 'entre 30 y 200' },
                'PROT. TOTAL': { value: '', unit: 'g/dL', ref: '6.0-8.3' },
                TGP: { value: '', unit: 'U/L', ref: '<40' },
            };
        case 'Coagulación':
            return {
                TP: { value: '', unit: 'seg', ref: '11-13.5' },
                AP: { value: '', unit: '%', ref: '70-120' },
                RIN: { value: '', unit: '', ref: '0.8-1.1' },
                KPTT: { value: '', unit: 'seg', ref: '25-35' },
            };
        default:
            return {};
    }
};

const initialSamplePatients = [
    { id: uuidv4(), dni: '12345678', name: 'Juan Carlos Pérez', birthDate: '1985-03-15', sex: 'male', phone: '11-4567-8901', email: 'juan.perez@email.com', address: 'Av. Corrientes 1234, CABA', obraSocial: 'OSDE', numeroAfiliado: '123456789', createdAt: new Date().toISOString(), status: 'active', type: 'guardia' },
    { id: uuidv4(), dni: '87654321', name: 'María Elena González', birthDate: '1992-07-22', sex: 'female', phone: '11-9876-5432', email: 'maria.gonzalez@email.com', address: 'Calle Falsa 567, Buenos Aires', obraSocial: 'Swiss Medical', numeroAfiliado: '987654321', createdAt: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), status: 'active', type: 'internado' },
    { id: uuidv4(), dni: '35874136', name: 'Cynthia Disogra', birthDate: '1990-05-20', sex: 'female', phone: '11-5555-6666', email: 'cynthia.disogra@email.com', address: 'Av. Santa Fe 3000, CABA', obraSocial: 'Galeno', numeroAfiliado: '1122334455', createdAt: new Date().toISOString(), status: 'active', type: 'externo' },
    { id: uuidv4(), dni: '28456789', name: 'Roberto Carlos', birthDate: '1978-11-02', sex: 'male', phone: '11-1234-5678', email: 'roberto.carlos@email.com', address: 'Av. de Mayo 800, CABA', obraSocial: 'PAMI', numeroAfiliado: '0987654321', createdAt: new Date().toISOString(), status: 'active', type: 'externo' }
];

export const DataProvider = ({ children }) => {
  const [patients, setPatients] = useState([]);
  const [results, setResults] = useState([]);
  const { equipment } = useQCData();

  useEffect(() => {
    const savedPatients = localStorage.getItem('labclinico_patients');
    const savedResults = localStorage.getItem('labclinico_results');

    if (savedPatients && savedResults && JSON.parse(savedPatients).length > 0) {
      setPatients(JSON.parse(savedPatients));
      setResults(JSON.parse(savedResults));
    } else {
      const patient1Id = initialSamplePatients[0].id;
      const patient2Id = initialSamplePatients[1].id;
      
      const initialSampleResults = [
        { id: uuidv4(), patientId: patient1Id, equipmentId: equipment[0]?.id, testType: 'Hematología', data: { ...generateResultData('Hemato', 'male'), WBC: { value: '7.8', unit: 'x10³/μL', ref: '4.0-11.0' } }, status: 'validated', createdAt: '2025-07-20T10:00:00Z', completedAt: '2025-07-20T12:30:00Z', validatedBy: 'admin@qclab.com', notes: 'Paciente refiere cansancio.', possibleDiagnosis: 'Sin particularidades', sampleExtractedBy: 'Téc. Carlos Rodríguez', sampleProcessedBy: 'Téc. Carlos Rodríguez' },
        { id: uuidv4(), patientId: patient2Id, equipmentId: equipment[1]?.id, testType: 'Química', data: { ...generateResultData('Química', 'female'), GLU: { value: '105', unit: 'mg/dL', ref: '70-110' } }, status: 'pending', createdAt: '2025-07-21T09:15:00Z', completedAt: null, validatedBy: null, notes: '', possibleDiagnosis: '', sampleExtractedBy: 'Téc. Laura Pausini', sampleProcessedBy: null },
        { id: uuidv4(), patientId: patient1Id, equipmentId: equipment[1]?.id, testType: 'Química', data: { ...generateResultData('Química', 'male'), COLEST: { value: '80', unit: 'mg/dL', ref: 'entre 30 y 200' } }, status: 'processing', createdAt: '2025-07-21T11:00:00Z', completedAt: null, validatedBy: null, notes: 'Muestra con leve hemólisis.', possibleDiagnosis: '', sampleExtractedBy: 'Téc. Carlos Rodríguez', sampleProcessedBy: 'Téc. Carlos Rodríguez' },
        { id: uuidv4(), patientId: patient2Id, equipmentId: equipment[3]?.id, testType: 'Iones', data: { ...generateResultData('Iones', 'female'), 'Na+': { value: '140', unit: 'mmol/L', ref: '136-145' } }, status: 'validated', createdAt: '2025-07-19T11:00:00Z', completedAt: '2025-07-19T13:00:00Z', validatedBy: 'bioquimico@qclab.com', notes: '', possibleDiagnosis: 'Equilibrio hidroelectrolítico normal', sampleExtractedBy: 'Téc. Laura Pausini', sampleProcessedBy: 'Téc. Laura Pausini' }
      ];
      
      setPatients(initialSamplePatients);
      setResults(initialSampleResults);
      localStorage.setItem('labclinico_patients', JSON.stringify(initialSamplePatients));
      localStorage.setItem('labclinico_results', JSON.stringify(initialSampleResults));
    }
  }, [equipment]);

  const addPatient = (patientData, order) => {
    let newPatient = { ...patientData };
    if (!newPatient.id) {
        newPatient = {
            ...patientData,
            id: uuidv4(),
            createdAt: new Date().toISOString(),
            status: 'active'
        };
        const updatedPatients = [...patients, newPatient];
        setPatients(updatedPatients);
        localStorage.setItem('labclinico_patients', JSON.stringify(updatedPatients));
    }

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
                if(type === 'Gases') testType = 'Gases en Sangre';
                if(type === 'Hemato') testType = 'Hematología';
            }

            if(shouldCreate) {
                const newResult = {
                    id: uuidv4(),
                    patientId: newPatient.id,
                    equipmentId: equipment[0]?.id,
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
                };
                newResults.push(newResult);
            }
        });

        if (newResults.length > 0) {
            const updatedResults = [...results, ...newResults];
            setResults(updatedResults);
            localStorage.setItem('labclinico_results', JSON.stringify(updatedResults));
        }
    }

    return newPatient;
  };

  const updatePatient = (id, updatedData) => {
    const updatedPatients = patients.map(patient =>
      patient.id === id ? { ...patient, ...updatedData } : patient
    );
    setPatients(updatedPatients);
    localStorage.setItem('labclinico_patients', JSON.stringify(updatedPatients));
  };
  
  const addResult = (result) => {
    const newResult = {
      ...result,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      status: 'pending',
      possibleDiagnosis: ''
    };
    const updatedResults = [...results, newResult];
    setResults(updatedResults);
    localStorage.setItem('labclinico_results', JSON.stringify(updatedResults));
    return newResult;
  };

  const updateResult = (id, updatedData) => {
    const updatedResults = results.map(result =>
      result.id === id ? { ...result, ...updatedData } : result
    );
    setResults(updatedResults);
    localStorage.setItem('labclinico_results', JSON.stringify(updatedResults));
  };

  const value = {
    patients,
    results,
    equipment,
    addPatient,
    updatePatient,
    addResult,
    updateResult,
    generateResultData,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};