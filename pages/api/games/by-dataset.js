import connectDB from '../../../lib/mongodb';
import Game from '../../../models/Game';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Verify admin token
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }

  await connectDB();

  const { datasetId } = req.query;

  if (!datasetId) {
    return res.status(400).json({ message: 'Dataset ID is required' });
  }

  try {
    const games = await Game.find({ datasetId })
      .sort({ createdAt: -1 })
      .select('gameCode currentLevel currentRound hostKey createdAt updatedAt')
      .lean();

    // Get last round finalized status for each game
    const gamesWithStatus = await Promise.all(games.map(async (game) => {
      const gameWithLastRound = await Game.findById(game._id)
        .select({ 'rounds': { $slice: -1 } })
        .lean();
      
      const isComplete = gameWithLastRound?.rounds?.[0]?.finalized || false;;
      const isHosted = !!game.hostKey;
      
      return {
        _id: game._id,
        gameCode: game.gameCode,
        currentLevel: game.currentLevel,
        currentRound: game.currentRound,
        isHosted,
        isComplete,
        createdAt: game.createdAt,
        updatedAt: game.updatedAt
      };
    }));

    return res.status(200).json(gamesWithStatus);
  } catch (error) {
    console.error('Error fetching games by dataset:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}
