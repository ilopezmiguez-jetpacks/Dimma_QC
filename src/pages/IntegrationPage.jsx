import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { Upload, Beaker, AlertTriangle, CheckCircle } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const IntegrationPage = () => {
  const { results, patients, equipment, updateResult } = useData();
  const { toast } = useToast();
  const [selectedEquipment, setSelectedEquipment] = useState('');
  const [rawData, setRawData] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [targetResultId, setTargetResultId] = useState('');

  const ionAnalyzers = equipment.filter(e => e.protocol === 'AadeeMiniISE');
  const ionResults = results.filter(r => r.testType === 'Iones' && r.status === 'processing');

  const parseAadeeMiniISE = (data) => {
    const lines = data.trim().split('\n');
    const result = {};
    lines.forEach(line => {
      const parts = line.split(':');
      if (parts.length === 2) {
        const key = parts[0].trim();
        const value = parseFloat(parts[1].trim());
        if (!isNaN(value)) {
          if (key.includes('Na')) result['Na+'] = value;
          if (key.includes('K')) result['K+'] = value;
          if (key.includes('Cl')) result['Cl-'] = value;
        }
      }
    });
    return result;
  };

  const handleParseData = () => {
    if (!selectedEquipment) {
      toast({ variant: 'destructive', title: 'Error', description: 'Por favor, selecciona un equipo.' });
      return;
    }
    
    const equipmentInfo = equipment.find(e => e.id === selectedEquipment);
    if (equipmentInfo.protocol === 'AadeeMiniISE') {
      const parsed = parseAadeeMiniISE(rawData);
      if (Object.keys(parsed).length > 0) {
        setParsedData(parsed);
        toast({ title: 'Datos procesados', description: 'Los datos del equipo han sido interpretados.' });
      } else {
        setParsedData(null);
        toast({ variant: 'destructive', title: 'Error de Formato', description: 'No se pudieron interpretar los datos. Revisa el formato.' });
      }
    }
  };

  const handleApplyData = () => {
    if (!parsedData || !targetResultId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Faltan datos procesados o un análisis de destino.' });
      return;
    }

    const targetResult = results.find(r => r.id === targetResultId);
    if (!targetResult) {
      toast({ variant: 'destructive', title: 'Error', description: 'Análisis de destino no encontrado.' });
      return;
    }

    const updatedData = { ...targetResult.data };
    Object.entries(parsedData).forEach(([key, value]) => {
      if (updatedData[key]) {
        updatedData[key].value = value.toString();
      }
    });

    updateResult(targetResult.id, { data: updatedData, status: 'completed' });
    toast({ title: 'Resultados Aplicados', description: `El análisis de ${targetResult.testType} ha sido actualizado y completado.` });
    setRawData('');
    setParsedData(null);
    setTargetResultId('');
  };

  return (
    <>
      <Helmet>
        <title>Integración de Equipos - LabClínico Pro</title>
        <meta name="description" content="Interfaz para la integración y recepción de datos de equipos de laboratorio." />
      </Helmet>

      <div className="space-y-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Integración de Equipos</h1>
          <p className="text-gray-600 mt-1">Recibe datos directamente de tus analizadores.</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="medical-card rounded-xl p-6 space-y-4">
            <h2 className="text-xl font-bold text-gray-800">Paso 1: Cargar Datos del Equipo</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Seleccionar Equipo</label>
              <select
                value={selectedEquipment}
                onChange={(e) => setSelectedEquipment(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg"
              >
                <option value="" disabled>Selecciona un analizador...</option>
                {ionAnalyzers.map(eq => <option key={eq.id} value={eq.id}>{eq.name} ({eq.model})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pegar Datos Crudos</label>
              <textarea
                rows="8"
                value={rawData}
                onChange={(e) => setRawData(e.target.value)}
                placeholder={`Ejemplo para Aadee mini ISE:\nNa+: 140.5\nK+: 4.2\nCl-: 101.0`}
                className="w-full p-3 border border-gray-300 rounded-lg font-mono text-sm"
              />
            </div>
            <Button onClick={handleParseData} className="w-full"><Upload className="w-4 h-4 mr-2" />Procesar Datos</Button>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="medical-card rounded-xl p-6 space-y-4">
            <h2 className="text-xl font-bold text-gray-800">Paso 2: Aplicar a un Análisis</h2>
            {parsedData ? (
              <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded-r-lg">
                <h3 className="font-semibold text-green-800 flex items-center"><CheckCircle className="w-5 h-5 mr-2" />Datos Interpretados</h3>
                <pre className="mt-2 text-sm text-green-700 bg-white p-2 rounded">{JSON.stringify(parsedData, null, 2)}</pre>
              </div>
            ) : (
              <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded-r-lg">
                <h3 className="font-semibold text-yellow-800 flex items-center"><AlertTriangle className="w-5 h-5 mr-2" />Esperando Datos</h3>
                <p className="text-sm text-yellow-700">Procesa los datos crudos para continuar.</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Análisis de Destino (Iones en Proceso)</label>
              <select
                value={targetResultId}
                onChange={(e) => setTargetResultId(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                disabled={!parsedData}
              >
                <option value="" disabled>Selecciona un análisis...</option>
                {ionResults.map(res => {
                  const patient = patients.find(p => p.id === res.patientId);
                  return <option key={res.id} value={res.id}>ID {res.id} - {patient?.name}</option>
                })}
              </select>
            </div>
            <Button onClick={handleApplyData} disabled={!parsedData || !targetResultId} className="w-full"><Beaker className="w-4 h-4 mr-2" />Aplicar Resultados</Button>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default IntegrationPage;