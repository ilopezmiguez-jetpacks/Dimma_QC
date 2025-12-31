import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { hasPermission } from '@/utils/permissions';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Printer, Save, MessageSquare, Edit, CheckSquare, ShieldCheck, Send } from 'lucide-react';

const ResultDetailPage = () => {
  const { resultId } = useParams();
  const { results, patients, updateResult } = useData();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [result, setResult] = useState(null);
  const [patient, setPatient] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editableData, setEditableData] = useState({});

  useEffect(() => {
    const foundResult = results.find(r => r.id === resultId);
    if (foundResult) {
      setResult(foundResult);
      setEditableData(foundResult.data ? JSON.parse(JSON.stringify(foundResult.data)) : {});
      const foundPatient = patients.find(p => p.id === foundResult.patientId);
      setPatient(foundPatient);
    } else {
      navigate('/resultados');
    }
  }, [resultId, results, patients, navigate]);

  const handleDataChange = (param, key, value) => {
    setEditableData(prev => ({
      ...prev,
      [param]: {
        ...prev[param],
        [key]: value
      }
    }));
  };

  const handleSaveChanges = () => {
    updateResult(result.id, { data: editableData });
    setIsEditing(false);
    toast({ title: "Cambios guardados", description: "El informe ha sido actualizado." });
  };

  const handlePrint = () => window.print();

  const handleAddComment = () => {
    toast({
      title: "🚧 Agregar Comentario",
      description: "Función en desarrollo. ¡Disponible próximamente!",
    });
  };

  const handleComplete = () => {
    updateResult(result.id, { status: 'completed', completedAt: new Date().toISOString() });
    setResult(prev => ({ ...prev, status: 'completed' }));
    toast({ title: "Resultado Completado", description: "El informe está listo para la revisión técnica." });
  };

  const handleReview = () => {
    updateResult(result.id, { status: 'revisado', reviewedBy: user?.email || 'Unknown' });
    setResult(prev => ({ ...prev, status: 'revisado', reviewedBy: user?.email }));
    toast({ title: "Enviado a Validación", description: "El informe está listo para ser validado." });
  };

  const handleValidate = () => {
    updateResult(result.id, { status: 'validated', validatedBy: user?.email || 'Unknown' });
    setResult(prev => ({ ...prev, status: 'validated', validatedBy: user?.email }));
    toast({ title: "Resultado Validado", description: "El informe ha sido validado exitosamente." });
  };

  const canEdit = user && !['revisado', 'validated'].includes(result?.status);
  const canComplete = user && result?.status === 'processing';
  const canReview = user && result?.status === 'completed';
  const canValidate = user && result?.status === 'revisado' && hasPermission(user, 'validate_results');

  if (!result || !patient) {
    return <div>Cargando...</div>;
  }

  const renderParameter = (param, data) => (
    <tr key={param} className="border-b border-gray-200 hover:bg-gray-50">
      <td className="py-2 px-4 font-medium text-gray-700">{param}</td>
      {isEditing ? (
        <td className="py-2 px-4">
          <input
            type="text"
            value={data.value}
            onChange={(e) => handleDataChange(param, 'value', e.target.value)}
            className="w-full px-2 py-1 border rounded-md"
          />
        </td>
      ) : (
        <td className="py-2 px-4 font-semibold text-gray-900">{data.value}</td>
      )}
      <td className="py-2 px-4 text-gray-600">{data.unit}</td>
      <td className="py-2 px-4 text-gray-600">{data.ref}</td>
    </tr>
  );

  return (
    <>
      <Helmet>
        <title>Informe de {result.testType} para {patient.name} - LabClínico Pro</title>
      </Helmet>

      <div className="max-w-4xl mx-auto">
        <div className="bg-white p-8 rounded-lg shadow-lg print-container" id="informe-imprimible">
          <header className="flex justify-between items-start pb-6 border-b-2 border-blue-600">
            <div>
              <h1 className="text-3xl font-bold text-blue-700">LabClínico Pro</h1>
              <p className="text-gray-500">Informe de Resultados</p>
            </div>
            <div className="text-right">
              <p className="font-semibold">{patient.name}</p>
              <p className="text-sm text-gray-600">DNI: {patient.dni}</p>
              <p className="text-sm text-gray-600">Fecha: {new Date(result.createdAt).toLocaleDateString('es-AR')}</p>
            </div>
          </header>

          <main className="mt-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                {result.testType}
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-100 text-gray-600 uppercase">
                    <tr>
                      <th className="py-3 px-4">Parámetro</th>
                      <th className="py-3 px-4">Resultado</th>
                      <th className="py-3 px-4">Unidades</th>
                      <th className="py-3 px-4">Valores de Referencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(editableData).map(([param, data]) => renderParameter(param, data))}
                  </tbody>
                </table>
              </div>
            </motion.div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="font-semibold text-gray-700">Revisado por (Técnico):</p>
                <p className="text-gray-600">{result.reviewedBy || 'Pendiente'}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="font-semibold text-gray-700">Validado por:</p>
                <p className="text-gray-600">{result.validatedBy || 'Pendiente'}</p>
              </div>
            </div>

            {result.notes && (
              <div className="mt-6 bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-400">
                <h4 className="font-semibold text-yellow-800">Notas:</h4>
                <p className="text-yellow-700">{result.notes}</p>
              </div>
            )}
          </main>

          <footer className="mt-12 pt-6 border-t text-center text-xs text-gray-500">
            <p>Este es un informe generado por LabClínico Pro. Consulte a su médico para la interpretación de los resultados.</p>
            <p>{user?.email || 'Unknown User'}</p>
          </footer>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-4 print-hidden">
          <Button onClick={handlePrint}><Printer className="w-4 h-4 mr-2" />Imprimir</Button>
          {canEdit && !isEditing && <Button onClick={() => setIsEditing(true)}><Edit className="w-4 h-4 mr-2" />Editar</Button>}
          {isEditing && (
            <>
              <Button onClick={handleSaveChanges} className="bg-green-600 hover:bg-green-700 text-white"><Save className="w-4 h-4 mr-2" />Guardar Cambios</Button>
              <Button variant="outline" onClick={() => {
                setIsEditing(false);
                setEditableData(JSON.parse(JSON.stringify(result.data)));
              }}>Cancelar</Button>
            </>
          )}
          {canComplete && <Button onClick={handleComplete} className="bg-blue-600 hover:bg-blue-700 text-white"><CheckSquare className="w-4 h-4 mr-2" />Marcar como Completo</Button>}
          {canReview && <Button onClick={handleReview} className="bg-orange-500 hover:bg-orange-600 text-white"><Send className="w-4 h-4 mr-2" />Enviar a Validación</Button>}
          {user && <Button variant="outline" onClick={handleAddComment}><MessageSquare className="w-4 h-4 mr-2" />Comentar</Button>}
          {canValidate && <Button onClick={handleValidate} className="bg-purple-600 hover:bg-purple-700 text-white"><ShieldCheck className="w-4 h-4 mr-2" />Validar</Button>}
        </div>
      </div>
    </>
  );
};

export default ResultDetailPage;