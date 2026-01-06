import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { authenticate } from '../../common/middleware/auth.js';
import { AppError } from '../../common/middleware/error-handler.js';

export const peopleRouter = Router();

const personSchema = z.object({
  name: z.string().min(3),
  types: z.array(z.enum(['OWNER', 'BUYER', 'TENANT', 'GUARANTOR', 'SYNDIC', 'BROKER'])),
  cpfCnpj: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().min(10),
  phone2: z.string().optional(),
  address: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  rgNumber: z.string().optional(),
  rgIssuer: z.string().optional(),
  birthDate: z.string().optional(),
  maritalStatus: z.string().optional(),
  profession: z.string().optional(),
  company: z.string().optional(),
  monthlyIncome: z.number().optional(),
  searchPreferences: z.any().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  source: z.string().optional(),
});

// List people
peopleRouter.get('/', authenticate, async (req, res, next) => {
  try {
    const {
      page = '1',
      limit = '20',
      type,
      search,
      sortBy = 'name',
      sortOrder = 'asc',
    } = req.query;

    const where: any = {
      realEstateId: req.realEstateId,
    };

    if (type) {
      where.types = { has: type as string };
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { phone: { contains: search as string, mode: 'insensitive' } },
        { cpfCnpj: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [people, total] = await Promise.all([
      prisma.person.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { [sortBy as string]: sortOrder },
        include: {
          _count: {
            select: {
              propertiesOwned: true,
              contractsAsBuyer: true,
              contractsAsTenant: true,
              leads: true,
            },
          },
        },
      }),
      prisma.person.count({ where }),
    ]);

    res.json({
      success: true,
      data: people,
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

// Get person by ID
peopleRouter.get('/:id', authenticate, async (req, res, next) => {
  try {
    const person = await prisma.person.findFirst({
      where: {
        id: req.params.id,
        realEstateId: req.realEstateId,
      },
      include: {
        propertiesOwned: {
          select: {
            id: true,
            code: true,
            title: true,
            type: true,
            status: true,
            salePrice: true,
            rentPrice: true,
          },
        },
        contractsAsBuyer: {
          include: {
            property: { select: { id: true, code: true, title: true } },
          },
        },
        contractsAsTenant: {
          include: {
            property: { select: { id: true, code: true, title: true } },
          },
        },
        visits: {
          take: 10,
          orderBy: { scheduledAt: 'desc' },
          include: {
            property: { select: { id: true, code: true, title: true } },
          },
        },
        leads: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            property: { select: { id: true, code: true, title: true } },
          },
        },
      },
    });

    if (!person) {
      throw new AppError(404, 'NOT_FOUND', 'Pessoa nao encontrada');
    }

    res.json({ success: true, data: person });
  } catch (error) {
    next(error);
  }
});

// Create person
peopleRouter.post('/', authenticate, async (req, res, next) => {
  try {
    const data = personSchema.parse(req.body);

    const person = await prisma.person.create({
      data: {
        ...data,
        realEstateId: req.realEstateId!,
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
      },
    });

    res.status(201).json({ success: true, data: person });
  } catch (error) {
    next(error);
  }
});

// Update person
peopleRouter.put('/:id', authenticate, async (req, res, next) => {
  try {
    const data = personSchema.partial().parse(req.body);

    const existing = await prisma.person.findFirst({
      where: { id: req.params.id, realEstateId: req.realEstateId },
    });

    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Pessoa nao encontrada');
    }

    const person = await prisma.person.update({
      where: { id: req.params.id },
      data: {
        ...data,
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
      },
    });

    res.json({ success: true, data: person });
  } catch (error) {
    next(error);
  }
});

// Delete person
peopleRouter.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const existing = await prisma.person.findFirst({
      where: { id: req.params.id, realEstateId: req.realEstateId },
    });

    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Pessoa nao encontrada');
    }

    // Check if person has active contracts
    const activeContracts = await prisma.contract.count({
      where: {
        OR: [
          { buyerTenantId: req.params.id },
          { guarantorId: req.params.id },
        ],
        status: 'ACTIVE',
      },
    });

    if (activeContracts > 0) {
      throw new AppError(400, 'HAS_ACTIVE_CONTRACTS', 'Pessoa possui contratos ativos');
    }

    await prisma.person.delete({ where: { id: req.params.id } });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});
