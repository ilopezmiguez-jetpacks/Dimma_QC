import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Edit, User, CreditCard, Bus as Ambulance, BedDouble, History, Briefcase as BriefcaseMedical } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PatientCard = ({ patient, onAction, userRole }) => {
  const navigate = useNavigate();

  const calculateAge = (birthDate) => {
    if (!birthDate) return 'N/A';
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };
  
  const canEdit = ['admin', 'biochemist', 'technician'].includes(userRole);

  const getGenderText = (gender) => {
    if (gender === 'male') return 'M';
    if (gender === 'female') return 'F';
    return 'N/A';
  }

  const getTypeInfo = (type) => {
    switch (type) {
      case 'guardia':
        return { icon: <Ambulance className="w-3 h-3" />, text: 'Guardia', style: 'bg-orange-100 text-orange-800' };
      case 'internado':
        return { icon: <BedDouble className="w-3 h-3" />, text: 'Internado', style: 'bg-teal-100 text-teal-800' };
      case 'externo':
        return { icon: <BriefcaseMedical className="w-3 h-3" />, text: 'Externo', style: 'bg-indigo-100 text-indigo-800' };
      default:
        return { icon: <User className="w-3 h-3" />, text: 'Desconocido', style: 'bg-gray-100 text-gray-800' };
    }
  };

  const typeInfo = getTypeInfo(patient.type);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => navigate(`/pacientes/${patient.id}`)}
      className="medical-card rounded-xl p-4 hover:shadow-lg transition-all duration-300 h-full flex flex-col cursor-pointer"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
            <User className="w-5 h-5 text-blue-600" />
          </div>
          <div className="overflow-hidden">
            <h3 className="text-base font-semibold text-gray-900 truncate" title={patient.name}>{patient.name}</h3>
            <p className="text-sm text-gray-500">DNI: {patient.dni}</p>
          </div>
        </div>
        <div className="flex space-x-1">
          {canEdit && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => { e.stopPropagation(); onAction('edit', patient); }}
              className="tooltip h-8 w-8"
              data-tooltip="Editar paciente"
            >
              <Edit className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2 flex-grow text-sm text-gray-600">
        <p><strong>Edad:</strong> {calculateAge(patient.birthDate)} años</p>
        <p><strong>Sexo:</strong> {getGenderText(patient.sex)}</p>
        <div className="flex items-center space-x-2">
            <CreditCard className="w-4 h-4 shrink-0 text-gray-400" />
            <span className="truncate" title={patient.obraSocial}>{patient.obraSocial}</span>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${typeInfo.style}`}>
            {typeInfo.icon}
            <span>{typeInfo.text}</span>
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => { e.stopPropagation(); navigate(`/pacientes/${patient.id}`); }}
          >
            <History className="w-3 h-3 mr-2" />
            Historial
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default PatientCard;