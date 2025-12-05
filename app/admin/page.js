'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminPanel() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [datasets, setDatasets] = useState([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState('');
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [games, setGames] = useState([]);
  const [newDatasetName, setNewDatasetName] = useState('');
  const [csvData, setCsvData] = useState('');
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [editingPerson, setEditingPerson] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      setIsAuthenticated(true);
      loadDatasets(token);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('adminToken', data.token);
        setIsAuthenticated(true);
        loadDatasets(data.token);
        setError('');
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Login failed');
    }
  };

  const loadDatasets = async (token) => {
    try {
      const response = await fetch('/api/datasets', {
        headers: { 'Authorization': `Bearer ${token || localStorage.getItem('adminToken')}` }
      });
      const data = await response.json();
      if (response.ok) {
        setDatasets(data);
      }
    } catch (err) {
      console.error('Error loading datasets:', err);
    }
  };

  const createDataset = async () => {
    if (!newDatasetName) return;
    
    try {
      const response = await fetch('/api/datasets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({ name: newDatasetName })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Dataset created successfully');
        setNewDatasetName('');
        loadDatasets();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Error creating dataset');
    }
  };

  const loadDataset = async (id) => {
    try {
      const response = await fetch(`/api/datasets/${id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
      });
      const data = await response.json();
      if (response.ok) {
        setSelectedDataset(data);
        setEditingQuestion(null);
        setEditingPerson(null);
        loadGames(id);
      }
    } catch (err) {
      setError('Error loading dataset');
    }
  };

  const loadGames = async (datasetId) => {
    try {
      const response = await fetch(`/api/games/by-dataset?datasetId=${datasetId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
      });
      const data = await response.json();
      if (response.ok) {
        setGames(data);
      }
    } catch (err) {
      console.error('Error loading games:', err);
    }
  };

  const handleDatasetSelect = (e) => {
    const id = e.target.value;
    setSelectedDatasetId(id);
    if (id) {
      loadDataset(id);
    } else {
      setSelectedDataset(null);
      setGames([]);
      setEditingQuestion(null);
      setEditingPerson(null);
    }
  };

  const updateDataset = async (updatedData) => {
    if (!selectedDataset) return;

    try {
      const response = await fetch(`/api/datasets/${selectedDataset._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify(updatedData)
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Dataset updated successfully');
        setSelectedDataset(data);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Error updating dataset');
    }
  };

  const saveQuestionEdit = () => {
    if (!editingQuestion || !editingQuestion.text.trim()) return;

    const updatedQuestions = [...selectedDataset.questions];
    updatedQuestions[editingQuestion.index] = {
      text: editingQuestion.text,
      order: editingQuestion.order
    };

    updateDataset({ ...selectedDataset, questions: updatedQuestions });
    setEditingQuestion(null);
  };

  const savePersonEdit = () => {
    if (!editingPerson || !editingPerson.name.trim()) return;

    const updatedPeople = [...selectedDataset.people];
    // Convert Map to plain object for JSON serialization
    const answersObject = {};
    editingPerson.answers.forEach((value, key) => {
      answersObject[key] = value;
    });
    
    updatedPeople[editingPerson.index] = {
      name: editingPerson.name,
      answers: answersObject
    };

    updateDataset({ ...selectedDataset, people: updatedPeople });
    setEditingPerson(null);
  };

  const updatePersonAnswer = (questionIndex, value) => {
    setEditingPerson({
      ...editingPerson,
      answers: new Map(editingPerson.answers).set(questionIndex.toString(), value)
    });
  };

  const importCSV = async () => {
    if (!selectedDataset || !csvData) return;

    try {
      const response = await fetch('/api/datasets/import-csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({
          datasetId: selectedDataset._id,
          csvData
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`Imported ${data.questionsCount} questions and ${data.peopleCount} people`);
        setCsvData('');
        loadDataset(selectedDataset._id);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Error importing CSV');
    }
  };

  const deleteDataset = async (id) => {
    if (!confirm('Are you sure you want to delete this dataset?')) return;

    try {
      const response = await fetch(`/api/datasets/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
      });

      if (response.ok) {
        setSuccess('Dataset deleted');
        if (selectedDataset?._id === id) {
          setSelectedDataset(null);
          setSelectedDatasetId('');
        }
        loadDatasets();
      }
    } catch (err) {
      setError('Error deleting dataset');
    }
  };

  const createGame = async () => {
    if (!selectedDataset) return;

    try {
      const response = await fetch('/api/games/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datasetId: selectedDataset._id })
      });

      const data = await response.json();

      if (response.ok) {
        alert(`Game created! Game Code: ${data.gameCode}`);
        loadGames(selectedDataset._id);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Error creating game');
    }
  };

  const forceReleaseHost = async (gameCode) => {
    if (!confirm(`Are you sure you want to release the host key for game ${gameCode}?`)) return;

    try {
      const response = await fetch('/api/games/force-release-host', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({ gameCode })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Host key released successfully');
        loadGames(selectedDataset._id);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Error releasing host key');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="container" style={{ maxWidth: '400px', marginTop: '60px' }}>
        <div className="card">
          <h1>Admin Login</h1>
          <form onSubmit={handleLogin}>
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="submit" style={{ width: '100%', marginTop: '12px' }}>
              Login
            </button>
          </form>
          {error && <div className="error">{error}</div>}
          <button 
            onClick={() => router.push('/')}
            className="secondary"
            style={{ width: '100%', marginTop: '12px' }}
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>Admin Panel</h1>
        <div className="flex">
          <button onClick={() => router.push('/')} className="secondary">
            Home
          </button>
          <button
            onClick={() => {
              localStorage.removeItem('adminToken');
              setIsAuthenticated(false);
            }}
            className="danger"
          >
            Logout
          </button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <div className="card">
        <h2>Create New Dataset</h2>
        <div className="flex">
          <input
            type="text"
            placeholder="Dataset name"
            value={newDatasetName}
            onChange={(e) => setNewDatasetName(e.target.value)}
            style={{ marginBottom: 0 }}
          />
          <button onClick={createDataset}>Create</button>
        </div>
      </div>

      <div className="card">
        <h2>Select Dataset</h2>
        <select 
          value={selectedDatasetId} 
          onChange={handleDatasetSelect}
          style={{ marginBottom: 0 }}
        >
          <option value="">-- Select a dataset --</option>
          {datasets.map(ds => (
            <option key={ds._id} value={ds._id}>{ds.name}</option>
          ))}
        </select>
      </div>

      {selectedDataset && (
        <div className="card">
          <h2>Dataset: {selectedDataset.name}</h2>
          <div className="flex" style={{ marginTop: '12px' }}>
            <button onClick={createGame}>Create Game</button>
            <button onClick={() => deleteDataset(selectedDataset._id)} className="danger">Delete Dataset</button>
          </div>
        </div>
      )}

      {selectedDataset && games.length > 0 && (
        <div className="card">
          <h2>Games ({games.length})</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '16px' }}>
              <thead>
                <tr style={{ background: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Game Code</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Progress</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Hosted</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Created</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {games.map((game) => (
                  <tr key={game._id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px', fontWeight: 'bold', fontSize: '16px' }}>
                      {game.gameCode}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      L{game.currentLevel} R{game.currentRound}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {game.isComplete ? (
                        <span style={{ 
                          background: '#10b981', 
                          color: 'white', 
                          padding: '4px 12px', 
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}>
                          Complete
                        </span>
                      ) : (
                        <span style={{ 
                          background: '#3b82f6', 
                          color: 'white', 
                          padding: '4px 12px', 
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}>
                          In Progress
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {game.isHosted ? (
                        <span style={{ 
                          background: '#ef4444', 
                          color: 'white', 
                          padding: '4px 12px', 
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}>
                          🔒 Locked
                        </span>
                      ) : (
                        <span style={{ color: '#6b7280', fontSize: '12px' }}>Available</span>
                      )}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
                      {new Date(game.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {game.isHosted && (
                        <button 
                          onClick={() => forceReleaseHost(game.gameCode)}
                          className="danger"
                          style={{ fontSize: '12px', padding: '6px 12px' }}
                        >
                          Release Host
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedDataset && (
        <div className="card">
          <h2>Import CSV</h2>
          <textarea
            placeholder="Paste CSV data here (with headers: Your Name, Question 1, Question 2, ...)"
            value={csvData}
            onChange={(e) => setCsvData(e.target.value)}
            rows={10}
          />
          <button onClick={importCSV}>Import CSV</button>
        </div>
      )}

      {selectedDataset && (
        <div className="card">
          <h2>Questions ({selectedDataset.questions?.length || 0})</h2>
          {selectedDataset.questions?.map((q, i) => (
            <div key={i} style={{ 
              padding: '12px', 
              background: '#f9f9f9', 
              margin: '8px 0', 
              borderRadius: '4px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ flex: 1 }}>
                {editingQuestion?.index === i ? (
                  <input
                    type="text"
                    value={editingQuestion.text}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, text: e.target.value })}
                    style={{ marginBottom: 0 }}
                  />
                ) : (
                  <span>{i + 1}. {q.text}</span>
                )}
              </div>
              <div className="flex" style={{ marginLeft: '12px' }}>
                {editingQuestion?.index === i ? (
                  <>
                    <button onClick={saveQuestionEdit} style={{ padding: '6px 12px' }}>Save</button>
                    <button onClick={() => setEditingQuestion(null)} className="secondary" style={{ padding: '6px 12px' }}>Cancel</button>
                  </>
                ) : (
                  <button onClick={() => setEditingQuestion({ index: i, text: q.text, order: q.order })} style={{ padding: '6px 12px' }}>Edit</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedDataset && (
        <div className="card">
          <h2>People ({selectedDataset.people?.length || 0})</h2>
          {selectedDataset.people?.map((p, i) => (
            <div key={i}>
              <div style={{ 
                padding: '12px', 
                background: editingPerson?.index === i ? '#e3f2fd' : '#f9f9f9',
                margin: '8px 0', 
                borderRadius: '4px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer'
              }}>
                <div style={{ flex: 1 }}>
                  {editingPerson?.index === i ? (
                    <input
                      type="text"
                      value={editingPerson.name}
                      onChange={(e) => setEditingPerson({ ...editingPerson, name: e.target.value })}
                      style={{ marginBottom: 0, fontWeight: 'bold' }}
                      placeholder="Person's name"
                    />
                  ) : (
                    <span style={{ fontWeight: 'bold' }}>{p.name}</span>
                  )}
                </div>
                <div className="flex" style={{ marginLeft: '12px' }}>
                  {editingPerson?.index === i ? (
                    <>
                      <button onClick={savePersonEdit} style={{ padding: '6px 12px' }}>Save</button>
                      <button onClick={() => setEditingPerson(null)} className="secondary" style={{ padding: '6px 12px' }}>Cancel</button>
                    </>
                  ) : (
                    <button 
                      onClick={() => setEditingPerson({ 
                        index: i, 
                        name: p.name, 
                        answers: new Map(Object.entries(p.answers || {}))
                      })} 
                      style={{ padding: '6px 12px' }}
                    >
                      Edit Answers
                    </button>
                  )}
                </div>
              </div>
              
              {editingPerson?.index === i && (
                <div style={{ 
                  marginLeft: '24px', 
                  marginBottom: '16px',
                  padding: '16px',
                  background: '#fff',
                  border: '2px solid #e3f2fd',
                  borderRadius: '4px'
                }}>
                  <h3 style={{ marginBottom: '12px' }}>Edit Answers for {editingPerson.name}</h3>
                  {selectedDataset.questions?.map((q, qIndex) => (
                    <div key={qIndex} style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '14px', color: '#666' }}>
                        {qIndex + 1}. {q.text}
                      </label>
                      <input
                        type="text"
                        value={editingPerson.answers.get(qIndex.toString()) || ''}
                        onChange={(e) => updatePersonAnswer(qIndex, e.target.value)}
                        placeholder="Answer"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
