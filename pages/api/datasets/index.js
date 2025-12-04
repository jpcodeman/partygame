import connectDB from '../../../lib/mongodb';
import Dataset from '../../../models/Dataset';
import { verifyAdmin } from '../../../lib/auth';

async function handler(req, res) {
  await connectDB();

  if (req.method === 'GET') {
    try {
      const datasets = await Dataset.find().select('name createdAt updatedAt').sort({ name: 1 });
      res.status(200).json(datasets);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching datasets', error: error.message });
    }
  } else if (req.method === 'POST') {
    try {
      const { name } = req.body;
      
      if (!name) {
        return res.status(400).json({ message: 'Dataset name required' });
      }

      const dataset = new Dataset({
        name,
        questions: [],
        people: []
      });

      await dataset.save();
      res.status(201).json(dataset);
    } catch (error) {
      if (error.code === 11000) {
        res.status(400).json({ message: 'Dataset name already exists' });
      } else {
        res.status(500).json({ message: 'Error creating dataset', error: error.message });
      }
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}

export default verifyAdmin(handler);
