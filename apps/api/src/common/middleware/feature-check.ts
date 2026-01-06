import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database.js';
import { redis } from '../../config/redis.js';
import { AppError } from './error-handler.js';
import { FEATURES } from '@imob360/shared';

type FeatureCode = keyof typeof FEATURES;

// Cache feature status for 5 minutes
const CACHE_TTL = 300;

export const requireFeature = (featureCode: FeatureCode) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.realEstateId) {
        return next(new AppError(401, 'UNAUTHORIZED', 'Nao autenticado'));
      }

      const cacheKey = `feature:${req.realEstateId}:${featureCode}`;

      // Check cache first
      const cached = await redis.get(cacheKey);
      if (cached !== null) {
        if (cached === 'true') {
          return next();
        }
        return next(new AppError(403, 'FEATURE_DISABLED', `Funcionalidade ${featureCode} nao esta habilitada`));
      }

      // Check database
      const feature = await prisma.featureDefinition.findUnique({
        where: { code: featureCode },
      });

      if (!feature) {
        await redis.setex(cacheKey, CACHE_TTL, 'false');
        return next(new AppError(403, 'FEATURE_NOT_FOUND', `Funcionalidade ${featureCode} nao existe`));
      }

      const tenantFeature = await prisma.tenantFeature.findUnique({
        where: {
          realEstateId_featureId: {
            realEstateId: req.realEstateId,
            featureId: feature.id,
          },
        },
      });

      const isEnabled = tenantFeature?.isEnabled ?? false;
      await redis.setex(cacheKey, CACHE_TTL, isEnabled.toString());

      if (!isEnabled) {
        return next(new AppError(403, 'FEATURE_DISABLED', `Funcionalidade ${featureCode} nao esta habilitada. Ative no painel de configuracoes.`));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Helper to check feature status without blocking
export const checkFeature = async (realEstateId: string, featureCode: FeatureCode): Promise<boolean> => {
  const cacheKey = `feature:${realEstateId}:${featureCode}`;

  const cached = await redis.get(cacheKey);
  if (cached !== null) {
    return cached === 'true';
  }

  const feature = await prisma.featureDefinition.findUnique({
    where: { code: featureCode },
  });

  if (!feature) {
    await redis.setex(cacheKey, CACHE_TTL, 'false');
    return false;
  }

  const tenantFeature = await prisma.tenantFeature.findUnique({
    where: {
      realEstateId_featureId: {
        realEstateId,
        featureId: feature.id,
      },
    },
  });

  const isEnabled = tenantFeature?.isEnabled ?? false;
  await redis.setex(cacheKey, CACHE_TTL, isEnabled.toString());

  return isEnabled;
};

// Invalidate feature cache
export const invalidateFeatureCache = async (realEstateId: string, featureCode?: FeatureCode) => {
  if (featureCode) {
    await redis.del(`feature:${realEstateId}:${featureCode}`);
  } else {
    // Invalidate all features for tenant
    const keys = await redis.keys(`feature:${realEstateId}:*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
};

// Increment usage count for a feature
export const incrementUsage = async (realEstateId: string, featureCode: FeatureCode) => {
  const feature = await prisma.featureDefinition.findUnique({
    where: { code: featureCode },
  });

  if (!feature) return;

  await prisma.tenantFeature.update({
    where: {
      realEstateId_featureId: {
        realEstateId,
        featureId: feature.id,
      },
    },
    data: {
      usageCount: { increment: 1 },
    },
  });

  // Log usage
  const tenantFeature = await prisma.tenantFeature.findUnique({
    where: {
      realEstateId_featureId: {
        realEstateId,
        featureId: feature.id,
      },
    },
  });

  if (tenantFeature) {
    await prisma.featureUsageLog.create({
      data: {
        tenantFeatureId: tenantFeature.id,
      },
    });
  }
};
