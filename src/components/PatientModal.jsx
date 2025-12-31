import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Phone, Mail, MapPin, Calendar, CreditCard, AlertCircle, Beaker, FileText, Bus as Ambulance, BedDouble, Users as GenderIcon, Upload, Briefcase as BriefcaseMedical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';

const PatientModal = ({ isOpen, onClose, onSave, patient, mode = 'create' }) => {
  const [formData, setFormData] = useState({
    dni: '', name: '', birthDate: '', sex: 'other', phone: '', email: '', address: '', obraSocial: '', numeroAfiliado: '', type: 'guardia'
  });
  const [errors, setErrors] = useState({});
  const [analysisOrder, setAnalysisOrder] = useState({
    'Hemato': false,
    'Química': { checked: false, tests: [] },
    'Iones': false,
    'Gases': false,
    'Coagulación': false
  });
  const [orderNotes, setOrderNotes] = useState('');
  const { toast } = useToast();

  const chemistryDeterminations = ['GLU', 'UREA', 'CREATI', 'COLEST.', 'PROT. TOTAL', 'TGP'];
  
  useEffect(() => {
    if (isOpen) {
      if (patient && (mode === 'edit' || mode === 'view' || mode === 'add-analysis')) {
        setFormData({
          dni: patient.dni || '',
          name: patient.name || '',
          birthDate: patient.birthDate || '',
          sex: patient.sex || 'other',
          phone: patient.phone || '',
          email: patient.email || '',
          address: patient.address || '',
          obraSocial: patient.obraSocial || '',
          numeroAfiliado: patient.numeroAfiliado || '',
          type: patient.type || 'guardia'
        });
      } else {
        setFormData({
          dni: '', name: '', birthDate: '', sex: 'other', phone: '', email: '', address: '', obraSocial: '', numeroAfiliado: '', type: 'guardia'
        });
      }
      setAnalysisOrder({ 'Hemato': false, 'Química': { checked: false, tests: [] }, 'Iones': false, 'Gases': false, 'Coagulación': false });
      setOrderNotes('');
      setErrors({});
    }
  }, [patient, mode, isOpen]);

  const validateForm = () => {
    const newErrors = {};
    if (mode !== 'add-analysis') {
      if (!formData.dni.trim()) newErrors.dni = 'El DNI es obligatorio';
      else if (!/^\d{7,8}$/.test(formData.dni.trim())) newErrors.dni = 'El DNI debe tener 7 u 8 dígitos';
      if (!formData.name.trim()) newErrors.name = 'El nombre es obligatorio';
      if (!formData.birthDate) newErrors.birthDate = 'La fecha de nacimiento es obligatoria';
      if (!formData.sex || formData.sex === 'other') newErrors.sex = 'El sexo es obligatorio';
      if (!formData.phone.trim()) newErrors.phone = 'El teléfono es obligatorio';
      if (!formData.email.trim()) newErrors.email = 'El email es obligatorio';
      else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'El email no es válido';
      if (!formData.obraSocial.trim()) newErrors.obraSocial = 'La obra social es obligatoria';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (mode === 'view') return;
    if (validateForm()) {
      onSave(formData, { ...analysisOrder, notes: orderNotes });
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleAnalysisToggle = (type) => {
    setAnalysisOrder(prev => ({ ...prev, [type]: !prev[type] }));
  };
  
  const handleChemistryToggle = () => {
    setAnalysisOrder(prev => ({
      ...prev,
      'Química': { ...prev['Química'], checked: !prev['Química'].checked }
    }));
  };
  
  const handleChemistryTestToggle = (test) => {
    setAnalysisOrder(prev => {
      const newTests = prev['Química'].tests.includes(test)
        ? prev['Química'].tests.filter(t => t !== test)
        : [...prev['Química'].tests, test];
      return { ...prev, 'Química': { ...prev['Química'], tests: newTests } };
    });
  };

  const handleImport = () => {
    toast({
      title: "🚧 Importar Datos",
      description: "Función en desarrollo. Próximamente podrás importar datos de pacientes desde otros sistemas. 🚀",
    });
  };

  const obrasSociales = ['OSDE', 'Swiss Medical', 'Galeno', 'Medicus', 'IOMA', 'PAMI', 'Particular', 'Otra'];
  const getModalTitle = () => {
    if (mode === 'create') return 'Nuevo Paciente';
    if (mode === 'edit') return 'Editar Paciente';
    if (mode === 'view') return 'Detalles del Paciente';
    if (mode === 'add-analysis') return 'Agregar Análisis';
    return 'Paciente';
  };

  if (!isOpen) return null;
  const isAnalysisMode = mode === 'create' || mode === 'add-analysis';
  const isViewMode = mode === 'view';
  const isEditMode = mode === 'edit';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10 shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">{getModalTitle()}</h2>
            </div>
            {mode === 'create' && (
              <Button variant="outline" size="sm" onClick={handleImport}>
                <Upload className="w-4 h-4 mr-2" />
                Importar Datos
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5" /></Button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
            {(mode === 'create' || isEditMode || isViewMode) && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">DNI * <span className="tooltip ml-1" data-tooltip="Documento Nacional de Identidad"><AlertCircle className="w-4 h-4 inline text-gray-400" /></span></label>
                    <input type="text" value={formData.dni} onChange={(e) => handleChange('dni', e.target.value)} disabled={isViewMode} className={`w-full px-3 py-2 border rounded-lg ${errors.dni ? 'border-red-500' : 'border-gray-300'} ${isViewMode ? 'bg-gray-50' : ''}`} placeholder="12345678" maxLength="8" />
                    {errors.dni && <p className="text-red-500 text-sm mt-1">{errors.dni}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nombre Completo *</label>
                    <input type="text" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} disabled={isViewMode} className={`w-full px-3 py-2 border rounded-lg ${errors.name ? 'border-red-500' : 'border-gray-300'} ${isViewMode ? 'bg-gray-50' : ''}`} placeholder="Juan Carlos Pérez" />
                    {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de Nacimiento *</label>
                    <div className="relative"><Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" /><input type="date" value={formData.birthDate} onChange={(e) => handleChange('birthDate', e.target.value)} disabled={isViewMode} className={`pl-10 w-full px-3 py-2 border rounded-lg ${errors.birthDate ? 'border-red-500' : 'border-gray-300'} ${isViewMode ? 'bg-gray-50' : ''}`} /></div>
                    {errors.birthDate && <p className="text-red-500 text-sm mt-1">{errors.birthDate}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sexo *</label>
                    <div className="relative"><GenderIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" /><select value={formData.sex} onChange={(e) => handleChange('sex', e.target.value)} disabled={isViewMode} className={`pl-10 w-full px-3 py-2 border rounded-lg ${errors.sex ? 'border-red-500' : 'border-gray-300'} ${isViewMode ? 'bg-gray-50' : ''}`}><option value="other" disabled>Seleccionar sexo</option><option value="male">Masculino</option><option value="female">Femenino</option></select></div>
                    {errors.sex && <p className="text-red-500 text-sm mt-1">{errors.sex}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Teléfono *</label>
                    <div className="relative"><Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" /><input type="tel" value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} disabled={isViewMode} className={`pl-10 w-full px-3 py-2 border rounded-lg ${errors.phone ? 'border-red-500' : 'border-gray-300'} ${isViewMode ? 'bg-gray-50' : ''}`} placeholder="11-4567-8901" /></div>
                    {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                    <div className="relative"><Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" /><input type="email" value={formData.email} onChange={(e) => handleChange('email', e.target.value)} disabled={isViewMode} className={`pl-10 w-full px-3 py-2 border rounded-lg ${errors.email ? 'border-red-500' : 'border-gray-300'} ${isViewMode ? 'bg-gray-50' : ''}`} placeholder="juan.perez@email.com" /></div>
                    {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Dirección</label>
                  <div className="relative"><MapPin className="absolute left-3 top-3 text-gray-400 w-5 h-5" /><textarea value={formData.address} onChange={(e) => handleChange('address', e.target.value)} disabled={isViewMode} rows="2" className={`pl-10 w-full px-3 py-2 border rounded-lg ${isViewMode ? 'bg-gray-50' : 'border-gray-300'}`} placeholder="Av. Corrientes 1234, CABA" /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Obra Social *</label>
                    <div className="relative"><CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" /><select value={formData.obraSocial} onChange={(e) => handleChange('obraSocial', e.target.value)} disabled={isViewMode} className={`pl-10 w-full px-3 py-2 border rounded-lg ${errors.obraSocial ? 'border-red-500' : 'border-gray-300'} ${isViewMode ? 'bg-gray-50' : ''}`}><option value="">Seleccionar obra social</option>{obrasSociales.map(obra => (<option key={obra} value={obra}>{obra}</option>))}</select></div>
                    {errors.obraSocial && <p className="text-red-500 text-sm mt-1">{errors.obraSocial}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Número de Afiliado</label>
                    <input type="text" value={formData.numeroAfiliado} onChange={(e) => handleChange('numeroAfiliado', e.target.value)} disabled={isViewMode} className={`w-full px-3 py-2 border rounded-lg ${isViewMode ? 'bg-gray-50' : 'border-gray-300'}`} placeholder="123456789" />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Paciente</label>
              <div className="grid grid-cols-3 gap-2">
                <Button type="button" onClick={() => handleChange('type', 'guardia')} variant={formData.type === 'guardia' ? 'default' : 'outline'} className={`flex-1 ${formData.type === 'guardia' ? 'medical-gradient text-white' : ''}`} disabled={isViewMode}><Ambulance className="w-4 h-4 mr-2" />Guardia</Button>
                <Button type="button" onClick={() => handleChange('type', 'internado')} variant={formData.type === 'internado' ? 'default' : 'outline'} className={`flex-1 ${formData.type === 'internado' ? 'medical-gradient text-white' : ''}`} disabled={isViewMode}><BedDouble className="w-4 h-4 mr-2" />Internado</Button>
                <Button type="button" onClick={() => handleChange('type', 'externo')} variant={formData.type === 'externo' ? 'default' : 'outline'} className={`flex-1 ${formData.type === 'externo' ? 'medical-gradient text-white' : ''}`} disabled={isViewMode}><BriefcaseMedical className="w-4 h-4 mr-2" />Externo</Button>
              </div>
            </div>

            {isAnalysisMode && (
              <div className="space-y-4 pt-4 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center"><Beaker className="w-5 h-5 mr-2 text-blue-600"/>Crear Pedido de Análisis</h3>
                <div className="space-y-3">
                  {Object.keys(analysisOrder).map(type => (
                    <div key={type}>
                      <div className="flex items-center space-x-2">
                        <Checkbox id={`analysis-${type}`} checked={type === 'Química' ? analysisOrder[type].checked : analysisOrder[type]} onCheckedChange={() => type === 'Química' ? handleChemistryToggle() : handleAnalysisToggle(type)} />
                        <label htmlFor={`analysis-${type}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{type === 'Gases' ? 'Gases en Sangre' : type}</label>
                      </div>
                      {type === 'Química' && analysisOrder['Química'].checked && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="pl-6 mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
                          {chemistryDeterminations.map(test => (
                            <div key={test} className="flex items-center space-x-2">
                              <Checkbox id={`chem-${test}`} checked={analysisOrder['Química'].tests.includes(test)} onCheckedChange={() => handleChemistryTestToggle(test)} />
                              <label htmlFor={`chem-${test}`} className="text-xs font-medium">{test}</label>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </div>
                  ))}
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Notas del Pedido</label>
                    <div className="relative"><FileText className="absolute left-3 top-3 text-gray-400 w-5 h-5" /><textarea value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} rows="2" className="pl-10 w-full px-3 py-2 border rounded-lg border-gray-300" placeholder="Ej: Paciente en ayunas de 12hs..."/></div>
                 </div>
              </div>
            )}
            
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 shrink-0">
              {mode !== 'view' ? (
                <>
                  <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                  <Button type="submit" className="medical-gradient text-white">{mode === 'create' ? 'Crear Paciente y Pedido' : 'Guardar Cambios'}</Button>
                </>
              ) : (
                <Button type="button" onClick={onClose}>Cerrar</Button>
              )}
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PatientModal;