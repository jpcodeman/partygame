import connectDB from '../../../lib/mongodb';
import Dataset from '../../../models/Dataset';
import { verifyAdmin } from '../../../lib/auth';

async function handler(req, res) {
  await connectDB();

  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const dataset = await Dataset.findById(id);
      if (!dataset) {
        return res.status(404).json({ message: 'Dataset not found' });
      }
      res.status(200).json(dataset);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching dataset', error: error.message });
    }
  } else if (req.method === 'PUT') {
    try {
      const dataset = await Dataset.findByIdAndUpdate(
        id,
        { ...req.body, updatedAt: Date.now() },
        { new: true, runValidators: true }
      );
      
      if (!dataset) {
        return res.status(404).json({ message: 'Dataset not found' });
      }
      
      res.status(200).json(dataset);
    } catch (error) {
      res.status(500).json({ message: 'Error updating dataset', error: error.message });
    }
  } else if (req.method === 'DELETE') {
    try {
      const dataset = await Dataset.findByIdAndDelete(id);
      
      if (!dataset) {
        return res.status(404).json({ message: 'Dataset not found' });
      }
      
      res.status(200).json({ message: 'Dataset deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error deleting dataset', error: error.message });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}

export default verifyAdmin(handler);
