import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { authenticate } from '../../common/middleware/auth.js';
import { requireFeature } from '../../common/middleware/feature-check.js';
import { AppError } from '../../common/middleware/error-handler.js';

export const contractsRouter = Router();

const contractSchema = z.object({
  propertyId: z.string(),
  type: z.enum(['SALE', 'RENT', 'ADMINISTRATION']),
  buyerTenantId: z.string(),
  guarantorId: z.string().optional(),
  brokerId: z.string().optional(),
  value: z.number(),
  deposit: z.number().optional(),
  commissionRate: z.number().optional(),
  startDate: z.string(),
  endDate: z.string().optional(),
  dueDay: z.number().int().min(1).max(28).optional(),
  adjustmentIndex: z.string().optional(),
});

// List contracts
contractsRouter.get('/', authenticate, async (req, res, next) => {
  try {
    const {
      page = '1',
      limit = '20',
      type,
      status,
      propertyId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const where: any = {
      realEstateId: req.realEstateId,
    };

    if (type) where.type = type;
    if (status) where.status = status;
    if (propertyId) where.propertyId = propertyId;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [contracts, total] = await Promise.all([
      prisma.contract.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { [sortBy as string]: sortOrder },
        include: {
          property: { select: { id: true, code: true, title: true, address: true } },
          buyerTenant: { select: { id: true, name: true, phone: true } },
          guarantor: { select: { id: true, name: true } },
          broker: { select: { id: true, name: true } },
        },
      }),
      prisma.contract.count({ where }),
    ]);

    res.json({
      success: true,
      data: contracts,
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

// Get contract by ID
contractsRouter.get('/:id', authenticate, async (req, res, next) => {
  try {
    const contract = await prisma.contract.findFirst({
      where: { id: req.params.id, realEstateId: req.realEstateId },
      include: {
        property: true,
        buyerTenant: true,
        guarantor: true,
        broker: { select: { id: true, name: true, email: true, phone: true } },
        payments: {
          orderBy: { dueDate: 'desc' },
        },
      },
    });

    if (!contract) {
      throw new AppError(404, 'NOT_FOUND', 'Contrato nao encontrado');
    }

    res.json({ success: true, data: contract });
  } catch (error) {
    next(error);
  }
});

// Create contract
contractsRouter.post('/', authenticate, async (req, res, next) => {
  try {
    const data = contractSchema.parse(req.body);

    // Calculate commission
    const commissionValue = data.commissionRate
      ? (data.value * data.commissionRate) / 100
      : null;

    const contract = await prisma.contract.create({
      data: {
        ...data,
        realEstateId: req.realEstateId!,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        commissionValue,
        status: 'DRAFT',
      },
      include: {
        property: { select: { id: true, code: true, title: true } },
        buyerTenant: { select: { id: true, name: true } },
        broker: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({ success: true, data: contract });
  } catch (error) {
    next(error);
  }
});

// Activate contract
contractsRouter.post('/:id/activate', authenticate, async (req, res, next) => {
  try {
    const existing = await prisma.contract.findFirst({
      where: { id: req.params.id, realEstateId: req.realEstateId },
      include: { property: true },
    });

    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Contrato nao encontrado');
    }

    if (existing.status !== 'DRAFT') {
      throw new AppError(400, 'INVALID_STATUS', 'Contrato ja esta ativo');
    }

    // Update contract status
    const contract = await prisma.contract.update({
      where: { id: req.params.id },
      data: {
        status: 'ACTIVE',
        signedAt: new Date(),
      },
    });

    // Update property status
    const propertyStatus = existing.type === 'SALE' ? 'SOLD' : 'RENTED';
    await prisma.property.update({
      where: { id: existing.propertyId },
      data: {
        status: propertyStatus,
        ...(existing.type === 'SALE' ? { soldAt: new Date() } : { rentedAt: new Date() }),
      },
    });

    // Generate rent payments if it's a rental contract
    if (existing.type === 'RENT' && existing.endDate && existing.dueDay) {
      const startDate = new Date(existing.startDate);
      const endDate = new Date(existing.endDate);
      const payments = [];

      let currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dueDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), existing.dueDay);

        payments.push({
          contractId: contract.id,
          referenceMonth: currentDate.getMonth() + 1,
          referenceYear: currentDate.getFullYear(),
          rentValue: existing.value,
          totalValue: existing.value,
          dueDate,
          status: 'PENDING',
        });

        currentDate.setMonth(currentDate.getMonth() + 1);
      }

      await prisma.rentPayment.createMany({ data: payments });
    }

    // Create commission record
    if (existing.commissionValue && existing.brokerId) {
      await prisma.commission.create({
        data: {
          userId: existing.brokerId,
          contractId: contract.id,
          saleValue: existing.value,
          commissionRate: existing.commissionRate!,
          commissionValue: existing.commissionValue,
          status: 'PENDING',
        },
      });
    }

    res.json({ success: true, data: contract });
  } catch (error) {
    next(error);
  }
});

// Request digital signature (requires DIGITAL_SIGNATURE feature)
contractsRouter.post('/:id/sign', authenticate, requireFeature('DIGITAL_SIGNATURE'), async (req, res, next) => {
  try {
    const existing = await prisma.contract.findFirst({
      where: { id: req.params.id, realEstateId: req.realEstateId },
      include: {
        buyerTenant: true,
        property: { include: { owner: true } },
      },
    });

    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Contrato nao encontrado');
    }

    // TODO: Implement Clicksign integration
    // For now, just update the signature status
    const contract = await prisma.contract.update({
      where: { id: req.params.id },
      data: {
        signatureStatus: 'PENDING',
        signatureRequestId: `SIG-${Date.now()}`,
      },
    });

    res.json({
      success: true,
      data: {
        contract,
        signatureUrl: `https://clicksign.com/sign/${contract.signatureRequestId}`,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Delete contract
contractsRouter.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const existing = await prisma.contract.findFirst({
      where: { id: req.params.id, realEstateId: req.realEstateId },
    });

    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Contrato nao encontrado');
    }

    if (existing.status === 'ACTIVE') {
      throw new AppError(400, 'CANNOT_DELETE', 'Nao e possivel excluir contrato ativo');
    }

    await prisma.contract.delete({ where: { id: req.params.id } });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});
