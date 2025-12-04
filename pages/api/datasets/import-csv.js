import connectDB from '../../../lib/mongodb';
import Dataset from '../../../models/Dataset';
import { verifyAdmin } from '../../../lib/auth';
import csv from 'csv-parser';
import { Readable } from 'stream';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  await connectDB();

  try {
    const { datasetId, csvData } = req.body;

    if (!datasetId || !csvData) {
      return res.status(400).json({ message: 'Dataset ID and CSV data required' });
    }

    const dataset = await Dataset.findById(datasetId);
    if (!dataset) {
      return res.status(404).json({ message: 'Dataset not found' });
    }

    const results = [];
    const stream = Readable.from([csvData]);

    await new Promise((resolve, reject) => {
      stream
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', resolve)
        .on('error', reject);
    });

    if (results.length === 0) {
      return res.status(400).json({ message: 'No data found in CSV' });
    }

    // Extract questions from headers (excluding "Your Name")
    const headers = Object.keys(results[0]);
    const nameColumn = headers.find(h => h.toLowerCase().includes('name'));
    
    if (!nameColumn) {
      return res.status(400).json({ message: 'CSV must have a "Your Name" column' });
    }

    const questionHeaders = headers.filter(h => h !== nameColumn);
    
    // Create questions
    const questions = questionHeaders.map((header, index) => ({
      text: header,
      order: index + 1
    }));

    // Create people with their answers
    const people = results.map(row => {
      const person = {
        name: row[nameColumn],
        answers: new Map()
      };

      questionHeaders.forEach((qHeader, index) => {
        person.answers.set(index.toString(), row[qHeader] || '');
      });

      return person;
    });

    dataset.questions = questions;
    dataset.people = people;
    dataset.updatedAt = Date.now();

    await dataset.save();

    res.status(200).json({ 
      message: 'CSV imported successfully',
      questionsCount: questions.length,
      peopleCount: people.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Error importing CSV', error: error.message });
  }
}

export default verifyAdmin(handler);
