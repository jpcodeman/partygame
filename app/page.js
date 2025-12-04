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
        <h1 style={{ textAlign: 'center' }}>Party Game</h1>
        
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
            onClick={() => router.push('/admin')}
            className="secondary"
            style={{ width: '100%', marginBottom: '12px' }}
          >
            Admin Panel
          </button>
          
          <button 
            onClick={() => {
              const code = prompt('Enter game code for host view:');
              if (code) router.push(`/host/${code.toUpperCase()}`);
            }}
            className="secondary"
            style={{ width: '100%' }}
          >
            Host View
          </button>
        </div>
      </div>
    </div>
  );
}
