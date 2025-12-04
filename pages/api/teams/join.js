import connectDB from '../../../lib/mongodb';
import Team from '../../../models/Team';
import Game from '../../../models/Game';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  await connectDB();

  try {
    const { gameCode, teamName } = req.body;

    if (!gameCode || !teamName) {
      return res.status(400).json({ message: 'Game code and team name required' });
    }

    const game = await Game.findOne({ gameCode });
    
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    // Check if team already exists (case insensitive)
    let team = await Team.findOne({ 
      gameId: game._id, 
      name: { $regex: new RegExp(`^${teamName}$`, 'i') }
    });
    
    if (team) {
      return res.status(200).json({ team, message: 'Team already exists' });
    }

    team = new Team({
      gameId: game._id,
      name: teamName
    });

    await team.save();

    res.status(201).json({ team, message: 'Team joined successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error joining game', error: error.message });
  }
}
