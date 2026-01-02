import React from 'react';
import { useQCData } from '@/contexts/QCDataContext';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2 } from 'lucide-react';

const LabSelector = () => {
  const { laboratories, currentLabId, setCurrentLabId, loading } = useQCData();
  const { user } = useAuth();

  // Only admins can switch labs
  const canSwitch = user?.user_metadata?.role === 'admin';

  if (!canSwitch || loading) return null;

  return (
    <div className="flex items-center gap-2">
      <Building2 className="w-4 h-4 text-muted-foreground" />
      <Select value={currentLabId || 'all'} onValueChange={setCurrentLabId}>
        <SelectTrigger className="w-[200px] h-9 bg-white">
          <SelectValue placeholder="Seleccionar Laboratorio" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los Laboratorios</SelectItem>
          {laboratories.map((lab) => (
            <SelectItem key={lab.id} value={lab.id}>
              {lab.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default LabSelector;