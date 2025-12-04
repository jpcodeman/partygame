import mongoose from 'mongoose';

const TeamSchema = new mongoose.Schema({
  gameId: { type: mongoose.Schema.Types.ObjectId, ref: 'Game', required: true },
  name: { type: String, required: true },
  score: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

// Unique combination of gameId and team name
TeamSchema.index({ gameId: 1, name: 1 }, { unique: true });

export default mongoose.models.Team || mongoose.model('Team', TeamSchema);
