import mongoose from 'mongoose';

const PersonSchema = new mongoose.Schema({
  name: { type: String, required: true },
  answers: { type: Map, of: String } // questionId -> answer
});

const QuestionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  order: { type: Number, required: true }
});

const DatasetSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  questions: [QuestionSchema],
  people: [PersonSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.models.Dataset || mongoose.model('Dataset', DatasetSchema);
