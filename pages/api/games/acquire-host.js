import connectDB from '../../../lib/mongodb';
import Game from '../../../models/Game';
import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  await connectDB();

  const { gameCode, existingKey } = req.body;

  if (!gameCode) {
    return res.status(400).json({ message: 'Game code is required' });
  }

  try {
    const game = await Game.findOne({ gameCode: gameCode.toUpperCase() });

    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    // If existingKey provided, verify it matches the stored key
    if (existingKey) {
      if (game.hostKey === existingKey) {
        return res.status(200).json({ 
          message: 'Host key verified',
          hostKey: existingKey
        });
      }
      // Existing key is invalid, continue to try acquiring new key
    }

    // Check if another host already has control
    if (game.hostKey) {
      return res.status(403).json({ 
        message: 'Another host is currently controlling this game',
        locked: true
      });
    }

    // Generate a unique host key
    const hostKey = crypto.randomBytes(32).toString('hex');
    
    game.hostKey = hostKey;
    await game.save();

    return res.status(200).json({ 
      message: 'Host key acquired',
      hostKey
    });
  } catch (error) {
    console.error('Error acquiring host key:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}
