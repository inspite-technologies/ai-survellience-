import { useState, useEffect } from 'react';
import axios from 'axios';

const RegisteredFaces = () => {
  const [faces, setFaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

  useEffect(() => {
    loadFaces();
  }, []);

  const loadFaces = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('🔄 Fetching from:', `${API_URL}/faces`);

      const response = await axios.get(`${API_URL}/faces`);

      console.log('✅ Raw response:', response);
      console.log('✅ Response data:', response.data);
      console.log('✅ Is array?', Array.isArray(response.data));
      console.log('✅ Length:', response.data.length);

      setFaces(response.data);
      setLoading(false);

    } catch (err) {
      console.error('❌ Error:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const deleteFace = async (id, name) => {
    if (!window.confirm(`Delete ${name}?`)) return;

    try {
      await axios.delete(`${API_URL}/faces/${id}`);
      loadFaces();
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1a1a1a, #0a0a0a)',
      padding: '20px',
      borderRadius: '12px',
      margin: '20px',
      border: '2px solid #32a629',
      boxShadow: '0 4px 15px rgba(50, 166, 41, 0.2)'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        paddingBottom: '15px',
        borderBottom: '2px solid #32a629'
      }}>
        <h3 style={{
          color: '#f1fff0',
          fontSize: '20px',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          margin: 0
        }}>
          <i className="fas fa-users"></i>
          Registered Employees
          <span style={{
            background: '#32a629',
            color: '#000',
            padding: '3px 12px',
            borderRadius: '20px',
            fontSize: '14px',
            fontWeight: 'bold',
            marginLeft: '8px'
          }}>
            {faces.length}
          </span>
        </h3>
        <button
          onClick={loadFaces}
          disabled={loading}
          style={{
            padding: '8px 18px',
            border: 'none',
            borderRadius: '8px',
            background: loading ? '#666' : 'linear-gradient(135deg, #32a629, #2d9524)',
            color: '#f1fff0',
            fontWeight: 'bold',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            transition: 'all 0.3s',
            boxShadow: '0 3px 10px rgba(50, 166, 41, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i>
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div style={{
          background: '#ff444420',
          border: '2px solid #ff4444',
          borderRadius: '8px',
          padding: '15px',
          marginBottom: '15px',
          color: '#ff4444',
          fontSize: '14px'
        }}>
          <i className="fas fa-exclamation-triangle"></i> Error: {error}
        </div>
      )}

      {loading ? (
        <div style={{
          color: '#f1fff0',
          textAlign: 'center',
          padding: '30px',
          fontSize: '16px'
        }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', color: '#32a629' }}></i>
          <div style={{ marginTop: '10px' }}>Loading employees...</div>
        </div>
      ) : faces.length === 0 ? (
        <div style={{
          color: '#888',
          textAlign: 'center',
          padding: '30px',
          background: '#0a0a0a',
          borderRadius: '8px',
          border: '2px dashed #333'
        }}>
          <i className="fas fa-user-slash" style={{ fontSize: '48px', color: '#333' }}></i>
          <div style={{ marginTop: '15px', color: '#f1fff0' }}>No employees registered yet</div>
        </div>
      ) : (
        <div style={{
          maxHeight: '400px',
          overflowY: 'auto',
          paddingRight: '5px'
        }}>
          {faces.map((face, index) => (
            <div
              key={face._id}
              style={{
                background: '#0a0a0a',
                padding: '15px',
                margin: '10px 0',
                borderRadius: '10px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                border: '2px solid #222',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#32a629';
                e.currentTarget.style.transform = 'translateX(5px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#222';
                e.currentTarget.style.transform = 'translateX(0)';
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '15px'
              }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #32a629, #2d9524)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px',
                  color: '#f1fff0',
                  boxShadow: '0 3px 10px rgba(50, 166, 41, 0.3)'
                }}>
                  <i className="fas fa-user"></i>
                </div>
                <div>
                  <div style={{
                    color: '#f1fff0',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    marginBottom: '4px'
                  }}>
                    {face.name}
                  </div>
                  <div style={{
                    color: '#888',
                    fontSize: '12px'
                  }}>
                    <i className="fas fa-clock"></i> {new Date(face.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <button
                onClick={() => deleteFace(face._id, face.name)}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #ff4444, #cc0000)',
                  color: '#f1fff0',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '13px',
                  transition: 'all 0.3s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <i className="fas fa-trash-alt"></i>
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RegisteredFaces;