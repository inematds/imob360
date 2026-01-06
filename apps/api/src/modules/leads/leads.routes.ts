import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { authenticate } from '../../common/middleware/auth.js';
import { requireFeature, checkFeature } from '../../common/middleware/feature-check.js';
import { AppError } from '../../common/middleware/error-handler.js';

export const leadsRouter = Router();

const leadSchema = z.object({
  propertyId: z.string().optional(),
  personId: z.string().optional(),
  assignedToId: z.string().optional(),
  source: z.string(),
  sourceDetails: z.any().optional(),
  name: z.string().optional(),
  phone: z.string().min(10),
  email: z.string().email().optional(),
  message: z.string().optional(),
});

// List leads
leadsRouter.get('/', authenticate, async (req, res, next) => {
  try {
    const {
      page = '1',
      limit = '20',
      stage,
      source,
      assignedToId,
      propertyId,
      temperature,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const where: any = {
      realEstateId: req.realEstateId,
    };

    if (stage) where.stage = stage;
    if (source) where.source = source;
    if (assignedToId) where.assignedToId = assignedToId;
    if (propertyId) where.propertyId = propertyId;
    if (temperature) where.temperature = temperature;

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { phone: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { [sortBy as string]: sortOrder },
        include: {
          property: { select: { id: true, code: true, title: true, images: true } },
          person: { select: { id: true, name: true, phone: true } },
          assignedTo: { select: { id: true, name: true } },
        },
      }),
      prisma.lead.count({ where }),
    ]);

    res.json({
      success: true,
      data: leads,
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

// Get leads by stage (for Kanban)
leadsRouter.get('/kanban', authenticate, async (req, res, next) => {
  try {
    const stages = ['NEW', 'CONTACTED', 'QUALIFIED', 'VISIT_SCHEDULED', 'VISITED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'];

    const leadsByStage = await Promise.all(
      stages.map(async (stage) => {
        const leads = await prisma.lead.findMany({
          where: { realEstateId: req.realEstateId, stage },
          orderBy: { updatedAt: 'desc' },
          take: 50,
          include: {
            property: { select: { id: true, code: true, title: true, images: true } },
            person: { select: { id: true, name: true } },
            assignedTo: { select: { id: true, name: true } },
          },
        });
        return { stage, leads, count: leads.length };
      })
    );

    res.json({ success: true, data: leadsByStage });
  } catch (error) {
    next(error);
  }
});

// Get lead by ID
leadsRouter.get('/:id', authenticate, async (req, res, next) => {
  try {
    const lead = await prisma.lead.findFirst({
      where: { id: req.params.id, realEstateId: req.realEstateId },
      include: {
        property: true,
        person: true,
        assignedTo: { select: { id: true, name: true, email: true, phone: true } },
        visits: {
          orderBy: { scheduledAt: 'desc' },
          include: {
            broker: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!lead) {
      throw new AppError(404, 'NOT_FOUND', 'Lead nao encontrado');
    }

    res.json({ success: true, data: lead });
  } catch (error) {
    next(error);
  }
});

// Create lead
leadsRouter.post('/', authenticate, async (req, res, next) => {
  try {
    const data = leadSchema.parse(req.body);

    // Check if lead with same phone exists for this property
    if (data.propertyId) {
      const existingLead = await prisma.lead.findFirst({
        where: {
          realEstateId: req.realEstateId,
          phone: data.phone,
          propertyId: data.propertyId,
          stage: { notIn: ['WON', 'LOST'] },
        },
      });

      if (existingLead) {
        throw new AppError(409, 'LEAD_EXISTS', 'Ja existe um lead ativo com este telefone para este imovel');
      }
    }

    const lead = await prisma.lead.create({
      data: {
        ...data,
        realEstateId: req.realEstateId!,
        stage: 'NEW',
      },
      include: {
        property: { select: { id: true, code: true, title: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });

    // Update property lead count
    if (data.propertyId) {
      await prisma.property.update({
        where: { id: data.propertyId },
        data: { leadCount: { increment: 1 } },
      });
    }

    // Calculate lead score if AI feature is enabled
    const hasAI = await checkFeature(req.realEstateId!, 'AI_LEAD_SCORING');
    if (hasAI) {
      // TODO: Implement AI lead scoring
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          score: 50, // Default score
          temperature: 'WARM',
        },
      });
    }

    res.status(201).json({ success: true, data: lead });
  } catch (error) {
    next(error);
  }
});

// Update lead stage
leadsRouter.patch('/:id/stage', authenticate, async (req, res, next) => {
  try {
    const { stage, lostReason, wonValue } = req.body;

    const existing = await prisma.lead.findFirst({
      where: { id: req.params.id, realEstateId: req.realEstateId },
    });

    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Lead nao encontrado');
    }

    const updateData: any = {
      stage,
      updatedAt: new Date(),
    };

    if (stage === 'CONTACTED' && !existing.contactedAt) {
      updateData.contactedAt = new Date();
    }

    if (stage === 'WON') {
      updateData.convertedAt = new Date();
      if (wonValue) updateData.wonValue = wonValue;
    }

    if (stage === 'LOST' && lostReason) {
      updateData.lostReason = lostReason;
    }

    const lead = await prisma.lead.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        property: { select: { id: true, code: true, title: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });

    res.json({ success: true, data: lead });
  } catch (error) {
    next(error);
  }
});

// Assign lead to broker
leadsRouter.patch('/:id/assign', authenticate, async (req, res, next) => {
  try {
    const { assignedToId } = req.body;

    const existing = await prisma.lead.findFirst({
      where: { id: req.params.id, realEstateId: req.realEstateId },
    });

    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Lead nao encontrado');
    }

    const lead = await prisma.lead.update({
      where: { id: req.params.id },
      data: { assignedToId },
      include: {
        property: { select: { id: true, code: true, title: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });

    res.json({ success: true, data: lead });
  } catch (error) {
    next(error);
  }
});

// Get AI lead score (requires AI_LEAD_SCORING feature)
leadsRouter.get('/:id/score', authenticate, requireFeature('AI_LEAD_SCORING'), async (req, res, next) => {
  try {
    const lead = await prisma.lead.findFirst({
      where: { id: req.params.id, realEstateId: req.realEstateId },
    });

    if (!lead) {
      throw new AppError(404, 'NOT_FOUND', 'Lead nao encontrado');
    }

    // TODO: Implement real AI scoring
    const scoreResult = {
      score: lead.score || 50,
      temperature: lead.temperature || 'WARM',
      factors: lead.scoreFactors || {
        propertyViews: 10,
        emailOpens: 5,
        responseTime: 15,
        budgetMatch: 10,
        locationMatch: 10,
        engagementLevel: 10,
      },
      recommendation: 'Entrar em contato via WhatsApp',
      nextAction: 'Agendar visita',
    };

    res.json({ success: true, data: scoreResult });
  } catch (error) {
    next(error);
  }
});

// Delete lead
leadsRouter.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const existing = await prisma.lead.findFirst({
      where: { id: req.params.id, realEstateId: req.realEstateId },
    });

    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Lead nao encontrado');
    }

    await prisma.lead.delete({ where: { id: req.params.id } });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});
