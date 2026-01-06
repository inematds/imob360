import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { authenticate, requireRole } from '../../common/middleware/auth.js';
import { requireFeature, incrementUsage } from '../../common/middleware/feature-check.js';
import { AppError } from '../../common/middleware/error-handler.js';

export const paymentsRouter = Router();

// List rent payments
paymentsRouter.get('/rent', authenticate, async (req, res, next) => {
  try {
    const {
      page = '1',
      limit = '20',
      status,
      contractId,
      month,
      year,
      overdue,
      sortBy = 'dueDate',
      sortOrder = 'asc',
    } = req.query;

    const where: any = {
      contract: { realEstateId: req.realEstateId },
    };

    if (status) where.status = status;
    if (contractId) where.contractId = contractId;
    if (month) where.referenceMonth = parseInt(month as string);
    if (year) where.referenceYear = parseInt(year as string);
    if (overdue === 'true') {
      where.status = 'PENDING';
      where.dueDate = { lt: new Date() };
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [payments, total] = await Promise.all([
      prisma.rentPayment.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { [sortBy as string]: sortOrder },
        include: {
          contract: {
            include: {
              property: { select: { id: true, code: true, title: true, address: true } },
              buyerTenant: { select: { id: true, name: true, phone: true, email: true } },
            },
          },
        },
      }),
      prisma.rentPayment.count({ where }),
    ]);

    res.json({
      success: true,
      data: payments,
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

// Get rent payment by ID
paymentsRouter.get('/rent/:id', authenticate, async (req, res, next) => {
  try {
    const payment = await prisma.rentPayment.findFirst({
      where: {
        id: req.params.id,
        contract: { realEstateId: req.realEstateId },
      },
      include: {
        contract: {
          include: {
            property: true,
            buyerTenant: true,
          },
        },
      },
    });

    if (!payment) {
      throw new AppError(404, 'NOT_FOUND', 'Pagamento nao encontrado');
    }

    res.json({ success: true, data: payment });
  } catch (error) {
    next(error);
  }
});

// Register payment
const registerPaymentSchema = z.object({
  paidValue: z.number(),
  paidAt: z.string(),
  paymentMethod: z.enum(['PIX', 'BOLETO', 'TRANSFER', 'CASH', 'CREDIT_CARD', 'DEBIT_CARD']),
  receiptUrl: z.string().optional(),
  notes: z.string().optional(),
});

paymentsRouter.post('/rent/:id/pay', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = registerPaymentSchema.parse(req.body);

    const payment = await prisma.rentPayment.findFirst({
      where: {
        id,
        contract: { realEstateId: req.realEstateId },
      },
    });

    if (!payment) {
      throw new AppError(404, 'NOT_FOUND', 'Pagamento nao encontrado');
    }

    if (payment.status === 'PAID') {
      throw new AppError(400, 'ALREADY_PAID', 'Pagamento ja foi registrado');
    }

    const updated = await prisma.rentPayment.update({
      where: { id },
      data: {
        status: 'PAID',
        paidValue: data.paidValue,
        paidAt: new Date(data.paidAt),
        paymentMethod: data.paymentMethod,
        receiptUrl: data.receiptUrl,
        notes: data.notes,
      },
      include: {
        contract: {
          include: {
            property: { select: { id: true, code: true, title: true } },
            buyerTenant: { select: { id: true, name: true } },
          },
        },
      },
    });

    res.json({
      success: true,
      data: updated,
      message: 'Pagamento registrado',
    });
  } catch (error) {
    next(error);
  }
});

// Generate boleto (requires PIX_BOLETO feature)
paymentsRouter.post('/rent/:id/boleto', authenticate, requireFeature('PIX_BOLETO'), async (req, res, next) => {
  try {
    const { id } = req.params;

    const payment = await prisma.rentPayment.findFirst({
      where: {
        id,
        contract: { realEstateId: req.realEstateId },
      },
      include: {
        contract: {
          include: {
            property: true,
            buyerTenant: true,
          },
        },
      },
    });

    if (!payment) {
      throw new AppError(404, 'NOT_FOUND', 'Pagamento nao encontrado');
    }

    if (payment.status === 'PAID') {
      throw new AppError(400, 'ALREADY_PAID', 'Pagamento ja foi registrado');
    }

    // TODO: Integrate with payment gateway (Asaas, PagSeguro, etc.)
    // For now, generate mock boleto
    const boletoCode = `23793.38128 60000.000003 00000.000405 1 ${Date.now().toString().slice(-14)}`;

    const updated = await prisma.rentPayment.update({
      where: { id },
      data: {
        boletoCode,
        boletoUrl: `https://api.imob360.com.br/boleto/${id}`,
        boletoGeneratedAt: new Date(),
      },
    });

    await incrementUsage(req.realEstateId!, 'PIX_BOLETO');

    res.json({
      success: true,
      data: {
        boletoCode: updated.boletoCode,
        boletoUrl: updated.boletoUrl,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Generate PIX (requires PIX_BOLETO feature)
paymentsRouter.post('/rent/:id/pix', authenticate, requireFeature('PIX_BOLETO'), async (req, res, next) => {
  try {
    const { id } = req.params;

    const payment = await prisma.rentPayment.findFirst({
      where: {
        id,
        contract: { realEstateId: req.realEstateId },
      },
      include: {
        contract: {
          include: {
            property: true,
            buyerTenant: true,
          },
        },
      },
    });

    if (!payment) {
      throw new AppError(404, 'NOT_FOUND', 'Pagamento nao encontrado');
    }

    if (payment.status === 'PAID') {
      throw new AppError(400, 'ALREADY_PAID', 'Pagamento ja foi registrado');
    }

    // TODO: Integrate with PIX API (EFI/Gerencianet, etc.)
    // For now, generate mock PIX
    const pixCode = `00020126580014br.gov.bcb.pix0136${crypto.randomUUID()}5204000053039865802BR5913IMOB3606304${payment.totalValue}`;

    const updated = await prisma.rentPayment.update({
      where: { id },
      data: {
        pixCode,
        pixQrCode: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`,
        pixGeneratedAt: new Date(),
        pixExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    await incrementUsage(req.realEstateId!, 'PIX_BOLETO');

    res.json({
      success: true,
      data: {
        pixCode: updated.pixCode,
        pixQrCode: updated.pixQrCode,
        expiresAt: updated.pixExpiresAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Add extra charges (condominio, IPTU, etc.)
paymentsRouter.post('/rent/:id/charges', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { condominioValue, iptuValue, waterValue, gasValue, electricityValue, otherCharges, otherChargesDescription } = req.body;

    const payment = await prisma.rentPayment.findFirst({
      where: {
        id,
        contract: { realEstateId: req.realEstateId },
      },
    });

    if (!payment) {
      throw new AppError(404, 'NOT_FOUND', 'Pagamento nao encontrado');
    }

    if (payment.status === 'PAID') {
      throw new AppError(400, 'ALREADY_PAID', 'Nao e possivel alterar pagamento ja registrado');
    }

    const totalValue =
      (payment.rentValue || 0) +
      (condominioValue || 0) +
      (iptuValue || 0) +
      (waterValue || 0) +
      (gasValue || 0) +
      (electricityValue || 0) +
      (otherCharges || 0);

    const updated = await prisma.rentPayment.update({
      where: { id },
      data: {
        condominioValue,
        iptuValue,
        waterValue,
        gasValue,
        electricityValue,
        otherCharges,
        otherChargesDescription,
        totalValue,
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// Get financial summary
paymentsRouter.get('/summary', authenticate, async (req, res, next) => {
  try {
    const { month, year } = req.query;

    const currentMonth = month ? parseInt(month as string) : new Date().getMonth() + 1;
    const currentYear = year ? parseInt(year as string) : new Date().getFullYear();

    // Get rent payments for the period
    const rentPayments = await prisma.rentPayment.findMany({
      where: {
        contract: { realEstateId: req.realEstateId },
        referenceMonth: currentMonth,
        referenceYear: currentYear,
      },
    });

    const pendingPayments = rentPayments.filter((p) => p.status === 'PENDING');
    const paidPayments = rentPayments.filter((p) => p.status === 'PAID');
    const overduePayments = pendingPayments.filter((p) => new Date(p.dueDate) < new Date());

    const totalExpected = rentPayments.reduce((sum, p) => sum + Number(p.totalValue || 0), 0);
    const totalReceived = paidPayments.reduce((sum, p) => sum + Number(p.paidValue || 0), 0);
    const totalPending = pendingPayments.reduce((sum, p) => sum + Number(p.totalValue || 0), 0);
    const totalOverdue = overduePayments.reduce((sum, p) => sum + Number(p.totalValue || 0), 0);

    // Get commissions
    const commissions = await prisma.commission.findMany({
      where: {
        contract: { realEstateId: req.realEstateId },
        createdAt: {
          gte: new Date(currentYear, currentMonth - 1, 1),
          lt: new Date(currentYear, currentMonth, 1),
        },
      },
    });

    const totalCommissions = commissions.reduce((sum, c) => sum + Number(c.commissionValue || 0), 0);
    const paidCommissions = commissions.filter((c) => c.status === 'PAID').reduce((sum, c) => sum + Number(c.commissionValue || 0), 0);

    res.json({
      success: true,
      data: {
        period: { month: currentMonth, year: currentYear },
        rentPayments: {
          total: rentPayments.length,
          paid: paidPayments.length,
          pending: pendingPayments.length,
          overdue: overduePayments.length,
          totalExpected,
          totalReceived,
          totalPending,
          totalOverdue,
        },
        commissions: {
          total: commissions.length,
          totalValue: totalCommissions,
          paid: paidCommissions,
          pending: totalCommissions - paidCommissions,
        },
        summary: {
          grossRevenue: totalReceived,
          commissionsToPay: totalCommissions - paidCommissions,
          netRevenue: totalReceived - paidCommissions,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// List commissions
paymentsRouter.get('/commissions', authenticate, async (req, res, next) => {
  try {
    const {
      page = '1',
      limit = '20',
      status,
      userId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const where: any = {
      contract: { realEstateId: req.realEstateId },
    };

    if (status) where.status = status;
    if (userId) where.userId = userId;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [commissions, total] = await Promise.all([
      prisma.commission.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { [sortBy as string]: sortOrder },
        include: {
          user: { select: { id: true, name: true, email: true } },
          contract: {
            include: {
              property: { select: { id: true, code: true, title: true } },
              buyerTenant: { select: { id: true, name: true } },
            },
          },
        },
      }),
      prisma.commission.count({ where }),
    ]);

    res.json({
      success: true,
      data: commissions,
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

// Pay commission
paymentsRouter.post('/commissions/:id/pay', authenticate, requireRole(['ADMIN', 'OWNER']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { paidAt, paymentMethod, notes } = req.body;

    const commission = await prisma.commission.findFirst({
      where: {
        id,
        contract: { realEstateId: req.realEstateId },
      },
    });

    if (!commission) {
      throw new AppError(404, 'NOT_FOUND', 'Comissao nao encontrada');
    }

    if (commission.status === 'PAID') {
      throw new AppError(400, 'ALREADY_PAID', 'Comissao ja foi paga');
    }

    const updated = await prisma.commission.update({
      where: { id },
      data: {
        status: 'PAID',
        paidAt: new Date(paidAt || Date.now()),
        paymentMethod,
        notes,
      },
      include: {
        user: { select: { id: true, name: true } },
        contract: {
          include: {
            property: { select: { id: true, code: true, title: true } },
          },
        },
      },
    });

    res.json({
      success: true,
      data: updated,
      message: 'Comissao paga',
    });
  } catch (error) {
    next(error);
  }
});

// Get overdue report
paymentsRouter.get('/overdue', authenticate, async (req, res, next) => {
  try {
    const overduePayments = await prisma.rentPayment.findMany({
      where: {
        contract: { realEstateId: req.realEstateId },
        status: 'PENDING',
        dueDate: { lt: new Date() },
      },
      include: {
        contract: {
          include: {
            property: { select: { id: true, code: true, title: true, address: true } },
            buyerTenant: { select: { id: true, name: true, phone: true, email: true } },
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    // Calculate days overdue
    const paymentsWithDays = overduePayments.map((p) => {
      const daysOverdue = Math.floor((Date.now() - new Date(p.dueDate).getTime()) / (1000 * 60 * 60 * 24));
      return { ...p, daysOverdue };
    });

    const totalOverdue = overduePayments.reduce((sum, p) => sum + Number(p.totalValue || 0), 0);

    res.json({
      success: true,
      data: {
        payments: paymentsWithDays,
        summary: {
          count: overduePayments.length,
          totalValue: totalOverdue,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Send payment reminder
paymentsRouter.post('/rent/:id/reminder', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { channel = 'email' } = req.body;

    const payment = await prisma.rentPayment.findFirst({
      where: {
        id,
        contract: { realEstateId: req.realEstateId },
      },
      include: {
        contract: {
          include: {
            property: { select: { id: true, code: true, title: true } },
            buyerTenant: true,
          },
        },
      },
    });

    if (!payment) {
      throw new AppError(404, 'NOT_FOUND', 'Pagamento nao encontrado');
    }

    if (payment.status === 'PAID') {
      throw new AppError(400, 'ALREADY_PAID', 'Pagamento ja foi registrado');
    }

    // TODO: Send actual reminder via email or WhatsApp
    // For now, just log the reminder
    await prisma.paymentReminder.create({
      data: {
        rentPaymentId: id,
        channel,
        sentAt: new Date(),
        sentBy: req.user!.id,
      },
    });

    res.json({
      success: true,
      message: `Lembrete enviado via ${channel}`,
    });
  } catch (error) {
    next(error);
  }
});
