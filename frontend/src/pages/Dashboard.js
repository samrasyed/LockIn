import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/sessions/analytics')
      .then(res => setAnalytics(res.data))
      .catch(() => toast.error('Failed to load analytics'))
      .finally(() => setLoading(false));
  }, []);

  // Compute 3D Chart Bars dynamically bounds
  const maxMinutes = Math.max(...(analytics?.dailyStats?.map(d => d.totalMinutes) || [1]));
  const chartBars = analytics?.dailyStats?.map(d => {
    return {
      label: d._id,
      heightPercent: Math.max((d.totalMinutes / maxMinutes) * 100, 10),
      hours: (d.totalMinutes / 60).toFixed(1)
    };
  }) || [];
  
  // Fill empty bars to maintain the visual curve structure if blank
  const renderBars = chartBars.length > 5 ? chartBars : [
    { heightPercent: 20 }, { heightPercent: 40 }, { heightPercent: 25 },
    { heightPercent: 80 }, { heightPercent: 30 }, { heightPercent: 20 },
    { heightPercent: 60 }, { heightPercent: 45 }, { heightPercent: 15 },
    { heightPercent: 85 }
  ];

  const totalMinutes = user?.totalStats?.totalMinutes || 0;
  const avgFocus = user?.totalStats?.avgFocusScore || 0;
  const totalSessions = user?.totalStats?.totalSessions || 0;

  return (
    <div style={styles.appContainer}>
      
      {/* LEFT SIDEBAR NAVBAR */}
      <aside style={styles.sidebar}>
        <div style={styles.logoContainer}>
          <span className="font-headline" style={styles.logoText}>Lockin</span>
        </div>
        <div style={styles.navGroup}>
          <button style={{...styles.navBtn, ...styles.navBtnActive}}>
            <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>grid_view</span>
            <span className="font-label" style={styles.navLabel}>Dashboard</span>
          </button>
          <button style={styles.navBtn} onClick={() => navigate('/session')}>
            <span className="material-symbols-outlined">timer</span>
            <span className="font-label" style={styles.navLabel}>Focus Sessions</span>
          </button>
          <button style={styles.navBtn}>
            <span className="material-symbols-outlined">insights</span>
            <span className="font-label" style={styles.navLabel}>Statistics</span>
          </button>
          <button style={styles.navBtn}>
            <span className="material-symbols-outlined">menu_book</span>
            <span className="font-label" style={styles.navLabel}>Library</span>
          </button>
        </div>
        
        <div style={styles.sidebarBottom}>
          <div style={{padding: '0 16px', marginBottom: 16}}>
            <button onClick={() => navigate('/session')} style={styles.lockInBtnSidebar}>
              Lock In
            </button>
          </div>
          <button style={styles.navBtn}>
            <span className="material-symbols-outlined">help</span>
            <span className="font-label" style={styles.navLabel}>Help</span>
          </button>
          <button onClick={() => { logout(); navigate('/login'); }} style={{...styles.navBtn, color: '#ff716c'}}>
            <span className="material-symbols-outlined">logout</span>
            <span className="font-label" style={styles.navLabel}>Logout</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT CANVAS */}
      <main className="custom-scrollbar" style={styles.mainCanvas}>
        
        {/* TOP HEADER */}
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <h1 className="font-headline" style={styles.mobileLogo}>Lockin</h1>
            <div style={styles.headerDivider} />
            <span className="font-label" style={styles.headerTitle}>Command Center</span>
          </div>
          
          <div style={styles.headerRight}>
            <div style={styles.searchBox}>
              <span className="material-symbols-outlined" style={styles.searchIcon}>search</span>
              <input type="text" placeholder="Search sessions..." style={styles.searchInput} />
            </div>
            <button style={styles.iconBtn}><span className="material-symbols-outlined">notifications</span></button>
            <button style={styles.iconBtn}><span className="material-symbols-outlined">settings</span></button>
            <div style={styles.avatarWrap}>
              <img src={`https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=00fc9b&color=0c0e12&bold=true`} style={styles.avatarImg} alt="User Avatar"/>
            </div>
          </div>
        </header>

        {/* DASHBOARD GRID CONTENT */}
        <div style={styles.contentGrid}>
          
          {/* Hero Section */}
          <section style={styles.heroSection}>
            <div>
              <span className="font-label" style={styles.heroPretitle}>System Online</span>
              <h2 className="font-headline" style={styles.heroTitle}>
                Welcome Back, <br/>
                <span style={{color: '#aaabb0'}}>{user?.name || 'Focus Initiate'}.</span>
              </h2>
            </div>
            <div style={styles.heroActions}>
              <button className="ghost-border" style={styles.historyBtn}>
                <span className="font-label" style={{letterSpacing: '0.1em'}}>VIEW HISTORY</span>
              </button>
              <button onClick={() => navigate('/session')} style={styles.lockInBtnMain}>
                <span className="font-label" style={{letterSpacing: '0.2em'}}>LOCK IN NOW</span>
              </button>
            </div>
          </section>

          {/* Metrics Bento Group */}
          <div style={styles.metricsGroup}>
            
            {/* Streak Card */}
            <div className="glass-card ghost-border" style={{...styles.metricCard, overflow: 'hidden'}}>
              <div style={styles.metricHeader}>
                <span className="font-label" style={styles.metricLabel}>MOMENTUM</span>
                <span className="material-symbols-outlined" style={{color: 'var(--tertiary)', animation: 'pulse 2s infinite', fontVariationSettings: "'FILL' 1"}}>local_fire_department</span>
              </div>
              <div style={styles.metricValueWrap}>
                <span className="font-headline" style={{...styles.metricValue, color: 'var(--tertiary)'}}>{user?.streak?.current || 0}</span>
                <span className="font-headline" style={styles.metricUnit}>Day Streak</span>
              </div>
              <p style={{fontSize: 12, color: 'var(--on-surface-variant)', marginTop: 16}}>Next milestone in 24 hours.<br/>Keep the heat!</p>
              <div style={styles.metricGlowTertiary} />
            </div>

            {/* Focus Output Card */}
            <div className="glass-card ghost-border" style={styles.metricCard}>
              <div style={styles.metricHeader}>
                <span className="font-label" style={styles.metricLabel}>FOCUS OUTPUT</span>
                <span className="material-symbols-outlined" style={{color: 'var(--primary)'}}>schedule</span>
              </div>
              <div style={styles.metricValueWrap}>
                <span className="font-headline" style={styles.metricValue}>{(totalMinutes / 60).toFixed(1)}</span>
                <span className="font-headline" style={styles.metricUnit}>Hours Total</span>
              </div>
              <div style={styles.progBarTrack}>
                <div style={{...styles.progBarFillPrimary, width: `${Math.min((totalMinutes / 600) * 100, 100)}%`}} />
              </div>
            </div>

            {/* Intensity Card */}
            <div className="glass-card ghost-border" style={styles.metricCard}>
              <div style={styles.metricHeader}>
                <span className="font-label" style={styles.metricLabel}>INTENSITY</span>
                <span className="material-symbols-outlined" style={{color: 'var(--secondary)'}}>bolt</span>
              </div>
              <div style={styles.metricValueWrap}>
                <span className="font-headline" style={{...styles.metricValue, color: 'var(--secondary)'}}>{Math.round(avgFocus)}</span>
                <span className="font-headline" style={styles.metricUnit}>% Avg Focus</span>
              </div>
              <div style={styles.progBarTrack}>
                <div style={{...styles.progBarFillSecondary, width: `${avgFocus}%`}} />
              </div>
            </div>

            {/* Volume Card */}
            <div className="glass-card ghost-border" style={styles.metricCard}>
              <div style={styles.metricHeader}>
                <span className="font-label" style={styles.metricLabel}>VOLUME</span>
                <span className="material-symbols-outlined" style={{color: 'var(--error)'}}>rebase_edit</span>
              </div>
              <div style={styles.metricValueWrap}>
                <span className="font-headline" style={styles.metricValue}>{totalSessions}</span>
                <span className="font-headline" style={styles.metricUnit}>Sessions</span>
              </div>
              <div style={{display: 'flex', gap: 4, marginTop: 24}}>
                {Array.from({length: 5}).map((_, i) => (
                  <div key={i} style={{flex: 1, height: 8, borderRadius: 4, background: totalSessions > i ? 'var(--primary)' : 'var(--surface-highest)'}} />
                ))}
              </div>
            </div>
            
          </div>

          {/* Main Visual Data Row */}
          <div style={styles.dataGrid}>
            
            {/* 3D Study Activity Chart */}
            <div className="glass-card ghost-border" style={styles.chartCard}>
               <div style={styles.chartHeader}>
                 <div>
                   <h3 className="font-headline" style={styles.chartTitle}>Study Activity</h3>
                   <p className="font-label" style={styles.chartSubtitle}>LAST 30 DAYS TIMELINE</p>
                 </div>
                 <div style={{display: 'flex', gap: 8}}>
                   <button style={styles.chartFilterBtnActive} className="font-label ghost-border">HOURS</button>
                   <button style={styles.chartFilterBtn} className="font-label">SESSIONS</button>
                 </div>
               </div>
               
               <div style={styles.barGraphContainer}>
                  {renderBars.map((bar, idx) => (
                    <motion.div 
                      key={idx} 
                      className="bar-3d"
                      initial={{ height: 0 }}
                      animate={{ height: `${bar.heightPercent}%` }}
                      transition={{ duration: 1, delay: 0.1 * idx, ease: "easeOut" }}
                      style={{
                        flex: 1, 
                        background: 'rgba(0, 252, 155, 0.4)',
                        borderTopLeftRadius: 4, borderTopRightRadius: 4,
                        boxShadow: '0 0 10px rgba(0, 252, 155, 0.2)'
                      }}
                    />
                  ))}
               </div>
               
               <div style={styles.chartFooter}>
                 <span>START</span>
                 <span>MID</span>
                 <span>TODAY</span>
               </div>
            </div>

            {/* Right Column / Subjects & Upgrade */}
            <div style={styles.sidebarColumn}>
              
              <div className="glass-card ghost-border" style={{padding: 24, borderRadius: 16, display: 'flex', flexDirection: 'column', flex: 1}}>
                <h3 className="font-headline" style={{fontSize: 18, fontWeight: 700, margin: '0 0 24px 0'}}>Activity By Subject</h3>
                <div style={{display: 'flex', flexDirection: 'column', gap: 24}}>
                  
                  {analytics?.subjectStats?.map((s, idx) => {
                    const themes = [
                      { color: 'var(--primary)', bg: 'rgba(0,252,155,0.1)', icon: 'code' },
                      { color: 'var(--secondary)', bg: 'rgba(0,227,253,0.1)', icon: 'psychology' },
                      { color: 'var(--tertiary)', bg: 'rgba(255,228,131,0.1)', icon: 'menu_book' }
                    ];
                    const t = themes[idx % themes.length];
                    return (
                      <div key={s._id}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8}}>
                          <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                            <div style={{width: 32, height: 32, borderRadius: 8, background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.color}}>
                              <span className="material-symbols-outlined" style={{fontSize: 16}}>{t.icon}</span>
                            </div>
                            <span style={{fontSize: 14, fontWeight: 700}}>{s._id}</span>
                          </div>
                          <span className="font-label" style={{fontSize: 12, color: 'var(--on-surface-variant)'}}>{Math.round(s.totalMinutes)}m</span>
                        </div>
                        <div style={styles.progBarTrack}>
                          <div style={{height: '100%', borderRadius: 4, background: t.color, boxShadow: `0 0 10px ${t.color}`, width: `${s.avgFocusScore}%`}} />
                        </div>
                      </div>
                    )
                  })}
                  {!analytics?.subjectStats?.length && <p style={{color:'var(--on-surface-variant)', fontSize:14}}>No subjects active.</p>}
                  
                </div>
                <button className="font-label ghost-border" style={styles.manageBtn}>MANAGE SUBJECTS</button>
              </div>

              {/* Upgrade Banner */}
              <div className="ghost-border" style={styles.upgradeBanner}>
                <img src="https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=600&auto=format&fit=crop" style={styles.upgradeImg} alt="Upgrade background" />
                <div style={styles.upgradeContent}>
                  <span className="font-label" style={styles.upgradeBadge}>PRO FEATURE</span>
                  <h4 className="font-headline" style={styles.upgradeTitle}>Unlock Deep Insights</h4>
                  <p style={{fontSize: 10, color: 'var(--on-surface-variant)', marginBottom: 16}}>Get personalized focus reports and AI coaching.</p>
                  <button className="font-label" style={{color: 'var(--primary)', background: 'transparent', border:'none', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', cursor:'pointer', display:'flex', alignItems:'center', gap: 8}}>
                    UPGRADE NOW
                    <span className="material-symbols-outlined" style={{fontSize: 12}}>arrow_forward</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
          
        </div>
      </main>
    </div>
  );
}

const styles = {
  appContainer: { display: 'flex', height: '100vh', overflow: 'hidden', backgroundColor: 'var(--surface)' },
  
  /* Sidebar */
  sidebar: { width: 256, display: 'flex', flexDirection: 'column', padding: 16, backgroundColor: 'rgba(15, 23, 42, 0.8)', borderRight: '1px solid rgba(0, 252, 155, 0.05)', backdropFilter: 'blur(24px)', zIndex: 50 },
  logoContainer: { marginBottom: 40, padding: '8px 16px' },
  logoText: { fontSize: 24, fontWeight: 800, color: 'var(--primary)', fontStyle: 'italic', letterSpacing: '-1px' },
  navGroup: { display: 'flex', flexDirection: 'column', gap: 8, flexGrow: 1 },
  navBtn: { background: 'transparent', border: 'none', color: '#64748b', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s' },
  navBtnActive: { backgroundColor: 'rgba(0, 252, 155, 0.1)', color: 'var(--primary)' },
  navLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 },
  sidebarBottom: { borderTop: '1px solid rgba(70, 72, 77, 0.2)', paddingTop: 24 },
  lockInBtnSidebar: { width: '100%', padding: '12px', background: 'var(--primary-gradient)', color: '#004527', border: 'none', borderRadius: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: 12, boxShadow: '0 0 20px rgba(160,255,195,0.3)', cursor: 'pointer' },
  
  /* Main Canvas & Header */
  mainCanvas: { flex: 1, overflowY: 'auto', position: 'relative' },
  header: { position: 'fixed', top: 0, left: 256, right: 0, zIndex: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', backgroundColor: 'rgba(2, 6, 23, 0.6)', backdropFilter: 'blur(16px)', boxShadow: '0 24px 48px -12px rgba(0,0,0,0.5)' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 16 },
  mobileLogo: { display: 'none', margin: 0, color: 'var(--primary)', fontStyle: 'italic' },
  headerDivider: { height: 24, width: 1, backgroundColor: 'rgba(116, 117, 122, 0.3)' },
  headerTitle: { fontSize: 12, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.1em' },
  headerRight: { display: 'flex', alignItems: 'center', gap: 24 },
  searchBox: { position: 'relative', display: 'flex', alignItems: 'center' },
  searchIcon: { position: 'absolute', left: 12, color: 'var(--on-surface-variant)', fontSize: 20 },
  searchInput: { backgroundColor: '#111318', border: 'none', borderRadius: 100, padding: '8px 16px 8px 40px', color: '#fff', fontSize: 14, outline: 'none', width: 250 },
  iconBtn: { background: 'transparent', border: 'none', color: 'var(--on-surface-variant)', cursor: 'pointer', padding: 0 },
  avatarWrap: { width: 40, height: 40, borderRadius: 20, border: '2px solid rgba(0, 252, 155, 0.2)', padding: 2 },
  avatarImg: { width: '100%', height: '100%', borderRadius: 20, objectFit: 'cover' },
  
  /* Grid Content */
  contentGrid: { paddingTop: 96, paddingBottom: 48, paddingLeft: 40, paddingRight: 40, maxWidth: 1200, margin: '0 auto' },
  heroSection: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40 },
  heroPretitle: { color: 'var(--primary)', textTransform: 'uppercase', fontSize: 12, fontWeight: 700, letterSpacing: '0.3em', marginBottom: 8, display: 'block' },
  heroTitle: { margin: 0, fontSize: '3.5rem', fontWeight: 800, lineHeight: 1 },
  heroActions: { display: 'flex', gap: 16 },
  historyBtn: { backgroundColor: 'var(--surface-high)', padding: '12px 24px', borderRadius: 12, color: 'var(--on-surface)', fontSize: 12, cursor: 'pointer' },
  lockInBtnMain: { background: 'var(--primary-gradient)', padding: '12px 32px', borderRadius: 12, border: 'none', color: '#004527', fontWeight: 800, cursor: 'pointer', boxShadow: '0 10px 30px rgba(0,252,155,0.3)' },
  
  /* Metrics Grid */
  metricsGroup: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 40 },
  metricCard: { padding: 24, borderRadius: 16, display: 'flex', flexDirection: 'column' },
  metricHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  metricLabel: { fontSize: 10, color: 'var(--on-surface-variant)', letterSpacing: '0.1em' },
  metricValueWrap: { display: 'flex', alignItems: 'baseline', gap: 8 },
  metricValue: { fontSize: 40, fontWeight: 800, margin: 0, lineHeight: 1 },
  metricUnit: { fontSize: 14, fontWeight: 700, color: 'var(--on-surface-variant)' },
  metricGlowTertiary: { position: 'absolute', right: -40, bottom: -40, width: 120, height: 120, background: 'rgba(255, 228, 131, 0.1)', borderRadius: '50%', filter: 'blur(30px)', pointerEvents: 'none' },
  progBarTrack: { marginTop: 24, width: '100%', height: 4, backgroundColor: 'var(--surface-highest)', borderRadius: 2, overflow: 'hidden' },
  progBarFillPrimary: { height: '100%', background: 'var(--primary)', boxShadow: '0 0 10px var(--primary)', transition: 'width 1s ease-out' },
  progBarFillSecondary: { height: '100%', background: 'var(--secondary)', boxShadow: '0 0 10px var(--secondary)', transition: 'width 1s ease-out' },
  
  /* Visual Data Area */
  dataGrid: { display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: 40 },
  chartCard: { padding: 32, borderRadius: 16 },
  chartHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40 },
  chartTitle: { margin: '0 0 4px 0', fontSize: 24, fontWeight: 800 },
  chartSubtitle: { margin: 0, fontSize: 12, color: 'var(--on-surface-variant)', letterSpacing: '0.1em' },
  chartFilterBtnActive: { background: 'var(--surface-highest)', color: 'var(--primary)', padding: '4px 12px', fontSize: 10, borderRadius: 4, border: 'none' },
  chartFilterBtn: { background: 'transparent', color: 'var(--on-surface-variant)', padding: '4px 12px', fontSize: 10, border: 'none' },
  barGraphContainer: { height: 256, display: 'flex', alignItems: 'flex-end', gap: 12, padding: '0 16px' },
  chartFooter: { marginTop: 24, paddingTop: 24, borderTop: '1px solid rgba(116, 117, 122, 0.1)', display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--on-surface-variant)', letterSpacing: '0.1em', fontFamily: 'Space Grotesk' },
  
  /* Right Sidebar Area */
  sidebarColumn: { display: 'flex', flexDirection: 'column', gap: 24 },
  manageBtn: { width: '100%', marginTop: 'auto', padding: 12, borderRadius: 8, background: 'transparent', color: '#fff', fontSize: 10, letterSpacing: '0.1em', cursor: 'pointer', transition: 'border-color 0.2s' },
  upgradeBanner: { background: 'linear-gradient(to bottom right, var(--surface-high), var(--surface))', borderRadius: 16, padding: 24, position: 'relative', overflow: 'hidden' },
  upgradeImg: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.1, zIndex: 0 },
  upgradeContent: { position: 'relative', zIndex: 1 },
  upgradeBadge: { display: 'inline-block', background: 'rgba(0,252,155,0.2)', color: 'var(--primary)', fontSize: 8, fontWeight: 800, padding: '4px 8px', borderRadius: 4, letterSpacing: '-0.05em', marginBottom: 16 },
  upgradeTitle: { margin: '0 0 8px 0', fontSize: 14, fontWeight: 800 },
};
