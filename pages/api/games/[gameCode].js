import connectDB from '../../../lib/mongodb';
import Game from '../../../models/Game';
import Team from '../../../models/Team';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  await connectDB();

  try {
    const { gameCode } = req.query;

    if (!gameCode) {
      return res.status(400).json({ message: 'Game code required' });
    }

    const game = await Game.findOne({ gameCode });
    
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    const teams = await Team.find({ gameId: game._id });
    
    // Calculate correct index based on actual round structure
    // Level 1: 10 rounds (index 0-9)
    // Level 2: 5 rounds (index 10-14)
    // Level 3: 2 rounds (index 15-16)
    let currentRoundIndex;
    if (game.currentLevel === 1) {
      currentRoundIndex = game.currentRound - 1;
    } else if (game.currentLevel === 2) {
      currentRoundIndex = 10 + (game.currentRound - 1);
    } else {
      currentRoundIndex = 15 + (game.currentRound - 1);
    }
    
    console.log('Getting round - Level:', game.currentLevel, 'Round:', game.currentRound, 'Index:', currentRoundIndex, 'Total rounds:', game.rounds?.length);
    const currentRound = game.rounds[currentRoundIndex];
    
    if (!currentRound) {
      console.error('Current round not found at index:', currentRoundIndex, 'Available rounds:', game.rounds?.length);
    }

    // If round is finalized, calculate results to send to client
    let results = null;
    if (currentRound && currentRound.finalized) {
      const sortedGuesses = currentRound.guesses.sort((a, b) => a.timestamp - b.timestamp);
      
      results = {
        correctGuess: currentRound.correctGuess,
        results: []
      };

      let firstCorrectFound = false;

      for (const guessEntry of sortedGuesses) {
        const team = teams.find(t => t._id.toString() === guessEntry.teamId.toString());
        if (team) {
          let isCorrect = false;
          let points = 0;

          if (game.currentLevel === 3) {
            // Calculate level 3 matches
            if (Array.isArray(guessEntry.guess) && Array.isArray(currentRound.correctGuess)) {
              let correctCount = 0;
              for (const match of guessEntry.guess) {
                const correctMatch = currentRound.correctGuess.find(cm => cm.person === match.person);
                if (correctMatch && correctMatch.answer === match.answer) {
                  correctCount++;
                }
              }
              points = correctCount * 2;
              if (correctCount === currentRound.correctGuess.length) {
                points += 5;
              }
              isCorrect = correctCount > 0;
            }
          } else {
            // Levels 1 and 2
            isCorrect = guessEntry.guess === currentRound.correctGuess;
            if (isCorrect) {
              const isFirst = !firstCorrectFound;
              firstCorrectFound = true;
              if (game.currentLevel === 1) {
                points = isFirst ? 2 : 1;
              } else if (game.currentLevel === 2) {
                points = isFirst ? 4 : 2;
              }
            }
          }

          results.results.push({
            teamName: team.name,
            guess: guessEntry.guess,
            isCorrect,
            points: guessEntry.points || points,
            timestamp: guessEntry.timestamp
          });
        }
      }
    }

    res.status(200).json({
      game: {
        _id: game._id,
        gameCode: game.gameCode,
        datasetName: game.datasetName,
        currentLevel: game.currentLevel,
        currentRound: game.currentRound
      },
      currentRound,
      teams: teams.map(t => ({ _id: t._id, name: t.name, score: t.score })),
      results
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching game', error: error.message });
  }
}
