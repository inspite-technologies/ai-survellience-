import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Shield, Camera, Scan, Loader2 } from 'lucide-react';
import { login } from './services/authAPI';

// 1. Added setRole to props destructuring
export default function LoginPage({ setView, setRole }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');

  // 2. Added loading state for API calls
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    // Prevent default form submission if wrapped in a form tag
    if (e) e.preventDefault();

    // Basic Validation
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      // 3. Call the API
      const response = await login({ email, password });

      // Assuming backend returns { success: true, msg: "...", data: { token: "...", role: "admin", ... } }
      if (response && response.success && response.data && response.data.token) {
        const userData = response.data;

        // 4. Save to Local Storage (Crucial for App.js useEffect restoration)
        localStorage.setItem('token', userData.token);
        localStorage.setItem('role', userData.role);
        localStorage.setItem('lastView', userData.role);

        // 5. Update Parent State
        setRole(userData.role);

        // Map role to view
        setView(userData.role);
      } else {
        setError("Login successful, but no token received.");
      }

    } catch (err) {
      console.error("Login Failed:", err);
      // Handle Axios error response
      const errorMessage = err.response?.data?.msg || "Invalid credentials or server error";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f5f7f6 0%, #ebf2e9 100%)',
      position: 'relative',
      overflow: 'hidden',
      padding: '20px',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        @keyframes scanLine {
          0% { top: -10%; opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { top: 110%; opacity: 0; }
        }
        
        @keyframes gridPulse {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.05); }
        }
        
        @keyframes hexFloat {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(10deg); }
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        input, button, .feature-item {
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
      `}</style>

      {/* Background Elements */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {[...Array(8)].map((_, i) => (
          <div
            key={`hex-${i}`}
            className="hex-shape"
            style={{
              position: 'absolute',
              width: '40px',
              height: '40px',
              opacity: 0.1,
              clipPath: 'polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%)',
              background: i % 2 === 0 ? '#165d3c' : '#bdf59a',
              left: `${(i % 4) * 25 + 10}%`,
              top: `${Math.floor(i / 4) * 50 + 10}%`,
              animation: `hexFloat ${7 + i}s ease-in-out infinite`,
              animationDelay: `${i * 0.5}s`
            }}
          />
        ))}
      </div>

      {/* Main Login Container */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        maxWidth: '800px',
        width: '100%',
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(22, 93, 60, 0.15), 0 0 1px rgba(22, 93, 60, 0.2)',
        border: '1px solid rgba(189, 245, 154, 0.3)',
        backdropFilter: 'blur(10px)'
      }}>

        {/* Left Side */}
        <div style={{
          background: 'linear-gradient(135deg, #1e7b4ef8 0%, #bdf59a 100%)',
          padding: '30px 25px',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'linear-gradient(rgba(189, 245, 154, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(189, 245, 154, 0.1) 1px, transparent 1px)',
            backgroundSize: '30px 30px',
            opacity: 0.3
          }} />

          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ marginBottom: '20px', textAlign: 'center' }}>
              <div style={{
                width: '50px',
                height: '50px',
                background: 'rgba(189, 245, 154, 0.2)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                border: '3px solid rgba(189, 245, 154, 0.4)',
                position: 'relative'
              }}>
                <Shield size={25} color="#bdf59a" />
                <div style={{
                  position: 'absolute',
                  inset: '-6px',
                  border: '1px solid rgba(189, 245, 154, 0.2)',
                  borderRadius: '50%',
                  animation: 'gridPulse 2.5s ease-in-out infinite'
                }} />
              </div>
            </div>

            <h1 style={{
              fontSize: '20px',
              marginBottom: '8px',
              textAlign: 'center',
              fontWeight: 700,
              letterSpacing: '-0.5px'
            }}>
              AI Surveillance System
            </h1>

            <p style={{
              fontSize: '12px',
              opacity: 0.9,
              textAlign: 'center',
              marginBottom: '25px',
              fontWeight: 400,
              color: '#bdf59a'
            }}>
              Advanced Security & Monitoring Platform
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { icon: Camera, text: 'Real-time Video Analytics' },
                { icon: Scan, text: 'AI-Powered Threat Detection' },
                { icon: Shield, text: 'End-to-End Encryption' }
              ].map((feature, idx) => (
                <div key={idx} className="feature-item" style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 12px',
                  background: 'rgba(189, 245, 154, 0.08)',
                  borderRadius: '6px',
                  border: '1px solid rgba(189, 245, 154, 0.15)'
                }}>
                  <div style={{
                    width: '30px',
                    height: '30px',
                    background: 'rgba(189, 245, 154, 0.15)',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <feature.icon size={18} color="#bdf59a" />
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 500 }}>{feature.text}</span>
                </div>
              ))}
            </div>

            <div style={{
              marginTop: '25px',
              paddingTop: '20px',
              borderTop: '1px solid rgba(189, 245, 154, 0.2)',
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '15px',
              textAlign: 'center'
            }}>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#bdf59a' }}>99.9%</div>
                <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '2px' }}>Uptime</div>
              </div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#bdf59a' }}>24/7</div>
                <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '2px' }}>Monitoring</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side */}
        <div style={{
          padding: '30px 30px',
          background: 'white',
          display: 'flex',
          alignItems: 'center'
        }}>
          <div style={{ width: '100%', maxWidth: '320px', margin: '0 auto' }}>

            <div style={{ marginBottom: '25px' }}>
              <h2 style={{
                fontSize: '22px',
                fontWeight: 700,
                color: '#165d3c',
                marginBottom: '6px',
                letterSpacing: '-0.5px'
              }}>
                Secure Access
              </h2>
              <p style={{ color: '#5a6c7d', fontSize: '13px' }}>
                Enter your credentials to access the system
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#2d3748',
                  marginBottom: '6px'
                }}>
                  <Mail size={12} color="#165d3c" />
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  disabled={isLoading}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="you@company.com"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '2px solid #e8ede8',
                    borderRadius: '6px',
                    background: '#fafbfa',
                    fontSize: '13px',
                    fontFamily: 'Inter, sans-serif',
                    color: '#2d3748',
                    outline: 'none',
                    borderColor: error ? '#fca5a5' : '#e8ede8',
                    opacity: isLoading ? 0.7 : 1
                  }}
                  onFocus={(e) => !error && (e.target.style.borderColor = '#165d3c')}
                  onBlur={(e) => !error && (e.target.style.borderColor = '#e8ede8')}
                />
              </div>

              <div>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#2d3748',
                  marginBottom: '6px'
                }}>
                  <Lock size={12} color="#165d3c" />
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    disabled={isLoading}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError('');
                    }}
                    placeholder="Enter your password"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      paddingRight: '40px',
                      border: '2px solid #e8ede8',
                      borderRadius: '6px',
                      background: '#fafbfa',
                      fontSize: '13px',
                      fontFamily: 'Inter, sans-serif',
                      color: '#2d3748',
                      outline: 'none',
                      borderColor: error ? '#fca5a5' : '#e8ede8',
                      opacity: isLoading ? 0.7 : 1
                    }}
                    onFocus={(e) => !error && (e.target.style.borderColor = '#165d3c')}
                    onBlur={(e) => !error && (e.target.style.borderColor = '#e8ede8')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#5a6c7d',
                      padding: '3px'
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={{ width: '14px', height: '14px', cursor: 'pointer', accentColor: '#165d3c' }}
                  />
                  <span style={{ fontSize: '12px', color: '#5a6c7d', fontWeight: 500 }}>Remember me</span>
                </label>
                <button
                  onClick={() => console.log('Forgot password')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#165d3c',
                    fontSize: '12px',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Forgot Password?
                </button>
              </div>

              {/* Error Message Display */}
              {error && (
                <div style={{
                  color: '#e53e3e',
                  fontSize: '12px',
                  fontWeight: 500,
                  background: '#fff5f5',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #fed7d7',
                  textAlign: 'center'
                }}>
                  {error}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={isLoading}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #165d3c 0%, #1e7b4e 100%)',
                  color: 'white',
                  padding: '12px',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 8px rgba(22, 93, 60, 0.2)',
                  opacity: isLoading ? 0.8 : 1
                }}
                onMouseEnter={(e) => !isLoading && (e.target.style.transform = 'translateY(-2px)')}
                onMouseLeave={(e) => !isLoading && (e.target.style.transform = 'translateY(0)')}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <span>Access System</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>

            <p style={{ textAlign: 'center', marginTop: '18px', color: '#5a6c7d', fontSize: '12px' }}>
              {/* Not Admin?{' '} */}
              {/* <button
                onClick={() => setView('register')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#165d3c',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '12px',
                  textDecoration: 'underline'
                }}
              >
                Register now for HR
              </button> */}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}