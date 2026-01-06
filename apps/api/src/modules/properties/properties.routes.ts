import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { authenticate } from '../../common/middleware/auth.js';
import { requireFeature, checkFeature } from '../../common/middleware/feature-check.js';
import { AppError } from '../../common/middleware/error-handler.js';

export const propertiesRouter = Router();

const propertySchema = z.object({
  code: z.string().min(1),
  title: z.string().min(3),
  description: z.string().optional(),
  type: z.enum(['APARTMENT', 'HOUSE', 'COMMERCIAL', 'LAND', 'RURAL', 'GARAGE', 'CONDO_UNIT']),
  purpose: z.enum(['SALE', 'RENT', 'SALE_AND_RENT']),
  ownerId: z.string(),
  responsibleId: z.string().optional(),
  address: z.string().min(3),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().min(2),
  city: z.string().min(2),
  state: z.string().length(2),
  zipCode: z.string().min(8),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  totalArea: z.number().optional(),
  builtArea: z.number().optional(),
  bedrooms: z.number().int().optional(),
  suites: z.number().int().optional(),
  bathrooms: z.number().int().optional(),
  parkingSpaces: z.number().int().optional(),
  floor: z.number().int().optional(),
  hasElevator: z.boolean().optional(),
  hasFurniture: z.boolean().optional(),
  acceptsPets: z.boolean().optional(),
  features: z.array(z.string()).optional(),
  salePrice: z.number().optional(),
  rentPrice: z.number().optional(),
  condoFee: z.number().optional(),
  iptuAnnual: z.number().optional(),
  images: z.array(z.string()).optional(),
  videoUrl: z.string().optional(),
  virtualTourUrl: z.string().optional(),
  publishOnSite: z.boolean().optional(),
  publishOnPortals: z.boolean().optional(),
});

// List properties
propertiesRouter.get('/', authenticate, async (req, res, next) => {
  try {
    const {
      page = '1',
      limit = '20',
      type,
      purpose,
      status,
      city,
      neighborhood,
      minPrice,
      maxPrice,
      minArea,
      maxArea,
      bedrooms,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const where: any = {
      realEstateId: req.realEstateId,
    };

    if (type) where.type = type;
    if (purpose) where.purpose = purpose;
    if (status) where.status = status;
    if (city) where.city = { contains: city as string, mode: 'insensitive' };
    if (neighborhood) where.neighborhood = { contains: neighborhood as string, mode: 'insensitive' };
    if (bedrooms) where.bedrooms = { gte: parseInt(bedrooms as string) };

    if (minPrice || maxPrice) {
      where.OR = [
        {
          salePrice: {
            ...(minPrice && { gte: parseFloat(minPrice as string) }),
            ...(maxPrice && { lte: parseFloat(maxPrice as string) }),
          },
        },
        {
          rentPrice: {
            ...(minPrice && { gte: parseFloat(minPrice as string) }),
            ...(maxPrice && { lte: parseFloat(maxPrice as string) }),
          },
        },
      ];
    }

    if (minArea || maxArea) {
      where.totalArea = {
        ...(minArea && { gte: parseFloat(minArea as string) }),
        ...(maxArea && { lte: parseFloat(maxArea as string) }),
      };
    }

    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { code: { contains: search as string, mode: 'insensitive' } },
        { address: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { [sortBy as string]: sortOrder },
        include: {
          owner: { select: { id: true, name: true, phone: true } },
          responsible: { select: { id: true, name: true } },
        },
      }),
      prisma.property.count({ where }),
    ]);

    res.json({
      success: true,
      data: properties,
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

// Get property by ID
propertiesRouter.get('/:id', authenticate, async (req, res, next) => {
  try {
    const property = await prisma.property.findFirst({
      where: {
        id: req.params.id,
        realEstateId: req.realEstateId,
      },
      include: {
        owner: true,
        responsible: { select: { id: true, name: true, email: true, phone: true } },
        condominium: { select: { id: true, name: true } },
        visits: {
          take: 10,
          orderBy: { scheduledAt: 'desc' },
          include: {
            person: { select: { id: true, name: true } },
            broker: { select: { id: true, name: true } },
          },
        },
        leads: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            person: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!property) {
      throw new AppError(404, 'NOT_FOUND', 'Imovel nao encontrado');
    }

    // Increment view count
    await prisma.property.update({
      where: { id: property.id },
      data: { viewCount: { increment: 1 } },
    });

    res.json({ success: true, data: property });
  } catch (error) {
    next(error);
  }
});

// Create property
propertiesRouter.post('/', authenticate, async (req, res, next) => {
  try {
    const data = propertySchema.parse(req.body);

    // Check property limit
    const realEstate = await prisma.realEstate.findUnique({
      where: { id: req.realEstateId },
      select: { maxProperties: true },
    });

    if (realEstate && realEstate.maxProperties > 0) {
      const propertyCount = await prisma.property.count({
        where: { realEstateId: req.realEstateId },
      });

      if (propertyCount >= realEstate.maxProperties) {
        throw new AppError(403, 'LIMIT_REACHED', 'Limite de imoveis atingido. Faca upgrade do plano.');
      }
    }

    const property = await prisma.property.create({
      data: {
        ...data,
        realEstateId: req.realEstateId!,
        status: 'AVAILABLE',
      },
      include: {
        owner: { select: { id: true, name: true } },
        responsible: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({ success: true, data: property });
  } catch (error) {
    next(error);
  }
});

// Update property
propertiesRouter.put('/:id', authenticate, async (req, res, next) => {
  try {
    const data = propertySchema.partial().parse(req.body);

    const existing = await prisma.property.findFirst({
      where: { id: req.params.id, realEstateId: req.realEstateId },
    });

    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Imovel nao encontrado');
    }

    const property = await prisma.property.update({
      where: { id: req.params.id },
      data,
      include: {
        owner: { select: { id: true, name: true } },
        responsible: { select: { id: true, name: true } },
      },
    });

    res.json({ success: true, data: property });
  } catch (error) {
    next(error);
  }
});

// Delete property
propertiesRouter.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const existing = await prisma.property.findFirst({
      where: { id: req.params.id, realEstateId: req.realEstateId },
    });

    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Imovel nao encontrado');
    }

    await prisma.property.delete({ where: { id: req.params.id } });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Search properties with map (requires GOOGLE_MAPS feature)
propertiesRouter.get('/search/map', authenticate, requireFeature('GOOGLE_MAPS'), async (req, res, next) => {
  try {
    const { north, south, east, west, ...filters } = req.query;

    const where: any = {
      realEstateId: req.realEstateId,
      status: 'AVAILABLE',
      latitude: { not: null },
      longitude: { not: null },
    };

    if (north && south && east && west) {
      where.latitude = {
        gte: parseFloat(south as string),
        lte: parseFloat(north as string),
      };
      where.longitude = {
        gte: parseFloat(west as string),
        lte: parseFloat(east as string),
      };
    }

    // Apply other filters
    if (filters.type) where.type = filters.type;
    if (filters.purpose) where.purpose = filters.purpose;

    const properties = await prisma.property.findMany({
      where,
      select: {
        id: true,
        code: true,
        title: true,
        type: true,
        purpose: true,
        latitude: true,
        longitude: true,
        salePrice: true,
        rentPrice: true,
        bedrooms: true,
        totalArea: true,
        images: true,
        neighborhood: true,
        city: true,
      },
      take: 500,
    });

    res.json({ success: true, data: properties });
  } catch (error) {
    next(error);
  }
});

// Get AI price suggestion (requires AI_PRICING feature)
propertiesRouter.get('/:id/price-suggestion', authenticate, requireFeature('AI_PRICING'), async (req, res, next) => {
  try {
    const property = await prisma.property.findFirst({
      where: { id: req.params.id, realEstateId: req.realEstateId },
    });

    if (!property) {
      throw new AppError(404, 'NOT_FOUND', 'Imovel nao encontrado');
    }

    // TODO: Implement AI pricing logic
    // For now, return mock data
    const suggestion = {
      suggestedSalePrice: property.salePrice ? Number(property.salePrice) * 1.05 : null,
      suggestedRentPrice: property.rentPrice ? Number(property.rentPrice) * 1.03 : null,
      confidence: 85,
      comparables: [],
      marketTrend: 'STABLE',
    };

    res.json({ success: true, data: suggestion });
  } catch (error) {
    next(error);
  }
});
