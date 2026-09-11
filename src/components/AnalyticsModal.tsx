import { useState, useEffect } from 'react';
import { X, Calendar, Clock, Timer, Loader2 } from 'lucide-react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area
} from 'recharts';

interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookPath: string;
  bookTitle: string;
}

interface Visit {
  date: string;
  hour: number;
  durationSeconds: number;
  timestamp: string;
}

export default function AnalyticsModal({ isOpen, onClose, bookPath, bookTitle }: AnalyticsModalProps) {
  const [loading, setLoading] = useState(true);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [timeframe, setTimeframe] = useState<'day' | 'month' | 'year'>('day');

  useEffect(() => {
    if (!isOpen) return;

    const fetchVisits = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'pageVisits'),
          where('path', '==', bookPath)
        );
        const snap = await getDocs(q);
        const data = snap.docs.map(doc => doc.data() as Visit);
        // Sort in memory by timestamp
        data.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        setVisits(data);
      } catch (error) {
        console.error("Error fetching analytics", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVisits();
  }, [isOpen, bookPath]);

  if (!isOpen) return null;

  // Process Data
  const groupedData: Record<string, number> = {};
  const hourlyData: number[] = new Array(24).fill(0);
  let totalDuration = 0;

  visits.forEach(v => {
    if (v.date) {
      let key = v.date;
      if (timeframe === 'month') {
        key = v.date.substring(0, 7); // YYYY-MM
      } else if (timeframe === 'year') {
        key = v.date.substring(0, 4); // YYYY
      }
      groupedData[key] = (groupedData[key] || 0) + 1;
    }
    if (typeof v.hour === 'number') {
      hourlyData[v.hour] += 1;
    }
    if (v.durationSeconds) {
      totalDuration += v.durationSeconds;
    }
  });

  const timelineChartData = Object.entries(groupedData).map(([date, count]) => ({ date, count }));
  const hourlyChartData = hourlyData.map((count, hour) => ({ hour: `${hour}:00`, count }));
  
  const averageDuration = visits.length > 0 ? Math.round(totalDuration / visits.length) : 0;
  
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-md shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-stone-200">
          <div>
            <h2 className="text-xl font-serif text-brand-dark">Statistikk: {bookTitle}</h2>
            <p className="text-xs text-stone-500 mt-1">Detaljert oversikt over visningar på salgssida</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-sm transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto bg-stone-50/50 flex-grow">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-stone-400">
              <Loader2 className="w-8 h-8 animate-spin mb-4" />
              <p>Hentar statistikk...</p>
            </div>
          ) : visits.length === 0 ? (
            <div className="text-center py-20 text-stone-500">
              <p>Ingen detaljert statistikk tilgjengeleg for denne boka endå.</p>
              <p className="text-xs mt-2">Visningar før detaljert sporing vart aktivert visast ikkje her.</p>
            </div>
          ) : (
            <div className="space-y-8">
              
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 border border-stone-200 rounded-sm shadow-sm flex items-center gap-4">
                  <div className="p-3 bg-brand-dark/5 text-brand-dark rounded-full">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs text-stone-500 uppercase tracking-wider font-semibold">Totalt (sidan aktivering)</p>
                    <p className="text-2xl font-serif font-bold text-brand-dark">{visits.length} visningar</p>
                  </div>
                </div>
                
                <div className="bg-white p-4 border border-stone-200 rounded-sm shadow-sm flex items-center gap-4">
                  <div className="p-3 bg-amber-500/10 text-amber-600 rounded-full">
                    <Timer className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs text-stone-500 uppercase tracking-wider font-semibold">Gjennomsnittleg tid</p>
                    <p className="text-2xl font-serif font-bold text-brand-dark">{formatTime(averageDuration)}</p>
                  </div>
                </div>

                <div className="bg-white p-4 border border-stone-200 rounded-sm shadow-sm flex items-center gap-4">
                  <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-full">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs text-stone-500 uppercase tracking-wider font-semibold">Siste visning</p>
                    <p className="text-sm font-medium text-brand-dark mt-1">
                      {new Date(visits[visits.length - 1].timestamp).toLocaleString('no-NO')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Timeline Visits Chart */}
                <div className="bg-white p-5 border border-stone-200 rounded-sm shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-brand-dark font-serif">Visningar</h3>
                    <div className="flex bg-stone-100 p-0.5 rounded-sm">
                      <button 
                        onClick={() => setTimeframe('day')}
                        className={`px-2 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-sm transition-colors ${timeframe === 'day' ? 'bg-white shadow-sm text-brand-dark' : 'text-stone-500 hover:text-stone-700'}`}
                      >
                        Dag
                      </button>
                      <button 
                        onClick={() => setTimeframe('month')}
                        className={`px-2 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-sm transition-colors ${timeframe === 'month' ? 'bg-white shadow-sm text-brand-dark' : 'text-stone-500 hover:text-stone-700'}`}
                      >
                        Månad
                      </button>
                      <button 
                        onClick={() => setTimeframe('year')}
                        className={`px-2 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-sm transition-colors ${timeframe === 'year' ? 'bg-white shadow-sm text-brand-dark' : 'text-stone-500 hover:text-stone-700'}`}
                      >
                        År
                      </button>
                    </div>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={timelineChartData}>
                        <defs>
                          <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#1c1917" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#1c1917" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis 
                          dataKey="date" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 12, fill: '#78716c' }}
                          dy={10}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 12, fill: '#78716c' }} 
                        />
                        <Tooltip 
                          contentStyle={{ borderRadius: '4px', border: '1px solid #e7e5e4', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Area type="monotone" dataKey="count" stroke="#1c1917" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Hourly Visits Chart */}
                <div className="bg-white p-5 border border-stone-200 rounded-sm shadow-sm">
                  <h3 className="text-sm font-bold text-brand-dark mb-4 font-serif">Aktivitet gjennom døgnet</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={hourlyChartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis 
                          dataKey="hour" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 11, fill: '#78716c' }}
                          dy={10}
                          interval={3}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 12, fill: '#78716c' }} 
                        />
                        <Tooltip 
                          cursor={{ fill: '#f5f5f4' }}
                          contentStyle={{ borderRadius: '4px', border: '1px solid #e7e5e4' }}
                        />
                        <Bar dataKey="count" fill="#d97706" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
