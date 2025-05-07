import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { initiateLogin, verifyLogin, setAuthToken } from '../api';
import { 
  Moon, Sun, Eye, EyeOff, Lock, Mail, Shield, 
  AlertTriangle, CheckCircle, ChevronRight, RefreshCw,
  Terminal, Database, Key, Zap
} from 'lucide-react';

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [animateLogin, setAnimateLogin] = useState(false);
  const [glowEffect, setGlowEffect] = useState(false);
  const [securityLevel, setSecurityLevel] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Refs for animations
  const formContainerRef = useRef(null);
  const passwordInputRef = useRef(null);
  const canvasRef = useRef(null);
  
  // Initialize dark mode from local storage preference
  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode === 'true') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
    
    // Add entry animation after a slight delay
    setTimeout(() => {
      setAnimateLogin(true);
    }, 100);
    
    // Check if there's a message from navigation
    if (location.state?.message) {
      setMessage(location.state.message);
      window.history.replaceState({}, document.title);
    }
    
    // Initialize particle animation
    initParticles();
    
    // Interval for security level animation
    const interval = setInterval(() => {
      setSecurityLevel(prev => (prev < 3 ? prev + 1 : prev));
    }, 800);
    
    return () => {
      clearInterval(interval);
      if (canvasRef.current) {
        cancelAnimationFrame(canvasRequestId);
      }
    };
  }, [location]);
  
  // Particle animation variables
  let particles = [];
  let canvasRequestId;
  
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
      const particleCount = Math.floor(window.innerWidth / 10);
      
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: Math.random() * 2 + 1,
          color: darkMode ? '#3b82f6' : '#60a5fa',
          velocity: {
            x: (Math.random() - 0.5) * 0.5,
            y: (Math.random() - 0.5) * 0.5
          },
          alpha: Math.random() * 0.5 + 0.1
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
          
          if (distance < 120) {
            ctx.beginPath();
            ctx.strokeStyle = darkMode 
              ? `rgba(59, 130, 246, ${0.1 * (1 - distance / 120)})`
              : `rgba(96, 165, 250, ${0.1 * (1 - distance / 120)})`;
            ctx.lineWidth = 0.5;
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
  
  // Effect for password strength indicator
  useEffect(() => {
    if (password.length > 0) {
      const strength = calculatePasswordStrength(password);
      setSecurityLevel(strength);
    } else {
      setSecurityLevel(0);
    }
  }, [password]);
  
  // Password strength calculator
  const calculatePasswordStrength = (pass) => {
    if (pass.length === 0) return 0;
    if (pass.length < 6) return 1;
    
    let strength = 0;
    if (pass.length >= 8) strength += 1;
    if (/[A-Z]/.test(pass)) strength += 1;
    if (/[0-9]/.test(pass)) strength += 1;
    if (/[^A-Za-z0-9]/.test(pass)) strength += 1;
    
    return Math.min(3, strength);
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
  
  // Form submission handlers
  const handleInitiateLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    setGlowEffect(true);
    
    try {
      await initiateLogin(email, password);
      setOtpSent(true);
    } catch (err) {
      console.error('Login initiation error:', err);
      setError(err.message || 'Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
      setTimeout(() => setGlowEffect(false), 500);
    }
  };

  const handleVerifyLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    setGlowEffect(true);
    
    try {
      const data = await verifyLogin(email, otp);
      localStorage.setItem('token', data.token);
      setAuthToken(data.token);
      
      // Slight delay to ensure token is set before navigating
      setTimeout(() => {
        if (data.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      }, 100);
    } catch (err) {
      console.error('Login verification error:', err);
      setError(err.message || 'Invalid verification code. Please try again.');
    } finally {
      setIsLoading(false);
      setTimeout(() => setGlowEffect(false), 500);
    }
  };

  // Helper function for security level indicator classes
  const getSecurityLevelClass = (level, currentLevel) => {
    if (currentLevel === 0) return 'bg-gray-300 dark:bg-gray-600';
    if (level <= currentLevel) {
      if (currentLevel === 1) return 'bg-red-500';
      if (currentLevel === 2) return 'bg-yellow-500';
      return 'bg-green-500';
    }
    return 'bg-gray-300 dark:bg-gray-600';
  };
  
  // Feature icons for the premium login experience
  const securityFeatures = [
    { icon: <Shield size={20} />, text: "Zero Trust" },
    { icon: <Terminal size={20} />, text: "AI Detection" },
    { icon: <Database size={20} />, text: "Data Shield" },
    { icon: <Key size={20} />, text: "MFA Security" }
  ];
  
  return (
    <div className={`relative min-h-screen flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-500 overflow-hidden ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      {/* Particle background */}
      <canvas ref={canvasRef} className="absolute inset-0 z-0" />
      
      {/* Floating security bubbles */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div 
            key={i}
            className={`absolute rounded-full ${darkMode ? 'bg-blue-900/10' : 'bg-blue-100/50'} animate-float-slow`}
            style={{
              width: `${Math.random() * 150 + 50}px`,
              height: `${Math.random() * 150 + 50}px`,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${Math.random() * 15 + 15}s`
            }}
          />
        ))}
      </div>
      
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
      
      {/* Branding */}
      <div className={`relative z-10 flex flex-col items-center mb-8 transform transition-all duration-700 ${animateLogin ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
        <div className={`flex items-center mb-2 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
          <div className="relative">
            <Shield size={40} className={`mr-2 transform transition-all duration-500 ${glowEffect ? 'scale-110' : ''}`} />
            {glowEffect && (
              <div className="absolute inset-0 rounded-full animate-ping-slow opacity-75 bg-blue-500 blur-sm"></div>
            )}
          </div>
          <span className="text-3xl font-bold tracking-tight">ZTrust</span>
        </div>
        <div className="flex flex-col items-center">
          <h1 className={`text-xl font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Email Inspector</h1>
          <div className="mt-2 flex space-x-1">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'}`}>
              <Zap size={12} className="mr-1" />
              Enterprise
            </span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${darkMode ? 'bg-purple-900 text-purple-200' : 'bg-purple-100 text-purple-800'}`}>
              AI Powered
            </span>
          </div>
        </div>
      </div>
      
      {/* Main form container */}
      <div 
        ref={formContainerRef}
        className={`relative w-full max-w-md transform transition-all duration-700 ${animateLogin ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}
      >
        <div className={`relative ${
          darkMode 
            ? 'bg-gray-800/90 backdrop-blur-xl' 
            : 'bg-white/90 backdrop-blur-xl'
          } py-10 px-6 shadow-2xl rounded-2xl transition-all duration-300 ${
            glowEffect 
              ? `shadow-lg ${darkMode ? 'shadow-blue-500/30' : 'shadow-blue-500/20'}` 
              : ''
          } border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}
        >
          {/* Glow effect top bar */}
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-blue-500 via-fuchsia-500 to-blue-500 opacity-50 blur-sm"></div>

          
          {/* Animated corner accents */}
          {/* <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 rounded-tl-lg border-blue-500 animate-pulse-slow"></div>
          <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 rounded-tr-lg border-purple-500 animate-pulse-slow"></div>
          <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 rounded-bl-lg border-purple-500 animate-pulse-slow"></div>
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 rounded-br-lg border-blue-500 animate-pulse-slow"></div> */}
          
          {/* Header */}
          <div>
            <h2 className={`text-center text-2xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {otpSent ? 'Verify Your Login' : 'Welcome Back'}
            </h2>
            <p className={`text-center text-sm mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {otpSent 
                ? 'Enter the verification code sent to your email'
                : 'Sign in to your secure dashboard'}
            </p>
          </div>
          
          {/* Success message */}
          {message && (
            <div className={`${
              darkMode 
                ? 'bg-green-900/50 border-green-700' 
                : 'bg-green-50 border-green-500'
              } border-l-4 p-4 mb-6 rounded transition-all duration-300 animate-fade-in`}
            >
              <div className="flex">
                <div className={`flex-shrink-0 ${darkMode ? 'text-green-400' : 'text-green-500'}`}>
                  <CheckCircle size={18} />
                </div>
                <div className="ml-3">
                  <p className={`text-sm ${darkMode ? 'text-green-300' : 'text-green-700'}`}>{message}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Error message */}
          {error && (
            <div className={`${
              darkMode 
                ? 'bg-red-900/50 border-red-700' 
                : 'bg-red-50 border-red-500'
              } border-l-4 p-4 mb-6 rounded transition-all duration-300 animate-shake`}
            >
              <div className="flex">
                <div className={`flex-shrink-0 ${darkMode ? 'text-red-400' : 'text-red-500'}`}>
                  <AlertTriangle size={18} />
                </div>
                <div className="ml-3">
                  <p className={`text-sm ${darkMode ? 'text-red-300' : 'text-red-700'}`}>{error}</p>
                </div>
              </div>
            </div>
          )}

          {!otpSent ? (
            // Initial login form
            <form className="space-y-6" onSubmit={handleInitiateLogin}>
              <div className="group">
                <label htmlFor="email" className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Email Address
                </label>
                <div className={`relative rounded-md shadow-sm transition-all duration-200 ${darkMode ? 'shadow-gray-700/30' : 'shadow-gray-200'}`}>
                  <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 ${darkMode ? 'text-gray-400' : ''}`}>
                    <Mail size={18} />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`appearance-none block w-full pl-10 pr-3 py-3 border ${
                      darkMode 
                        ? 'border-gray-600 bg-gray-700/70 text-white focus:ring-blue-500 focus:border-blue-500' 
                        : 'border-gray-300 bg-white/90 text-gray-900 focus:ring-blue-600 focus:border-blue-600'
                      } rounded-md shadow-sm placeholder-gray-400 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                        darkMode ? 'focus:ring-offset-gray-800' : ''
                      } hover:border-blue-400`}
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div className="group">
                <label htmlFor="password" className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Password
                </label>
                <div className={`relative rounded-md shadow-sm transition-all duration-200 ${darkMode ? 'shadow-gray-700/30' : 'shadow-gray-200'}`}>
                  <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 ${darkMode ? 'text-gray-400' : ''}`}>
                    <Lock size={18} />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    ref={passwordInputRef}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`appearance-none block w-full pl-10 pr-12 py-3 border ${
                      darkMode 
                        ? 'border-gray-600 bg-gray-700/70 text-white focus:ring-blue-500 focus:border-blue-500' 
                        : 'border-gray-300 bg-white/90 text-gray-900 focus:ring-blue-600 focus:border-blue-600'
                      } rounded-md shadow-sm placeholder-gray-400 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                        darkMode ? 'focus:ring-offset-gray-800' : ''
                      } hover:border-blue-400`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className={`absolute inset-y-0 right-0 pr-3 flex items-center ${
                      darkMode 
                        ? 'text-gray-400 hover:text-gray-200' 
                        : 'text-gray-500 hover:text-gray-700'
                      } transition-colors duration-200`}
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                
                {/* Password strength indicator */}
                {password.length > 0 && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Password Strength
                      </span>
                      <span className={`text-xs font-medium ${
                        securityLevel === 0 ? 'text-gray-400' :
                        securityLevel === 1 ? 'text-red-500' :
                        securityLevel === 2 ? 'text-yellow-500' :
                        'text-green-500'
                      }`}>
                        {securityLevel === 0 ? 'None' :
                         securityLevel === 1 ? 'Weak' :
                         securityLevel === 2 ? 'Medium' :
                         'Strong'}
                      </span>
                    </div>
                    <div className="flex w-full h-1 gap-1">
                      {[1, 2, 3].map((level) => (
                        <div 
                          key={level}
                          className={`h-full w-1/3 rounded transition-all duration-500 ${getSecurityLevelClass(level, securityLevel)}`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className={`h-4 w-4 rounded ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-600 focus:ring-offset-gray-800' 
                        : 'bg-white border-gray-300 text-blue-600 focus:ring-blue-500'
                      } transition-colors duration-200`}
                  />
                  <label htmlFor="remember-me" className={`ml-2 block text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Remember me
                  </label>
                </div>

                <div>
                  <a 
                    href="#" 
                    className={`font-medium ${
                      darkMode 
                        ? 'text-blue-400 hover:text-blue-300' 
                        : 'text-blue-600 hover:text-blue-500'
                      } transition-colors duration-200`}
                  >
                    Forgot password?
                  </a>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md text-sm font-medium text-white transition-all duration-300 ${
                    isLoading 
                      ? `${darkMode ? 'bg-gray-600' : 'bg-gray-400'} cursor-not-allowed` 
                      : `${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'} 
                        transform hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 
                        ${darkMode ? 'focus:ring-offset-gray-800' : ''} focus:ring-blue-500`
                  } relative overflow-hidden group`}
                >
                  {/* Button background animation */}
                  <span className="absolute w-0 h-0 transition-all duration-300 ease-out bg-white rounded-full group-hover:w-32 group-hover:h-32 opacity-10"></span>
                  
                  {isLoading ? (
                    <span className="flex items-center">
                      <RefreshCw size={18} className="mr-2 animate-spin" />
                      Authenticating...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      Sign in
                      <ChevronRight size={18} className="ml-1 transition-transform duration-200 group-hover:translate-x-1" />
                    </span>
                  )}
                </button>
              </div>
            </form>
          ) : (
            // OTP verification form
            <form className="space-y-6" onSubmit={handleVerifyLogin}>
              <div className="py-4">
                <div className="text-center mb-6">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${
                    darkMode 
                      ? 'bg-blue-900/30 text-blue-400' 
                      : 'bg-blue-100 text-blue-600'
                    } mb-4`}
                  >
                    <Shield size={32} />
                  </div>
                  <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    We've sent a 6-digit verification code to
                    <br />
                    <span className="font-medium">{email}</span>
                  </p>
                </div>
            
                <div className="mt-6">
                  <label htmlFor="otp" className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Verification Code
                  </label>
                  
                  {/* OTP Input */}
                  <div className="mt-1">
                    <input
                      id="otp"
                      name="otp"
                      type="text"
                      pattern="[0-9]*"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      required
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className={`appearance-none block w-full px-3 py-3 border ${
                        darkMode 
                          ? 'border-gray-600 bg-gray-700/70 text-white focus:ring-blue-500 focus:border-blue-500' 
                          : 'border-gray-300 bg-white/90 text-gray-900 focus:ring-blue-600 focus:border-blue-600'
                        } rounded-md shadow-sm placeholder-gray-400 text-center tracking-widest text-lg transition-all duration-300 
                        focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                          darkMode ? 'focus:ring-offset-gray-800' : ''
                        } hover:border-blue-400`}
                      placeholder="123456"
                      maxLength={6}
                    />
                  </div>
                  
                  <div className="mt-1 flex justify-center">
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Code expires in <span className="font-semibold">4:59</span>
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md text-sm font-medium text-white transition-all duration-300 ${
                    isLoading 
                      ? `${darkMode ? 'bg-gray-600' : 'bg-gray-400'} cursor-not-allowed` 
                      : `${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'} 
                        transform hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 
                        ${darkMode ? 'focus:ring-offset-gray-800' : ''} focus:ring-blue-500`
                  } relative overflow-hidden group`}
                >
                  {/* Button background animation */}
                  <span className="absolute w-0 h-0 transition-all duration-300 ease-out bg-white rounded-full group-hover:w-32 group-hover:h-32 opacity-10"></span>
                  
                  {isLoading ? (
                    <span className="flex items-center">
                      <RefreshCw size={18} className="mr-2 animate-spin" />
                      Verifying...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      Complete Sign In
                      <ChevronRight size={18} className="ml-1 transition-transform duration-200 group-hover:translate-x-1" />
                    </span>
                  )}
                </button>
              </div>
              
              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  className={`text-sm ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'} transition-colors duration-200 flex items-center mx-auto`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Go back to login
                </button>
              </div>
            </form>
          )}

          {/* Security Features Section */}
          <div className={`mt-8 pt-6 border-t text-center text-xs ${darkMode ? 'border-gray-600/50' : 'border-gray-300/70'}`}>
            <p className={`mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Protected by ZTrust Advanced Security</p>
            <div className="flex justify-center space-x-3 mt-2">
              {securityFeatures.map((feature, index) => (
                <div 
                  key={index} 
                  className={`flex flex-col items-center group transition-all duration-300
                    ${darkMode ? 'text-gray-400 hover:text-blue-400' : 'text-gray-500 hover:text-blue-600'}`}
                >
                  <div className={`p-2 rounded-full transition-all duration-300
                    ${darkMode 
                      ? 'bg-gray-800 group-hover:bg-blue-900/30' 
                      : 'bg-gray-100 group-hover:bg-blue-100'
                    }`}
                  >
                    {feature.icon}
                  </div>
                  <span className="text-xs mt-1">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Divider */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className={`w-full border-t ${darkMode ? 'border-gray-700' : 'border-gray-300'}`}></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className={`px-2 ${darkMode ? 'bg-gray-800 text-gray-400' : 'bg-white text-gray-500'}`}>
                  Don't have an account?
                </span>
              </div>
            </div>

            <div className="mt-6">
              <Link
                to="/register"
                className={`w-full flex justify-center items-center py-3 px-4 border ${
                  darkMode 
                    ? 'border-gray-600 bg-gray-700 hover:bg-gray-600 text-white' 
                    : 'border-gray-300 bg-white hover:bg-gray-50 text-gray-700'
                } rounded-md shadow-sm text-sm font-medium transition-all duration-300 transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  darkMode ? 'focus:ring-offset-gray-800' : ''
                } focus:ring-blue-500 relative group overflow-hidden`}
              >
                {/* Button hover effect */}
                <span className="absolute w-0 h-0 transition-all duration-300 ease-out bg-blue-500 rounded-full group-hover:w-32 group-hover:h-32 opacity-10"></span>
                
                <span className="flex items-center">
                  Create an account
                  <ChevronRight size={18} className="ml-1 transition-transform duration-200 group-hover:translate-x-1" />
                </span>
              </Link>
            </div>
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

export default LoginForm;