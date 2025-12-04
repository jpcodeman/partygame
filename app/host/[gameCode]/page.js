'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function HostView() {
  const router = useRouter();
  const params = useParams();
  const gameCode = params.gameCode;

  const [game, setGame] = useState(null);
  const [currentRound, setCurrentRound] = useState(null);
  const [teams, setTeams] = useState([]);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [gameComplete, setGameComplete] = useState(false);

  const loadGame = async () => {
    try {
      const response = await fetch(`/api/games/${gameCode}`);
      const data = await response.json();

      if (response.ok) {
        setGame(data.game);
        setCurrentRound(data.currentRound);
        setTeams(data.teams);
        // If round is finalized and results are included, set them
        if (data.results) {
          setResults(data.results);
        }
        setError('');
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Error loading game');
    }
  };

  useEffect(() => {
    if (gameCode) {
      loadGame();
    }
  }, [gameCode]);

  const handleFinalize = async () => {
    try {
      const response = await fetch('/api/games/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameCode })
      });

      const data = await response.json();

      if (response.ok) {
        setResults(data);
        loadGame();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Error finalizing round');
    }
  };

  const handleNextRound = async () => {
    try {
      const response = await fetch('/api/games/next-round', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameCode })
      });

      const data = await response.json();

      if (response.ok) {
        setResults(null);
        loadGame();
      } else {
        if (data.message.includes('complete')) {
          setGameComplete(true);
        } else {
          alert(data.message);
        }
      }
    } catch (err) {
      setError('Error advancing round');
    }
  };

  if (error && !game) {
    return (
      <div className="container" style={{ maxWidth: '600px', marginTop: '60px' }}>
        <div className="card">
          <div className="error">{error}</div>
          <button onClick={() => router.push('/')}>Back to Home</button>
        </div>
      </div>
    );
  }

  if (!game || !currentRound) {
    return (
      <div className="container" style={{ maxWidth: '600px', marginTop: '60px' }}>
        <div className="card">
          <h2>Loading...</h2>
        </div>
      </div>
    );
  }

  const getLevelInfo = (level) => {
    if (level === 1) return '1 point correct, +1 if first';
    if (level === 2) return '2 points correct, +2 if first';
    return '2 points per match, +5 for all correct';
  };

  const getLevelBackground = (level) => {
    if (level === 1) return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    if (level === 2) return 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
    return 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
  };

  if (gameComplete) {
    const sortedTeams = [...teams].sort((a, b) => b.score - a.score);
    const winner = sortedTeams[0];

    return (
      <div className="container" style={{ minHeight: '100vh' }}>
        <style jsx global>{`
          body {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            transition: background 0.5s ease;
          }
        `}</style>
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <h1 style={{ fontSize: '48px', marginBottom: '40px' }}>🎉 Game Complete! 🎉</h1>
          
          {/* Winner Card */}
          <div className="card" style={{ 
            background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
            border: '4px solid #ffa500',
            boxShadow: '0 8px 32px rgba(255, 215, 0, 0.4)',
            marginBottom: '32px'
          }}>
            <h2 style={{ fontSize: '36px', marginBottom: '16px' }}>👑 Winner! 👑</h2>
            <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#d97706', marginBottom: '8px' }}>
              {winner.name}
            </div>
            <div style={{ fontSize: '64px', fontWeight: 'bold', color: '#d97706' }}>
              {winner.score} points
            </div>
          </div>

          {/* Other Teams */}
          {sortedTeams.length > 1 && (
            <div className="card">
              <h2 style={{ marginBottom: '24px' }}>Final Standings</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {sortedTeams.slice(1).map((team, idx) => {
                  // Calculate rank based on how many teams have a higher score
                  // idx + 1 because we're in the sliced array (starting from second place)
                  const actualIndex = idx + 1;
                  let rank = 1;
                  for (let i = 0; i < actualIndex; i++) {
                    if (sortedTeams[i].score > team.score) {
                      rank++;
                    }
                  }
                  
                  return (
                    <div key={team._id} style={{
                      padding: '20px',
                      background: rank === 2 
                        ? 'linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%)' 
                        : 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                      borderRadius: '12px',
                      border: rank === 2 ? '3px solid #c0c0c0' : '2px solid #dee2e6',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ 
                          fontSize: '24px', 
                          fontWeight: 'bold',
                          color: '#666',
                          minWidth: '40px'
                        }}>
                          #{rank}
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>
                          {team.name}
                        </div>
                      </div>
                      <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#667eea' }}>
                        {team.score}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ marginTop: '32px', display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <button onClick={() => router.push('/')} style={{ fontSize: '18px', padding: '16px 32px' }}>
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ minHeight: '100vh' }}>
      <style jsx global>{`
        body {
          background: ${getLevelBackground(game.currentLevel)};
          transition: background 0.5s ease;
        }
      `}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>Host View</h1>
        <button onClick={() => router.push('/')} className="secondary">
          Exit Game
        </button>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
          <div>
            <h2>Game Code: <span style={{ color: '#667eea' }}>{game.gameCode}</span></h2>
            <div style={{ fontSize: '16px', color: '#666', marginTop: '4px' }}>{game.datasetName}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className="level-badge">Level {game.currentLevel} - Round {game.currentRound}</span>
            <div style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>{getLevelInfo(game.currentLevel)}</div>
          </div>
        </div>
        
        <h2>Team Scores</h2>
        <div className={`grid grid-${teams.length <= 4 ? 4 : teams.length > 8 ? 8 : teams.length}`} style={{ gap: '16px', marginTop: '16px' }}>
          {teams.sort((a, b) => b.score - a.score).map((team, idx) => (
            <div key={team._id} style={{ 
              padding: '20px', 
              background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
              borderRadius: '12px',
              textAlign: 'center',
              border: '3px solid #dee2e6',
              boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
            }}>
              <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#333' }}>
                {team.name}
              </div>
              <div style={{ fontSize: '32px', color: '#667eea', marginTop: '8px', fontWeight: '700' }}>{team.score}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>{currentRound.questionText}</h2>

        {(game.currentLevel === 1 || game.currentLevel === 2) && currentRound.displayAnswer && (
          <div className="answer-display">
            "{currentRound.displayAnswer}"
          </div>
        )}

        {game.currentLevel === 1 && (
          <div>
            <h3>Who said this?</h3>
            <div className="grid grid-2">
              {currentRound.options.map((option, i) => (
                <button key={i} style={{
                        padding: '20px',
                        background: currentRound.finalized && option === currentRound.correctGuess ? '#d4edda' : 'white',
                        color: 'black',
                        border: '2px solid #ddd',
                        fontSize: '18px'
                      }}>
                  {option}
                </button>
              ))}
            </div>
          </div>
        )}

        {game.currentLevel === 2 && (
          <div>
            <h3>Who said this?</h3>
            <div className="grid grid-4">
              {currentRound.options.map((option, i) => (
                <button key={i} style={{
                  padding: '16px',
                  background: currentRound.finalized && option === currentRound.correctGuess ? '#d4edda' : 'white',
                  color: 'black',
                  border: '2px solid #ddd',
                  fontSize: '16px',
                }}>
                  {option}
                </button>
              ))}
            </div>
          </div>
        )}

        {game.currentLevel === 3 && (
          <div>
            <h3>Match each person to their answer:</h3>
            
            {!currentRound.finalized ? (
              <>
                {/* People names */}
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ fontSize: '16px', marginBottom: '8px', color: '#667eea' }}>People:</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {currentRound.options.map((match, i) => (
                      <div key={i} style={{
                        padding: '8px 16px',
                        background: 'white',
                        border: '2px solid #ddd',
                        borderRadius: '8px',
                        fontWeight: '600',
                        fontSize: '16px'
                      }}>
                        {match.person}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Answers in random order */}
                <div>
                  <h4 style={{ fontSize: '16px', marginBottom: '8px', color: '#667eea' }}>Answers:</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[...currentRound.options]
                      .map(match => match.answer)
                      .sort(() => Math.random() - 0.5)
                      .map((answer, i) => (
                        <div key={i} style={{
                          padding: '12px',
                          background: 'white',
                          border: '2px solid #ddd',
                          borderRadius: '8px',
                          fontSize: '16px'
                        }}>
                          {answer}
                        </div>
                      ))}
                  </div>
                </div>
              </>
            ) : (
              /* Show correct matches when finalized */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {currentRound.correctGuess.map((match, i) => {
                  // Find teams that got this match correct
                  const teamsWithCorrectMatch = currentRound.guesses
                    .filter(g => {
                      if (!Array.isArray(g.guess)) return false;
                      const teamMatch = g.guess.find(tm => tm.person === match.person);
                      return teamMatch && teamMatch.answer === match.answer;
                    })
                    .map(g => {
                      const team = teams.find(t => t._id === g.teamId);
                      return team ? team.name : '';
                    })
                    .filter(name => name);

                  return (
                    <div key={i} style={{
                      padding: '16px',
                      background: 'linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%)',
                      border: '2px solid #28a745',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      justifyContent: 'space-between'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                        <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#155724' }}>
                          {match.person}
                        </div>
                        <div style={{ fontSize: '24px', color: '#155724' }}>→</div>
                        <div style={{ fontSize: '16px', color: '#155724', fontStyle: 'italic' }}>
                          "{match.answer}"
                        </div>
                      </div>
                      {teamsWithCorrectMatch.length > 0 && (
                        <div style={{ 
                          display: 'flex', 
                          flexWrap: 'wrap', 
                          gap: '6px',
                          justifyContent: 'flex-end'
                        }}>
                          {teamsWithCorrectMatch.map((teamName, idx) => (
                            <div key={idx} style={{
                              padding: '4px 12px',
                              background: 'rgba(21, 87, 36, 0.15)',
                              borderRadius: '8px',
                              fontSize: '14px',
                              fontWeight: '600',
                              color: '#155724',
                              border: '1px solid rgba(21, 87, 36, 0.3)'
                            }}>
                              {teamName}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <h3 style={{ marginTop: '24px' }}>Guesses Received: {currentRound.guesses?.length || 0} / {teams.length}</h3>

        {!currentRound.finalized && (
          <>
            <button 
              onClick={handleFinalize} 
              style={{ width: '100%', marginTop: '16px' }}
              disabled={currentRound.guesses?.length === 0}
            >
              Finalize & Show Results
            </button>
            <button onClick={loadGame} className="secondary" style={{ width: '100%', marginTop: '12px' }}>
              Refresh
            </button>
          </>
        )}
      </div>

      {results && (
        <div className="card" style={{ background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)', border: '3px solid #10b981' }}>
          <h2>
            Correct Answer: {
              Array.isArray(results.correctGuess) 
                ? 'See matches above'
                : results.correctGuess
            }
          </h2>

          {results.results.map((result, i) => (
            <div key={i} style={{ 
              padding: '16px', 
              background: result.isCorrect ? 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)' : 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
              margin: '8px 0',
              borderRadius: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              border: '2px solid ' + (result.isCorrect ? '#10b981' : '#ef4444')
            }}>
              <div>
                <strong style={{ fontSize: '18px' }}>{result.teamName}</strong>
                <div style={{ fontSize: '14px', color: '#555', marginTop: '4px' }}>
                  Guess: {Array.isArray(result.guess) ? 'See matches' : result.guess}
                </div>
              </div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: result.isCorrect ? '#059669' : '#dc2626' }}>
                +{result.points}
              </div>
            </div>
          ))}

          <button onClick={handleNextRound} style={{ width: '100%', marginTop: '16px', fontSize: '18px' }}>
            Next Question
          </button>
        </div>
      )}
    </div>
  );
}
