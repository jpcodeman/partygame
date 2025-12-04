import connectDB from '../../../lib/mongodb';
import Game from '../../../models/Game';
import Team from '../../../models/Team';

function calculatePoints(level, isCorrect, isFirst, allCorrect = false) {
  if (level === 1) {
    if (!isCorrect) return 0;
    return isFirst ? 2 : 1;
  } else if (level === 2) {
    if (!isCorrect) return 0;
    return isFirst ? 4 : 2;
  } else if (level === 3) {
    // For level 3, points are calculated differently
    return 0; // Will be calculated per match
  }
  return 0;
}

function checkLevel3Matches(teamGuess, correctMatches) {
  if (!Array.isArray(teamGuess)) return { correctCount: 0, allCorrect: false };
  
  let correctCount = 0;
  
  for (const match of teamGuess) {
    const correctMatch = correctMatches.find(cm => cm.person === match.person);
    if (correctMatch && correctMatch.answer === match.answer) {
      correctCount++;
    }
  }
  
  const allCorrect = correctCount === correctMatches.length;
  return { correctCount, allCorrect };
}

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

    if (currentRound.finalized) {
      return res.status(400).json({ message: 'Round already finalized' });
    }

    // Sort guesses by timestamp
    const sortedGuesses = currentRound.guesses.sort((a, b) => 
      a.timestamp - b.timestamp
    );

    // Calculate points for each team
    const results = [];
    let firstCorrectFound = false;

    for (const guessEntry of sortedGuesses) {
      const team = await Team.findById(guessEntry.teamId);
      let points = 0;
      let isCorrect = false;

      if (game.currentLevel === 3) {
        const { correctCount, allCorrect } = checkLevel3Matches(
          guessEntry.guess, 
          currentRound.correctGuess
        );
        points = correctCount * 2;
        if (allCorrect) {
          points += 5;
        }
        isCorrect = correctCount > 0;
      } else {
        isCorrect = guessEntry.guess === currentRound.correctGuess;
        const isFirst = isCorrect && !firstCorrectFound;
        if (isCorrect) firstCorrectFound = true;
        points = calculatePoints(game.currentLevel, isCorrect, isFirst);
      }

      team.score += points;
      await team.save();

      // Store points in the guess entry for later retrieval
      guessEntry.points = points;

      results.push({
        teamName: team.name,
        guess: guessEntry.guess,
        isCorrect,
        points,
        timestamp: guessEntry.timestamp
      });
    }

    currentRound.finalized = true;
    game.markModified('rounds'); // Mark the rounds array as modified
    game.updatedAt = Date.now();
    await game.save();

    res.status(200).json({ 
      message: 'Round finalized',
      correctGuess: currentRound.correctGuess,
      results
    });
  } catch (error) {
    res.status(500).json({ message: 'Error finalizing round', error: error.message });
  }
}
