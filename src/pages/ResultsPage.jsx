import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import {
  Search,
  FileText,
  Check,
  Users,
  History,
  BrainCircuit,
  Eye
} from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const ResultsPage = () => {
  const { results, patients, updateResult } = useData();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const status = params.get('status');
    const date = params.get('date');
    if (status) setStatusFilter(status);
    if (date) setDateFilter(date);
  }, [location.search]);

  const filteredResults = results.filter(result => {
    const patient = patients.find(p => p.id === result.patientId);
    if (!patient) return false;
    const matchesSearch = patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.dni.includes(searchTerm) ||
      result.testType?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || result.status === statusFilter;
    const matchesDate = !dateFilter || result.createdAt.startsWith(dateFilter);

    return matchesSearch && matchesStatus && matchesDate;
  });

  const getStatusInfo = (status) => {
    switch (status) {
      case 'pending': return { text: 'Pendiente', color: 'bg-yellow-100 text-yellow-800' };
      case 'processing': return { text: 'Procesando', color: 'bg-blue-100 text-blue-800' };
      case 'completed': return { text: 'Completo', color: 'bg-orange-100 text-orange-800' };
      case 'revisado': return { text: 'Pend. Validación', color: 'bg-indigo-100 text-indigo-800' };
      case 'validated': return { text: 'Validado', color: 'bg-purple-100 text-purple-800' };
      default: return { text: 'Desconocido', color: 'bg-gray-100 text-gray-800' };
    }
  };

  const handleValidateResult = (resultId) => {
    updateResult(resultId, { status: 'validated', validatedBy: user?.profile?.full_name || user?.email || 'Desconocido' });
    toast({
      title: "Resultado Validado",
      description: "El resultado ha sido validado exitosamente.",
    });
  };

  const ResultCard = ({ result }) => {
    const patient = patients.find(p => p.id === result.patientId);
    const patientHistory = results.filter(r => r.patientId === result.patientId && r.id !== result.id && r.status === 'validated').slice(0, 2);
    const canValidate = user && result.status === 'revisado';
    const statusInfo = getStatusInfo(result.status);

    if (!patient) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="medical-card rounded-xl p-6 hover:shadow-lg transition-all duration-300 flex flex-col"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{patient.name}</h3>
              <p className="text-sm text-gray-500">DNI: {patient.dni}</p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center justify-center min-w-[120px] ${statusInfo.color}`}>
            {statusInfo.text}
          </span>
        </div>

        <div className="space-y-3 mb-4 flex-grow">
          <div>
            <p className="text-sm font-medium text-gray-700">Tipo de Análisis</p>
            <p className="text-gray-900 font-semibold">{result.testType || 'No especificado'}</p>
          </div>
          {result.possibleDiagnosis && (
            <div className="p-3 bg-indigo-50 border-l-4 border-indigo-400 rounded-r-lg">
              <p className="text-sm font-medium text-indigo-800 flex items-center"><BrainCircuit className="w-4 h-4 mr-2" />Posible Diagnóstico:</p>
              <p className="text-sm text-indigo-700 font-semibold">{result.possibleDiagnosis}</p>
            </div>
          )}
          {patientHistory.length > 0 && (
            <div className="p-3 bg-gray-50 border-l-4 border-gray-300 rounded-r-lg">
              <p className="text-sm font-medium text-gray-800 flex items-center"><History className="w-4 h-4 mr-2" />Historial Reciente:</p>
              <ul className="list-disc list-inside text-sm text-gray-600 mt-1">
                {patientHistory.map(hist => <li key={hist.id}>{hist.testType} ({new Date(hist.createdAt).toLocaleDateString('es-AR')})</li>)}
              </ul>
            </div>
          )}
          {result.notes && (
            <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg">
              <p className="text-sm font-medium text-yellow-800">Nota:</p>
              <p className="text-sm text-yellow-700">{result.notes}</p>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-gray-200">
          <Button variant="outline" size="sm" onClick={() => navigate(`/resultados/${result.id}`)}>
            <Eye className="w-4 h-4 mr-2" />
            Ver Informe
          </Button>

          {canValidate && (
            <Button onClick={() => handleValidateResult(result.id)} size="sm" className="bg-green-600 hover:bg-green-700 text-white">
              <Check className="w-4 h-4 mr-2" />
              Validar
            </Button>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <>
      <Helmet>
        <title>Resultados - DIMMA QC</title>
        <meta name="description" content="Gestión de resultados de análisis clínicos." />
      </Helmet>

      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Resultados de Análisis</h1>
          <p className="text-gray-600 mt-1">Gestiona todos los resultados de análisis clínicos</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="medical-card rounded-xl p-4 md:p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input type="text" placeholder="Buscar por paciente, DNI o tipo de análisis..." className="pl-10 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full md:w-auto px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="all">Todos los estados</option>
              <option value="pending">Pendientes</option>
              <option value="processing">Procesando</option>
              <option value="completed">Completos</option>
              <option value="revisado">Pend. Validación</option>
              <option value="validated">Validados</option>
            </select>
          </div>
        </motion.div>

        {filteredResults.length > 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredResults.map((result, index) => (
              <motion.div key={result.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * index }}>
                <ResultCard result={result} />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="medical-card rounded-xl p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No se encontraron resultados</h3>
            <p className="text-gray-600 mb-6">Intenta con otros términos de búsqueda o filtros.</p>
          </motion.div>
        )}
      </div>
    </>
  );
};

export default ResultsPage;