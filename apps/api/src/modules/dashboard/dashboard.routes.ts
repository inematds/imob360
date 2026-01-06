import { Router } from 'express';
import { prisma } from '../../config/database.js';
import { authenticate } from '../../common/middleware/auth.js';

export const dashboardRouter = Router();

// Get dashboard stats
dashboardRouter.get('/stats', authenticate, async (req, res, next) => {
  try {
    const realEstateId = req.realEstateId!;

    const [
      propertiesTotal,
      propertiesAvailable,
      propertiesSold,
      propertiesRented,
      leadsTotal,
      leadsNew,
      leadsConverted,
      visitsScheduled,
      visitsCompleted,
      contractsActive,
      contractsValue,
    ] = await Promise.all([
      prisma.property.count({ where: { realEstateId } }),
      prisma.property.count({ where: { realEstateId, status: 'AVAILABLE' } }),
      prisma.property.count({ where: { realEstateId, status: 'SOLD' } }),
      prisma.property.count({ where: { realEstateId, status: 'RENTED' } }),
      prisma.lead.count({ where: { realEstateId } }),
      prisma.lead.count({ where: { realEstateId, stage: 'NEW' } }),
      prisma.lead.count({ where: { realEstateId, stage: 'WON' } }),
      prisma.visit.count({
        where: {
          realEstateId,
          status: 'SCHEDULED',
          scheduledAt: { gte: new Date() },
        },
      }),
      prisma.visit.count({
        where: {
          realEstateId,
          status: 'DONE',
          completedAt: {
            gte: new Date(new Date().setDate(1)), // This month
          },
        },
      }),
      prisma.contract.count({ where: { realEstateId, status: 'ACTIVE' } }),
      prisma.contract.aggregate({
        where: { realEstateId, status: 'ACTIVE' },
        _sum: { value: true },
      }),
    ]);

    res.json({
      success: true,
      data: {
        properties: {
          total: propertiesTotal,
          available: propertiesAvailable,
          sold: propertiesSold,
          rented: propertiesRented,
        },
        leads: {
          total: leadsTotal,
          new: leadsNew,
          converted: leadsConverted,
          conversionRate: leadsTotal > 0 ? ((leadsConverted / leadsTotal) * 100).toFixed(1) : 0,
        },
        visits: {
          scheduled: visitsScheduled,
          completedThisMonth: visitsCompleted,
        },
        contracts: {
          active: contractsActive,
          totalValue: contractsValue._sum.value || 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get recent activity
dashboardRouter.get('/activity', authenticate, async (req, res, next) => {
  try {
    const [recentLeads, recentVisits, recentContracts] = await Promise.all([
      prisma.lead.findMany({
        where: { realEstateId: req.realEstateId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          property: { select: { id: true, title: true } },
        },
      }),
      prisma.visit.findMany({
        where: { realEstateId: req.realEstateId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          property: { select: { id: true, title: true } },
          broker: { select: { id: true, name: true } },
        },
      }),
      prisma.contract.findMany({
        where: { realEstateId: req.realEstateId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          property: { select: { id: true, title: true } },
          buyerTenant: { select: { id: true, name: true } },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        recentLeads,
        recentVisits,
        recentContracts,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get charts data
dashboardRouter.get('/charts', authenticate, async (req, res, next) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period as string);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Leads by day
    const leadsRaw = await prisma.lead.groupBy({
      by: ['createdAt'],
      where: {
        realEstateId: req.realEstateId,
        createdAt: { gte: startDate },
      },
      _count: { id: true },
    });

    // Leads by source
    const leadsBySource = await prisma.lead.groupBy({
      by: ['source'],
      where: { realEstateId: req.realEstateId },
      _count: { id: true },
    });

    // Leads by stage
    const leadsByStage = await prisma.lead.groupBy({
      by: ['stage'],
      where: { realEstateId: req.realEstateId },
      _count: { id: true },
    });

    // Properties by type
    const propertiesByType = await prisma.property.groupBy({
      by: ['type'],
      where: { realEstateId: req.realEstateId },
      _count: { id: true },
    });

    // Properties by status
    const propertiesByStatus = await prisma.property.groupBy({
      by: ['status'],
      where: { realEstateId: req.realEstateId },
      _count: { id: true },
    });

    res.json({
      success: true,
      data: {
        leadsBySource: leadsBySource.map((l) => ({ source: l.source, count: l._count.id })),
        leadsByStage: leadsByStage.map((l) => ({ stage: l.stage, count: l._count.id })),
        propertiesByType: propertiesByType.map((p) => ({ type: p.type, count: p._count.id })),
        propertiesByStatus: propertiesByStatus.map((p) => ({ status: p.status, count: p._count.id })),
      },
    });
  } catch (error) {
    next(error);
  }
});
