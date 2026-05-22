import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, ArrowRight, User, Building, ShieldCheck, Camera, Loader2 } from 'lucide-react';
import { register } from './services/authAPI';

export default function SignupPage({ setView }) {
  const [formData, setFormData] = useState({
    fullName: '',
    companyName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleRegister = async () => {
    if (!formData.fullName || !formData.email || !formData.password) {
      setError("Please fill in all required fields");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      // Call the register API
      const response = await register({
        name: formData.fullName,
        email: formData.email,
        password: formData.password
      });

      // Registration successful - handle based on context
      if (response && response.success && response.data && response.data.token) {
        setSuccessMessage('Registration successful!');
        
        // Show success message briefly
        if (typeof setView === 'function') {
          alert('Registration successful! Please login with your credentials.');
          setView('login');
        } else {
          // If no setView, assume we're in admin panel - just reset form
          setFormData({
            fullName: '',
            companyName: '',
            email: '',
            password: '',
            confirmPassword: ''
          });
          setTimeout(() => setSuccessMessage(''), 5000);
        }
      } else {
        setError("Registration successful, but no token received.");
      }

    } catch (err) {
      console.error("Registration Failed:", err);
      const errorMessage = err.response?.data?.msg || "Registration failed. Please try again.";
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
        
        @keyframes hexFloat {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(10deg); }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        input, button {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>

      {/* Background Hexagons */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {[...Array(8)].map((_, i) => (
          <div
            key={`hex-${i}`}
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

      {/* Main Container - WIDTH REDUCED HERE */}
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
        boxShadow: '0 20px 60px rgba(22, 93, 60, 0.15)',
        border: '1px solid rgba(189, 245, 154, 0.3)',
        backdropFilter: 'blur(10px)',
        animation: 'fadeIn 0.5s ease-out',
        marginTop: '-130px',
      }}>

        {/* Left Side */}
        <div style={{
          background: 'linear-gradient(135deg, #1e7b4ef8 0%, #bdf59a 100%)',
          padding: '30px', /* Reduced padding */
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'linear-gradient(rgba(189, 245, 154, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(189, 245, 154, 0.1) 1px, transparent 1px)',
            backgroundSize: '30px 30px',
            opacity: 0.3
          }} />

          <div style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
            <div style={{
              width: '50px', height: '50px', background: 'rgba(255,255,255,0.2)',
              borderRadius: '50%', margin: '0 auto 15px', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <ShieldCheck size={24} color="#fff" />
            </div>

            <h1 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Join the Network</h1>
            <p style={{ fontSize: '12px', opacity: 0.9, lineHeight: '1.5', marginBottom: '20px', color: '#ecfdf5' }}>
              Create an account to manage surveillance and track attendance.
            </p>

            <div style={{ background: 'rgba(0,0,0,0.1)', padding: '15px', borderRadius: '10px', backdropFilter: 'blur(5px)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <Camera size={18} color="#bdf59a" />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600 }}>Face Recognition</div>
                  <div style={{ fontSize: '10px', opacity: 0.8 }}>99.9% Accuracy</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Building size={18} color="#bdf59a" />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600 }}>Enterprise Ready</div>
                  <div style={{ fontSize: '10px', opacity: 0.8 }}>Scalable Infrastructure</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side (Form) */}
        <div style={{ padding: '30px', background: 'white', display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '100%' }}>

            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#165d3c', marginBottom: '4px' }}>Create HR Account</h2>
              <p style={{ color: '#5a6c7d', fontSize: '12px' }}>Get started with your free admin dashboard</p>
            </div>

            <div style={{ display: 'grid', gap: '12px' }}>

              {/* Name */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#2d3748', marginBottom: '4px' }}>Full Name</label>
                <div style={{ position: 'relative' }}>
                  <User size={14} color="#165d3c" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    name="fullName"
                    placeholder="John Doe"
                    onChange={handleChange}
                    disabled={isLoading}
                    style={{
                      width: '100%', padding: '8px 8px 8px 32px', border: '2px solid #e8ede8', borderRadius: '6px',
                      background: '#fafbfa', fontSize: '12px', outline: 'none', color: '#2d3748', boxSizing: 'border-box',
                      opacity: isLoading ? 0.7 : 1
                    }}
                    onFocus={e => { e.target.style.borderColor = '#165d3c'; e.target.style.background = 'white'; }}
                    onBlur={e => { e.target.style.borderColor = '#e8ede8'; e.target.style.background = '#fafbfa'; }}
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#2d3748', marginBottom: '4px' }}>Work Email</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={14} color="#165d3c" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="email"
                    name="email"
                    placeholder="hr@company.com"
                    onChange={handleChange}
                    disabled={isLoading}
                    style={{
                      width: '100%', padding: '8px 8px 8px 32px', border: '2px solid #e8ede8', borderRadius: '6px',
                      background: '#fafbfa', fontSize: '12px', outline: 'none', color: '#2d3748', boxSizing: 'border-box',
                      opacity: isLoading ? 0.7 : 1
                    }}
                    onFocus={e => { e.target.style.borderColor = '#165d3c'; e.target.style.background = 'white'; }}
                    onBlur={e => { e.target.style.borderColor = '#e8ede8'; e.target.style.background = '#fafbfa'; }}
                  />
                </div>
              </div>

              {/* Passwords */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#2d3748', marginBottom: '4px' }}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={14} color="#165d3c" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder="••••••"
                      onChange={handleChange}
                      disabled={isLoading}
                      style={{
                        width: '100%', padding: '8px 8px 8px 32px', border: '2px solid #e8ede8', borderRadius: '6px',
                        background: '#fafbfa', fontSize: '12px', outline: 'none', color: '#2d3748', boxSizing: 'border-box',
                        opacity: isLoading ? 0.7 : 1
                      }}
                      onFocus={e => { e.target.style.borderColor = '#165d3c'; e.target.style.background = 'white'; }}
                      onBlur={e => { e.target.style.borderColor = '#e8ede8'; e.target.style.background = '#fafbfa'; }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#2d3748', marginBottom: '4px' }}>Confirm</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={14} color="#165d3c" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="confirmPassword"
                      placeholder="••••••"
                      onChange={handleChange}
                      style={{
                        width: '100%', padding: '8px 8px 8px 32px', border: '2px solid #e8ede8', borderRadius: '6px',
                        background: '#fafbfa', fontSize: '12px', outline: 'none', color: '#2d3748', boxSizing: 'border-box'
                      }}
                      onFocus={e => { e.target.style.borderColor = '#165d3c'; e.target.style.background = 'white'; }}
                      onBlur={e => { e.target.style.borderColor = '#e8ede8'; e.target.style.background = '#fafbfa'; }}
                    />
                  </div>
                </div>
              </div>

              {/* Show Password */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={() => setShowPassword(!showPassword)}
                  style={{ width: '12px', height: '12px', accentColor: '#165d3c', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '11px', color: '#64748b' }}>Show Password</span>
              </div>

              {error && (
                <div style={{
                  color: '#e53e3e', fontSize: '11px', fontWeight: 500, background: '#fff5f5',
                  padding: '6px', borderRadius: '4px', border: '1px solid #fed7d7', textAlign: 'center'
                }}>
                  {error}
                </div>
              )}

              {successMessage && (
                <div style={{
                  color: '#165d3c', fontSize: '11px', fontWeight: 500, background: '#f0fdf4',
                  padding: '6px', borderRadius: '4px', border: '1px solid #bdf59a', textAlign: 'center'
                }}>
                  {successMessage}
                </div>
              )}

              <button
                onClick={handleRegister}
                disabled={isLoading}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #165d3c 0%, #1e7b4e 100%)',
                  color: 'white',
                  padding: '10px',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginTop: '8px',
                  boxShadow: '0 4px 8px rgba(22, 93, 60, 0.2)',
                  opacity: isLoading ? 0.8 : 1
                }}
                onMouseEnter={e => { if (!isLoading) { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 8px 20px rgba(22, 93, 60, 0.25)'; } }}
                onMouseLeave={e => { if (!isLoading) { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 4px 8px rgba(22, 93, 60, 0.2)'; } }}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <span>Join Now</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>


          </div>
        </div>
      </div>
    </div>
  );
}