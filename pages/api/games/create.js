import connectDB from '../../../lib/mongodb';
import Game from '../../../models/Game';
import Dataset from '../../../models/Dataset';

function generateGameCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getAnswerForPerson(person, questionIndex) {
  try {
    const answer = person.answers?.[questionIndex.toString()] || 
                   person.answers?.get?.(questionIndex.toString()) || '';
    return typeof answer === 'string' ? answer.trim() : '';
  } catch (error) {
    console.error('Error getting answer for person:', person.name, 'question:', questionIndex, error);
    return '';
  }
}

function getQuestionIndex(dataset, question) {
  return dataset.questions.findIndex(q => q._id.toString() === question._id.toString());
}

function selectPersonWithUniqueAnswer(people, qIndex, excludeAnswers = new Set()) {
  // Find people whose answers are unique (no one else has the same answer)
  const answerCounts = new Map();
  
  // Count occurrences of each answer
  people.forEach(p => {
    const answer = getAnswerForPerson(p, qIndex);
    if (answer && !excludeAnswers.has(answer)) {
      const normalizedAnswer = answer.toLowerCase().trim();
      if (!answerCounts.has(normalizedAnswer)) {
        answerCounts.set(normalizedAnswer, []);
      }
      answerCounts.get(normalizedAnswer).push(p);
    }
  });
  
  // Find unique answers (only one person gave this answer)
  const peopleWithUniqueAnswers = [];
  answerCounts.forEach((peopleList, answer) => {
    if (peopleList.length === 1) {
      peopleWithUniqueAnswers.push(peopleList[0]);
    }
  });
  
  if (peopleWithUniqueAnswers.length > 0) {
    return peopleWithUniqueAnswers[Math.floor(Math.random() * peopleWithUniqueAnswers.length)];
  }
  
  return null;
}

function selectRandomOptions(allPeople, correctPerson, count) {
  const others = allPeople.filter(p => p.name !== correctPerson.name);
  const shuffled = shuffleArray(others);
  const selected = shuffled.slice(0, count - 1).map(p => p.name);
  selected.push(correctPerson.name);
  return shuffleArray(selected);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  await connectDB();

  try {
    const { datasetId } = req.body;

    if (!datasetId) {
      return res.status(400).json({ message: 'Dataset ID required' });
    }

    console.log('Creating game for dataset:', datasetId);

    const dataset = await Dataset.findById(datasetId);
    if (!dataset) {
      return res.status(404).json({ message: 'Dataset not found' });
    }

    console.log('Dataset loaded:', dataset.name, 'Questions:', dataset.questions.length, 'People:', dataset.people.length);

    if (dataset.questions.length < 1 || dataset.people.length < 4) {
      return res.status(400).json({ 
        message: `Dataset needs at least 1 question and 4 people. Currently has ${dataset.questions.length} questions and ${dataset.people.length} people.` 
      });
    }

    const gameCode = generateGameCode();
    const rounds = [];
    const usedPersonQuestions = new Set(); // Track person-question combinations

    // Level 1: 10 rounds with 4 options
    const shuffledQuestions = shuffleArray(dataset.questions);
    let questionIndex = 0;

    console.log('Generating Level 1 rounds...');
    const usedAnswersLevel1 = new Set(); // Track used answers to avoid duplicates
    let level1RoundsCreated = 0;
    let level1Attempts = 0;
    const maxLevel1Attempts = 50; // Prevent infinite loop
    
    while (level1RoundsCreated < 10 && level1Attempts < maxLevel1Attempts) {
      level1Attempts++;
      const question = shuffledQuestions[questionIndex % shuffledQuestions.length];
      if (!question || !question._id) {
        console.error('Invalid question at index', questionIndex, question);
        questionIndex++;
        continue;
      }
      
      const qIndex = getQuestionIndex(dataset, question);
      
      // Find person with unique answer (not used in previous rounds)
      const selectedPerson = selectPersonWithUniqueAnswer(dataset.people, qIndex, usedAnswersLevel1);
      
      if (!selectedPerson) {
        // If no unique answer available, try next question
        console.log('No unique answer available for Level 1 question:', question.text);
        questionIndex++;
        continue;
      }

      const personAnswer = getAnswerForPerson(selectedPerson, qIndex);
      const normalizedAnswer = personAnswer.toLowerCase().trim();
      usedAnswersLevel1.add(normalizedAnswer);
      usedPersonQuestions.add(`${selectedPerson.name}-${qIndex}`);
      const options = selectRandomOptions(dataset.people, selectedPerson, 4);

      rounds.push({
        questionId: question._id.toString(),
        questionText: question.text,
        displayAnswer: personAnswer,
        level: 1,
        roundNumber: level1RoundsCreated + 1,
        options,
        correctGuess: selectedPerson.name,
        guesses: []
      });
      
      level1RoundsCreated++;
      questionIndex++;
    }

    console.log('Level 1 rounds created:', rounds.filter(r => r.level === 1).length);

    // Level 2: 5 rounds with all people as options
    console.log('Generating Level 2 rounds...');
    const usedAnswersLevel2 = new Set(); // Track used answers to avoid duplicates
    let level2RoundsCreated = 0;
    let level2Attempts = 0;
    const maxLevel2Attempts = 30; // Prevent infinite loop
    
    while (level2RoundsCreated < 5 && level2Attempts < maxLevel2Attempts) {
      level2Attempts++;
      const question = shuffledQuestions[questionIndex % shuffledQuestions.length];
      if (!question || !question._id) {
        console.error('Invalid question at index', questionIndex, question);
        questionIndex++;
        continue;
      }
      
      const qIndex = getQuestionIndex(dataset, question);
      
      // Find person with unique answer (not used in previous rounds)
      const selectedPerson = selectPersonWithUniqueAnswer(dataset.people, qIndex, usedAnswersLevel2);
      
      if (!selectedPerson) {
        // If no unique answer available, try next question
        console.log('No unique answer available for Level 2 question:', question.text);
        questionIndex++;
        continue;
      }

      const personAnswer = getAnswerForPerson(selectedPerson, qIndex);
      const normalizedAnswer = personAnswer.toLowerCase().trim();
      usedAnswersLevel2.add(normalizedAnswer);
      usedPersonQuestions.add(`${selectedPerson.name}-${qIndex}`);

      rounds.push({
        questionId: question._id.toString(),
        questionText: question.text,
        displayAnswer: personAnswer,
        level: 2,
        roundNumber: level2RoundsCreated + 1,
        options: dataset.people.map(p => p.name),
        correctGuess: selectedPerson.name,
        guesses: []
      });
      
      level2RoundsCreated++;
      questionIndex++;
    }

    console.log('Level 2 rounds created:', rounds.filter(r => r.level === 2).length);

    // Level 3: 2 rounds with matching
    console.log('Generating Level 3 rounds...');
    // Round 1: Match as many people as have answers (up to 5)
    const question1 = shuffledQuestions[questionIndex % shuffledQuestions.length];
    if (question1 && question1._id) {
      questionIndex++;
      
      const q1Index = getQuestionIndex(dataset, question1);
      
      const round1PeopleWithAnswers = dataset.people.filter(p => 
        getAnswerForPerson(p, q1Index)
      );
      const round1Count = Math.min(5, round1PeopleWithAnswers.length);
      const round1Selected = shuffleArray(round1PeopleWithAnswers).slice(0, round1Count);
      
      const round1Matches = round1Selected.map(person => ({
        person: person.name,
        answer: getAnswerForPerson(person, q1Index)
      }));

      if (round1Matches.length > 0) {
        rounds.push({
          questionId: question1._id.toString(),
          questionText: question1.text,
          level: 3,
          roundNumber: 1,
          options: round1Matches,
          correctGuess: round1Matches,
          guesses: []
        });
        console.log('Level 3 Round 1 created with', round1Matches.length, 'matches');
      } else {
        console.log('No matches found for Level 3 Round 1');
      }
    }

    // Round 2: Match as many people as have answers (up to 10)
    const question2 = shuffledQuestions[questionIndex % shuffledQuestions.length];
    if (question2 && question2._id) {
      const q2Index = getQuestionIndex(dataset, question2);
      
      const round2PeopleWithAnswers = dataset.people.filter(p => 
        getAnswerForPerson(p, q2Index)
      );
      const round2Count = Math.min(10, round2PeopleWithAnswers.length);
      const round2Selected = shuffleArray(round2PeopleWithAnswers).slice(0, round2Count);
      
      const round2Matches = round2Selected.map(person => ({
        person: person.name,
        answer: getAnswerForPerson(person, q2Index)
      }));

      if (round2Matches.length > 0) {
        rounds.push({
          questionId: question2._id.toString(),
          questionText: question2.text,
          level: 3,
          roundNumber: 2,
          options: round2Matches,
          correctGuess: round2Matches,
          guesses: []
        });
        console.log('Level 3 Round 2 created with', round2Matches.length, 'matches');
      } else {
        console.log('No matches found for Level 3 Round 2');
      }
    }

    console.log('Total rounds created:', rounds.length);

    if (rounds.length === 0) {
      return res.status(400).json({ 
        message: 'Could not create any game rounds. Please ensure people have answered the questions in the dataset.' 
      });
    }

    const game = new Game({
      gameCode,
      datasetId: dataset._id,
      datasetName: dataset.name,
      rounds
    });

    await game.save();

    console.log('Game created successfully with code:', gameCode);

    res.status(201).json({ 
      gameCode,
      gameId: game._id,
      message: 'Game created successfully'
    });
  } catch (error) {
    console.error('Error creating game:', error);
    res.status(500).json({ message: 'Error creating game', error: error.message, stack: error.stack });
  }
}
