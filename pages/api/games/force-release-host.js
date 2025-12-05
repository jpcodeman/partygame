import connectDB from '../../../lib/mongodb';
import Game from '../../../models/Game';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
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

  const { gameCode } = req.body;

  if (!gameCode) {
    return res.status(400).json({ message: 'Game code is required' });
  }

  try {
    const game = await Game.findOne({ gameCode: gameCode.toUpperCase() });

    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    // Force release the host key
    game.hostKey = null;
    await game.save();

    return res.status(200).json({ message: 'Host key released successfully' });
  } catch (error) {
    console.error('Error force-releasing host key:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}
