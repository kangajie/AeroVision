import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { apiGet, apiDelete } from '../api/client';

export default function HistoryPage() {
  const [logs, setLogs] = useState([]);
  const [timeFilter, setTimeFilter] = useState('today'); // today, week, month, year
  const [isLoading, setIsLoading] = useState(true);

  // Fetch data — backend yang query Supabase
  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const result = await apiGet('/api/events?page=1&limit=200');
      setLogs(result.data || []);
    } catch (err) {
      console.error('[History] Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // CRUD: Delete single log — backend yang hapus dari Supabase
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this log?')) return;
    try {
      await apiDelete(`/api/events/${id}`);
      setLogs(prev => prev.filter(log => log.id !== id));
    } catch (err) {
      console.error('[History] Delete error:', err);
      alert('Gagal menghapus log.');
    }
  };

  // CRUD: Clear all logs — backend yang hapus semua dari Supabase
  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to delete ALL logs? This cannot be undone.')) return;
    try {
      await apiDelete('/api/events');
      setLogs([]);
    } catch (err) {
      console.error('[History] Clear error:', err);
      alert('Gagal menghapus semua log.');
    }
  };

  // Dynamic Chart Data Calculation
  const chartData = useMemo(() => {
    const now = new Date();
    
    // Filter logs based on timeFilter
    const filteredLogs = logs.filter(log => {
      const logDate = new Date(log.timestamp);
      if (timeFilter === 'today') {
        return logDate.toDateString() === now.toDateString();
      }
      if (timeFilter === 'week') {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(now.getDate() - 7);
        return logDate >= oneWeekAgo;
      }
      if (timeFilter === 'month') {
        return logDate.getMonth() === now.getMonth() && logDate.getFullYear() === now.getFullYear();
      }
      if (timeFilter === 'year') {
        return logDate.getFullYear() === now.getFullYear();
      }
      return true;
    });

    // Aggregate
    // For simplicity, we just aggregate total counts per class for the selected period.
    // Grouping by time bucket (hour/day) is more complex, so we just group by "Total in Period"
    const totals = { name: timeFilter.toUpperCase(), person: 0, car: 0, truck: 0, bus: 0, motorcycle: 0 };
    
    filteredLogs.forEach(log => {
      if (log.direction === 'Masuk' && totals[log.object_class] !== undefined) {
         totals[log.object_class]++;
      }
      // Note: we might subtract if Keluar, but usually charts show total 'Masuk' traffic.
    });

    return [totals];
  }, [logs, timeFilter]);

  const getChartTitle = () => {
    switch(timeFilter) {
      case 'week': return 'Traffic Trends (Past 7 Days)';
      case 'month': return 'Traffic Trends (This Month)';
      case 'year': return 'Traffic Trends (This Year)';
      default: return 'Traffic Trends (Today)';
    }
  };

  const downloadCSV = () => {
    const headers = ['Event ID,Time,Class,Direction'];
    const rows = logs.map(log => `${log.id},${new Date(log.timestamp).toLocaleString()},${log.object_class},${log.direction}`);
    const csvContent = "data:text/csv;charset=utf-8," + headers.concat(rows).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `cctv_logs_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="display-lg text-[var(--color-ink)] m-0">History & Logs</h1>
          <p className="body-sm text-[var(--color-mute)]">Analitik akumulatif harian dan riwayat raw event dari database.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleAddDummy} className="px-4 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50 utility-sm font-bold text-gray-700 shadow-sm transition-colors">
            + Add Manual Log
          </button>
          <button onClick={handleClearAll} className="px-4 py-2 border border-red-300 rounded-md bg-red-50 hover:bg-red-100 utility-sm font-bold text-red-600 shadow-sm transition-colors">
            Clear All Logs
          </button>
          <button onClick={downloadCSV} className="button-primary flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Download CSV
          </button>
        </div>
      </div>

      {/* Chart Section */}
      <div className="doc-card w-full h-[400px] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="heading-sm text-[var(--color-ink)] m-0">{getChartTitle()}</h2>
          
          <div className="flex items-center bg-[var(--color-surface-soft)] p-1 rounded-full border border-[var(--color-hairline)]">
            {['today', 'week', 'month', 'year'].map((filter) => (
              <button
                key={filter}
                onClick={() => setTimeFilter(filter)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase transition-all ${timeFilter === filter ? 'bg-white shadow-sm text-[var(--color-ink)]' : 'text-[var(--color-mute)] hover:text-[var(--color-ink)]'}`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-hairline)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'var(--color-mute)', fontSize: 12}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--color-mute)', fontSize: 12}} />
              <Tooltip cursor={{fill: 'var(--color-surface-soft)'}} contentStyle={{borderRadius: '8px', border: '1px solid var(--color-hairline)'}} />
              <Legend wrapperStyle={{fontSize: '12px'}} />
              <Bar dataKey="person" stackId="a" fill="var(--color-accent-blue)" />
              <Bar dataKey="car" stackId="a" fill="var(--color-accent-green)" />
              <Bar dataKey="truck" stackId="a" fill="var(--color-primary)" />
              <Bar dataKey="bus" stackId="a" fill="var(--color-accent-purple)" />
              <Bar dataKey="motorcycle" stackId="a" fill="var(--color-accent-red)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table Section */}
      <div className="doc-card flex-1 flex flex-col overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <h2 className="heading-sm text-[var(--color-ink)] m-0">Raw Events Log (Database)</h2>
          <button onClick={fetchLogs} className="utility-xs text-[var(--color-primary)] font-bold hover:underline">
            Refresh Data
          </button>
        </div>
        <div className="overflow-auto border border-[var(--color-hairline)] rounded-[var(--radius-md)] flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[var(--color-surface-soft)] sticky top-0 z-10">
              <tr>
                <th className="p-3 utility-xs text-[var(--color-mute)] font-semibold border-b border-[var(--color-hairline)]">Time</th>
                <th className="p-3 utility-xs text-[var(--color-mute)] font-semibold border-b border-[var(--color-hairline)]">Event ID</th>
                <th className="p-3 utility-xs text-[var(--color-mute)] font-semibold border-b border-[var(--color-hairline)]">Class</th>
                <th className="p-3 utility-xs text-[var(--color-mute)] font-semibold border-b border-[var(--color-hairline)]">Direction</th>
                <th className="p-3 utility-xs text-[var(--color-mute)] font-semibold border-b border-[var(--color-hairline)] text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="p-6 text-center text-[var(--color-mute)] utility-sm">Loading data from database...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-6 text-center text-[var(--color-mute)] utility-sm">No logs found in database.</td>
                </tr>
              ) : logs.map((log) => (
                <tr key={log.id} className="border-b border-[var(--color-hairline)] hover:bg-[var(--color-surface-soft)] transition-colors">
                  <td className="p-3 body-xs text-[var(--color-ink)]">{new Date(log.timestamp).toLocaleTimeString()}</td>
                  <td className="p-3 code-sm text-[var(--color-ink)]">{log.id.split('-')[0]}</td>
                  <td className="p-3 body-xs text-[var(--color-ink)] capitalize">{log.object_class}</td>
                  <td className="p-3 body-xs">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${log.direction === 'Masuk' ? 'bg-[var(--color-accent-green-soft)] text-[var(--color-accent-green)]' : 'bg-[var(--color-accent-red-soft)] text-[var(--color-accent-red)]'}`}>
                      {log.direction}
                    </span>
                  </td>
                  <td className="p-3 body-xs text-right">
                    <button onClick={() => handleDelete(log.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors utility-xs font-bold">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
