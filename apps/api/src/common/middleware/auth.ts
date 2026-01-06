import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/database.js';
import { AppError } from './error-handler.js';

export interface AuthUser {
  id: string;
  realEstateId: string;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      realEstateId?: string;
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(401, 'UNAUTHORIZED', 'Token nao fornecido');
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      throw new AppError(500, 'CONFIG_ERROR', 'JWT secret nao configurado');
    }

    const decoded = jwt.verify(token, jwtSecret) as {
      userId: string;
      realEstateId: string;
    };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        realEstateId: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      throw new AppError(401, 'UNAUTHORIZED', 'Usuario nao encontrado ou inativo');
    }

    // Check if real estate is active
    const realEstate = await prisma.realEstate.findUnique({
      where: { id: user.realEstateId },
      select: { isActive: true },
    });

    if (!realEstate || !realEstate.isActive) {
      throw new AppError(401, 'UNAUTHORIZED', 'Imobiliaria inativa');
    }

    req.user = {
      id: user.id,
      realEstateId: user.realEstateId,
      email: user.email,
      role: user.role,
    };
    req.realEstateId = user.realEstateId;

    next();
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new AppError(401, 'INVALID_TOKEN', 'Token invalido'));
    }
    if (error instanceof jwt.TokenExpiredError) {
      return next(new AppError(401, 'TOKEN_EXPIRED', 'Token expirado'));
    }
    next(error);
  }
};

export const requireRole = (roles: string | string[]) => {
  const roleArray = Array.isArray(roles) ? roles : [roles];
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, 'UNAUTHORIZED', 'Nao autenticado'));
    }

    if (!roleArray.includes(req.user.role)) {
      return next(new AppError(403, 'FORBIDDEN', 'Permissao negada'));
    }

    next();
  };
};
