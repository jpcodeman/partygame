'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function TeamView() {
  const router = useRouter();
  const params = useParams();
  const gameCode = params.gameCode;

  const [game, setGame] = useState(null);
  const [currentRound, setCurrentRound] = useState(null);
  const [teamId, setTeamId] = useState('');
  const [teamName, setTeamName] = useState('');
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [matches, setMatches] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [draggedAnswer, setDraggedAnswer] = useState(null);
  const [touchedAnswer, setTouchedAnswer] = useState(null);
  const [randomizedAnswers, setRandomizedAnswers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [gameComplete, setGameComplete] = useState(false);

  const loadGame = useCallback(async () => {
    try {
      console.log('Loading game for code:', gameCode);
      const response = await fetch(`/api/games/${gameCode}`);
      const data = await response.json();
      console.log('Game data received:', data);

      if (response.ok) {
        if (!data.game || !data.currentRound) {
          console.error('Missing game data:', { game: data.game, currentRound: data.currentRound });
          setError('Game data is incomplete');
          return;
        }

        console.log('Setting game state - currentLevel:', data.game.currentLevel);
        console.log('Current round options:', data.currentRound?.options);
        setGame(data.game);
        setCurrentRound(data.currentRound);
        setTeams(data.teams || []);
        
        // Check if game is complete (Level 3, Round 2, finalized)
        if (data.game.currentLevel === 3 && data.game.currentRound === 2 && data.currentRound?.finalized) {
          setGameComplete(true);
          return;
        }
        
        // Check if team has already guessed
        const storedTeamId = localStorage.getItem('teamId');
        const hasGuessed = data.currentRound.guesses?.some(
          g => g.teamId === storedTeamId
        );
        setSubmitted(hasGuessed || data.currentRound.finalized);
        
        if (hasGuessed) {
          const teamGuess = data.currentRound.guesses.find(
            g => g.teamId === storedTeamId
          );
          if (data.game.currentLevel === 3) {
            console.log('Level 3 - setting matches from guess:', teamGuess.guess);
            setMatches(teamGuess.guess || []);
          } else {
            setSelectedAnswer(teamGuess.guess);
          }
        } else {
          setSelectedAnswer('');
          if (data.game.currentLevel === 3) {
            // Initialize empty matches
            if (data.currentRound.options && Array.isArray(data.currentRound.options)) {
              console.log('Level 3 - initializing empty matches from options:', data.currentRound.options);
              setMatches(data.currentRound.options.map(opt => ({
                person: opt.person,
                answer: ''
              })));
              // Randomize answers once when loading the round
              const uniqueAnswers = [...new Set(data.currentRound.options.map(opt => opt.answer))];
              setRandomizedAnswers(uniqueAnswers.sort(() => Math.random() - 0.5));
            } else {
              console.error('Level 3 options are not an array:', data.currentRound.options);
              setError('Level 3 data is invalid');
            }
          }
        }

        setError('');
        console.log('Game state updated successfully');
      } else {
        console.error('Error response:', data.message);
        setError(data.message);
      }
    } catch (err) {
      console.error('Error loading game:', err);
      setError('Error loading game: ' + err.message);
    }
  }, [gameCode]);

  useEffect(() => {
    console.log('Team view useEffect triggered - gameCode:', gameCode);
    
    if (!gameCode) {
      console.log('No gameCode yet, waiting...');
      return;
    }
    
    const storedTeamId = localStorage.getItem('teamId');
    const storedTeamName = localStorage.getItem('teamName');
    const storedGameCode = localStorage.getItem('gameCode');
    console.log('Stored values - teamId:', storedTeamId, 'gameCode:', storedGameCode, 'current gameCode:', gameCode);

    if (storedTeamId && storedGameCode === gameCode?.toUpperCase()) {
      console.log('Team credentials valid, loading game...');
      setTeamId(storedTeamId);
      setTeamName(storedTeamName);
      loadGame();
    } else {
      console.log('Team credentials invalid or missing, redirecting to home');
      router.push('/');
    }
  }, [gameCode, loadGame, router]);

  const handleSubmit = async () => {
    const guess = game.currentLevel === 3 ? matches : selectedAnswer;

    if (!guess || (game.currentLevel === 3 && matches.some(m => !m.answer))) {
      alert('Please complete your guess');
      return;
    }

    try {
      const response = await fetch('/api/teams/submit-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameCode: gameCode.toUpperCase(),
          teamId,
          guess
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitted(true);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Error submitting guess');
    }
  };

  const handleMatchChange = (person, answer) => {
    setMatches(matches.map(m => 
      m.person === person ? { ...m, answer } : m
    ));
  };

  // Drag and drop handlers for desktop
  const handleDragStart = (e, answer) => {
    setDraggedAnswer(answer);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, person) => {
    e.preventDefault();
    if (draggedAnswer) {
      handleMatchChange(person, draggedAnswer);
      setDraggedAnswer(null);
    }
  };

  // Touch handlers for mobile
  const handleTouchStart = (answer) => {
    setTouchedAnswer(answer);
  };

  const handlePersonTap = (person) => {
    if (touchedAnswer) {
      handleMatchChange(person, touchedAnswer);
      setTouchedAnswer(null);
    }
  };

  const getAvailableAnswers = () => {
    // Use the pre-randomized answers
    return randomizedAnswers;
  };

  if (gameComplete && teams.length > 0) {
    const sortedTeams = [...teams].sort((a, b) => b.score - a.score);
    const myTeam = sortedTeams.find(t => t._id === teamId);
    
    // Calculate rank accounting for ties
    let myRank = 1;
    if (myTeam) {
      for (let i = 0; i < sortedTeams.length; i++) {
        if (sortedTeams[i]._id === teamId) {
          // Count how many teams have a higher score
          let higherScoreCount = 0;
          for (let j = 0; j < i; j++) {
            if (sortedTeams[j].score > myTeam.score) {
              higherScoreCount++;
            }
          }
          myRank = higherScoreCount + 1;
          break;
        }
      }
    }
    
    const isWinner = myRank === 1;

    return (
      <div className="container" style={{ maxWidth: '800px', minHeight: '100vh' }}>
        <style jsx global>{`
          body {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            transition: background 0.5s ease;
          }
        `}</style>
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <h1 style={{ fontSize: '48px', marginBottom: '40px' }}>🎉 Game Complete! 🎉</h1>
          
          {/* Your Team Result */}
          <div className="card" style={{ 
            background: isWinner 
              ? 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)'
              : myRank === 2
                ? 'linear-gradient(135deg, #f9f9faff 0%, #a9e5f4ff 100%)'
                : 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
            border: isWinner ? '4px solid #ffa500' : myRank === 2 ? '3px solid #c0c0c0' : '2px solid #dee2e6',
            boxShadow: isWinner ? '0 8px 32px rgba(255, 215, 0, 0.4)' : '0 4px 15px rgba(0,0,0,0.1)',
            marginBottom: '32px'
          }}>
            {isWinner && <h2 style={{ fontSize: '36px', marginBottom: '16px' }}>👑 Winner! 👑</h2>}
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Your Team</div>
            <div style={{ 
              fontSize: isWinner ? '48px' : '36px', 
              fontWeight: 'bold', 
              color: isWinner ? '#d97706' : '#333',
              marginBottom: '8px' 
            }}>
              {teamName}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '14px', color: '#666' }}>Rank</div>
                <div style={{ 
                  fontSize: isWinner ? '48px' : '32px', 
                  fontWeight: 'bold',
                  color: isWinner ? '#d97706' : '#667eea'
                }}>
                  #{myRank}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '14px', color: '#666' }}>Score</div>
                <div style={{ 
                  fontSize: isWinner ? '48px' : '32px', 
                  fontWeight: 'bold',
                  color: isWinner ? '#d97706' : '#667eea'
                }}>
                  {myTeam?.score || 0}
                </div>
              </div>
            </div>
          </div>

          {/* All Teams Standings */}
          <div className="card">
            <h2 style={{ marginBottom: '24px' }}>Final Standings</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {sortedTeams.map((team, idx) => {
                const isMyTeam = team._id === teamId;
                // Calculate rank based on how many teams have a higher score
                let rank = 1;
                for (let i = 0; i < idx; i++) {
                  if (sortedTeams[i].score > team.score) {
                    rank++;
                  }
                }
                
                return (
                  <div key={team._id} style={{
                    padding: '16px',
                    background: isMyTeam
                      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                      : rank === 1 
                        ? 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)'
                        : 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                    borderRadius: '12px',
                    border: isMyTeam ? '3px solid #4338ca' : rank === 1 ? '3px solid #ffa500' : '2px solid #dee2e6',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: isMyTeam || rank === 1 ? '0 4px 15px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.1)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ 
                        fontSize: '20px', 
                        fontWeight: 'bold',
                        color: isMyTeam ? 'white' : rank === 1 ? '#d97706' : '#666',
                        minWidth: '32px'
                      }}>
                        #{rank}
                      </div>
                      <div style={{ 
                        fontSize: '20px', 
                        fontWeight: 'bold', 
                        color: isMyTeam ? 'white' : rank === 1 ? '#d97706' : '#333'
                      }}>
                        {team.name}
                        {isMyTeam && ' (You)'}
                      </div>
                    </div>
                    <div style={{ 
                      fontSize: '28px', 
                      fontWeight: 'bold', 
                      color: isMyTeam ? 'white' : rank === 1 ? '#d97706' : '#667eea'
                    }}>
                      {team.score}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ marginTop: '32px' }}>
            <button onClick={() => router.push('/')} style={{ fontSize: '18px', padding: '16px 32px', width: '100%' }}>
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!game || !currentRound) {
    console.log('Waiting for game data - game:', game, 'currentRound:', currentRound);
    return (
      <div className="container" style={{ maxWidth: '600px', marginTop: '60px' }}>
        <div className="card">
          <h2>Loading...</h2>
        </div>
      </div>
    );
  }

  console.log('Rendering game - Level:', game.currentLevel, 'Matches:', matches);

  const getLevelInfo = (level) => {
    if (level === 1) return '1 pt correct, +1 if first';
    if (level === 2) return '2 pts correct, +2 if first';
    return '2 pts/match, +5 if all correct';
  };

  const getLevelBackground = (level) => {
    if (level === 1) return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    if (level === 2) return 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
    return 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
  };

  return (
    <div className="container" style={{ maxWidth: '800px', minHeight: '100vh' }}>
      <style jsx global>{`
        body {
          background: ${getLevelBackground(game.currentLevel)};
          transition: background 0.5s ease;
        }
      `}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', marginTop: '24px', flexFlow: 'wrap-reverse' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h1 style={{ marginBottom: 0 }}>{teamName}</h1>
            {teams.length > 0 && (() => {
              const myTeam = teams.find(t => t._id === teamId);
              if (myTeam) {
                return (
                  <div className='score-text'>
                    {myTeam.score}<span style={{ fontSize: '16px', marginLeft: '4px' }}>pts</span>
                  </div>
                );
              }
              return null;
            })()}
          </div>
          <div style={{ color: '#666' }}>Game: {game.gameCode}</div>
        </div>
        {/* dont let this button be pushed off the screen */}
        <button onClick={() => router.push('/')} className="secondary " style={{ marginLeft: 'auto' }}>
          Exit
        </button>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <span className="level-badge">Level {game.currentLevel} - Round {game.currentRound}</span>
          <div style={{ fontSize: '14px', color: '#666' }}>{getLevelInfo(game.currentLevel)}</div>
        </div>

        <div style={{ fontSize: '20px', padding: '16px', background: '#f9f9f9', borderRadius: '6px', marginBottom: '24px' }}>
          {currentRound.questionText}
        </div>

        {(game.currentLevel === 1 || game.currentLevel === 2) && currentRound.displayAnswer && (
          <div style={{ fontSize: '22px', padding: '20px', background: '#e3f2fd', borderRadius: '12px', marginBottom: '24px', textAlign: 'center', fontWeight: 'bold', border: '3px solid #90caf9' }}>
            "{currentRound.displayAnswer}"
          </div>
        )}

        {!submitted ? (
          <>
            {game.currentLevel === 1 && (
              <div>
                <h3 style={{ marginBottom: '12px' }}>Who said this?</h3>
                <div className="grid grid-2">
                  {currentRound.options.map((option, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedAnswer(option)}
                      style={{
                        padding: '20px',
                        background: selectedAnswer === option ? '#0070f3' : 'white',
                        color: selectedAnswer === option ? 'white' : 'black',
                        border: '2px solid #ddd',
                        fontSize: '18px'
                      }}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {game.currentLevel === 2 && (
              <div>
                <h3 style={{ marginBottom: '12px' }}>Who said this?</h3>
                <div className="grid grid-4">
                  {currentRound.options.map((option, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedAnswer(option)}
                      style={{
                        padding: '16px',
                        background: selectedAnswer === option ? '#0070f3' : 'white',
                        color: selectedAnswer === option ? 'white' : 'black',
                        border: '2px solid #ddd',
                        fontSize: '16px'
                      }}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {game.currentLevel === 3 && (
              <div>
                <h3>Match each person to their answer:</h3>
                <p style={{ color: '#666', fontSize: '14px', marginBottom: '16px' }}>
                  Drag answers to people (or tap an answer then tap a person on mobile)
                </p>
                
                {/* Two-column grid layout */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  alignItems: 'start'
                }}>
                  {(() => {
                    const availableAnswers = getAvailableAnswers();
                    const unmatchedAnswers = availableAnswers.filter(
                      ans => !matches.some(m => m.answer === ans)
                    );
                    let answerIndex = 0;

                    return matches.map((match, i) => {
                      if (match.answer) {
                        // Matched: span both columns
                        return (
                          <div
                            key={`matched-${i}`}
                            style={{
                              gridColumn: '1 / -1',
                              padding: '8px 16px',
                              background: 'linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%)',
                              border: '2px solid #28a745',
                              borderRadius: '12px',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#155724' }}>
                                  {match.person}
                                </div>
                                <div style={{ 
                                  fontSize: '16px', 
                                  color: '#155724',
                                  marginTop: '8px',
                                  fontStyle: 'italic'
                                }}>
                                  → "{match.answer}"
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMatchChange(match.person, '');
                                }}
                                style={{
                                  background: 'rgba(220, 53, 69, 0.1)',
                                  border: '2px solid #dc3545',
                                  borderRadius: '8px',
                                  color: '#dc3545',
                                  cursor: 'pointer',
                                  fontSize: '20px',
                                  padding: '8px 12px',
                                  fontWeight: 'bold'
                                }}
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        );
                      } else {
                        // Unmatched: person on left, answer on right
                        const currentAnswer = unmatchedAnswers[answerIndex];
                        answerIndex++;
                        
                        return (
                          <>
                            {/* Person card - left column */}
                            <div
                              key={`person-${i}`}
                              onDragOver={handleDragOver}
                              onDrop={(e) => handleDrop(e, match.person)}
                              onClick={() => handlePersonTap(match.person)}
                              style={{
                                padding: '16px',
                                background: 'white',
                                border: touchedAnswer ? '3px dashed #667eea' : '2px solid #ddd',
                                borderRadius: '12px',
                                cursor: touchedAnswer ? 'pointer' : 'default',
                                transition: 'all 0.2s ease',
                                fontWeight: 'bold',
                                fontSize: '18px',
                                minHeight: '56px',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                            >
                              {match.person}
                            </div>

                            {/* Answer card - right column */}
                            {currentAnswer && (
                              <div
                                key={`answer-${i}`}
                                draggable={true}
                                onDragStart={(e) => handleDragStart(e, currentAnswer)}
                                onDragEnd={() => setDraggedAnswer(null)}
                                onClick={() => handleTouchStart(currentAnswer)}
                                style={{
                                  padding: '16px',
                                  background: touchedAnswer === currentAnswer
                                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                    : 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                                  color: touchedAnswer === currentAnswer ? 'white' : '#333',
                                  border: touchedAnswer === currentAnswer ? '3px solid #4338ca' : '2px solid #ddd',
                                  borderRadius: '12px',
                                  cursor: 'grab',
                                  fontSize: '16px',
                                  transition: 'all 0.2s ease',
                                  boxShadow: touchedAnswer === currentAnswer 
                                    ? '0 4px 12px rgba(102, 126, 234, 0.4)' 
                                    : '0 2px 4px rgba(0,0,0,0.1)',
                                  userSelect: 'none',
                                  minHeight: '56px',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                              >
                                {currentAnswer}
                              </div>
                            )}
                          </>
                        );
                      }
                    });
                  })()}
                </div>
              </div>
            )}

            <button 
              onClick={handleSubmit} 
              style={{ width: '100%', marginTop: '24px' }}
              disabled={(!selectedAnswer && (game.currentLevel !== 3 || matches.some(m => !m.answer))) || (error && error.includes('finalized'))}
            >
              Submit Guess
            </button>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '32px' }}>
            <div style={{ fontSize: '20px', marginBottom: '16px' }}>
              {currentRound.finalized ? (
                <>✅ Round Complete!</>
              ) : (
                <>✅ Guess Submitted!</>
              )}
            </div>
            <div style={{ color: '#666', marginBottom: '24px' }}>
              {game.currentLevel === 3 ? (
                <>You've submitted your matches for Level {game.currentLevel} Question {game.currentRound}.</>
              ) : (
                <>You've submitted <strong>{selectedAnswer}</strong> for Level {game.currentLevel} Question {game.currentRound}.</>
              )}
              <br />
              Click refresh when the host advances to the next question.
            </div>
            <button onClick={loadGame} style={{ width: '100%' }}>
              Refresh
            </button>
          </div>
        )}

        {error && (
          <div style={{ marginTop: '16px' }}>
            <div className="error">{error}</div>
            <button onClick={loadGame} style={{ width: '100%', marginTop: '12px' }}>
              Refresh
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
