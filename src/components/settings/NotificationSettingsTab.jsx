import React from 'react';

const NotificationSettingsTab = () => {
  const ToggleSwitch = ({ id, defaultChecked = true }) => (
    <label htmlFor={id} className="relative inline-flex items-center cursor-pointer">
      <input id={id} type="checkbox" className="sr-only peer" defaultChecked={defaultChecked} />
      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
    </label>
  );

  return (
    <div className="space-y-6">
      <div className="medical-card rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Settings</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">Email Notifications</h4>
              <p className="text-sm text-gray-500">Receive important alerts by email</p>
            </div>
            <ToggleSwitch id="email-notifications" />
          </div>
          
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">Equipment Alerts</h4>
              <p className="text-sm text-gray-500">Notifications when equipment goes offline</p>
            </div>
            <ToggleSwitch id="equipment-alerts" />
          </div>
          
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">Maintenance Reminders</h4>
              <p className="text-sm text-gray-500">Alerts for scheduled maintenance</p>
            </div>
            <ToggleSwitch id="maintenance-reminders" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettingsTab;