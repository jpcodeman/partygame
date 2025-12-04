# Party Game - Get to Know You

A multiplayer party game built with Next.js, React, and MongoDB where teams compete to match people with their answers to get-to-know-you questions.

## Features

- **3 Game Levels** with different gameplay mechanics
- **Admin Panel** for managing datasets, questions, and people
- **CSV Import** for bulk uploading questions and answers
- **Host View** for controlling game flow and displaying results
- **Team View** for players to submit answers
- **Persistent Games** with automatic scoring

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env.local` file with your configuration:
```
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
ADMIN_PASSWORD=your_admin_password
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Game Flow

1. **Admin creates a dataset** - Add questions and people via CSV or manually
2. **Admin creates a game** - Select a dataset and generate a game code
3. **Teams join** - Use the game code and choose a team name
4. **Host controls** - Display questions, finalize rounds, and advance the game
5. **Teams answer** - Submit answers for each question
6. **Scoring** - Automatic point calculation based on correctness and speed

## Levels

- **Level 1** (10 rounds): Choose from 4 options - 1 point + 1 for first correct
- **Level 2** (5 rounds): Choose from all people - 2 points + 2 for first correct
- **Level 3** (2 rounds): Match people to answers - 2 points per match + 5 for all correct

## CSV Format

Your CSV should have:
- A "Your Name" column (or similar) with people's names
- Additional columns for each question
- One row per person with their answers

Example:
```csv
Your Name,Favorite Color,Hometown,Hobby
John,Blue,Seattle,Reading
Jane,Green,Portland,Hiking
```

## Deployment to Vercel

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

## Tech Stack

- **Frontend**: Next.js 14, React 18
- **Backend**: Next.js API Routes
- **Database**: MongoDB with Mongoose
- **Hosting**: Vercel
