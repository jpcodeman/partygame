'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [gameCode, setGameCode] = useState('');
  const [teamName, setTeamName] = useState('');

  const handleJoinGame = async (e) => {
    e.preventDefault();
    if (gameCode && teamName) {
      try {
        const response = await fetch('/api/teams/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameCode: gameCode.toUpperCase(), teamName })
        });

        const data = await response.json();
        
        if (response.ok) {
          localStorage.setItem('teamId', data.team._id);
          localStorage.setItem('teamName', data.team.name);
          localStorage.setItem('gameCode', gameCode.toUpperCase());
          router.push(`/team/${gameCode.toUpperCase()}`);
        } else {
          alert(data.message);
        }
      } catch (error) {
        alert('Error joining game');
      }
    }
  };

  return (
    <div className="container" style={{ maxWidth: '500px', marginTop: '60px' }}>
      <div className="card">
        {/* shrink the title dynamically to fit in one line */}
        
        <h1 style={{ textAlign: 'center', fontSize: '3rem', marginBottom: '0px' }}>Crew Clue</h1>
        <h1 style={{ textAlign: 'center', fontSize: '3rem', marginBottom: '10px' }}>Who's Who</h1>
        <h3 style={{ textAlign: 'center', marginBottom: '36px'}}>Who on your crew matches the clue?</h3>
        <div style={{ background: 'rgba(0,0,0,0.05)', padding: '16px', borderRadius: '12px' }}>
          <h4 style={{ textAlign: 'left', marginBottom: '16px', color: '#468791ff' }}>Instructions:</h4>
          <h4 style={{ color: '#468791ff' }}>Review each clue with your crew to choose the true who, even as clues accrue and outdo the previous few being more screwy to chew through</h4>
        </div>
      </div>
      <div className="card">
        <h1 style={{ textAlign: 'center', marginBottom: '24px', fontSize: '2rem' }}>Join a Game</h1>
        <form onSubmit={handleJoinGame}>
          <label>Game Code</label>
          <input
            type="text"
            placeholder="Enter game code"
            value={gameCode}
            onChange={(e) => setGameCode(e.target.value.toUpperCase())}
            required
          />
          
          <label>Team Name</label>
          <input
            type="text"
            placeholder="Enter your team name"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            required
          />
          
          <button type="submit" style={{ width: '100%', marginTop: '12px' }}>
            Join Game
          </button>
        </form>

        <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #eee' }}>
          <button 
            onClick={() => {
              const code = prompt('Enter game code for host view:');
              if (code) router.push(`/host/${code.toUpperCase()}`);
            }}
            className="secondary"
            style={{ width: '100%', marginBottom: '12px' }}
          >
            Host View
          </button>

          <button 
            onClick={() => router.push('/admin')}
            className="secondary"
            style={{ width: '100%' }}
          >
            Admin Panel
          </button>
        </div>
      </div>
    </div>
  );
}
