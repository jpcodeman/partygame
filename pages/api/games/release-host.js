import connectDB from '../../../lib/mongodb';
import Game from '../../../models/Game';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  await connectDB();

  const { gameCode, hostKey } = req.body;

  if (!gameCode || !hostKey) {
    return res.status(400).json({ message: 'Game code and host key are required' });
  }

  try {
    const game = await Game.findOne({ gameCode: gameCode.toUpperCase() });

    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    // Verify the host key matches
    if (game.hostKey !== hostKey) {
      return res.status(403).json({ message: 'Invalid host key' });
    }

    // Release the host key
    game.hostKey = null;
    await game.save();

    return res.status(200).json({ message: 'Host key released' });
  } catch (error) {
    console.error('Error releasing host key:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}
