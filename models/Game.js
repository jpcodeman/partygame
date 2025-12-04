import mongoose from 'mongoose';

const GuessSchema = new mongoose.Schema({
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  guess: mongoose.Schema.Types.Mixed, // String for level 1&2 (person name), Array of matches for level 3
  timestamp: { type: Date, default: Date.now }
});

const RoundSchema = new mongoose.Schema({
  questionId: { type: String, required: true },
  questionText: { type: String, required: true },
  level: { type: Number, required: true },
  roundNumber: { type: Number, required: true },
  displayAnswer: String, // The actual answer given by someone (for levels 1&2) that teams see
  options: mongoose.Schema.Types.Mixed, // Array of strings for level 1&2, Array of {person, answer} objects for level 3
  correctGuess: mongoose.Schema.Types.Mixed, // Correct person name for level 1&2, Array of {person, answer} objects for level 3
  guesses: [GuessSchema],
  finalized: { type: Boolean, default: false }
});

const GameSchema = new mongoose.Schema({
  gameCode: { type: String, required: true, unique: true },
  datasetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Dataset', required: true },
  datasetName: { type: String, required: true },
  currentLevel: { type: Number, default: 1 },
  currentRound: { type: Number, default: 1 },
  rounds: [RoundSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Delete the cached model to prevent schema conflicts in development
if (mongoose.models.Game) {
  delete mongoose.models.Game;
}

export default mongoose.model('Game', GameSchema);
