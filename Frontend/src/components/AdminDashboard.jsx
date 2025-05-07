import React, { useState, useEffect, useRef } from 'react';
import { getLogs, getSecurityEvents, logout } from '../api';
import { useNavigate } from 'react-router-dom';
import {
  LineChart,
  BarChart,
  PieChart,
  Pie,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Moon, Sun, Mail, Shield, AlertTriangle, CheckCircle, RefreshCw,
  Search, ChevronUp, ChevronDown, Database, Lock, Activity, Zap, Settings
} from 'lucide-react';

const AdminDashboard = () => {
  const [logs, setLogs] = useState([]);
  const [securityEvents, setSecurityEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSecurityEventsLoading, setIsSecurityEventsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [securityEventsError, setSecurityEventsError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [securitySearchTerm, setSecuritySearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({
    key: 'timestamp',
    direction: 'desc',
  });
  const [securitySortConfig, setSecuritySortConfig] = useState({
    key: 'timestamp',
    direction: 'desc',
  });
  const [timeRange, setTimeRange] = useState('week'); // 'day', 'week', 'month'
  const [analyticsTab, setAnalyticsTab] = useState('overview'); // 'overview', 'users', 'spam', 'security'
  const [severityFilter, setSeverityFilter] = useState('all'); // 'all', 'high', 'medium', 'low'
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics', 'logs', 'security'
   const [darkMode, setDarkMode] = useState(false);


  const navigate = useNavigate();

   // Refs for animations
  const canvasRef = useRef(null);

  // Particle animation variables
  let particles = [];
  let canvasRequestId;

  // Initialize dark mode and particles
  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode === 'true') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }

    // Initialize particle animation
    initParticles();

    return () => {
      if (canvasRef.current) {
        cancelAnimationFrame(canvasRequestId);
      }
    };
  }, []);

   // Initialize particle animation
  const initParticles = () => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const createParticles = () => {
      particles = [];
      const particleCount = Math.floor(window.innerWidth / 20); // Fewer particles for dashboard

      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: Math.random() * 1.5 + 0.5, // Smaller particles
          color: darkMode ? '#3b82f6' : '#60a5fa',
          velocity: {
            x: (Math.random() - 0.5) * 0.2, // Slower movement
            y: (Math.random() - 0.5) * 0.2
          },
          alpha: Math.random() * 0.3 + 0.03 // Lower opacity
        });
      }
    };

    createParticles();

    const connectParticles = () => {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 60) { // Shorter connection distance
            ctx.beginPath();
            ctx.strokeStyle = darkMode
              ? `rgba(59, 130, 246, ${0.06 * (1 - distance / 60)})` // Lower line opacity
              : `rgba(96, 165, 250, ${0.06 * (1 - distance / 60)})`;
            ctx.lineWidth = 0.2; // Thinner lines
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
    };

    const animateParticles = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach(p => {
        p.x += p.velocity.x;
        p.y += p.velocity.y;

        if (p.x < 0 || p.x > canvas.width) p.velocity.x *= -1;
        if (p.y < 0 || p.y > canvas.height) p.velocity.y *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${darkMode ? '59, 130, 246' : '96, 165, 250'}, ${p.alpha})`;
        ctx.fill();
      });

      connectParticles();
      canvasRequestId = requestAnimationFrame(animateParticles);
    };

    animateParticles();

    // Update particles when dark mode changes
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(canvasRequestId);
    };
  };

  // Toggle dark mode with animation
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    if (!darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }

    // Reinitialize particles with new color
    setTimeout(() => {
      initParticles();
    }, 300);
  };


  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setIsSecurityEventsLoading(true);

      try {
        // Modified to get ALL logs, not just the first 10
        const logsData = await getLogs({ getAll: true });
        setLogs(logsData.logs);
        setError(null);
      } catch (error) {
        console.error('Failed to fetch logs:', error);
        setError('Failed to load logs. Please try again later.');
      } finally {
        setIsLoading(false);
      }

      try {
        // Include all severity levels
        const securityData = await getSecurityEvents({
          getAll: true,
          includeAllSeverities: true
        });
        setSecurityEvents(securityData.events);
        setSecurityEventsError(null);
      } catch (error) {
        console.error('Failed to fetch security events:', error);
        setSecurityEventsError('Failed to load security events. Please try again later.');
      } finally {
        setIsSecurityEventsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleSecuritySort = (key) => {
    let direction = 'asc';
    if (securitySortConfig.key === key && securitySortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSecuritySortConfig({ key, direction });
  };

  // Helper function to properly determine if a result indicates spam
  const isSpamResult = (resultText) => {
    return (
      resultText &&
      resultText.toLowerCase().includes('spam') &&
      !resultText.toLowerCase().startsWith('not spam')
    );
  };

  const filteredLogs = logs.filter(
    (log) =>
      log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.emailSubject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.result.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSecurityEvents = securityEvents.filter(event => {
    const matchesSearch =
      (event.event_type && event.event_type.toLowerCase().includes(securitySearchTerm.toLowerCase())) ||
      (event.details && event.details.toLowerCase().includes(securitySearchTerm.toLowerCase())) ||
      (event.user_email && event.user_email.toLowerCase().includes(securitySearchTerm.toLowerCase())) ||
      (event.ip_address && event.ip_address.toLowerCase().includes(securitySearchTerm.toLowerCase()));

    const matchesSeverity = severityFilter === 'all' || event.severity === severityFilter;

    return matchesSearch && matchesSeverity;
  });

  const sortedLogs = [...filteredLogs].sort((a, b) => {
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];

    if (sortConfig.key === 'timestamp') {
      const dateA = new Date(aValue);
      const dateB = new Date(bValue);
      if (dateA < dateB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (dateA > dateB) return sortConfig.direction === 'asc' ? 1 : -1;
    } else {
       if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
       if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });


  const sortedSecurityEvents = [...filteredSecurityEvents].sort((a, b) => {
    const aValue = a[securitySortConfig.key];
    const bValue = b[securitySortConfig.key];

     if (securitySortConfig.key === 'timestamp') {
      const dateA = new Date(aValue);
      const dateB = new Date(bValue);
      if (dateA < dateB) return securitySortConfig.direction === 'asc' ? -1 : 1;
      if (dateA > dateB) return securitySortConfig.direction === 'asc' ? 1 : -1;
    } else if (securitySortConfig.key === 'severity') {
       const severityOrder = { high: 0, medium: 1, low: 2 };
       const orderA = severityOrder[aValue] !== undefined ? severityOrder[aValue] : 99;
       const orderB = severityOrder[bValue] !== undefined ? severityOrder[bValue] : 99;
       if (orderA < orderB) return securitySortConfig.direction === 'asc' ? -1 : 1;
       if (orderA > orderB) return securitySortConfig.direction === 'asc' ? 1 : -1;
    }
     else {
       if (aValue < bValue) return securitySortConfig.direction === 'asc' ? -1 : 1;
       if (aValue > bValue) return securitySortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });


  const getSortIcon = (key, config) => {
    if (config.key !== key) return null;
    return config.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />;
  };

  // Calculate analytics data
  const getAnalyticsData = () => {
    // Use combined loading state
    if (isLoading || isSecurityEventsLoading) return {
       dailyData: [],
        topUsers: [],
        spamDistribution: [],
        securityEventsByType: [],
        securityEventsBySeverity: [],
        securityEventsTimeline: []
    };


    // Get date ranges
    const now = new Date();
    let startDate;

    switch (timeRange) {
      case 'day':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0); // Start of today
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1); // Start of last month
        break;
      case 'week':
      default:
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        startDate.setHours(0, 0, 0, 0); // Start of the day 7 days ago
    }

    // Filter logs and security events by date range
    const rangedLogs = logs.filter(
      (log) => new Date(log.timestamp) >= startDate
    );

    const rangedSecurityEvents = securityEvents.filter(
      (event) => new Date(event.timestamp) >= startDate
    );

    // Daily spam trend data (within the selected time range)
    const dailyData = [];
    const dateMap = new Map();

    rangedLogs.forEach((log) => {
      const date = new Date(log.timestamp).toLocaleDateString();
      if (!dateMap.has(date)) {
        dateMap.set(date, { date, total: 0, spam: 0 });
      }

      const dateData = dateMap.get(date);
      dateData.total += 1;
      if (isSpamResult(log.result)) {
        dateData.spam += 1;
      }
    });

    dateMap.forEach((value) => {
      value.percentage =
        value.total > 0 ? Math.round((value.spam / value.total) * 100) : 0;
      dailyData.push(value);
    });

    // Sort by date ascending
    dailyData.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Top users data (use ALL logs for overall activity)
    const userMap = new Map();
    logs.forEach((log) => {
      if (!userMap.has(log.user)) {
        userMap.set(log.user, 0);
      }
      userMap.set(log.user, userMap.get(log.user) + 1);
    });

    const topUsers = Array.from(userMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    // Spam distribution data (use ALL logs)
    const spamCount = logs.filter((log) => isSpamResult(log.result)).length;
    const notSpamCount = logs.length - spamCount;

    const spamDistribution = [
      { name: 'Spam', value: spamCount },
      { name: 'Not Spam', value: notSpamCount },
    ];

    // Security events by type (within the selected time range)
    const eventTypeMap = new Map();
    rangedSecurityEvents.forEach((event) => {
      if (!eventTypeMap.has(event.event_type)) {
        eventTypeMap.set(event.event_type, 0);
      }
      eventTypeMap.set(event.event_type, eventTypeMap.get(event.event_type) + 1);
    });

    const securityEventsByType = Array.from(eventTypeMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Security events by severity (within the selected time range)
    const severityMap = new Map();
    rangedSecurityEvents.forEach((event) => {
      if (!severityMap.has(event.severity)) {
        severityMap.set(event.severity, 0);
      }
      severityMap.set(event.severity, severityMap.get(event.severity) + 1);
    });

    const securityEventsBySeverity = Array.from(severityMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => {
        const severityOrder = { high: 0, medium: 1, low: 2 };
        return severityOrder[a.name] - severityOrder[b.name];
      });

    // Security events timeline (within the selected time range)
    const securityDatesMap = new Map();
    rangedSecurityEvents.forEach((event) => {
      const date = new Date(event.timestamp).toLocaleDateString();
      if (!securityDatesMap.has(date)) {
        securityDatesMap.set(date, { date, total: 0, high: 0, medium: 0, low: 0 });
      }

      const dateData = securityDatesMap.get(date);
      dateData.total += 1;

      if (event.severity === 'high') {
        dateData.high += 1;
      } else if (event.severity === 'medium') {
        dateData.medium += 1;
      } else if (event.severity === 'low') {
        dateData.low += 1;
      }
    });

    const securityEventsTimeline = Array.from(securityDatesMap.values())
      .sort((a, b) => new Date(a.date) - new Date(b.date));


    return {
      dailyData,
      topUsers,
      spamDistribution,
      securityEventsByType,
      securityEventsBySeverity,
      securityEventsTimeline
    };
  };

   // Recalculate analytics data whenever logs, securityEvents, or timeRange change
  const {
    dailyData,
    topUsers,
    spamDistribution,
    securityEventsByType,
    securityEventsBySeverity,
    securityEventsTimeline
  } = getAnalyticsData();


  const COLORS = [
    '#0088FE',
    '#00C49F',
    '#FF8042',
    '#FF0000',
    '#8884d8',
    '#82ca9d',
    '#ffc658',
    '#8dd1e1',
    '#a4de6c',
    '#d0ed57'
  ];

  const severityColors = {
    high: '#FF0000', // Red
    medium: '#FFC107', // Amber
    low: '#4CAF50' // Green
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { state: { message: 'You have been logged out successfully.' } }); // Redirect to login page after successful logout
    } catch (error) {
      console.error('Logout failed:', error);
      // Handle logout error (e.g., display an error message)
      setError('Logout failed. Please try again.');
    }
  };

  return (
     <div className={`relative min-h-screen transition-colors duration-500 overflow-hidden ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
       {/* Particle background */}
      <canvas ref={canvasRef} className="absolute inset-0 z-0" />

       {/* Abstract cybersecurity design elements */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className={`cyber-circuit ${darkMode ? 'dark' : ''}`}></div>
      </div>

      {/* Dark mode toggle */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={toggleDarkMode}
          className={`p-3 rounded-full transition-all duration-300 transform hover:scale-110 ${
            darkMode
              ? 'bg-gray-800 text-yellow-300 hover:bg-gray-700 hover:text-yellow-200 shadow-lg shadow-gray-900/50'
              : 'bg-white text-gray-700 hover:bg-gray-100 hover:text-blue-600 shadow-lg'
          }`}
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8"> {/* Increased max-width */}
        <div className={`relative ${
          darkMode
            ? 'bg-gray-800/90 backdrop-blur-xl'
            : 'bg-white/90 backdrop-blur-xl'
          } shadow-2xl rounded-2xl overflow-hidden transition-all duration-300 border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>

          {/* Glow effect top bar */}
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-blue-500 via-fuchsia-500 to-blue-500 opacity-50 blur-sm"></div>

          {/* Header */}
          <div className={`p-6 flex justify-between items-center ${darkMode ? 'bg-gray-700/50' : 'bg-gray-100/50'}`}>
            <div>
              <div className={`flex items-center ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                 <Shield size={28} className="mr-3" />
                <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Admin Dashboard
                </h1>
              </div>
              <p className={`mt-1 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Comprehensive monitoring and analytics for ZTrust
              </p>
            </div>
            <button
  onClick={handleLogout} // <--- Corrected
  className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 transform hover:-translate-y-0.5
    ${darkMode
      ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/30'
      : 'bg-red-500 hover:bg-red-600 text-white shadow-md'
    }`}
>
   
  Logout
</button>


          </div>

          <div className="p-6">
            {/* Main Navigation Tabs */}
            <div className="mb-6">
              <div className={`flex space-x-2 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} pb-2`}>
                <button
                  onClick={() => setActiveTab('analytics')}
                  className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors duration-200 ${
                    activeTab === 'analytics'
                      ? `${darkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'}`
                      : `${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`
                  }`}
                >
                  Analytics
                </button>
                <button
                  onClick={() => setActiveTab('logs')}
                  className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors duration-200 ${
                    activeTab === 'logs'
                      ? `${darkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'}`
                      : `${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`
                  }`}
                >
                  Detection Logs
                </button>
                <button
                  onClick={() => setActiveTab('security')}
                  className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors duration-200 ${
                    activeTab === 'security'
                      ? `${darkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'}`
                      : `${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`
                  }`}
                >
                  Security Events
                </button>
              </div>
            </div>


            {/* Content Based on Active Tab */}
            {/* Analytics Section */}
            {activeTab === 'analytics' && (
              <div className={`${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-blue-50 border-blue-200'} p-4 rounded-lg mb-6 border`}>
                <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-blue-800'}`}>
                  Analytics Dashboard
                </h2>

                {/* Analytics Tabs */}
                <div className={`flex justify-between mb-6 pb-4 border-b ${darkMode ? 'border-gray-600' : 'border-blue-200'}`}>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => setAnalyticsTab('overview')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                        analyticsTab === 'overview'
                          ? `${darkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'}`
                          : `${darkMode ? 'bg-gray-600 text-gray-300 hover:bg-gray-500' : 'bg-white text-gray-700 hover:bg-gray-100'}`
                      }`}
                    >
                      Overview
                    </button>
                    <button
                      onClick={() => setAnalyticsTab('users')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                        analyticsTab === 'users'
                           ? `${darkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'}`
                          : `${darkMode ? 'bg-gray-600 text-gray-300 hover:bg-gray-500' : 'bg-white text-gray-700 hover:bg-gray-100'}`
                      }`}
                    >
                      Users
                    </button>
                    <button
                      onClick={() => setAnalyticsTab('spam')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                        analyticsTab === 'spam'
                           ? `${darkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'}`
                          : `${darkMode ? 'bg-gray-600 text-gray-300 hover:bg-gray-500' : 'bg-white text-gray-700 hover:bg-gray-100'}`
                      }`}
                    >
                      Spam
                    </button>
                    <button
                      onClick={() => setAnalyticsTab('security')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                        analyticsTab === 'security'
                          ? `${darkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'}`
                          : `${darkMode ? 'bg-gray-600 text-gray-300 hover:bg-gray-500' : 'bg-white text-gray-700 hover:bg-gray-100'}`
                      }`}
                    >
                      Security
                    </button>
                  </div>

                  <div className="flex space-x-1">
                    <button
                      onClick={() => setTimeRange('day')}
                      className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors duration-200 ${
                        timeRange === 'day' ? `${darkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'}` : `${darkMode ? 'bg-gray-600 text-gray-300 hover:bg-gray-500' : 'bg-white text-gray-700 hover:bg-gray-100'}`
                      }`}
                    >
                      24 Hours
                    </button>
                    <button
                      onClick={() => setTimeRange('week')}
                       className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors duration-200 ${
                        timeRange === 'week' ? `${darkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'}` : `${darkMode ? 'bg-gray-600 text-gray-300 hover:bg-gray-500' : 'bg-white text-gray-700 hover:bg-gray-100'}`
                      }`}
                    >
                      7 Days
                    </button>
                    <button
                      onClick={() => setTimeRange('month')}
                       className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors duration-200 ${
                        timeRange === 'month' ? `${darkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'}` : `${darkMode ? 'bg-gray-600 text-gray-300 hover:bg-gray-500' : 'bg-white text-gray-700 hover:bg-gray-100'}`
                      }`}
                    >
                      30 Days
                    </button>
                  </div>
                </div>

                {/* Analytics Loading and Error Handling */}
                {isLoading || isSecurityEventsLoading ? (
                  <div className="flex justify-center items-center h-64">
                    <div className={`animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 ${darkMode ? 'border-blue-400' : 'border-blue-500'}`}></div>
                  </div>
                ) : error || securityEventsError ? (
                  <div className={`${darkMode ? 'bg-red-900/50 border-red-700' : 'bg-red-50 border-red-500'} border-l-4 p-4 rounded-lg text-red-700 transition-all duration-300 animate-fade-in`}>
                     <div className="flex items-center">
                      <div className={`flex-shrink-0 ${darkMode ? 'text-red-400' : 'text-red-500'}`}>
                        <AlertTriangle size={18} />
                      </div>
                      <div className="ml-3">
                         {error && <p className={`text-sm ${darkMode ? 'text-red-300' : 'text-red-700'}`}>Error loading logs: {error}</p>}
                        {securityEventsError && <p className={`text-sm ${darkMode ? 'text-red-300' : 'text-red-700'}`}>Error loading security events: {securityEventsError}</p>}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Overview Tab */}
                    {analyticsTab === 'overview' && (
                      <div>
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"> {/* Increased gap */}
                          <div className={`${darkMode ? 'bg-gray-800 border-gray-700 shadow-gray-900/50' : 'bg-white border-gray-200 shadow-lg'} p-6 rounded-lg border transition-shadow duration-300 hover:shadow-xl`}>
                            <div className={`flex items-center mb-3 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                              <Database size={24} className="mr-3" />
                              <h3 className={`text-lg font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                Total Scans
                              </h3>
                            </div>
                            <p className={`text-4xl font-bold ${darkMode ? 'text-blue-500' : 'text-blue-600'}`}>
                              {logs.length}
                            </p>
                          </div>
                          <div className={`${darkMode ? 'bg-gray-800 border-gray-700 shadow-gray-900/50' : 'bg-white border-gray-200 shadow-lg'} p-6 rounded-lg border transition-shadow duration-300 hover:shadow-xl`}>
                             <div className={`flex items-center mb-3 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                                <AlertTriangle size={24} className="mr-3" />
                                <h3 className={`text-lg font-medium ${                                 darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                  Spam Detected
                                </h3>
                             </div>
                            <p className={`text-4xl font-bold ${darkMode ? 'text-red-500' : 'text-red-600'}`}>
                              {logs.filter((log) => isSpamResult(log.result)).length}
                            </p>
                          </div>
                          <div className={`${darkMode ? 'bg-gray-800 border-gray-700 shadow-gray-900/50' : 'bg-white border-gray-200 shadow-lg'} p-6 rounded-lg border transition-shadow duration-300 hover:shadow-xl`}>
                             <div className={`flex items-center mb-3 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                                 <Lock size={24} className="mr-3" />
                                <h3 className={`text-lg font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                  Security Incidents
                                </h3>
                             </div>
                            <p className={`text-4xl font-bold ${darkMode ? 'text-orange-500' : 'text-orange-600'}`}>
                              {securityEvents.length}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-6"> {/* Increased gap and changed to lg */}
                          <div className={`${darkMode ? 'bg-gray-800 border-gray-700 shadow-gray-900/50' : 'bg-white border-gray-200 shadow-lg'} p-6 rounded-lg border transition-shadow duration-300 hover:shadow-xl`}>
                            <h3 className={`text-lg font-medium mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              Spam Detection Trend ({timeRange})
                            </h3>
                            <ResponsiveContainer width="100%" height={300}> {/* Increased height */}
                              <LineChart
                                data={dailyData}
                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#4b5563' : '#e5e7eb'}/> {/* Dark mode grid color */}
                                <XAxis dataKey="date" stroke={darkMode ? '#9ca3af' : '#6b7280'}/> {/* Dark mode axis color */}
                                <YAxis stroke={darkMode ? '#9ca3af' : '#6b7280'}/> {/* Dark mode axis color */}
                                <Tooltip
                                   contentStyle={{ background: darkMode ? '#1f2937' : '#fff', border: `1px solid ${darkMode ? '#4b5563' : '#d1d5db'}`, color: darkMode ? '#e5e7eb' : '#374151' }} // Dark mode tooltip style
                                   labelStyle={{ color: darkMode ? '#e5e7eb' : '#374151' }} // Dark mode label style
                                   itemStyle={{ color: darkMode ? '#e5e7eb' : '#374151' }} // Dark mode item style
                                />
                                <Legend verticalAlign="top" height={36} wrapperStyle={{ color: darkMode ? '#e5e7eb' : '#374151' }}/> {/* Dark mode legend color */}
                                <Line
                                  type="monotone"
                                  dataKey="spam"
                                  stroke="#FF0000"
                                  strokeWidth={2}
                                  name="Spam Emails"
                                />
                                <Line
                                  type="monotone"
                                  dataKey="total"
                                  stroke="#0088FE"
                                  strokeWidth={2}
                                  name="Total Scans"
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>

                          <div className={`${darkMode ? 'bg-gray-800 border-gray-700 shadow-gray-900/50' : 'bg-white border-gray-200 shadow-lg'} p-6 rounded-lg border transition-shadow duration-300 hover:shadow-xl`}>
                            <h3 className={`text-lg font-medium mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              Security Events by Severity ({timeRange})
                            </h3>
                            <ResponsiveContainer width="100%" height={300}> {/* Increased height */}
                              <BarChart
                                data={securityEventsBySeverity}
                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#4b5563' : '#e5e7eb'}/> {/* Dark mode grid color */}
                                <XAxis dataKey="name" stroke={darkMode ? '#9ca3af' : '#6b7280'}/> {/* Dark mode axis color */}
                                <YAxis stroke={darkMode ? '#9ca3af' : '#6b7280'}/> {/* Dark mode axis color */}
                                <Tooltip
                                  contentStyle={{ background: darkMode ? '#1f2937' : '#fff', border: `1px solid ${darkMode ? '#4b5563' : '#d1d5db'}`, color: darkMode ? '#e5e7eb' : '#374151' }} // Dark mode tooltip style
                                  labelStyle={{ color: darkMode ? '#e5e7eb' : '#374151' }} // Dark mode label style
                                  itemStyle={{ color: darkMode ? '#e5e7eb' : '#374151' }} // Dark mode item style
                                />
                                <Legend verticalAlign="top" height={36} wrapperStyle={{ color: darkMode ? '#e5e7eb' : '#374151' }}/> {/* Dark mode legend color */}
                                <Bar dataKey="value" name="Count">
                                  {securityEventsBySeverity.map((entry, index) => (
                                    <Cell
                                      key={`cell-${index}`}
                                      fill={severityColors[entry.name] || COLORS[index % COLORS.length]}
                                    />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* User Activity Tab */}
                    {analyticsTab === 'users' && (
                      <div>
                        <div className={`${darkMode ? 'bg-gray-800 border-gray-700 shadow-gray-900/50' : 'bg-white border-gray-200 shadow-lg'} p-6 rounded-lg border transition-shadow duration-300 hover:shadow-xl`}>
                          <h3 className={`text-lg font-medium mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Top Active Users (All Time)
                          </h3>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart
                              data={topUsers}
                              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#4b5563' : '#e5e7eb'}/> {/* Dark mode grid color */}
                              <XAxis dataKey="name" stroke={darkMode ? '#9ca3af' : '#6b7280'}/> {/* Dark mode axis color */}
                              <YAxis stroke={darkMode ? '#9ca3af' : '#6b7280'}/> {/* Dark mode axis color */}
                              <Tooltip
                                 contentStyle={{ background: darkMode ? '#1f2937' : '#fff', border: `1px solid ${darkMode ? '#4b5563' : '#d1d5db'}`, color: darkMode ? '#e5e7eb' : '#374151' }} // Dark mode tooltip style
                                   labelStyle={{ color: darkMode ? '#e5e7eb' : '#374151' }} // Dark mode label style
                                   itemStyle={{ color: darkMode ? '#e5e7eb' : '#374151' }} // Dark mode item style
                              />
                              <Legend verticalAlign="top" height={36} wrapperStyle={{ color: darkMode ? '#e5e7eb' : '#374151' }}/> {/* Dark mode legend color */}
                              <Bar dataKey="value" fill="#8884d8" name="Scan Count" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}

                    {/* Spam Analysis Tab */}
                    {analyticsTab === 'spam' && (
                      <div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8"> {/* Increased gap and changed to lg */}
                          <div className={`${darkMode ? 'bg-gray-800 border-gray-700 shadow-gray-900/50' : 'bg-white border-gray-200 shadow-lg'} p-6 rounded-lg border transition-shadow duration-300 hover:shadow-xl`}>
                            <h3 className={`text-lg font-medium mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              Spam Distribution (All Time)
                            </h3>
                            <ResponsiveContainer width="100%" height={300}>
                              <PieChart>
                                <Pie
                                  data={spamDistribution}
                                  cx="50%"
                                  cy="50%"
                                  labelLine={false}
                                  label={({ name, percent }) =>
                                    `${name}: ${(percent * 100).toFixed(0)}%`
                                  }
                                  outerRadius={100} // Increased radius
                                  fill="#8884d8"
                                  dataKey="value"
                                >
                                  {spamDistribution.map((entry, index) => (
                                    <Cell
                                      key={`cell-${index}`}
                                      fill={
                                        entry.name === 'Spam' ? '#FF0000' : '#00C49F'
                                      }
                                    />
                                  ))}
                                </Pie>
                                <Tooltip
                                  contentStyle={{ background: darkMode ? '#1f2937' : '#fff', border: `1px solid ${darkMode ? '#4b5563' : '#d1d5db'}`, color: darkMode ? '#e5e7eb' : '#374151' }} // Dark mode tooltip style
                                  labelStyle={{ color: darkMode ? '#e5e7eb' : '#374151' }} // Dark mode label style
                                  itemStyle={{ color: darkMode ? '#e5e7eb' : '#374151' }} // Dark mode item style
                                />
                                 <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: darkMode ? '#e5e7eb' : '#374151' }}/> {/* Dark mode legend color */}
                              </PieChart>
                            </ResponsiveContainer>
                          </div>

                          <div className={`${darkMode ? 'bg-gray-800 border-gray-700 shadow-gray-900/50' : 'bg-white border-gray-200 shadow-lg'} p-6 rounded-lg border transition-shadow duration-300 hover:shadow-xl`}>
                            <h3 className={`text-lg font-medium mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              Daily Spam Percentage ({timeRange})
                            </h3>
                            <ResponsiveContainer width="100%" height={300}>
                              <LineChart
                                data={dailyData}
                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#4b5563' : '#e5e7eb'}/> {/* Dark mode grid color */}
                                <XAxis dataKey="date" stroke={darkMode ? '#9ca3af' : '#6b7280'}/> {/* Dark mode axis color */}
                                <YAxis unit="%" domain={[0, 100]} stroke={darkMode ? '#9ca3af' : '#6b7280'}/> {/* Dark mode axis color */}
                                <Tooltip
                                  formatter={(value) => [`${value}%`, 'Spam Rate']}
                                  contentStyle={{ background: darkMode ? '#1f2937' : '#fff', border: `1px solid ${darkMode ? '#4b5563' : '#d1d5db'}`, color: darkMode ? '#e5e7eb' : '#374151' }} // Dark mode tooltip style
                                   labelStyle={{ color: darkMode ? '#e5e7eb' : '#374151' }} // Dark mode label style
                                   itemStyle={{ color: darkMode ? '#e5e7eb' : '#374151' }} // Dark mode item style
                                />
                                <Legend verticalAlign="top" height={36} wrapperStyle={{ color: darkMode ? '#e5e7eb' : '#374151' }}/> {/* Dark mode legend color */}
                                <Line
                                  type="monotone"
                                  dataKey="percentage"
                                  stroke="#FF8042"
                                  strokeWidth={2}
                                  name="Spam Rate"
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Security Analysis Tab */}
                    {analyticsTab === 'security' && (
                      <div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                           <div className={`${darkMode ? 'bg-gray-800 border-gray-700 shadow-gray-900/50' : 'bg-white border-gray-200 shadow-lg'} p-6 rounded-lg border transition-shadow duration-300 hover:shadow-xl`}>
                             <div className={`flex items-center mb-3 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                                 <Activity size={24} className="mr-3" />
                                <h3 className={`text-lg font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                  Total Security Events
                                </h3>
                             </div>
                            <p className={`text-4xl font-bold ${darkMode ? 'text-orange-500' : 'text-orange-600'}`}>
                              {securityEvents.length}
                            </p>
                          </div>
                          <div className={`${darkMode ? 'bg-gray-800 border-gray-700 shadow-gray-900/50' : 'bg-white border-gray-200 shadow-lg'} p-6 rounded-lg border transition-shadow duration-300 hover:shadow-xl`}>
                            <div className={`flex items-center mb-3 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                                <AlertTriangle size={24} className="mr-3" />
                                <h3 className={`text-lg font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                  High Severity Events
                                </h3>
                             </div>
                            <p className={`text-4xl font-bold ${darkMode ? 'text-red-500' : 'text-red-600'}`}>
                              {securityEvents.filter(event => event.severity === 'high').length}
                            </p>
                          </div>
                          <div className={`${darkMode ? 'bg-gray-800 border-gray-700 shadow-gray-900/50' : 'bg-white border-gray-200 shadow-lg'} p-6 rounded-lg border transition-shadow duration-300 hover:shadow-xl`}>
                             <div className={`flex items-center mb-3 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                                 <Zap size={24} className="mr-3" />
                                <h3 className={`text-lg font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                  Unique IP Addresses
                                </h3>
                             </div>
                            <p className={`text-4xl font-bold ${darkMode ? 'text-blue-500' : 'text-blue-600'}`}>
                              {new Set(securityEvents.map(event => event.ip_address)).size}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-6">
                           <div className={`${darkMode ? 'bg-gray-800 border-gray-700 shadow-gray-900/50' : 'bg-white border-gray-200 shadow-lg'} p-6 rounded-lg border transition-shadow duration-300 hover:shadow-xl`}>
                            <h3 className={`text-lg font-medium mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              Security Events by Type ({timeRange})
                            </h3>
                            <ResponsiveContainer width="100%" height={300}>
                              <BarChart
                                data={securityEventsByType}
                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                layout="vertical"
                              >
                                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#4b5563' : '#e5e7eb'}/> {/* Dark mode grid color */}
                                <XAxis type="number" stroke={darkMode ? '#9ca3af' : '#6b7280'}/> {/* Dark mode axis color */}
                                <YAxis type="category" dataKey="name" width={150} stroke={darkMode ? '#9ca3af' : '#6b7280'}/> {/* Dark mode axis color */}
                                <Tooltip
                                   contentStyle={{ background: darkMode ? '#1f2937' : '#fff', border: `1px solid ${darkMode ? '#4b5563' : '#d1d5db'}`, color: darkMode ? '#e5e7eb' : '#374151' }} // Dark mode tooltip style
                                   labelStyle={{ color: darkMode ? '#e5e7eb' : '#374151' }} // Dark mode label style
                                   itemStyle={{ color: darkMode ? '#e5e7eb' : '#374151' }} // Dark mode item style
                                />
                                <Legend verticalAlign="top" height={36} wrapperStyle={{ color: darkMode ? '#e5e7eb' : '#374151' }}/> {/* Dark mode legend color */}
                                <Bar dataKey="value" fill="#8884d8" name="Event Count" />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>

                          <div className={`${darkMode ? 'bg-gray-800 border-gray-700 shadow-gray-900/50' : 'bg-white border-gray-200 shadow-lg'} p-6 rounded-lg border transition-shadow duration-300 hover:shadow-xl`}>
                            <h3 className={`text-lg font-medium mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              Security Events Timeline ({timeRange})
                            </h3>
                            <ResponsiveContainer width="100%" height={300}>
                              <LineChart
                                data={securityEventsTimeline}
                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#4b5563' : '#e5e7eb'}/> {/* Dark mode grid color */}
                                <XAxis dataKey="date" stroke={darkMode ? '#9ca3af' : '#6b7280'}/> {/* Dark mode axis color */}
                                <YAxis stroke={darkMode ? '#9ca3af' : '#6b7280'}/> {/* Dark mode axis color */}
                                <Tooltip
                                   contentStyle={{ background: darkMode ? '#1f2937' : '#fff', border: `1px solid ${darkMode ? '#4b5563' : '#d1d5db'}`, color: darkMode ? '#e5e7eb' : '#374151' }} // Dark mode tooltip style
                                   labelStyle={{ color: darkMode ? '#e5e7eb' : '#374151' }} // Dark mode label style
                                   itemStyle={{ color: darkMode ? '#e5e7eb' : '#374151' }} // Dark mode item style
                                />
                                <Legend verticalAlign="top" height={36} wrapperStyle={{ color: darkMode ? '#e5e7eb' : '#374151' }}/> {/* Dark mode legend color */}
                                <Line
                                  type="monotone"
                                  dataKey="high"
                                  stroke="#FF0000"
                                  strokeWidth={2}
                                  name="High Severity"
                                />
                                <Line
                                  type="monotone"
                                  dataKey="medium"
                                  stroke="#FFA500" // Changed medium severity color
                                  strokeWidth={2}
                                  name="Medium Severity"
                                />
                                <Line
                                  type="monotone"
                                  dataKey="low"
                                  stroke="#2E8B57" // Changed low severity color
                                  strokeWidth={2}
                                  name="Low Severity"
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Detection Logs Tab Content */}
            {activeTab === 'logs' && (
              <div className={`${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-blue-50 border-blue-200'} p-4 rounded-lg mb-6 border`}>
                 <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-blue-800'}`}>
                  Detection Logs
                </h2>

                <div className="flex justify-between items-center mb-4">
                  <div className="relative w-64">
                    <input
                      type="text"
                       placeholder="Search logs..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={`w-full pl-10 pr-4 py-2 border ${
                        darkMode
                          ? 'border-gray-600 bg-gray-800/70 text-white focus:ring-blue-500 focus:border-blue-500'
                          : 'border-gray-300 bg-white/90 text-gray-900 focus:ring-blue-600 focus:border-blue-600'
                        } rounded-lg shadow-sm placeholder-gray-400 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                          darkMode ? 'focus:ring-offset-gray-800' : ''
                        }`}
                    />
                    <div className={`absolute left-3 top-2.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      <Search size={18} />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {filteredLogs.length} {filteredLogs.length === 1 ? 'entry' : 'entries'} found
                    </span>
                  </div>
                </div>

                {/* Logs Loading and Error Handling */}
                {isLoading ? (
                  <div className="flex justify-center items-center h-64">
                     <div className={`animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 ${darkMode ? 'border-blue-400' : 'border-blue-500'}`}></div>
                  </div>
                ) : error ? (
                  <div className={`${darkMode ? 'bg-red-900/50 border-red-700' : 'bg-red-50 border-red-500'} border-l-4 p-4 rounded-lg text-red-700 transition-all duration-300 animate-fade-in`}>
                     <div className="flex items-center">
                      <div className={`flex-shrink-0 ${darkMode ? 'text-red-400' : 'text-red-500'}`}>
                        <AlertTriangle size={18} />
                      </div>
                      <div className="ml-3">
                         <p className={`text-sm ${darkMode ? 'text-red-300' : 'text-red-700'}`}>{error}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className={`min-w-full rounded-lg overflow-hidden shadow-md ${darkMode ? 'bg-gray-800 shadow-gray-900/30' : 'bg-white shadow-gray-200'}`}>
                      <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                        <tr>
                          <th
                            className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider cursor-pointer hover:${darkMode ? 'bg-gray-600' : 'bg-gray-200'} transition-colors duration-200`}
                            onClick={() => handleSort('user')}
                          >
                            <div className="flex items-center">
                              User {getSortIcon('user', sortConfig)}
                            </div>
                          </th>
                          <th
                            className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider cursor-pointer hover:${darkMode ? 'bg-gray-600' : 'bg-gray-200'} transition-colors duration-200`}
                            onClick={() => handleSort('emailSubject')}
                          >
                            <div className="flex items-center">
                              Subject {getSortIcon('emailSubject', sortConfig)}
                            </div>
                          </th>
                          <th
                            className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider cursor-pointer hover:${darkMode ? 'bg-gray-600' : 'bg-gray-200'} transition-colors duration-200`}
                            onClick={() => handleSort('timestamp')}
                          >
                            <div className="flex items-center">
                              Date {getSortIcon('timestamp', sortConfig)}
                            </div>
                          </th>
                          <th
                            className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider cursor-pointer hover:${darkMode ? 'bg-gray-600' : 'bg-gray-200'} transition-colors duration-200`}
                            onClick={() => handleSort('result')}
                          >
                            <div className="flex items-center">
                              Result {getSortIcon('result', sortConfig)}
                            </div>
                          </th>
                          <th className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>
                            Actions
                          </th>
                        </tr>
                      </thead>
                       <tbody className={`divide-y ${darkMode ? 'divide-gray-700 text-gray-300' : 'divide-gray-200 text-gray-900'}`}>
                        {sortedLogs.length === 0 ? (
                          <tr>
                            <td
                              colSpan="5"
                                className={`px-6 py-4 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
                            >
                              No matching logs found
                            </td>
                          </tr>
                        ) : (
                          sortedLogs.map((log, index) => (
                            <tr
                              key={log._id || index} // Use _id if available, fallback to index
                              className={`${
                                index % 2 === 0 ? (darkMode ? 'bg-gray-800' : 'bg-white') : (darkMode ? 'bg-gray-700/70' : 'bg-gray-50')
                              } hover:${darkMode ? 'bg-gray-600' : 'bg-blue-50'} transition-colors duration-200`}
                            >
                              <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                {log.user}
                              </td>
                              <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                {log.emailSubject}
                              </td>
                              <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                {new Date(log.timestamp).toLocaleString()}
                              </td>
                              <td className={`px-6 py-4 whitespace-nowrap text-sm`}>
                                <span
                                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                    isSpamResult(log.result)
                                      ? `${darkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-800'}`
                                      : `${darkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-800'}`
                                  }`}
                                >
                                  {log.result}
                                </span>
                              </td>
                              <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium`}>
                                <button
                                  className={`text-blue-600 hover:text-blue-900 ${darkMode ? 'dark:text-blue-400 dark:hover:text-blue-300' : ''} mr-2 transition-colors duration-200`}
                                  onClick={() => {
                                    // View details function
                                    console.log("View details for:", log);
                                    // Implement view details logic here
                                  }}
                                >
                                  Details
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Security Events Tab Content */}
            {activeTab === 'security' && (
              <div className={`${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-blue-50 border-blue-200'} p-4 rounded-lg mb-6 border`}>
                <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-blue-800'}`}>
                  Security Events
                </h2>

                <div className="flex justify-between items-center mb-4 flex-wrap gap-4"> {/* Added flex-wrap and gap */}
                  <div className="flex space-x-2 items-center"> {/* Added items-center */}
                    <div className="relative w-64">
                       <input
                        type="text"
                        placeholder="Search events..."
                        value={securitySearchTerm}
                        onChange={(e) => setSecuritySearchTerm(e.target.value)}
                         className={`w-full pl-10 pr-4 py-2 border ${
                          darkMode
                            ? 'border-gray-600 bg-gray-800/70 text-white focus:ring-blue-500 focus:border-blue-500'
                            : 'border-gray-300 bg-white/90 text-gray-900 focus:ring-blue-600 focus:border-blue-600'
                          } rounded-lg shadow-sm placeholder-gray-400 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                            darkMode ? 'focus:ring-offset-gray-800' : ''
                          }`}
                      />
                      <div className={`absolute left-3 top-2.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        <Search size={18} />
                      </div>
                    </div>

                    <select
                      value={severityFilter}
                      onChange={(e) => setSeverityFilter(e.target.value)}
                      className={`px-4 py-2 border ${
                        darkMode
                          ? 'border-gray-600 bg-gray-800/70 text-white focus:ring-blue-500 focus:border-blue-500'
                          : 'border-gray-300 bg-white/90 text-gray-900 focus:ring-blue-600 focus:border-blue-600'
                      } rounded-lg shadow-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                        darkMode ? 'focus:ring-offset-gray-800' : ''
                      }`}
                    >
                      <option value="all">All Severities</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                </div>

                <div className="flex items-center space-x-2">
                   <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {filteredSecurityEvents.length} {filteredSecurityEvents.length === 1 ? 'event' : 'events'} found
                  </span>
                </div>
              </div>

              {/* Security Events Loading and Error Handling */}
              {isSecurityEventsLoading ? (
                <div className="flex justify-center items-center h-64">
                  <div className={`animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 ${darkMode ? 'border-blue-400' : 'border-blue-500'}`}></div>
                </div>
              ) : securityEventsError ? (
                <div className={`${darkMode ? 'bg-red-900/50 border-red-700' : 'bg-red-50 border-red-500'} border-l-4 p-4 rounded-lg text-red-700 transition-all duration-300 animate-fade-in`}>
                  <div className="flex items-center">
                      <div className={`flex-shrink-0 ${darkMode ? 'text-red-400' : 'text-red-500'}`}>
                        <AlertTriangle size={18} />
                      </div>
                      <div className="ml-3">
                        <p className={`text-sm ${darkMode ? 'text-red-300' : 'text-red-700'}`}>{securityEventsError}</p>
                      </div>
                    </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                   <table className={`min-w-full rounded-lg overflow-hidden shadow-md ${darkMode ? 'bg-gray-800 shadow-gray-900/30' : 'bg-white shadow-gray-200'}`}>
                    <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      <tr>
                        <th
                           className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider cursor-pointer hover:${darkMode ? 'bg-gray-600' : 'bg-gray-200'} transition-colors duration-200`}
                          onClick={() => handleSecuritySort('timestamp')}
                        >
                          <div className="flex items-center">
                            Date {getSortIcon('timestamp', securitySortConfig)}
                          </div>
                        </th>
                        <th
                           className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider cursor-pointer hover:${darkMode ? 'bg-gray-600' : 'bg-gray-200'} transition-colors duration-200`}
                          onClick={() => handleSecuritySort('event_type')}
                        >
                          <div className="flex items-center">
                            Event Type {getSortIcon('event_type', securitySortConfig)}
                          </div>
                        </th>
                        <th
                          className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider cursor-pointer hover:${darkMode ? 'bg-gray-600' : 'bg-gray-200'} transition-colors duration-200`}
                          onClick={() => handleSecuritySort('user_email')}
                        >
                          <div className="flex items-center">
                            User {getSortIcon('user_email', securitySortConfig)}
                          </div>
                        </th>
                        <th
                          className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider cursor-pointer hover:${darkMode ? 'bg-gray-600' : 'bg-gray-200'} transition-colors duration-200`}
                          onClick={() => handleSecuritySort('severity')}
                        >
                          <div className="flex items-center">
                            Severity {getSortIcon('severity', securitySortConfig)}
                          </div>
                        </th>
                        <th
                           className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider cursor-pointer hover:${darkMode ? 'bg-gray-600' : 'bg-gray-200'} transition-colors duration-200`}
                          onClick={() => handleSecuritySort('ip_address')}
                        >
                          <div className="flex items-center">
                            IP Address {getSortIcon('ip_address', securitySortConfig)}
                          </div>
                        </th>
                         <th className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${darkMode ? 'divide-gray-700 text-gray-300' : 'divide-gray-200 text-gray-900'}`}>
                      {sortedSecurityEvents.length === 0 ? (
                        <tr>
                          <td
                            colSpan="6"
                             className={`px-6 py-4 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
                          >
                            No matching security events found
                          </td>
                        </tr>
                      ) : (
                        sortedSecurityEvents.map((event, index) => (
                          <tr
                            key={event._id || index} // Use _id if available, fallback to index
                            className={`${
                              index % 2 === 0 ? (darkMode ? 'bg-gray-800' : 'bg-white') : (darkMode ? 'bg-gray-700/70' : 'bg-gray-50')
                            } hover:${darkMode ? 'bg-gray-600' : 'bg-blue-50'} transition-colors duration-200`}
                          >
                            <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                              {new Date(event.timestamp).toLocaleString()}
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              {event.event_type}
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                              {event.user_email}
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm`}>
                              <span
                                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  event.severity === 'high'
                                    ? `${darkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-800'}`
                                    : event.severity === 'medium'
                                    ? `${darkMode ? 'bg-yellow-900/30 text-yellow-300' : 'bg-yellow-100 text-yellow-800'}`
                                    : `${darkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-800'}`
                                }`}
                              >
                                {event.severity}
                              </span>
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                              {event.ip_address}
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium`}>
                              <button
                                className={`text-blue-600 hover:text-blue-900 ${darkMode ? 'dark:text-blue-400 dark:hover:text-blue-300' : ''} mr-2 transition-colors duration-200`}
                                onClick={() => {
                                  // View details function
                                  console.log("View details for:", event);
                                  // Implement view details logic here
                                }}
                              >
                                Details
                              </button>
                              <button
                                className={`text-red-600 hover:text-red-900 ${darkMode ? 'dark:text-red-400 dark:hover:text-red-300' : ''} transition-colors duration-200`}
                                onClick={() => {
                                  // Block IP function
                                  console.log("Block IP:", event.ip_address);
                                  // Implement block IP logic here
                                }}
                              >
                                Block IP
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
       <div className={`absolute bottom-4 flex justify-center w-full text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
        <span className="transform transition-opacity duration-500 opacity-70 hover:opacity-100">
          © {new Date().getFullYear()} ZTrust Security Inc.
        </span>
      </div>

      <style jsx>{`
        /* Particle animation */
        @keyframes float-slow {
          0% {
            transform: translate(0, 0) rotate(0deg);
          }
          50% {
            transform: translate(30px, 30px) rotate(5deg);
          }
          100% {
            transform: translate(0, 0) rotate(0deg);
          }
        }

        /* Cyber circuit background */
        .cyber-circuit {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          opacity: 0.07;
          background-image:
            radial-gradient(circle at 25px 25px, rgba(255, 255, 255, 0.2) 2%, transparent 0%),
            radial-gradient(circle at 75px 75px, rgba(255, 255, 255, 0.2) 2%, transparent 0%);
          background-size: 100px 100px;
        }

        .cyber-circuit.dark {
          opacity: 0.1;
          background-image:
            radial-gradient(circle at 25px 25px, rgba(59, 130, 246, 0.3) 2%, transparent 0%),
            radial-gradient(circle at 75px 75px, rgba(59, 130, 246, 0.3) 2%, transparent 0%);
        }

        /* Button animation */
        button:active:not(:disabled) {
          transform: translateY(1px);
        }

        /* Animations */
        @keyframes ping-slow {
          75%, 100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }

        @keyframes pulse-slow {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        @keyframes fade-in {
          0% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }

        @keyframes shake {
          0%, 100% {
            transform: translateX(0);
          }
          10%, 30%, 50%, 70%, 90% {
            transform: translateX(-2px);
          }
          20%, 40%, 60%, 80% {
            transform: translateX(2px);
          }
        }

        .animate-ping-slow {
          animation: ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }

        .animate-pulse-slow {
          animation: pulse-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }

        .animate-shake {
          animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard;
