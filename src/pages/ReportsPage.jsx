import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Download, Filter } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const ReportsPage = () => {
  const { results } = useData();
  const { toast } = useToast();
  const [timeRange, setTimeRange] = useState('all');

  const filteredResults = useMemo(() => {
    if (timeRange === 'all') return results;
    const now = new Date();
    const daysToSubtract = timeRange === 'week' ? 7 : 30;
    const startDate = new Date(now.setDate(now.getDate() - daysToSubtract));
    return results.filter(r => new Date(r.createdAt) >= startDate);
  }, [results, timeRange]);

  const analysisByType = useMemo(() => {
    const counts = filteredResults.reduce((acc, result) => {
      acc[result.testType] = (acc[result.testType] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({ name, Cantidad: value }));
  }, [filteredResults]);

  const analysisByStatus = useMemo(() => {
    const statusMap = {
      pending: 'Pendiente',
      processing: 'Procesando',
      completed: 'Completo',
      revisado: 'Pend. Validación',
      validated: 'Validado',
    };
    const counts = filteredResults.reduce((acc, result) => {
      const statusName = statusMap[result.status] || 'Desconocido';
      acc[statusName] = (acc[statusName] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredResults]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'];

  const handleExport = (reportName) => {
    toast({
      title: `🚧 Exportar ${reportName}`,
      description: "Función en desarrollo. ¡Disponible próximamente!",
    });
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-2 bg-white border rounded-lg shadow-lg">
          <p className="font-bold">{label}</p>
          <p className="text-sm text-blue-600">{`Cantidad: ${payload[0].value}`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <Helmet>
        <title>Reportes - LabClínico Pro</title>
        <meta name="description" content="Reportes y estadísticas visuales del laboratorio clínico." />
      </Helmet>

      <div className="space-y-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Reportes y Estadísticas</h1>
          <p className="text-gray-600 mt-1">Visualiza el rendimiento y la carga de trabajo del laboratorio.</p>
        </motion.div>

        <div className="medical-card p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Filtro de Período</h2>
            <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg">
              <Button size="sm" variant={timeRange === 'all' ? 'default' : 'ghost'} onClick={() => setTimeRange('all')}>Total</Button>
              <Button size="sm" variant={timeRange === 'month' ? 'default' : 'ghost'} onClick={() => setTimeRange('month')}>Últimos 30 días</Button>
              <Button size="sm" variant={timeRange === 'week' ? 'default' : 'ghost'} onClick={() => setTimeRange('week')}>Últimos 7 días</Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="medical-card rounded-xl p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Análisis por Tipo</h3>
                <p className="text-sm text-gray-500">Cantidad de cada tipo de análisis solicitado.</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => handleExport('Análisis por Tipo')}><Download className="w-4 h-4 mr-2" />Exportar</Button>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analysisByType} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 102, 204, 0.1)' }} />
                <Bar dataKey="Cantidad" fill="#0066cc" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="medical-card rounded-xl p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Distribución de Estados</h3>
                <p className="text-sm text-gray-500">Estado actual de todos los análisis.</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => handleExport('Distribución de Estados')}><Download className="w-4 h-4 mr-2" />Exportar</Button>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analysisByStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {analysisByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default ReportsPage;