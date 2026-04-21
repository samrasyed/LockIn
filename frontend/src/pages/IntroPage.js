import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial, Stars, Float, Text } from '@react-three/drei';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Zap, Target, Book, ChevronDown, Eye } from 'lucide-react';

const AnimatedShape = ({ scrollYProgress }) => {
  const meshRef = useRef();
  const { viewport } = useThree();
  
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.getElapsedTime() * 0.2;
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.3;
      
      // Animate distortion based on scroll
      const progress = scrollYProgress.get();
      meshRef.current.position.y = progress * 2; // Moves up as you scroll down
      meshRef.current.scale.setScalar(1 + progress * 0.5);
    }
  });

  return (
    <Float speed={2} rotationIntensity={1} floatIntensity={2}>
      <Sphere ref={meshRef} args={[1.5, 64, 64]} position={[0, 0, 0]}>
        <MeshDistortMaterial 
          color="#00fc9b" 
          attach="material" 
          distort={0.4} 
          speed={1.5} 
          roughness={0.1}
          metalness={0.5}
        />
      </Sphere>
    </Float>
  );
};

export default function IntroPage() {
  const navigate = useNavigate();
  const { scrollYProgress } = useScroll();
  const opacityHero = useTransform(scrollYProgress, [0, 0.3], [1, 0]);
  const yHero = useTransform(scrollYProgress, [0, 0.3], [0, -100]);

  return (
    <div style={styles.container} className="custom-scrollbar">
      
      {/* Fixed 3D Background */}
      <div style={styles.canvasContainer}>
        <Canvas camera={{ position: [0, 2, 8], fov: 50 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <pointLight position={[-10, -10, -5]} intensity={0.5} color="#00e5a0" />
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          <AnimatedShape scrollYProgress={scrollYProgress} />
        </Canvas>
      </div>

      {/* Scrolling Content Overlay */}
      <div style={styles.scrollWrapper}>
        
        {/* Navigation */}
        <motion.nav 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          style={styles.navbar}
        >
          <div style={styles.logo}><Zap size={24} color="#00fc9b" /> LockIn</div>
          <button style={styles.loginBtn} onClick={() => navigate('/login')}>Log In</button>
        </motion.nav>

        {/* Section 1: Hero */}
        <motion.section style={{ ...styles.section, ...styles.heroSection, opacity: opacityHero, y: yHero }}>
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1, delay: 0.2 }}>
            <h1 style={styles.title}>
              Destroy Distractions.<br />Elevate Your <span style={styles.highlight}>Focus.</span>
            </h1>
          </motion.div>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.5 }} style={styles.subtitle}>
            Enter the state of flow. Track sessions, build streaks, and unlock deep insights.
          </motion.p>
          <motion.button 
            initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.8 }}
            whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(0, 252, 155, 0.4)' }}
            whileTap={{ scale: 0.95 }}
            style={styles.primaryBtn} onClick={() => navigate('/signup')}
          >
            LOCK IN
          </motion.button>
          
          <motion.div 
            animate={{ y: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 2 }}
            style={styles.scrollIndicator}
          >
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', letterSpacing: 2, marginBottom: 8, display: 'block' }}>SCROLL</span>
            <ChevronDown color="rgba(255,255,255,0.5)" size={24} />
          </motion.div>
        </motion.section>

        {/* Section 2: Features */}
        <section style={styles.section}>
          <div className="feature-grid-layout">
            {[
              { icon: <Target size={32} color="#00fc9b"/>, title: "Laser Targeting", text: "Break your goals into manageable chunks and lock in on them with zero friction." },
              { icon: <Book size={32} color="#00e3fd"/>, title: "Deep Analytics", text: "Our systems monitor your performance to chart your optimal productivity blocks." },
              { icon: <Zap size={32} color="#ffe483"/>, title: "Unbreakable Streaks", text: "Maintain momentum through daily objectives. Don't let the fire burn out." },
              { icon: <Eye size={32} color="#00fc9b"/>, title: "Reclaim Your Attention", text: "Constant scrolling is rewiring your focus. Take control and build it back." }
            ].map((f, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6, delay: i * 0.2 }}
                style={styles.featureCard}
              >
                <div style={styles.featureIcon}>{f.icon}</div>
                <h3 style={styles.featureTitle}>{f.title}</h3>
                <p style={styles.featureText}>{f.text}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Section 3: Final CTA */}
        <section style={{...styles.section, ...styles.finalSection}}>
           <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              style={styles.ctaBox}
           >
              <h2 style={styles.titleSmall}>Ready to Lock In?</h2>
              <p style={{color: '#8892a4', marginBottom: 32}}>Join thousands configuring their environments for absolute productivity.</p>
              <button style={styles.primaryBtn} onClick={() => navigate('/signup')}>Initiate Profile</button>
           </motion.div>
        </section>

      </div>
    </div>
  );
}

const styles = {
  container: {
    width: '100vw', height: '100vh',
    overflowX: 'hidden', overflowY: 'auto',
    backgroundColor: '#0c0e12', fontFamily: 'Inter, sans-serif'
  },
  canvasContainer: {
    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none'
  },
  scrollWrapper: {
    position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column'
  },
  navbar: {
    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10,
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '24px 48px', backdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(255,255,255,0.05)'
  },
  logo: {
    fontSize: 24, fontWeight: 800, color: '#00fc9b',
    fontFamily: 'Plus Jakarta Sans, sans-serif', letterSpacing: '-1px',
    display: 'flex', alignItems: 'center', gap: 8
  },
  loginBtn: {
    background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#fff', padding: '10px 24px', borderRadius: '100px',
    fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.3s ease',
  },
  section: {
    minHeight: '100vh', display: 'flex', flexDirection: 'column', 
    justifyContent: 'center', alignItems: 'center', padding: '100px 24px'
  },
  heroSection: {
    textAlign: 'center', position: 'relative'
  },
  title: {
    fontSize: 'clamp(3rem, 6vw, 5.5rem)', fontWeight: 800, color: '#fff',
    lineHeight: 1.1, marginBottom: 24, fontFamily: 'Plus Jakarta Sans, sans-serif',
    letterSpacing: '-2px'
  },
  titleSmall: {
    fontSize: '3rem', fontWeight: 800, color: '#fff',
    fontFamily: 'Plus Jakarta Sans, sans-serif', marginBottom: 16
  },
  highlight: {
    color: '#00fc9b', textShadow: '0 0 40px rgba(0, 252, 155, 0.4)'
  },
  subtitle: {
    fontSize: '1.25rem', color: '#8892a4', maxWidth: 600, lineHeight: 1.6, marginBottom: 48, marginInline: 'auto'
  },
  primaryBtn: {
    background: 'linear-gradient(135deg, #00fc9b 0%, #00d4ec 100%)', color: '#0c0e12',
    border: 'none', padding: '18px 48px', borderRadius: '100px',
    fontSize: 16, fontWeight: 800, cursor: 'pointer', letterSpacing: '0.1em',
    textTransform: 'uppercase', fontFamily: 'Space Grotesk, sans-serif'
  },
  scrollIndicator: {
    position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)', textAlign: 'center'
  },
  featureCard: {
    background: 'rgba(35, 38, 44, 0.4)', backdropFilter: 'blur(20px)',
    border: '1px solid rgba(116, 117, 122, 0.1)', borderRadius: 24, padding: 40,
    textAlign: 'left'
  },
  featureIcon: {
    width: 64, height: 64, borderRadius: 16, background: 'rgba(255,255,255,0.05)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24
  },
  featureTitle: {
    fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 12, fontFamily: 'Plus Jakarta Sans, sans-serif'
  },
  featureText: {
    fontSize: 15, color: '#8892a4', lineHeight: 1.6
  },
  finalSection: {
    background: 'linear-gradient(180deg, transparent 0%, rgba(0,252,155,0.05) 100%)'
  },
  ctaBox: {
    background: 'rgba(12, 14, 18, 0.8)', padding: 60, borderRadius: 32,
    border: '1px solid rgba(0,252,155,0.2)', textAlign: 'center',
    boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
  }
};
