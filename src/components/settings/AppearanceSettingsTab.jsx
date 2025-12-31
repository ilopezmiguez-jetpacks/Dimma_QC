import React from 'react';
import { Sun } from 'lucide-react';

const AppearanceSettingsTab = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Apariencia</h2>
        <p className="text-gray-600">Personaliza la apariencia de la aplicación.</p>
      </div>

      <div className="medical-card rounded-xl p-6 space-y-6">
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <Sun className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="font-semibold text-gray-900">Tema del Sistema</h3>
              <p className="text-sm text-gray-600">Actualmente usando tema claro</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppearanceSettingsTab;