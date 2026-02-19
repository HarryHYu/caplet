import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, ReferenceLine } from 'recharts';
import api from '../services/api';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

const SurveyResults = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await api.getSurveyStats();
        setStats(data);
      } catch (err) {
        setError(err.message || 'Failed to load survey statistics');
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center page-section-light">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-brand border-t-transparent mx-auto mb-4"></div>
          <p className="mt-2 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.25em]">
            Loading survey results...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center page-section-light">
        <div className="text-center max-w-md mx-auto px-6">
          <span className="section-kicker mb-4 text-red-500">Error</span>
          <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.25em]">
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (!stats || stats.total === 0) {
    return (
      <div className="min-h-screen py-24 page-section-light">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-900 p-10 text-center">
            <span className="section-kicker mb-4">Survey Results</span>
            <h1 className="text-3xl font-extrabold text-black dark:text-white mb-4 uppercase tracking-tight">Survey Results</h1>
            <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.25em]">
              No survey responses yet. Check back later.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Prepare data for charts
  const ageData = Object.entries(stats.age).map(([name, value]) => ({ name, value }));
  const tracksSpendingData = Object.entries(stats.tracksSpending).map(([name, value]) => ({ 
    name: name === 'yes' ? 'Yes' : 'No', 
    value 
  }));
  const taughtAtSchoolData = Object.entries(stats.taughtAtSchool).map(([name, value]) => ({ 
    name: name === 'yes' ? 'Yes' : 'No', 
    value 
  }));
  const termsConfusingData = Object.entries(stats.termsConfusing).map(([name, value]) => ({ 
    name: name === 'yes' ? 'Yes' : 'No', 
    value 
  }));
  const helpfulExplanationsData = Object.entries(stats.helpfulExplanations).map(([name, value]) => ({ 
    name, 
    value 
  }));
  // Generate confidence data for all levels 1-10, filling in 0 for missing ones
  const confidenceData = [];
  for (let i = 1; i <= 10; i++) {
    confidenceData.push({
      level: i,
      name: i.toString(),
      value: stats.confidence.distribution[i] || 0
    });
  }

  const renderLabel = (entry) => {
    const percent = ((entry.value / stats.total) * 100).toFixed(1);
    return `${entry.name}: ${percent}%`;
  };

  return (
    <div className="min-h-screen py-24 page-section-light">
      <div className="container-custom">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-900 p-10 mb-8">
            <span className="section-kicker mb-4">Survey Results</span>
            <h1 className="text-4xl font-extrabold text-black dark:text-white mb-2 uppercase tracking-tight">Survey Results</h1>
            <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.25em]">
              Total Responses:{' '}
              <span className="text-brand">
                {stats.total}
              </span>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Age Distribution */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Age Distribution</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={ageData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderLabel}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {ageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Tracks Spending */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Do You Track Your Spending?</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={tracksSpendingData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderLabel}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {tracksSpendingData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Taught at School */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Taught Financial Concepts at School?</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={taughtAtSchoolData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderLabel}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {taughtAtSchoolData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Terms Confusing */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Do Financial Terms Feel Confusing?</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={termsConfusingData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderLabel}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {termsConfusingData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Confidence Level */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Confidence in Understanding Financial Concepts
            </h2>
            <p className="text-gray-600 mb-4">
              Average Confidence: <span className="font-semibold text-blue-600">{stats.confidence.average} / 10</span>
            </p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={confidenceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  label={{ value: 'Confidence Level', position: 'insideBottom', offset: -5 }}
                />
                <YAxis 
                  label={{ value: 'Number of Responses', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip />
                <ReferenceLine 
                  y={stats.confidence.average} 
                  stroke="#EF4444" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  label={{ value: `Average: ${stats.confidence.average}`, position: 'right' }}
                />
                <Bar dataKey="value" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Helpful Explanations */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              What Helps You Understand Financial Concepts?
            </h2>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={helpfulExplanationsData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={150} />
                <Tooltip />
                <Bar dataKey="value" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SurveyResults;

