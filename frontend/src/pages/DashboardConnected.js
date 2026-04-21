import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Tooltip,
  Legend
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { getApiErrorMessage } from '../utils/apiError';
import toast from 'react-hot-toast';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler, Tooltip, Legend);

const chartModes = [
  { id: 'minutes', label: 'Hours' },
  { id: 'sessions', label: 'Sessions' },
  { id: 'focus', label: 'Focus %' }
];

const formatMinutes = (minutes) => {
  if (!minutes) return '0m';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining ? `${hours}h ${remaining}m` : `${hours}h`;
};

const formatMonthLabel = (value) =>
  new Date(`${value}-01T00:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

const formatDayLabel = (value) =>
  new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

const formatSessionTimestamp = (value) =>
  new Date(value).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit'
  });

const formatDateKey = (value) => {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const buildLibraryGroups = (sessions) => {
  const months = new Map();

  sessions.forEach((session) => {
    const dayKey = formatDateKey(session.startTime || session.createdAt);
    const monthKey = dayKey.slice(0, 7);

    if (!months.has(monthKey)) {
      months.set(monthKey, new Map());
    }

    const days = months.get(monthKey);
    if (!days.has(dayKey)) {
      days.set(dayKey, []);
    }

    days.get(dayKey).push(session);
  });

  return Array.from(months.entries()).map(([monthKey, days]) => ({
    monthKey,
    days: Array.from(days.entries()).map(([dayKey, entries]) => ({
      dayKey,
      entries
    }))
  }));
};

export default function DashboardConnected() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('overview');
  const [chartMode, setChartMode] = useState('minutes');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setLoading(true);
    api.get('/sessions/analytics')
      .then((res) => setAnalytics(res.data))
      .catch((err) => toast.error(getApiErrorMessage(err, 'Failed to load analytics')))
      .finally(() => setLoading(false));
  }, []);

  const dailyStats = analytics?.dailyStats || [];
  const streakHistory = analytics?.streakHistory || dailyStats;
  const subjectStats = analytics?.subjectStats || [];
  const recentSessions = analytics?.recentSessions || [];
  const todaySummary = analytics?.todaySummary || {
    totalMinutes: 0,
    sessionCount: 0,
    avgFocusScore: 0
  };

  const filteredSessions = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return recentSessions;

    return recentSessions.filter((session) => {
      const stamp = formatSessionTimestamp(session.startTime || session.createdAt).toLowerCase();
      return (
        session.subject?.toLowerCase().includes(query) ||
        stamp.includes(query) ||
        formatDayLabel(formatDateKey(session.startTime || session.createdAt)).toLowerCase().includes(query)
      );
    });
  }, [recentSessions, searchTerm]);

  const libraryGroups = useMemo(() => buildLibraryGroups(filteredSessions), [filteredSessions]);

  const studyActivityData = useMemo(() => {
    const source = dailyStats.slice(-14);
    return {
      labels: source.map((day) => formatDayLabel(day.date)),
      datasets: [
        {
          label: chartMode === 'minutes' ? 'Hours studied' : chartMode === 'sessions' ? 'Sessions' : 'Focus %',
          data: source.map((day) => {
            if (chartMode === 'sessions') return day.sessionCount;
            if (chartMode === 'focus') return day.avgFocusScore;
            return Number((day.totalMinutes / 60).toFixed(2));
          }),
          borderColor: chartMode === 'focus' ? '#00e3fd' : '#00fc9b',
          backgroundColor: chartMode === 'focus' ? 'rgba(0, 227, 253, 0.22)' : 'rgba(0, 252, 155, 0.2)',
          fill: true,
          tension: 0.35,
          pointRadius: 3,
          pointHoverRadius: 5
        }
      ]
    };
  }, [chartMode, dailyStats]);

  const streakGraphData = useMemo(() => ({
    labels: streakHistory.map((day) => formatDayLabel(day.date)),
    datasets: [
      {
        label: 'Streak',
        data: streakHistory.map((day) => day.streakCount),
        borderColor: '#ffe483',
        backgroundColor: 'rgba(255, 228, 131, 0.2)',
        fill: true,
        tension: 0.3,
        pointRadius: 2
      }
    ]
  }), [streakHistory]);

  const subjectChartData = useMemo(() => ({
    labels: subjectStats.map((subject) => subject._id),
    datasets: [
      {
        label: 'Minutes',
        data: subjectStats.map((subject) => subject.totalMinutes),
        backgroundColor: ['#00fc9b', '#00e3fd', '#ffe483', '#ff8e72', '#86efac'],
        borderRadius: 10
      }
    ]
  }), [subjectStats]);

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      x: {
        ticks: { color: '#94a3b8', maxRotation: 0, autoSkip: true },
        grid: { display: false }
      },
      y: {
        ticks: { color: '#94a3b8' },
        grid: { color: 'rgba(148, 163, 184, 0.12)' }
      }
    }
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      x: {
        ticks: { color: '#94a3b8' },
        grid: { display: false }
      },
      y: {
        ticks: { color: '#94a3b8' },
        grid: { color: 'rgba(148, 163, 184, 0.12)' }
      }
    }
  };

  const renderOverview = () => (
    <>
      <section style={styles.heroSection}>
        <div>
          <h1 style={styles.heroTitle}>
            Welcome back, <span style={{ color: '#9ca3af' }}>{user?.name || 'Focus Initiate'}</span>
          </h1>
          <p style={styles.heroText}>No distractions. Just progress</p>
        </div>
        <div style={styles.heroActions}>
          <button style={styles.ghostButton} onClick={() => setActiveSection('library')}>View Library</button>
          <button style={styles.primaryButton} onClick={() => navigate('/session')}>Lock In Now</button>
        </div>
      </section>

      <section style={styles.metricGrid}>
        <div style={styles.metricCard}>
          <div style={styles.metricLabel}>Momentum</div>
          <div style={styles.metricValue}>{user?.streak?.current || 0}</div>
          <div style={styles.metricSubtle}>Current streak in days</div>
        </div>
        <div style={styles.metricCard}>
          <div style={styles.metricLabel}>Focus Output</div>
          <div style={styles.metricValue}>{formatMinutes(todaySummary.totalMinutes)}</div>
          <div style={styles.metricSubtle}>Time you studied today</div>
        </div>
        <div style={styles.metricCard}>
          <div style={styles.metricLabel}>Volume</div>
          <div style={styles.metricValue}>{todaySummary.sessionCount}</div>
          <div style={styles.metricSubtle}>Sessions completed today</div>
        </div>
        <div style={styles.metricCard}>
          <div style={styles.metricLabel}>Intensity</div>
          <div style={styles.metricValue}>{todaySummary.avgFocusScore}%</div>
          <div style={styles.metricSubtle}>Average focus score today</div>
        </div>
      </section>

      <section style={styles.contentColumns}>
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <div>
              <h3 style={styles.panelTitle}>Study Activity</h3>
              <p style={styles.panelSubtitle}>Real session trend from the last 14 days</p>
            </div>
            <div style={styles.modeSwitch}>
              {chartModes.map((mode) => (
                <button
                  key={mode.id}
                  style={mode.id === chartMode ? styles.modeButtonActive : styles.modeButton}
                  onClick={() => setChartMode(mode.id)}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
          <div style={styles.chartWrap}>
            <Line data={studyActivityData} options={lineOptions} />
          </div>
        </div>

        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <div>
              <h3 style={styles.panelTitle}>Subjects</h3>
              <p style={styles.panelSubtitle}>Minutes studied by subject</p>
            </div>
          </div>
          <div style={styles.subjectList}>
            {subjectStats.length ? subjectStats.map((subject) => (
              <div key={subject._id} style={styles.subjectRow}>
                <div>
                  <div style={styles.subjectName}>{subject._id}</div>
                  <div style={styles.subjectMeta}>{subject.sessionCount} sessions</div>
                </div>
                <div style={styles.subjectMeta}>
                  {formatMinutes(subject.totalMinutes)} • {subject.avgFocusScore}%
                </div>
              </div>
            )) : <div style={styles.emptyState}>No subject data yet.</div>}
          </div>
        </div>
      </section>
    </>
  );

  const renderStatistics = () => (
    <section style={styles.statsGrid}>
      <div style={styles.panel}>
        <div style={styles.panelHeader}>
          <div>
            <h3 style={styles.panelTitle}>Focus Graph</h3>
            <p style={styles.panelSubtitle}>Average focus score over the last 30 days</p>
          </div>
        </div>
        <div style={styles.chartWrapTall}>
          <Line
            data={{
              labels: dailyStats.map((day) => formatDayLabel(day.date)),
              datasets: [{
                label: 'Focus %',
                data: dailyStats.map((day) => day.avgFocusScore),
                borderColor: '#00e3fd',
                backgroundColor: 'rgba(0, 227, 253, 0.18)',
                fill: true,
                tension: 0.35,
                pointRadius: 2
              }]
            }}
            options={lineOptions}
          />
        </div>
      </div>

      <div style={styles.panel}>
        <div style={styles.panelHeader}>
          <div>
            <h3 style={styles.panelTitle}>Real Streak Graph</h3>
            <p style={styles.panelSubtitle}>Built from actual days when you studied</p>
          </div>
        </div>
        <div style={styles.chartWrapTall}>
          <Line data={streakGraphData} options={lineOptions} />
        </div>
      </div>

      <div style={styles.panel}>
        <div style={styles.panelHeader}>
          <div>
            <h3 style={styles.panelTitle}>Subject Distribution</h3>
            <p style={styles.panelSubtitle}>Total minutes logged in each subject</p>
          </div>
        </div>
        <div style={styles.chartWrapTall}>
          <Bar data={subjectChartData} options={barOptions} />
        </div>
      </div>
    </section>
  );

  const renderLibrary = () => (
    <section style={styles.panel}>
      <div style={styles.panelHeader}>
        <div>
          <h3 style={styles.panelTitle}>Session Library</h3>
          <p style={styles.panelSubtitle}>Grouped by month and then by day</p>
        </div>
        <input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search subject or date"
          style={styles.searchInput}
        />
      </div>

      {libraryGroups.length ? libraryGroups.map((month) => (
        <div key={month.monthKey} style={styles.monthBlock}>
          <h4 style={styles.monthTitle}>{formatMonthLabel(month.monthKey)}</h4>
          {month.days.map((day) => (
            <div key={day.dayKey} style={styles.dayBlock}>
              <div style={styles.dayTitle}>{formatDayLabel(day.dayKey)}</div>
              <div style={styles.sessionGrid}>
                {day.entries.map((session) => (
                  <motion.div
                    key={session._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={styles.sessionCard}
                  >
                    <div style={styles.sessionTop}>
                      <div>
                        <div style={styles.subjectName}>{session.subject}</div>
                        <div style={styles.subjectMeta}>{formatSessionTimestamp(session.startTime || session.createdAt)}</div>
                      </div>
                      <div style={styles.focusBadge}>{session.focusScore}%</div>
                    </div>
                    <div style={styles.sessionStats}>
                      <span>{formatMinutes(session.duration)}</span>
                      <span>{session.distractions?.length || 0} alerts</span>
                      <span>{session.pomodoroSessions || 0} pomodoros</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )) : <div style={styles.emptyState}>No saved sessions match your search.</div>}
    </section>
  );

  return (
    <div style={styles.appShell}>
      <aside style={styles.sidebar}>
        <div style={styles.logo}>Lockin</div>
        <button style={activeSection === 'overview' ? styles.navActive : styles.navButton} onClick={() => setActiveSection('overview')}>Dashboard</button>
        <button style={styles.navButton} onClick={() => navigate('/session')}>Focus Sessions</button>
        <button style={activeSection === 'statistics' ? styles.navActive : styles.navButton} onClick={() => setActiveSection('statistics')}>Statistics</button>
        <button style={activeSection === 'library' ? styles.navActive : styles.navButton} onClick={() => setActiveSection('library')}>Library</button>
        <div style={styles.sidebarFooter}>
          <button style={styles.primaryButton} onClick={() => navigate('/session')}>Lock In</button>
          <button
            style={styles.logoutButton}
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            Logout
          </button>
        </div>
      </aside>

      <main style={styles.main}>
        <header style={styles.header}>
          <div>
            <div style={styles.headerEyebrow}>LOCKIN ANALYTICS</div>
            <h2 style={styles.headerTitle}>
              {activeSection === 'overview' ? 'Dashboard' : activeSection === 'statistics' ? 'Statistics' : 'Library'}
            </h2>
          </div>
          <div style={styles.headerUser}>
            <div style={styles.headerUserName}>{user?.name || 'User'}</div>
            <div style={styles.headerUserMeta}>{recentSessions.length} total sessions saved</div>
          </div>
        </header>

        {loading ? (
          <div style={styles.loadingState}>Loading your real session data...</div>
        ) : activeSection === 'statistics' ? renderStatistics() : activeSection === 'library' ? renderLibrary() : renderOverview()}
      </main>
    </div>
  );
}

const styles = {
  appShell: { minHeight: '100vh', display: 'flex', background: '#070b11', color: '#e5edf7' },
  sidebar: { width: 240, padding: 24, borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: 12, background: '#0b111a' },
  logo: { fontFamily: 'Syne, sans-serif', fontSize: 28, fontWeight: 800, color: '#00fc9b', marginBottom: 20 },
  navButton: { background: 'transparent', color: '#94a3b8', border: '1px solid transparent', borderRadius: 12, padding: '12px 14px', textAlign: 'left', cursor: 'pointer' },
  navActive: { background: 'rgba(0,252,155,0.12)', color: '#00fc9b', border: '1px solid rgba(0,252,155,0.18)', borderRadius: 12, padding: '12px 14px', textAlign: 'left', cursor: 'pointer' },
  sidebarFooter: { marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 12 },
  primaryButton: { background: 'linear-gradient(135deg, #00fc9b, #9dffbe)', color: '#032114', border: 'none', borderRadius: 12, padding: '12px 16px', fontWeight: 700, cursor: 'pointer' },
  ghostButton: { background: 'transparent', color: '#e5edf7', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '12px 16px', cursor: 'pointer' },
  logoutButton: { background: 'transparent', color: '#f87171', border: '1px solid rgba(248,113,113,0.16)', borderRadius: 12, padding: '12px 16px', cursor: 'pointer' },
  main: { flex: 1, padding: 32, display: 'flex', flexDirection: 'column', gap: 24 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 },
  headerEyebrow: { color: '#00fc9b', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 8 },
  headerTitle: { fontFamily: 'Syne, sans-serif', fontSize: 36, margin: 0 },
  headerUser: { textAlign: 'right' },
  headerUserName: { fontWeight: 700, fontSize: 16 },
  headerUserMeta: { color: '#94a3b8', fontSize: 13 },
  heroSection: { display: 'flex', justifyContent: 'space-between', gap: 24, alignItems: 'flex-end', flexWrap: 'wrap' },
  heroPretitle: { color: '#00fc9b', textTransform: 'uppercase', letterSpacing: '0.18em', fontSize: 12, display: 'block', marginBottom: 10 },
  heroTitle: { fontFamily: 'Syne, sans-serif', fontSize: 44, lineHeight: 1.05, margin: 0 },
  heroText: { color: '#94a3b8', fontSize: 15, marginTop: 12, maxWidth: 560 },
  heroActions: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  metricGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 18 },
  metricCard: { background: '#0d1520', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, padding: 22 },
  metricLabel: { color: '#8aa0b7', textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: 12, marginBottom: 14 },
  metricValue: { fontFamily: 'Syne, sans-serif', fontSize: 34, fontWeight: 800 },
  metricSubtle: { color: '#94a3b8', fontSize: 13, marginTop: 8 },
  contentColumns: { display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 18 },
  statsGrid: { display: 'grid', gridTemplateColumns: '1fr', gap: 18 },
  panel: { background: '#0d1520', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, padding: 22 },
  panelHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 18 },
  panelTitle: { margin: 0, fontFamily: 'Syne, sans-serif', fontSize: 22 },
  panelSubtitle: { margin: '6px 0 0', color: '#94a3b8', fontSize: 13 },
  chartWrap: { height: 320 },
  chartWrapTall: { height: 340 },
  modeSwitch: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  modeButton: { background: 'transparent', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 999, padding: '8px 12px', cursor: 'pointer' },
  modeButtonActive: { background: 'rgba(0,252,155,0.12)', color: '#00fc9b', border: '1px solid rgba(0,252,155,0.18)', borderRadius: 999, padding: '8px 12px', cursor: 'pointer' },
  subjectList: { display: 'flex', flexDirection: 'column', gap: 14 },
  subjectRow: { display: 'flex', justifyContent: 'space-between', gap: 12, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' },
  subjectName: { fontWeight: 700, fontSize: 15 },
  subjectMeta: { color: '#94a3b8', fontSize: 13 },
  searchInput: { background: '#09101a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, color: '#e5edf7', padding: '12px 14px', minWidth: 220, outline: 'none' },
  monthBlock: { marginTop: 16 },
  monthTitle: { fontFamily: 'Syne, sans-serif', fontSize: 24, margin: '0 0 12px' },
  dayBlock: { marginBottom: 18 },
  dayTitle: { color: '#00fc9b', fontWeight: 700, marginBottom: 12 },
  sessionGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 },
  sessionCard: { background: '#09101a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 16 },
  sessionTop: { display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  focusBadge: { background: 'rgba(0,227,253,0.12)', color: '#00e3fd', borderRadius: 999, padding: '6px 10px', height: 'fit-content', fontWeight: 700, fontSize: 12 },
  sessionStats: { display: 'flex', gap: 12, flexWrap: 'wrap', color: '#94a3b8', fontSize: 12 },
  emptyState: { color: '#94a3b8', fontSize: 14, padding: '16px 0' },
  loadingState: { color: '#94a3b8', fontSize: 15, paddingTop: 20 }
};
