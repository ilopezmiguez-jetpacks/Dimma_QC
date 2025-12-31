import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { SlidersHorizontal, CheckCircle, AlertTriangle, Wrench, Calendar, BarChart3, Loader2 } from 'lucide-react';
import { useQCData } from '@/contexts/QCDataContext';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient'; // Import supabase

const Dashboard = () => {
  const { equipment } = useQCData(); // Removed qcReports
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reportsTodayCount, setReportsTodayCount] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);

  const getTodayString = () => new Date().toISOString().split('T')[0];

  useEffect(() => {
    const fetchTodayStats = async () => {
      if (!user) return;
      setLoadingStats(true);
      try {
        const today = getTodayString();
        const startOfDay = new Date(today);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);

        const { count, error } = await supabase
          .from('qc_reports')
          .select('*', { count: 'exact', head: true })
          .gte('date', startOfDay.toISOString())
          .lte('date', endOfDay.toISOString());

        if (error) throw error;
        setReportsTodayCount(count || 0);

      } catch (err) {
        console.error("Error fetching dashboard stats:", err);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchTodayStats();
  }, [user]);

  const stats = {
    totalEquipment: equipment.length,
    okEquipment: equipment.filter(e => e.status === 'ok').length,
    warningEquipment: equipment.filter(e => e.status === 'warning').length,
    errorEquipment: equipment.filter(e => e.status === 'error').length,
    maintenanceDue: equipment.filter(e => new Date(e.maintenanceDue) < new Date()).length,
    reportsToday: reportsTodayCount,
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const StatCard = ({ icon: Icon, title, value, subtitle, color, onClick }) => (
    <div
      onClick={onClick}
      className={`medical-card rounded-xl p-6 hover:shadow-lg transition-all duration-300 ${onClick ? 'cursor-pointer hover:scale-105' : ''}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold text-foreground mt-1">{value}</p>
          {subtitle && <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>}
        </div>
        <div className={`w-12 h-12 bg-${color}-100 rounded-lg flex items-center justify-center`}>
          <Icon className={`w-6 h-6 text-${color}-600`} />
        </div>
      </div>
    </div>
  );

  const equipmentWithIssues = equipment.filter(e => e.status === 'error' || e.status === 'warning');

  const displayUserName = user?.profile?.full_name || user?.user_metadata?.full_name || user?.email || 'User';

  return (
    <>
      <Helmet>
        <title>Dashboard - DIMMA QC</title>
        <meta name="description" content="Main dashboard for laboratory equipment quality control management." />
      </Helmet>

      <div className="space-y-6">
        <div
          className="medical-card rounded-xl p-6"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                {getGreeting()}, {displayUserName}! 👋
              </h1>
              <p className="text-muted-foreground mt-1">
                Summary of today's quality control status.
              </p>
            </div>
            <div className="mt-4 md:mt-0 flex items-center space-x-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>{new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            icon={SlidersHorizontal}
            title="Monitored Equipment"
            value={stats.totalEquipment}
            subtitle="Total equipment"
            color="teal"
            onClick={() => navigate('/equipment')}
          />
          <StatCard
            icon={CheckCircle}
            title="Equipment OK"
            value={stats.okEquipment}
            subtitle="Operating in range"
            color="green"
            onClick={() => navigate('/equipment?status=ok')}
          />
          <StatCard
            icon={AlertTriangle}
            title="Equipment with Alerts"
            value={stats.warningEquipment + stats.errorEquipment}
            subtitle="Require attention"
            color="orange"
            onClick={() => navigate('/equipment?status=issue')}
          />
          <StatCard
            icon={Wrench}
            title="Maintenance"
            value={stats.maintenanceDue}
            subtitle="Services overdue"
            color="red"
            onClick={() => navigate('/equipment?status=maintenance')}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div
            className="lg:col-span-2 medical-card rounded-xl p-6"
          >
            <h2 className="text-xl font-bold text-foreground mb-4">Equipment with Issues</h2>
            {equipmentWithIssues.length > 0 ? (
              <div className="space-y-4">
                {equipmentWithIssues.map(eq => (
                  <div key={eq.id} className={`p-3 rounded-lg flex items-center justify-between border-l-4 ${eq.status === 'error' ? 'bg-red-50 border-red-500' : 'bg-yellow-50 border-yellow-500'}`}>
                    <div>
                      <p className="font-semibold text-gray-800">{eq.name}</p>
                      <p className="text-sm text-gray-500">{eq.model}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`font-bold text-sm ${eq.status === 'error' ? 'text-red-600' : 'text-yellow-600'}`}>
                        {eq.status === 'error' ? 'ERROR' : 'WARNING'}
                      </span>
                      <button onClick={() => navigate(`/equipment/${eq.id}`)} className="bg-white text-black text-sm py-1 px-3 rounded-md border">View Details</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                <p className="font-semibold text-gray-700">All systems normal!</p>
                <p className="text-sm text-gray-500">No equipment with warnings or errors.</p>
              </div>
            )}
          </div>

          <div
            className="medical-card rounded-xl p-6 flex flex-col justify-between"
          >
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">Today's Reports</h2>
              {loadingStats ? (
                <div className="h-12 flex items-center">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : (
                <p className="text-5xl font-bold text-primary">{stats.reportsToday}</p>
              )}
              <p className="text-muted-foreground">Quality controls submitted.</p>
            </div>
            <button onClick={() => navigate('/statistics')} className="bg-primary text-white w-full mt-4 py-2 px-4 rounded-md flex items-center justify-center">
              <BarChart3 className="w-4 h-4 mr-2" />
              View Statistics
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;