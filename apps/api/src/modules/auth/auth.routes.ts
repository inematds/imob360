import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/database.js';
import { AppError } from '../../common/middleware/error-handler.js';
import { authenticate } from '../../common/middleware/auth.js';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  realEstateName: z.string().min(3),
  cnpj: z.string().min(14),
  phone: z.string().min(10),
  userName: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
});

// Login
authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findFirst({
      where: { email, isActive: true },
      include: {
        realEstate: {
          select: {
            id: true,
            name: true,
            slug: true,
            isActive: true,
            planType: true,
          },
        },
      },
    });

    if (!user || !user.passwordHash) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Email ou senha invalidos');
    }

    if (!user.realEstate.isActive) {
      throw new AppError(401, 'INACTIVE_ACCOUNT', 'Conta inativa');
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Email ou senha invalidos');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const jwtSecret = process.env.JWT_SECRET!;
    const token = jwt.sign(
      { userId: user.id, realEstateId: user.realEstateId },
      jwtSecret,
      { expiresIn: '7d' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id, realEstateId: user.realEstateId, type: 'refresh' },
      jwtSecret,
      { expiresIn: '30d' }
    );

    // Save session
    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    });

    res.json({
      success: true,
      data: {
        token,
        refreshToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatarUrl: user.avatarUrl,
        },
        realEstate: user.realEstate,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Register new real estate
authRouter.post('/register', async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);

    // Check if CNPJ already exists
    const existingCnpj = await prisma.realEstate.findUnique({
      where: { cnpj: data.cnpj },
    });

    if (existingCnpj) {
      throw new AppError(409, 'CNPJ_EXISTS', 'CNPJ ja cadastrado');
    }

    // Generate slug
    const slug = data.realEstateName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Check if slug exists
    let finalSlug = slug;
    let counter = 1;
    while (await prisma.realEstate.findUnique({ where: { slug: finalSlug } })) {
      finalSlug = `${slug}-${counter}`;
      counter++;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 10);

    // Create real estate and admin user in transaction
    const result = await prisma.$transaction(async (tx) => {
      const realEstate = await tx.realEstate.create({
        data: {
          name: data.realEstateName,
          slug: finalSlug,
          cnpj: data.cnpj,
          phone: data.phone,
          planType: 'STARTER',
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days trial
        },
      });

      const user = await tx.user.create({
        data: {
          realEstateId: realEstate.id,
          name: data.userName,
          email: data.email,
          phone: data.phone,
          role: 'ADMIN',
          passwordHash,
        },
      });

      // Enable default features based on plan
      const features = await tx.featureDefinition.findMany();
      for (const feature of features) {
        const includedInPlan = feature.isIncludedInPlan as Record<string, boolean>;
        const isEnabled = includedInPlan['STARTER'] || false;

        await tx.tenantFeature.create({
          data: {
            realEstateId: realEstate.id,
            featureId: feature.id,
            isEnabled,
            enabledAt: isEnabled ? new Date() : null,
          },
        });
      }

      return { realEstate, user };
    });

    const jwtSecret = process.env.JWT_SECRET!;
    const token = jwt.sign(
      { userId: result.user.id, realEstateId: result.realEstate.id },
      jwtSecret,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role,
        },
        realEstate: {
          id: result.realEstate.id,
          name: result.realEstate.name,
          slug: result.realEstate.slug,
          planType: result.realEstate.planType,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get current user
authRouter.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        avatarUrl: true,
        creci: true,
        preferences: true,
        realEstate: {
          select: {
            id: true,
            name: true,
            slug: true,
            planType: true,
            logoUrl: true,
            primaryColor: true,
            secondaryColor: true,
            maxUsers: true,
            maxProperties: true,
            trialEndsAt: true,
          },
        },
      },
    });

    // Get enabled features
    const features = await prisma.tenantFeature.findMany({
      where: { realEstateId: req.realEstateId!, isEnabled: true },
      include: { feature: { select: { code: true, name: true } } },
    });

    res.json({
      success: true,
      data: {
        ...user,
        enabledFeatures: features.map((f) => f.feature.code),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Refresh token
authRouter.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError(400, 'MISSING_TOKEN', 'Refresh token nao fornecido');
    }

    const jwtSecret = process.env.JWT_SECRET!;
    const decoded = jwt.verify(refreshToken, jwtSecret) as {
      userId: string;
      realEstateId: string;
      type: string;
    };

    if (decoded.type !== 'refresh') {
      throw new AppError(401, 'INVALID_TOKEN', 'Token invalido');
    }

    const session = await prisma.session.findFirst({
      where: { refreshToken, userId: decoded.userId },
    });

    if (!session) {
      throw new AppError(401, 'INVALID_SESSION', 'Sessao invalida');
    }

    const newToken = jwt.sign(
      { userId: decoded.userId, realEstateId: decoded.realEstateId },
      jwtSecret,
      { expiresIn: '7d' }
    );

    await prisma.session.update({
      where: { id: session.id },
      data: {
        token: newToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.json({
      success: true,
      data: { token: newToken },
    });
  } catch (error) {
    next(error);
  }
});

// Logout
authRouter.post('/logout', authenticate, async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.substring(7);

    if (token) {
      await prisma.session.deleteMany({
        where: { token, userId: req.user!.id },
      });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});
