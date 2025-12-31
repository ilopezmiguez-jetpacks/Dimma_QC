import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { Beaker, Search, Filter, PlayCircle, Eye, AlertCircle } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"


const SamplesPage = () => {
  const { results, patients, updateResult } = useData();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');

  const samples = results.filter(r => r.status === 'pending' || r.status === 'processing');

  const filteredSamples = samples.filter(sample => {
    const patient = patients.find(p => p.id === sample.patientId);
    if (!patient) return false;
    
    const matchesSearch = patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patient.dni.includes(searchTerm) ||
                         sample.testType.toLowerCase().includes(searchTerm.toLowerCase());
                         
    const matchesStatus = statusFilter === 'all' || sample.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleStartProcessing = (resultId) => {
    updateResult(resultId, { status: 'processing' });
    toast({
      title: "Procesamiento iniciado",
      description: "La muestra ha pasado a estado de procesamiento.",
    });
  };
  
  const getStatusInfo = (status) => {
    switch (status) {
      case 'pending': return { text: 'Pendiente', color: 'text-yellow-600', bg: 'bg-yellow-100' };
      case 'processing': return { text: 'Procesando', color: 'text-blue-600', bg: 'bg-blue-100' };
      default: return { text: 'Desconocido', color: 'text-gray-600', bg: 'bg-gray-100' };
    }
  };

  return (
    <>
      <Helmet>
        <title>Gestión de Muestras - LabClínico Pro</title>
        <meta name="description" content="Centro de trabajo para la gestión y procesamiento de muestras de laboratorio." />
      </Helmet>

      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Gestión de Muestras</h1>
          <p className="text-gray-600 mt-1">Centro de trabajo para procesar análisis pendientes.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="medical-card rounded-xl p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar por paciente, DNI..."
                className="pl-10 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="all">Todos</option>
              <option value="pending">Pendientes</option>
              <option value="processing">En Proceso</option>
            </select>
          </div>
        </motion.div>
        
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paciente</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Análisis</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Pedido</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSamples.map(sample => {
                const patient = patients.find(p => p.id === sample.patientId);
                const statusInfo = getStatusInfo(sample.status);
                return (
                  <motion.tr key={sample.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{patient?.name}</div>
                      <div className="text-sm text-gray-500">DNI: {patient?.dni}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{sample.testType}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(sample.createdAt).toLocaleString('es-AR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusInfo.bg} ${statusInfo.color}`}>
                        {statusInfo.text}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium space-x-2">
                       <Button variant="outline" size="sm" onClick={() => navigate(`/resultados/${sample.id}`)}>
                         <Eye className="w-4 h-4 mr-2" />
                         Ver / Cargar
                       </Button>
                       {sample.status === 'pending' && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                              <PlayCircle className="w-4 h-4 mr-2"/>
                              Procesar
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle className="flex items-center"><AlertCircle className="text-yellow-500 mr-2"/>¿Iniciar procesamiento?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción cambiará el estado de la muestra a "Procesando". No podrá revertirse.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleStartProcessing(sample.id)}>
                                Sí, iniciar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                       )}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
         {filteredSamples.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center p-12 bg-white rounded-lg shadow">
                <Beaker className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900">No hay muestras que coincidan</h3>
                <p className="text-gray-600">Parece que no hay muestras con los filtros seleccionados, ¡o todo el trabajo está hecho!</p>
            </motion.div>
        )}
      </div>
    </>
  );
};

export default SamplesPage;