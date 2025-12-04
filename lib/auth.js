import jwt from 'jsonwebtoken';

export const verifyAdmin = (handler) => async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.admin) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    req.admin = decoded;
    return handler(req, res);
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};
