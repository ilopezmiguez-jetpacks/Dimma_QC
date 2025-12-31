import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import PatientModal from '@/components/PatientModal';
import { User, FileText, Edit, Eye, Phone, Mail, CreditCard, PlusCircle, Download } from 'lucide-react';

const PatientHistoryPage = () => {
  const { patientId } = useParams();
  const { patients, results, updatePatient, addPatient } = useData();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('view');
  const [selectedPatient, setSelectedPatient] = useState(null);

  const patient = patients.find(p => p.id === parseInt(patientId));
  const patientResults = results.filter(r => r.patientId === parseInt(patientId)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (!patient) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Paciente no encontrado</h1>
          <Button onClick={() => navigate('/pacientes')} className="mt-4">Volver a Pacientes</Button>
        </div>
      </div>
    );
  }

  const handleOpenModal = (mode, patientData) => {
    setSelectedPatient(patientData);
    setModalMode(mode);
    setIsModalOpen(true);
  };
  
  const handleSavePatient = (patientData, orderData) => {
    if (modalMode === 'edit') {
      updatePatient(patient.id, patientData);
      toast({
        title: "Paciente actualizado",
        description: "Los datos del paciente han sido actualizados.",
      });
    } else if (modalMode === 'add-analysis') {
      addPatient(patientData, orderData);
       toast({
        title: "Pedido de Análisis Creado",
        description: `Se ha creado un nuevo pedido para ${patient.name}.`,
      });
    }
    setIsModalOpen(false);
  };

  const handleExport = () => {
    toast({
      title: "🚧 Exportar Ficha",
      description: "Función en desarrollo. Próximamente podrás exportar los datos del paciente. 🚀",
    });
  };

  const calculateAge = (birthDate) => {
    if (!birthDate) return 'N/A';
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };
  
  const getGenderText = (gender) => {
    if (gender === 'male') return 'Masculino';
    if (gender === 'female') return 'Femenino';
    return 'No especificado';
  }

  const getStatusInfo = (status) => {
    switch (status) {
      case 'pending': return { text: 'Pendiente', color: 'border-yellow-500' };
      case 'processing': return { text: 'Procesando', color: 'border-blue-500' };
      case 'completed': return { text: 'Completo', color: 'border-orange-500' };
      case 'revisado': return { text: 'Pendiente de Validación', color: 'border-indigo-500' };
      case 'validated': return { text: 'Validado', color: 'border-purple-500' };
      default: return { text: 'Desconocido', color: 'border-gray-500' };
    }
  };

  return (
    <>
      <Helmet>
        <title>Historial de {patient.name} - LabClínico Pro</title>
        <meta name="description" content={`Historial clínico completo de ${patient.name}.`} />
      </Helmet>

      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="medical-card rounded-xl p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{patient.name}</h1>
                <p className="text-gray-600">DNI: {patient.dni}</p>
                <div className="flex items-center space-x-4 text-sm text-gray-500 mt-2">
                  <span>{calculateAge(patient.birthDate)} años</span>
                  <span>&bull;</span>
                  <span>{getGenderText(patient.sex)}</span>
                </div>
              </div>
            </div>
            <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => handleOpenModal('edit', patient)}>
                <Edit className="w-4 h-4 mr-2"/>
                Editar Paciente
              </Button>
              <Button onClick={() => handleOpenModal('add-analysis', patient)}>
                <PlusCircle className="w-4 h-4 mr-2" />
                Agregar Análisis
              </Button>
              <Button variant="outline" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                Exportar Ficha
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-2 text-sm text-gray-700">
              <Phone className="w-4 h-4 text-gray-400" />
              <span>{patient.phone}</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-700">
              <Mail className="w-4 h-4 text-gray-400" />
              <span className="truncate">{patient.email}</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-700">
              <CreditCard className="w-4 h-4 text-gray-400" />
              <span>{patient.obraSocial} ({patient.numeroAfiliado || 'N/A'})</span>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Historial de Análisis</h2>
          <div className="space-y-4">
            {patientResults.length > 0 ? (
              patientResults.map(result => {
                const statusInfo = getStatusInfo(result.status);
                return (
                  <motion.div
                    key={result.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`bg-white p-4 rounded-lg shadow-sm border-l-4 ${statusInfo.color} flex items-center justify-between`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex flex-col items-center justify-center w-16 text-center">
                        <span className="text-sm font-semibold text-gray-500">{new Date(result.createdAt).toLocaleDateString('es-AR', { month: 'short' })}</span>
                        <span className="text-2xl font-bold text-gray-800">{new Date(result.createdAt).getDate()}</span>
                        <span className="text-sm text-gray-500">{new Date(result.createdAt).getFullYear()}</span>
                      </div>
                      <div className="border-l border-gray-200 pl-4">
                        <h3 className="font-semibold text-gray-800">{result.testType}</h3>
                        <p className="text-sm text-gray-500">Estado: {statusInfo.text}</p>
                      </div>
                    </div>
                    <Button onClick={() => navigate(`/resultados/${result.id}`)}>
                      <Eye className="w-4 h-4 mr-2" />
                      Ver Informe
                    </Button>
                  </motion.div>
                )
              })
            ) : (
              <div className="medical-card rounded-xl p-12 text-center">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900">Sin historial</h3>
                <p className="text-gray-600">Este paciente aún no tiene resultados de análisis registrados.</p>
              </div>
            )}
          </div>
        </motion.div>
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

export default PatientHistoryPage;