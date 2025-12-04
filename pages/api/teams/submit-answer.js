import connectDB from '../../../lib/mongodb';
import Game from '../../../models/Game';
import Team from '../../../models/Team';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  await connectDB();

  try {
    const { gameCode, teamId, guess } = req.body;

    if (!gameCode || !teamId || guess === undefined) {
      return res.status(400).json({ message: 'Game code, team ID, and guess required' });
    }

    const game = await Game.findOne({ gameCode });
    
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    const team = await Team.findById(teamId);
    
    if (!team || team.gameId.toString() !== game._id.toString()) {
      return res.status(404).json({ message: 'Team not found' });
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

    if (currentRound.finalized) {
      return res.status(400).json({ message: 'This round has already been finalized' });
    }

    // Remove existing guess from this team if any
    currentRound.guesses = currentRound.guesses.filter(
      g => g.teamId.toString() !== teamId
    );

    // Add new guess
    currentRound.guesses.push({
      teamId: team._id,
      guess,
      timestamp: new Date()
    });

    await game.save();

    res.status(200).json({ 
      message: 'Guess submitted successfully',
      level: game.currentLevel,
      round: game.currentRound,
      guess
    });
  } catch (error) {
    res.status(500).json({ message: 'Error submitting guess', error: error.message });
  }
}
