import React, { useState, useEffect, useRef } from 'react';
import { checkSpam, logout } from '../api';
import { useNavigate } from 'react-router-dom';
import {
  Moon, Sun, Mail, Shield, AlertTriangle, CheckCircle, RefreshCw,
  Trash2, History, ArrowLeft, LogOut
} from 'lucide-react';

const Dashboard = () => {
  const [mail, setMail] = useState('');
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
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
      const particleCount = Math.floor(window.innerWidth / 15); // Fewer particles for dashboard

      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: Math.random() * 1.5 + 0.5, // Smaller particles
          color: darkMode ? '#3b82f6' : '#60a5fa',
          velocity: {
            x: (Math.random() - 0.5) * 0.3, // Slower movement
            y: (Math.random() - 0.5) * 0.3
          },
          alpha: Math.random() * 0.4 + 0.05 // Lower opacity
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

          if (distance < 80) { // Shorter connection distance
            ctx.beginPath();
            ctx.strokeStyle = darkMode
              ? `rgba(59, 130, 246, ${0.08 * (1 - distance / 80)})` // Lower line opacity
              : `rgba(96, 165, 250, ${0.08 * (1 - distance / 80)})`;
            ctx.lineWidth = 0.3; // Thinner lines
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


  const handleCheckSpam = async () => {
    if (!mail.trim()) {
      setError('Please enter email content before checking');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null); // Clear previous result

    try {
      const data = await checkSpam(mail);
      setResult(data.result);

      // Add to history
      const newEntry = {
        id: Date.now(),
        snippet: mail.substring(0, 50) + (mail.length > 50 ? '...' : ''),
        result: data.result,
        timestamp: new Date(),
      };

      setHistory((prev) => [newEntry, ...prev].slice(0, 5));
    } catch (error) {
      console.error('Spam check failed:', error);
      setError(error.message || 'Failed to check email');
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const clearForm = () => {
    setMail('');
    setResult(null);
    setError(null);
  };

  const isSpamResult = (resultText) => {
     return (
      resultText &&
      resultText.toLowerCase().includes('spam') &&
      !resultText.toLowerCase().startsWith('not spam')
    );
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { state: { message: 'You have been logged out successfully.' } }); // Redirect to login page with message
    } catch (error) {
      console.error('Logout failed:', error);
      // Handle logout error (e.g., display a modal or alert)
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

      <div className="relative z-10 max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
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
                  Email Spam Checker
                </h1>
              </div>
              <p className={`mt-1 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Paste your email content below to check for potential threats
              </p>
            </div>
            <button
              onClick={handleLogout}
              className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 transform hover:-translate-y-0.5
                ${darkMode
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/30'
                  : 'bg-red-500 hover:bg-red-600 text-white shadow-md'
                }`}
            >
               <LogOut size={18} className="mr-2" />
              Logout
            </button>
          </div>

          <div className="p-6">
            <div className="mb-6">
              <label
                htmlFor="email-content"
                className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}
              >
                Email Content
              </label>
              <textarea
                id="email-content"
                rows="8"
                className={`w-full px-4 py-3 border ${
                  darkMode
                    ? 'border-gray-600 bg-gray-700/70 text-white focus:ring-blue-500 focus:border-blue-500'
                    : 'border-gray-300 bg-white/90 text-gray-900 focus:ring-blue-600 focus:border-blue-600'
                  } rounded-lg shadow-sm placeholder-gray-400 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    darkMode ? 'focus:ring-offset-gray-800' : ''
                  } hover:border-blue-400`}
                value={mail}
                onChange={(e) => setMail(e.target.value)}
                placeholder="Paste your email content here..."
              />
            </div>

            <div className="flex flex-wrap gap-4 mb-6">
              <button
                onClick={handleCheckSpam}
                disabled={isLoading}
                className={`px-6 py-3 rounded-lg font-medium flex items-center justify-center text-white transition-all duration-300 transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  isLoading
                    ? `${darkMode ? 'bg-gray-600' : 'bg-gray-400'} cursor-not-allowed`
                    : `${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'}
                       ${darkMode ? 'focus:ring-offset-gray-800' : ''} focus:ring-blue-500 shadow-md ${darkMode ? 'shadow-blue-900/30' : ''}`
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <RefreshCw size={18} className="mr-2 animate-spin" />
                    Checking...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <Shield size={18} className="mr-2" />
                    Check for Spam
                  </span>
                )}
              </button>

              <button
                onClick={clearForm}
                className={`px-6 py-3 border rounded-lg font-medium flex items-center transition-all duration-300 transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  darkMode
                    ? 'border-gray-600 bg-gray-700 hover:bg-gray-600 text-gray-200 focus:ring-offset-gray-800 focus:ring-blue-500 shadow-md shadow-gray-900/30'
                    : 'border-gray-300 bg-white hover:bg-gray-50 text-gray-700 focus:ring-blue-500 shadow-md'
                }`}
              >
                 <Trash2 size={18} className="mr-2" />
                Clear
              </button>
            </div>

            {error && (
              <div className={`${
                darkMode
                  ? 'bg-red-900/50 border-red-700'
                  : 'bg-red-50 border-red-500'
                } border-l-4 p-4 mb-6 rounded transition-all duration-300 animate-fade-in`}
              >
                <div className="flex items-center">
                  <div className={`flex-shrink-0 ${darkMode ? 'text-red-400' : 'text-red-500'}`}>
                    <AlertTriangle size={18} />
                  </div>
                  <div className="ml-3">
                    <p className={`text-sm ${darkMode ? 'text-red-300' : 'text-red-700'}`}>{error}</p>
                  </div>
                </div>
              </div>
            )}

            {result && (
              <div
                className={`mb-6 p-4 rounded-lg transition-all duration-300 animate-fade-in border ${
                  isSpamResult(result)
                    ? `${darkMode ? 'bg-red-900/50 border-red-700' : 'bg-red-50 border-red-500'}`
                    : `${darkMode ? 'bg-green-900/50 border-green-700' : 'bg-green-50 border-green-500'}`
                }`}
              >
                <h3 className={`text-lg font-medium mb-2 flex items-center ${isSpamResult(result) ? (darkMode ? 'text-red-400' : 'text-red-700') : (darkMode ? 'text-green-400' : 'text-green-700')}`}>
                  {isSpamResult(result)
                    ? <><AlertTriangle size={20} className="mr-2" /> Potential Spam Detected</>
                    : <><CheckCircle size={20} className="mr-2" /> No Spam Detected</>
                  }
                </h3>
                <p
                  className={`text-sm ${
                    isSpamResult(result) ? (darkMode ? 'text-red-300' : 'text-red-800') : (darkMode ? 'text-green-300' : 'text-green-800')
                  }`}
                >
                  {result}
                </p>
              </div>
            )}

            {/* Recent checks history */}
            {history.length > 0 && (
              <div className="mt-8 animate-fade-in">
                <h3 className={`text-lg font-medium mb-4 flex items-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  <History size={20} className="mr-2" />
                  Recent Checks
                </h3>
                <div className={`border rounded-lg overflow-hidden shadow-md ${darkMode ? 'border-gray-700 shadow-gray-900/30' : 'border-gray-200 shadow-gray-200'}`}>
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <tr>
                        <th className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>
                          Email Snippet
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>
                          Result
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>
                          Time
                        </th>
                      </tr>
                    </thead>
                    <tbody className={`${darkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'} divide-y`}>
                      {history.map((entry) => (
                        <tr key={entry.id} className="transition-colors duration-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                          <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                            {entry.snippet}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                isSpamResult(entry.result)
                                  ? `${darkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-800'}`
                                  : `${darkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-800'}`
                              }`}
                            >
                              {entry.result}
                            </span>
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                            {entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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

export default Dashboard;
