import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { Plus, Search, Filter, Briefcase as BriefcaseMedical, Bus as Ambulance, BedDouble, X } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import PatientModal from '@/components/PatientModal';
import PatientCard from '@/components/PatientCard';

const PatientsPage = () => {
  const { patients, addPatient, updatePatient } = useData();
  const { user } = useAuth();
  const location = useLocation();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all', 'guardia', 'internado', 'externo'
  const [dateFilter, setDateFilter] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const date = params.get('date');
    if (date) {
      setDateFilter(date);
    }
  }, [location.search]);

  const filteredPatients = patients.filter(patient => {
    const matchesSearch = patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          patient.dni.includes(searchTerm) ||
                          patient.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || patient.type === typeFilter;
    const matchesDate = !dateFilter || patient.createdAt.startsWith(dateFilter);
    
    return matchesSearch && matchesType && matchesDate;
  });

  const handleCreatePatient = () => {
    setSelectedPatient(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleEditPatient = (patient) => {
    setSelectedPatient(patient);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleViewPatient = (patient) => {
    setSelectedPatient(patient);
    setModalMode('view');
    setIsModalOpen(true);
  };
  
  const handleAction = (action, patient) => {
    if (action === 'view') handleViewPatient(patient);
    if (action === 'edit') handleEditPatient(patient);
  };

  const handleSavePatient = (patientData, orderData) => {
    if (modalMode === 'create') {
      addPatient(patientData, orderData);
      toast({
        title: "Paciente y Pedido Creados",
        description: "El paciente ha sido registrado y los pedidos de análisis generados.",
      });
    } else if (modalMode === 'edit') {
      updatePatient(selectedPatient.id, patientData);
      toast({
        title: "Paciente actualizado",
        description: "Los datos del paciente han sido actualizados.",
      });
    }
    setIsModalOpen(false);
  };
  
  return (
    <>
      <Helmet>
        <title>Pacientes - LabClínico Pro</title>
        <meta name="description" content="Gestión completa de pacientes del laboratorio clínico con datos argentinos." />
      </Helmet>

      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Planilla de Pacientes</h1>
            <p className="text-gray-600 mt-1">Gestiona la información de todos los pacientes del laboratorio</p>
          </div>
          <Button
            onClick={handleCreatePatient}
            className="mt-4 sm:mt-0 medical-gradient text-white shadow-lg hover:shadow-blue-500/50"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Paciente
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="medical-card rounded-xl p-4 md:p-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar por nombre, DNI..."
                className="pl-10 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="all">Todos los tipos</option>
                <option value="guardia">Guardia</option>
                <option value="internado">Internado</option>
                <option value="externo">Externo</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {dateFilter && <Button variant="ghost" size="icon" onClick={() => setDateFilter('')}><X className="w-4 h-4" /></Button>}
            </div>
          </div>
        </motion.div>

        {filteredPatients.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
          >
            <AnimatePresence>
              {filteredPatients.map((patient, index) => (
                <motion.div
                  key={patient.id}
                  layout
                  initial={{ opacity: 0, y: 20, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.98 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <PatientCard patient={patient} onAction={handleAction} userRole={user.role} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="medical-card rounded-xl p-12 text-center"
          >
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BriefcaseMedical className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchTerm || typeFilter !== 'all' || dateFilter ? 'No se encontraron pacientes' : 'No hay pacientes registrados'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || typeFilter !== 'all' || dateFilter
                ? 'Intenta con otros términos de búsqueda o filtros'
                : 'Comienza agregando tu primer paciente al sistema'
              }
            </p>
            {!searchTerm && typeFilter === 'all' && !dateFilter && (
              <Button onClick={handleCreatePatient} className="medical-gradient text-white">
                <Plus className="w-4 h-4 mr-2" />
                Agregar Primer Paciente
              </Button>
            )}
          </motion.div>
        )}
      </div>

      <PatientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSavePatient}
        patient={selectedPatient}
        mode={modalMode}
      />
    </>
  );
};

export default PatientsPage;