import React, { useState, useMemo, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useQCData } from '@/contexts/QCDataContext';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { AlertTriangle, Repeat, Wrench, Settings2, Sliders, Loader2 } from 'lucide-react';

const StatisticsPage = () => {
  const { equipment, alarms, resolveAlarm } = useQCData(); // Removed qcReports
  const { user } = useAuth();
  const { toast } = useToast();

  const [selectedEquipmentId, setSelectedEquipmentId] = useState(equipment[0]?.id || '');

  const currentEquipment = useMemo(() => equipment.find(e => e.id === selectedEquipmentId), [equipment, selectedEquipmentId]);
  const activeLot = useMemo(() => currentEquipment?.lots?.find(l => l.isActive), [currentEquipment]);

  const [selectedLevel, setSelectedLevel] = useState('');
  const [selectedParam, setSelectedParam] = useState('');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  const [fetchedReports, setFetchedReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);

  // Effect to fetch reports when Equipment or Date Range changes
  useEffect(() => {
    const fetchReports = async () => {
      if (!selectedEquipmentId) return;
      setLoadingReports(true);
      const start = new Date(dateRange.start);
      start.setHours(0, 0, 0, 0);
      const end = new Date(dateRange.end);
      end.setHours(23, 59, 59, 999);

      try {
        const { data, error } = await supabase
          .from('qc_reports')
          .select('*')
          .eq('equipment_id', selectedEquipmentId)
          .gte('date', start.toISOString())
          .lte('date', end.toISOString())
          .order('date', { ascending: true }); // Chart needs ascending

        if (error) throw error;

        const formattedReports = (data || []).map(r => ({
          ...r,
          equipmentId: r.equipment_id,
          lotNumber: r.lot_number,
          westgardRules: r.westgard_rules
        }));
        setFetchedReports(formattedReports);

      } catch (err) {
        console.error("Error fetching statistics reports:", err);
        toast({ title: "Error", description: "No se pudieron cargar los reportes para el rango seleccionado.", variant: "destructive" });
      } finally {
        setLoadingReports(false);
      }
    };

    fetchReports();
  }, [selectedEquipmentId, dateRange.start, dateRange.end, toast]);


  useEffect(() => {
    if (activeLot && activeLot.qc_params) {
      const firstLevel = Object.keys(activeLot.qc_params)[0];
      setSelectedLevel(firstLevel || '');
      if (firstLevel) {
        const firstParam = Object.keys(activeLot.qc_params[firstLevel] || {})[0];
        setSelectedParam(firstParam || '');
      }
    } else {
      setSelectedLevel('');
      setSelectedParam('');
    }
  }, [activeLot]);

  const handleEquipmentChange = (id) => {
    setSelectedEquipmentId(id);
  };

  const filteredReports = useMemo(() => {
    if (!activeLot) return [];

    // We already filtered by date and equipment in the fetch.
    // Now we filter by LOT and LEVEL.
    return fetchedReports.filter(r =>
      r.lotNumber === activeLot.lotNumber &&
      r.level === selectedLevel
    );
  }, [fetchedReports, selectedLevel, activeLot]);

  const chartData = useMemo(() => filteredReports.map(report => ({
    date: new Date(report.date).toLocaleDateString('en-CA', { day: '2-digit', month: '2-digit' }),
    value: report.values[selectedParam],
    rules: (report.westgardRules || []).filter(r => r.includes(selectedParam)).join(', ')
  })), [filteredReports, selectedParam]);

  const qcParamsForChart = activeLot?.qc_params?.[selectedLevel]?.[selectedParam];

  const pendingAlarms = useMemo(() => alarms.filter(a => a.status === 'pending'), [alarms]);

  const handleResolveAlarm = (alarmId, action) => {
    resolveAlarm(alarmId, action);
    toast({
      title: "Alarma Gestionada",
      description: `La alarma ha sido marcada como resuelta con la acción: ${action}.`,
    });
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-2 bg-white border rounded-lg shadow-lg">
          <p className="font-bold">{`Fecha: ${label}`}</p>
          <p className="text-sm" style={{ color: payload[0].stroke }}>{`${selectedParam}: ${payload[0].value}`}</p>
          {payload[0].payload.rules && <p className="text-xs text-red-500">{`Reglas: ${payload[0].payload.rules}`}</p>}
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <Helmet>
        <title>Estadísticas - QC LabControl</title>
        <meta name="description" content="Rendimiento de los equipos y estadísticas de control de calidad." />
      </Helmet>
      <div className="space-y-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Análisis de Tendencias de CC</h1>
          <p className="text-muted-foreground mt-1">Visualice y analice el rendimiento histórico de sus equipos.</p>
        </motion.div>

        {user?.user_metadata?.role === 'admin' && pendingAlarms.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="medical-card rounded-xl p-6 bg-yellow-50 border-yellow-300">
            <h2 className="text-xl font-bold text-yellow-800 mb-4 flex items-center gap-2">
              <AlertTriangle />
              Alarmas Diarias Pendientes
            </h2>
            <div className="space-y-4 max-h-60 overflow-y-auto">
              {pendingAlarms.map(alarm => (
                <div key={alarm.id} className="p-3 bg-white rounded-lg shadow-sm flex flex-col md:flex-row md:items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-800">{equipment.find(e => e.id === alarm.equipmentId)?.name}</p>
                    <p className="text-sm text-gray-600">{alarm.message}</p>
                    <p className="text-xs text-gray-400">{new Date(alarm.date).toLocaleString('en-US')}</p>
                  </div>
                  <div className="flex gap-2 mt-2 md:mt-0">
                    <Button size="sm" variant="outline" onClick={() => handleResolveAlarm(alarm.id, 'Repeat Control')}><Repeat className="w-4 h-4 mr-1" /> Repetir</Button>
                    <Button size="sm" variant="outline" onClick={() => handleResolveAlarm(alarm.id, 'Adjust Factors')}><Settings2 className="w-4 h-4 mr-1" /> Ajustar</Button>
                    <Button size="sm" variant="outline" onClick={() => handleResolveAlarm(alarm.id, 'Request Technical Service')}><Wrench className="w-4 h-4 mr-1" /> Servicio Técnico</Button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="medical-card rounded-xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <select value={selectedEquipmentId} onChange={(e) => handleEquipmentChange(e.target.value)} className="p-2 border border-border rounded-md w-full">
              <option value="" disabled>Seleccionar Equipo</option>
              {equipment.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>

            <select value={selectedLevel} onChange={(e) => setSelectedLevel(e.target.value)} className="p-2 border border-border rounded-md w-full" disabled={!activeLot}>
              <option value="" disabled>Nivel</option>
              {activeLot && activeLot.qc_params && Object.keys(activeLot.qc_params).map(level => <option key={level} value={level}>{level}</option>)}
            </select>

            <select value={selectedParam} onChange={(e) => setSelectedParam(e.target.value)} className="p-2 border border-border rounded-md w-full" disabled={!selectedLevel}>
              <option value="" disabled>Parámetro</option>
              {activeLot && activeLot.qc_params && activeLot.qc_params[selectedLevel] && Object.keys(activeLot.qc_params[selectedLevel]).map(param => <option key={param} value={param}>{param}</option>)}
            </select>

            <div className="flex items-center gap-2">
              <input type="date" value={dateRange.start} onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))} className="p-2 border border-border rounded-md w-full" />
              <input type="date" value={dateRange.end} onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))} className="p-2 border border-border rounded-md w-full" />
            </div>
          </div>

          {loadingReports ? (
            <div className="h-96 flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
              <p className="text-muted-foreground">Cargando datos del gráfico...</p>
            </div>
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={['dataMin - 1', 'dataMax + 1']} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {qcParamsForChart && (
                  <>
                    <ReferenceLine y={parseFloat(qcParamsForChart.mean)} label="Media" stroke="black" strokeDasharray="3 3" />
                    <ReferenceLine y={parseFloat(qcParamsForChart.mean) + parseFloat(qcParamsForChart.sd)} label="+1s" stroke="green" strokeDasharray="3 3" />
                    <ReferenceLine y={parseFloat(qcParamsForChart.mean) - parseFloat(qcParamsForChart.sd)} label="-1s" stroke="green" strokeDasharray="3 3" />
                    <ReferenceLine y={parseFloat(qcParamsForChart.mean) + 2 * parseFloat(qcParamsForChart.sd)} label="+2s" stroke="orange" strokeDasharray="3 3" />
                    <ReferenceLine y={parseFloat(qcParamsForChart.mean) - 2 * parseFloat(qcParamsForChart.sd)} label="-2s" stroke="orange" strokeDasharray="3 3" />
                    <ReferenceLine y={parseFloat(qcParamsForChart.mean) + 3 * parseFloat(qcParamsForChart.sd)} label="+3s" stroke="red" strokeDasharray="3 3" />
                    <ReferenceLine y={parseFloat(qcParamsForChart.mean) - 3 * parseFloat(qcParamsForChart.sd)} label="-3s" stroke="red" strokeDasharray="3 3" />
                  </>
                )}
                <Line type="monotone" dataKey="value" name={selectedParam} stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-96 flex flex-col items-center justify-center text-center text-muted-foreground">
              <Sliders className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-foreground">No hay datos para mostrar</h3>
              <p>No se encontraron reportes para los filtros seleccionados, o no hay un lote activo para el equipo.</p>
            </div>
          )}
        </motion.div>
      </div>
    </>
  );
};

export default StatisticsPage;