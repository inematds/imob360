import { Router } from 'express';
import { prisma } from '../../config/database.js';
import { authenticate, requireRole } from '../../common/middleware/auth.js';
import { AppError } from '../../common/middleware/error-handler.js';
import { redis } from '../../config/redis.js';

export const featuresRouter = Router();

// List all available features
featuresRouter.get('/', authenticate, async (req, res, next) => {
  try {
    const features = await prisma.featureDefinition.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    // Get tenant's enabled features
    const tenantFeatures = await prisma.tenantFeature.findMany({
      where: { realEstateId: req.realEstateId },
      select: {
        featureId: true,
        isEnabled: true,
        usageCount: true,
        usageLimit: true,
        config: true,
      },
    });

    const tenantFeatureMap = new Map(
      tenantFeatures.map((tf) => [tf.featureId, tf])
    );

    const featuresWithStatus = features.map((feature) => {
      const tenantFeature = tenantFeatureMap.get(feature.id);
      return {
        ...feature,
        isEnabled: tenantFeature?.isEnabled || false,
        usageCount: tenantFeature?.usageCount || 0,
        usageLimit: tenantFeature?.usageLimit || null,
        config: tenantFeature?.config || {},
      };
    });

    // Group by category
    const grouped = featuresWithStatus.reduce(
      (acc, feature) => {
        const cat = feature.category;
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(feature);
        return acc;
      },
      {} as Record<string, typeof featuresWithStatus>
    );

    res.json({ success: true, data: { features: featuresWithStatus, grouped } });
  } catch (error) {
    next(error);
  }
});

// Get tenant's feature status summary
featuresRouter.get('/status', authenticate, async (req, res, next) => {
  try {
    const tenantFeatures = await prisma.tenantFeature.findMany({
      where: { realEstateId: req.realEstateId },
      include: {
        feature: true,
      },
    });

    const enabled = tenantFeatures.filter((tf) => tf.isEnabled);
    const totalMonthlyCost = enabled.reduce(
      (sum, tf) => sum + Number(tf.feature.monthlyPrice),
      0
    );

    res.json({
      success: true,
      data: {
        totalFeatures: tenantFeatures.length,
        enabledFeatures: enabled.length,
        totalMonthlyCost,
        features: tenantFeatures.map((tf) => ({
          code: tf.feature.code,
          name: tf.feature.name,
          isEnabled: tf.isEnabled,
          monthlyPrice: tf.feature.monthlyPrice,
          usageCount: tf.usageCount,
          usageLimit: tf.usageLimit,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Enable a feature
featuresRouter.post('/:featureId/enable', authenticate, requireRole(['ADMIN', 'OWNER']), async (req, res, next) => {
  try {
    const { featureId } = req.params;
    const { config } = req.body;

    const feature = await prisma.featureDefinition.findUnique({
      where: { id: featureId },
    });

    if (!feature) {
      throw new AppError(404, 'NOT_FOUND', 'Feature nao encontrada');
    }

    const tenantFeature = await prisma.tenantFeature.upsert({
      where: {
        realEstateId_featureId: {
          realEstateId: req.realEstateId!,
          featureId,
        },
      },
      update: {
        isEnabled: true,
        enabledAt: new Date(),
        disabledAt: null,
        config: config || {},
      },
      create: {
        realEstateId: req.realEstateId!,
        featureId,
        isEnabled: true,
        enabledAt: new Date(),
        config: config || {},
      },
      include: {
        feature: true,
      },
    });

    // Clear cache
    await redis.del(`features:${req.realEstateId}`);
    await redis.del(`feature:${req.realEstateId}:${feature.code}`);

    res.json({
      success: true,
      data: tenantFeature,
      message: `Feature "${feature.name}" ativada com sucesso`,
    });
  } catch (error) {
    next(error);
  }
});

// Disable a feature
featuresRouter.post('/:featureId/disable', authenticate, requireRole(['ADMIN', 'OWNER']), async (req, res, next) => {
  try {
    const { featureId } = req.params;

    const feature = await prisma.featureDefinition.findUnique({
      where: { id: featureId },
    });

    if (!feature) {
      throw new AppError(404, 'NOT_FOUND', 'Feature nao encontrada');
    }

    const tenantFeature = await prisma.tenantFeature.update({
      where: {
        realEstateId_featureId: {
          realEstateId: req.realEstateId!,
          featureId,
        },
      },
      data: {
        isEnabled: false,
        disabledAt: new Date(),
      },
      include: {
        feature: true,
      },
    });

    // Clear cache
    await redis.del(`features:${req.realEstateId}`);
    await redis.del(`feature:${req.realEstateId}:${feature.code}`);

    res.json({
      success: true,
      data: tenantFeature,
      message: `Feature "${feature.name}" desativada com sucesso`,
    });
  } catch (error) {
    next(error);
  }
});

// Update feature configuration
featuresRouter.patch('/:featureId/config', authenticate, requireRole(['ADMIN', 'OWNER']), async (req, res, next) => {
  try {
    const { featureId } = req.params;
    const { config } = req.body;

    const tenantFeature = await prisma.tenantFeature.update({
      where: {
        realEstateId_featureId: {
          realEstateId: req.realEstateId!,
          featureId,
        },
      },
      data: { config },
      include: {
        feature: true,
      },
    });

    // Clear cache
    await redis.del(`feature:${req.realEstateId}:${tenantFeature.feature.code}`);

    res.json({ success: true, data: tenantFeature });
  } catch (error) {
    next(error);
  }
});

// Get feature usage statistics
featuresRouter.get('/:featureId/usage', authenticate, async (req, res, next) => {
  try {
    const { featureId } = req.params;
    const { period = '30' } = req.query;

    const tenantFeature = await prisma.tenantFeature.findUnique({
      where: {
        realEstateId_featureId: {
          realEstateId: req.realEstateId!,
          featureId,
        },
      },
      include: {
        feature: true,
      },
    });

    if (!tenantFeature) {
      throw new AppError(404, 'NOT_FOUND', 'Feature nao configurada');
    }

    // Get usage logs
    const days = parseInt(period as string);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const usageLogs = await prisma.featureUsageLog.findMany({
      where: {
        tenantFeatureId: tenantFeature.id,
        createdAt: { gte: startDate },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Aggregate by day
    const dailyUsage = usageLogs.reduce(
      (acc, log) => {
        const day = log.createdAt.toISOString().split('T')[0];
        acc[day] = (acc[day] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    res.json({
      success: true,
      data: {
        feature: tenantFeature.feature,
        totalUsage: tenantFeature.usageCount,
        usageLimit: tenantFeature.usageLimit,
        remainingUsage: tenantFeature.usageLimit
          ? tenantFeature.usageLimit - tenantFeature.usageCount
          : null,
        dailyUsage,
        recentLogs: usageLogs.slice(0, 20),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Admin: List all feature definitions
featuresRouter.get('/admin/definitions', authenticate, requireRole(['SUPER_ADMIN']), async (req, res, next) => {
  try {
    const features = await prisma.featureDefinition.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: { tenantFeatures: true },
        },
      },
    });

    res.json({ success: true, data: features });
  } catch (error) {
    next(error);
  }
});

// Admin: Create feature definition
featuresRouter.post('/admin/definitions', authenticate, requireRole(['SUPER_ADMIN']), async (req, res, next) => {
  try {
    const { code, name, description, category, monthlyPrice, isIncludedInPlan } = req.body;

    const feature = await prisma.featureDefinition.create({
      data: {
        code,
        name,
        description,
        category,
        monthlyPrice,
        isIncludedInPlan: isIncludedInPlan || {},
      },
    });

    res.status(201).json({ success: true, data: feature });
  } catch (error) {
    next(error);
  }
});

// Admin: Update feature definition
featuresRouter.put('/admin/definitions/:id', authenticate, requireRole(['SUPER_ADMIN']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, category, monthlyPrice, isIncludedInPlan, isActive } = req.body;

    const feature = await prisma.featureDefinition.update({
      where: { id },
      data: {
        name,
        description,
        category,
        monthlyPrice,
        isIncludedInPlan,
        isActive,
      },
    });

    res.json({ success: true, data: feature });
  } catch (error) {
    next(error);
  }
});
