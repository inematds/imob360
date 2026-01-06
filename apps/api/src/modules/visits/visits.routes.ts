import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { authenticate } from '../../common/middleware/auth.js';
import { AppError } from '../../common/middleware/error-handler.js';

export const visitsRouter = Router();

const visitSchema = z.object({
  propertyId: z.string(),
  personId: z.string().optional(),
  leadId: z.string().optional(),
  brokerId: z.string(),
  scheduledAt: z.string(),
  duration: z.number().int().optional(),
});

// List visits
visitsRouter.get('/', authenticate, async (req, res, next) => {
  try {
    const {
      page = '1',
      limit = '20',
      status,
      brokerId,
      propertyId,
      startDate,
      endDate,
      sortBy = 'scheduledAt',
      sortOrder = 'asc',
    } = req.query;

    const where: any = {
      realEstateId: req.realEstateId,
    };

    if (status) where.status = status;
    if (brokerId) where.brokerId = brokerId;
    if (propertyId) where.propertyId = propertyId;

    if (startDate || endDate) {
      where.scheduledAt = {};
      if (startDate) where.scheduledAt.gte = new Date(startDate as string);
      if (endDate) where.scheduledAt.lte = new Date(endDate as string);
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [visits, total] = await Promise.all([
      prisma.visit.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { [sortBy as string]: sortOrder },
        include: {
          property: { select: { id: true, code: true, title: true, address: true, images: true } },
          person: { select: { id: true, name: true, phone: true } },
          broker: { select: { id: true, name: true } },
          lead: { select: { id: true, name: true, phone: true } },
        },
      }),
      prisma.visit.count({ where }),
    ]);

    res.json({
      success: true,
      data: visits,
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

// Get visits for calendar
visitsRouter.get('/calendar', authenticate, async (req, res, next) => {
  try {
    const { start, end, brokerId } = req.query;

    if (!start || !end) {
      throw new AppError(400, 'INVALID_PARAMS', 'Datas de inicio e fim sao obrigatorias');
    }

    const where: any = {
      realEstateId: req.realEstateId,
      scheduledAt: {
        gte: new Date(start as string),
        lte: new Date(end as string),
      },
    };

    if (brokerId) where.brokerId = brokerId;

    const visits = await prisma.visit.findMany({
      where,
      include: {
        property: { select: { id: true, code: true, title: true, address: true } },
        person: { select: { id: true, name: true, phone: true } },
        broker: { select: { id: true, name: true } },
      },
    });

    res.json({ success: true, data: visits });
  } catch (error) {
    next(error);
  }
});

// Get visit by ID
visitsRouter.get('/:id', authenticate, async (req, res, next) => {
  try {
    const visit = await prisma.visit.findFirst({
      where: { id: req.params.id, realEstateId: req.realEstateId },
      include: {
        property: true,
        person: true,
        broker: { select: { id: true, name: true, email: true, phone: true } },
        lead: true,
      },
    });

    if (!visit) {
      throw new AppError(404, 'NOT_FOUND', 'Visita nao encontrada');
    }

    res.json({ success: true, data: visit });
  } catch (error) {
    next(error);
  }
});

// Create visit
visitsRouter.post('/', authenticate, async (req, res, next) => {
  try {
    const data = visitSchema.parse(req.body);

    // Check for conflicting visits
    const conflicting = await prisma.visit.findFirst({
      where: {
        brokerId: data.brokerId,
        scheduledAt: {
          gte: new Date(new Date(data.scheduledAt).getTime() - 30 * 60 * 1000),
          lte: new Date(new Date(data.scheduledAt).getTime() + 30 * 60 * 1000),
        },
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
      },
    });

    if (conflicting) {
      throw new AppError(409, 'CONFLICT', 'Ja existe uma visita agendada para este corretor neste horario');
    }

    const visit = await prisma.visit.create({
      data: {
        ...data,
        realEstateId: req.realEstateId!,
        scheduledAt: new Date(data.scheduledAt),
        status: 'SCHEDULED',
      },
      include: {
        property: { select: { id: true, code: true, title: true } },
        person: { select: { id: true, name: true } },
        broker: { select: { id: true, name: true } },
      },
    });

    // Update property visit count
    await prisma.property.update({
      where: { id: data.propertyId },
      data: { visitCount: { increment: 1 } },
    });

    // Update lead stage if exists
    if (data.leadId) {
      await prisma.lead.update({
        where: { id: data.leadId },
        data: { stage: 'VISIT_SCHEDULED' },
      });
    }

    res.status(201).json({ success: true, data: visit });
  } catch (error) {
    next(error);
  }
});

// Update visit status
visitsRouter.patch('/:id/status', authenticate, async (req, res, next) => {
  try {
    const { status, feedback, interestLevel, notes } = req.body;

    const existing = await prisma.visit.findFirst({
      where: { id: req.params.id, realEstateId: req.realEstateId },
    });

    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Visita nao encontrada');
    }

    const updateData: any = { status };

    if (status === 'DONE') {
      updateData.completedAt = new Date();
      if (feedback) updateData.feedback = feedback;
      if (interestLevel) updateData.interestLevel = interestLevel;
      if (notes) updateData.notes = notes;

      // Update lead stage
      if (existing.leadId) {
        await prisma.lead.update({
          where: { id: existing.leadId },
          data: { stage: 'VISITED' },
        });
      }
    }

    if (status === 'CONFIRMED') {
      updateData.confirmedAt = new Date();
    }

    const visit = await prisma.visit.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        property: { select: { id: true, code: true, title: true } },
        person: { select: { id: true, name: true } },
        broker: { select: { id: true, name: true } },
      },
    });

    res.json({ success: true, data: visit });
  } catch (error) {
    next(error);
  }
});

// Delete visit
visitsRouter.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const existing = await prisma.visit.findFirst({
      where: { id: req.params.id, realEstateId: req.realEstateId },
    });

    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Visita nao encontrada');
    }

    await prisma.visit.delete({ where: { id: req.params.id } });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});
