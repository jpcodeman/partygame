import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ message: 'Password required' });
  }

  const isValid = password === process.env.ADMIN_PASSWORD;

  if (!isValid) {
    return res.status(401).json({ message: 'Invalid password' });
  }

  const token = jwt.sign({ admin: true }, process.env.JWT_SECRET, {
    expiresIn: '24h'
  });

  res.status(200).json({ token });
}
