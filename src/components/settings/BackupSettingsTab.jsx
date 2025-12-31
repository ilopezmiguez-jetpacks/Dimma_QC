import React from 'react';
import { Database, Info } from 'lucide-react';

const BackupSettingsTab = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Respaldo de Datos</h2>
        <p className="text-gray-600">Gestiona las copias de seguridad de tu información.</p>
      </div>

      <div className="medical-card rounded-xl p-6 space-y-6">
        <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
          <Info className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900">Almacenamiento Local</h3>
            <p className="text-sm text-blue-700 mt-1">
              Tus datos se guardan automáticamente en el navegador. Para realizar copias de seguridad completas, contacta al administrador del sistema.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <Database className="w-5 h-5 text-gray-600" />
            <div>
              <h3 className="font-semibold text-gray-900">Estado del Almacenamiento</h3>
              <p className="text-sm text-gray-600">Los datos se sincronizan automáticamente</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BackupSettingsTab;