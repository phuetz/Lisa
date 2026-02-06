import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma.js';

export const registerUser = async (email: string, password: string, name?: string) => {
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
    },
  });

   
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

export const loginUser = async (email: string, password_raw: string) => {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error('Invalid credentials');
  }

  const isPasswordValid = await bcrypt.compare(password_raw, user.password);

  if (!isPasswordValid) {
    throw new Error('Invalid credentials');
  }

  if (!process.env.JWT_SECRET) {
    throw new Error('JWT secret not configured on server (process.env.JWT_SECRET)');
  }
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
    expiresIn: '1h',
  });

   
  const { password: _pwd, ...userWithoutPassword } = user;

  return { user: userWithoutPassword, token };
};
