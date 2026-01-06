import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { authenticate, requireRole } from '../../common/middleware/auth.js';
import { AppError } from '../../common/middleware/error-handler.js';

export const settingsRouter = Router();

// Get real estate settings
settingsRouter.get('/', authenticate, async (req, res, next) => {
  try {
    const realEstate = await prisma.realEstate.findUnique({
      where: { id: req.realEstateId },
      include: {
        plan: true,
        tenantFeatures: {
          where: { isEnabled: true },
          include: { feature: true },
        },
      },
    });

    if (!realEstate) {
      throw new AppError(404, 'NOT_FOUND', 'Imobiliaria nao encontrada');
    }

    res.json({
      success: true,
      data: {
        company: {
          id: realEstate.id,
          name: realEstate.name,
          cnpj: realEstate.cnpj,
          creci: realEstate.creci,
          email: realEstate.email,
          phone: realEstate.phone,
          address: realEstate.address,
          city: realEstate.city,
          state: realEstate.state,
          zipCode: realEstate.zipCode,
          logo: realEstate.logo,
          website: realEstate.website,
        },
        plan: realEstate.plan,
        features: realEstate.tenantFeatures.map((tf) => ({
          code: tf.feature.code,
          name: tf.feature.name,
          config: tf.config,
        })),
        settings: realEstate.settings,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Update company info
const companySchema = z.object({
  name: z.string().min(3).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  website: z.string().url().optional().nullable(),
  logo: z.string().url().optional().nullable(),
});

settingsRouter.put('/company', authenticate, requireRole(['ADMIN', 'OWNER']), async (req, res, next) => {
  try {
    const data = companySchema.parse(req.body);

    const realEstate = await prisma.realEstate.update({
      where: { id: req.realEstateId },
      data,
    });

    res.json({
      success: true,
      data: realEstate,
      message: 'Dados da empresa atualizados',
    });
  } catch (error) {
    next(error);
  }
});

// Update settings
settingsRouter.patch('/preferences', authenticate, requireRole(['ADMIN', 'OWNER']), async (req, res, next) => {
  try {
    const { settings } = req.body;

    const realEstate = await prisma.realEstate.findUnique({
      where: { id: req.realEstateId },
    });

    if (!realEstate) {
      throw new AppError(404, 'NOT_FOUND', 'Imobiliaria nao encontrada');
    }

    const currentSettings = (realEstate.settings as object) || {};
    const newSettings = { ...currentSettings, ...settings };

    const updated = await prisma.realEstate.update({
      where: { id: req.realEstateId },
      data: { settings: newSettings },
    });

    res.json({
      success: true,
      data: updated.settings,
      message: 'Configuracoes atualizadas',
    });
  } catch (error) {
    next(error);
  }
});

// Get users/team
settingsRouter.get('/team', authenticate, async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { realEstateId: req.realEstateId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        avatar: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
        _count: {
          select: {
            leadsAssigned: true,
            visits: true,
            contracts: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
});

// Invite user
const inviteSchema = z.object({
  email: z.string().email(),
  name: z.string().min(3),
  role: z.enum(['BROKER', 'ADMIN', 'MANAGER', 'ASSISTANT']),
});

settingsRouter.post('/team/invite', authenticate, requireRole(['ADMIN', 'OWNER']), async (req, res, next) => {
  try {
    const data = inviteSchema.parse(req.body);

    // Check if user already exists
    const existing = await prisma.user.findFirst({
      where: {
        email: data.email,
        realEstateId: req.realEstateId,
      },
    });

    if (existing) {
      throw new AppError(409, 'USER_EXISTS', 'Usuario ja cadastrado');
    }

    // Create invitation
    const invitation = await prisma.invitation.create({
      data: {
        realEstateId: req.realEstateId!,
        email: data.email,
        name: data.name,
        role: data.role,
        invitedBy: req.user!.id,
        token: crypto.randomUUID(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // TODO: Send invitation email

    res.status(201).json({
      success: true,
      data: {
        id: invitation.id,
        email: invitation.email,
        expiresAt: invitation.expiresAt,
      },
      message: 'Convite enviado',
    });
  } catch (error) {
    next(error);
  }
});

// Update user
settingsRouter.patch('/team/:userId', authenticate, requireRole(['ADMIN', 'OWNER']), async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { role, isActive } = req.body;

    const user = await prisma.user.findFirst({
      where: { id: userId, realEstateId: req.realEstateId },
    });

    if (!user) {
      throw new AppError(404, 'NOT_FOUND', 'Usuario nao encontrado');
    }

    // Don't allow changing owner role
    if (user.role === 'OWNER') {
      throw new AppError(400, 'CANNOT_MODIFY_OWNER', 'Nao e possivel alterar o proprietario');
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        role: role || user.role,
        isActive: isActive !== undefined ? isActive : user.isActive,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// Remove user from team
settingsRouter.delete('/team/:userId', authenticate, requireRole(['ADMIN', 'OWNER']), async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findFirst({
      where: { id: userId, realEstateId: req.realEstateId },
    });

    if (!user) {
      throw new AppError(404, 'NOT_FOUND', 'Usuario nao encontrado');
    }

    if (user.role === 'OWNER') {
      throw new AppError(400, 'CANNOT_REMOVE_OWNER', 'Nao e possivel remover o proprietario');
    }

    if (userId === req.user!.id) {
      throw new AppError(400, 'CANNOT_REMOVE_SELF', 'Nao e possivel remover a si mesmo');
    }

    // Soft delete - deactivate instead of removing
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });

    res.json({ success: true, message: 'Usuario removido da equipe' });
  } catch (error) {
    next(error);
  }
});

// Get integrations status
settingsRouter.get('/integrations', authenticate, async (req, res, next) => {
  try {
    // Get all configured integrations
    const [whatsapp, portals] = await Promise.all([
      prisma.whatsappInstance.findFirst({
        where: { realEstateId: req.realEstateId },
        select: { status: true, phone: true },
      }),
      prisma.portalIntegration.findMany({
        where: { realEstateId: req.realEstateId },
        select: { portal: true, isActive: true, lastSync: true },
      }),
    ]);

    // Get feature configurations
    const features = await prisma.tenantFeature.findMany({
      where: {
        realEstateId: req.realEstateId,
        isEnabled: true,
      },
      include: { feature: true },
    });

    const featureConfigs = features.reduce(
      (acc, f) => {
        acc[f.feature.code] = f.config;
        return acc;
      },
      {} as Record<string, any>
    );

    res.json({
      success: true,
      data: {
        whatsapp: whatsapp
          ? { connected: whatsapp.status === 'CONNECTED', phone: whatsapp.phone }
          : null,
        portals: portals.map((p) => ({
          portal: p.portal,
          active: p.isActive,
          lastSync: p.lastSync,
        })),
        googleMaps: featureConfigs['GOOGLE_MAPS'] || null,
        clicksign: featureConfigs['DIGITAL_SIGNATURE'] || null,
        aiFeatures: {
          leadScoring: !!featureConfigs['AI_LEAD_SCORING'],
          pricing: !!featureConfigs['AI_PRICING'],
          smartSearch: !!featureConfigs['AI_SMART_SEARCH'],
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Update integration config
settingsRouter.patch('/integrations/:integration', authenticate, requireRole(['ADMIN', 'OWNER']), async (req, res, next) => {
  try {
    const { integration } = req.params;
    const { config } = req.body;

    // Map integration name to feature code
    const integrationToFeature: Record<string, string> = {
      googleMaps: 'GOOGLE_MAPS',
      clicksign: 'DIGITAL_SIGNATURE',
      zapImoveis: 'PORTAL_ZAP',
      vivaReal: 'PORTAL_VIVAREAL',
      olx: 'PORTAL_OLX',
    };

    const featureCode = integrationToFeature[integration];
    if (!featureCode) {
      throw new AppError(400, 'INVALID_INTEGRATION', 'Integracao invalida');
    }

    const feature = await prisma.featureDefinition.findUnique({
      where: { code: featureCode },
    });

    if (!feature) {
      throw new AppError(404, 'FEATURE_NOT_FOUND', 'Feature nao encontrada');
    }

    const tenantFeature = await prisma.tenantFeature.upsert({
      where: {
        realEstateId_featureId: {
          realEstateId: req.realEstateId!,
          featureId: feature.id,
        },
      },
      update: { config },
      create: {
        realEstateId: req.realEstateId!,
        featureId: feature.id,
        isEnabled: true,
        enabledAt: new Date(),
        config,
      },
    });

    res.json({
      success: true,
      data: tenantFeature,
      message: 'Configuracao atualizada',
    });
  } catch (error) {
    next(error);
  }
});

// Get billing info
settingsRouter.get('/billing', authenticate, requireRole(['ADMIN', 'OWNER']), async (req, res, next) => {
  try {
    const realEstate = await prisma.realEstate.findUnique({
      where: { id: req.realEstateId },
      include: {
        plan: true,
        tenantFeatures: {
          where: { isEnabled: true },
          include: { feature: true },
        },
      },
    });

    if (!realEstate) {
      throw new AppError(404, 'NOT_FOUND', 'Imobiliaria nao encontrada');
    }

    // Calculate monthly cost
    const planPrice = Number(realEstate.plan?.monthlyPrice || 0);
    const featuresPrice = realEstate.tenantFeatures.reduce(
      (sum, tf) => sum + Number(tf.feature.monthlyPrice),
      0
    );

    // Get recent invoices
    const invoices = await prisma.invoice.findMany({
      where: { realEstateId: req.realEstateId },
      orderBy: { createdAt: 'desc' },
      take: 12,
    });

    res.json({
      success: true,
      data: {
        plan: realEstate.plan,
        planPrice,
        featuresPrice,
        totalMonthly: planPrice + featuresPrice,
        enabledFeatures: realEstate.tenantFeatures.map((tf) => ({
          name: tf.feature.name,
          price: tf.feature.monthlyPrice,
        })),
        invoices,
        billingCycle: realEstate.billingCycle || 'MONTHLY',
        nextBillingDate: realEstate.nextBillingDate,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get audit logs
settingsRouter.get('/audit', authenticate, requireRole(['ADMIN', 'OWNER']), async (req, res, next) => {
  try {
    const { page = '1', limit = '50', userId, action } = req.query;

    const where: any = { realEstateId: req.realEstateId };
    if (userId) where.userId = userId;
    if (action) where.action = action;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: logs,
      meta: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Export data (LGPD compliance)
settingsRouter.post('/export', authenticate, requireRole(['ADMIN', 'OWNER']), async (req, res, next) => {
  try {
    const { format = 'json' } = req.body;

    // Create export request
    const exportRequest = await prisma.dataExport.create({
      data: {
        realEstateId: req.realEstateId!,
        requestedBy: req.user!.id,
        format,
        status: 'PENDING',
      },
    });

    // TODO: Queue background job to generate export

    res.status(202).json({
      success: true,
      data: {
        exportId: exportRequest.id,
        status: 'PENDING',
        message: 'Exportacao iniciada. Voce recebera um email quando estiver pronta.',
      },
    });
  } catch (error) {
    next(error);
  }
});
