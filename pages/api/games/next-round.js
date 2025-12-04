import connectDB from '../../../lib/mongodb';
import Game from '../../../models/Game';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  await connectDB();

  try {
    const { gameCode } = req.body;

    if (!gameCode) {
      return res.status(400).json({ message: 'Game code required' });
    }

    const game = await Game.findOne({ gameCode });
    
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    // Calculate correct index based on actual round structure
    let currentRoundIndex;
    if (game.currentLevel === 1) {
      currentRoundIndex = game.currentRound - 1;
    } else if (game.currentLevel === 2) {
      currentRoundIndex = 10 + (game.currentRound - 1);
    } else {
      currentRoundIndex = 15 + (game.currentRound - 1);
    }
    const currentRound = game.rounds[currentRoundIndex];

    if (!currentRound.finalized) {
      return res.status(400).json({ message: 'Current round must be finalized first' });
    }

    // Determine next round/level
    let nextLevel = game.currentLevel;
    let nextRound = game.currentRound + 1;

    if (game.currentLevel === 1 && game.currentRound === 10) {
      nextLevel = 2;
      nextRound = 1;
    } else if (game.currentLevel === 2 && game.currentRound === 5) {
      nextLevel = 3;
      nextRound = 1;
    } else if (game.currentLevel === 3 && game.currentRound === 2) {
      return res.status(400).json({ message: 'Game is complete!' });
    }

    game.currentLevel = nextLevel;
    game.currentRound = nextRound;
    game.updatedAt = Date.now();
    
    await game.save();

    res.status(200).json({ 
      message: 'Advanced to next round',
      currentLevel: game.currentLevel,
      currentRound: game.currentRound
    });
  } catch (error) {
    res.status(500).json({ message: 'Error advancing round', error: error.message });
  }
}
