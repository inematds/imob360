import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { authenticate, requireRole } from '../../common/middleware/auth.js';
import { requireFeature, incrementUsage } from '../../common/middleware/feature-check.js';
import { AppError } from '../../common/middleware/error-handler.js';
import { XMLBuilder } from 'fast-xml-parser';

export const portalsRouter = Router();

const PORTAL_FEATURES: Record<string, string> = {
  ZAP: 'PORTAL_ZAP',
  VIVAREAL: 'PORTAL_VIVAREAL',
  OLX: 'PORTAL_OLX',
};

// List portal integrations
portalsRouter.get('/', authenticate, async (req, res, next) => {
  try {
    const integrations = await prisma.portalIntegration.findMany({
      where: { realEstateId: req.realEstateId },
      orderBy: { portal: 'asc' },
    });

    // Get features status
    const features = await prisma.tenantFeature.findMany({
      where: {
        realEstateId: req.realEstateId,
        feature: {
          code: { in: Object.values(PORTAL_FEATURES) },
        },
      },
      include: { feature: true },
    });

    const featureMap = new Map(features.map((f) => [f.feature.code, f.isEnabled]));

    const portals = [
      {
        code: 'ZAP',
        name: 'ZAP Imoveis',
        featureCode: 'PORTAL_ZAP',
        enabled: featureMap.get('PORTAL_ZAP') || false,
        integration: integrations.find((i) => i.portal === 'ZAP') || null,
      },
      {
        code: 'VIVAREAL',
        name: 'VivaReal',
        featureCode: 'PORTAL_VIVAREAL',
        enabled: featureMap.get('PORTAL_VIVAREAL') || false,
        integration: integrations.find((i) => i.portal === 'VIVAREAL') || null,
      },
      {
        code: 'OLX',
        name: 'OLX',
        featureCode: 'PORTAL_OLX',
        enabled: featureMap.get('PORTAL_OLX') || false,
        integration: integrations.find((i) => i.portal === 'OLX') || null,
      },
    ];

    res.json({ success: true, data: portals });
  } catch (error) {
    next(error);
  }
});

// Configure portal integration
const configSchema = z.object({
  portal: z.enum(['ZAP', 'VIVAREAL', 'OLX']),
  credentials: z.object({
    clientId: z.string().optional(),
    clientSecret: z.string().optional(),
    accountId: z.string().optional(),
    apiKey: z.string().optional(),
  }),
  settings: z
    .object({
      autoSync: z.boolean().optional(),
      syncInterval: z.number().optional(),
      defaultHighlight: z.boolean().optional(),
    })
    .optional(),
});

portalsRouter.post('/configure', authenticate, requireRole(['ADMIN', 'OWNER']), async (req, res, next) => {
  try {
    const { portal, credentials, settings } = configSchema.parse(req.body);

    // Check if feature is enabled
    const featureCode = PORTAL_FEATURES[portal];
    const feature = await prisma.tenantFeature.findFirst({
      where: {
        realEstateId: req.realEstateId,
        feature: { code: featureCode },
        isEnabled: true,
      },
    });

    if (!feature) {
      throw new AppError(403, 'FEATURE_DISABLED', `Feature ${portal} nao esta habilitada`);
    }

    const integration = await prisma.portalIntegration.upsert({
      where: {
        realEstateId_portal: {
          realEstateId: req.realEstateId!,
          portal,
        },
      },
      update: {
        credentials,
        settings: settings || {},
        isActive: true,
      },
      create: {
        realEstateId: req.realEstateId!,
        portal,
        credentials,
        settings: settings || {},
        isActive: true,
      },
    });

    res.json({
      success: true,
      data: integration,
      message: `Integracao ${portal} configurada`,
    });
  } catch (error) {
    next(error);
  }
});

// Get properties to sync
portalsRouter.get('/:portal/properties', authenticate, async (req, res, next) => {
  try {
    const { portal } = req.params;
    const featureCode = PORTAL_FEATURES[portal.toUpperCase()];

    if (!featureCode) {
      throw new AppError(400, 'INVALID_PORTAL', 'Portal invalido');
    }

    const properties = await prisma.property.findMany({
      where: {
        realEstateId: req.realEstateId,
        status: 'AVAILABLE',
        publishToPortals: true,
      },
      include: {
        portalListings: {
          where: { portal: portal.toUpperCase() },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const propertiesWithStatus = properties.map((p) => ({
      id: p.id,
      code: p.code,
      title: p.title,
      type: p.type,
      purpose: p.purpose,
      salePrice: p.salePrice,
      rentPrice: p.rentPrice,
      address: p.address,
      neighborhood: p.neighborhood,
      city: p.city,
      portalStatus: p.portalListings[0]?.status || 'NOT_PUBLISHED',
      portalId: p.portalListings[0]?.externalId,
      lastSync: p.portalListings[0]?.lastSync,
    }));

    res.json({ success: true, data: propertiesWithStatus });
  } catch (error) {
    next(error);
  }
});

// Publish property to portal
portalsRouter.post('/:portal/publish/:propertyId', authenticate, async (req, res, next) => {
  try {
    const { portal, propertyId } = req.params;
    const featureCode = PORTAL_FEATURES[portal.toUpperCase()];

    if (!featureCode) {
      throw new AppError(400, 'INVALID_PORTAL', 'Portal invalido');
    }

    // Check feature
    const feature = await prisma.tenantFeature.findFirst({
      where: {
        realEstateId: req.realEstateId,
        feature: { code: featureCode },
        isEnabled: true,
      },
    });

    if (!feature) {
      throw new AppError(403, 'FEATURE_DISABLED', `Feature ${portal} nao esta habilitada`);
    }

    const property = await prisma.property.findFirst({
      where: { id: propertyId, realEstateId: req.realEstateId },
      include: { owner: true },
    });

    if (!property) {
      throw new AppError(404, 'NOT_FOUND', 'Imovel nao encontrado');
    }

    // Get integration config
    const integration = await prisma.portalIntegration.findFirst({
      where: {
        realEstateId: req.realEstateId,
        portal: portal.toUpperCase(),
        isActive: true,
      },
    });

    if (!integration) {
      throw new AppError(400, 'NOT_CONFIGURED', `Integracao ${portal} nao configurada`);
    }

    // TODO: Call actual portal API
    // For now, simulate publishing
    const externalId = `${portal.toUpperCase()}-${Date.now()}`;

    const listing = await prisma.portalListing.upsert({
      where: {
        propertyId_portal: {
          propertyId,
          portal: portal.toUpperCase(),
        },
      },
      update: {
        status: 'PUBLISHED',
        lastSync: new Date(),
        externalUrl: `https://${portal.toLowerCase()}.com.br/imovel/${externalId}`,
      },
      create: {
        propertyId,
        portal: portal.toUpperCase(),
        externalId,
        status: 'PUBLISHED',
        lastSync: new Date(),
        externalUrl: `https://${portal.toLowerCase()}.com.br/imovel/${externalId}`,
      },
    });

    await incrementUsage(req.realEstateId!, featureCode);

    res.json({
      success: true,
      data: listing,
      message: `Imovel publicado no ${portal}`,
    });
  } catch (error) {
    next(error);
  }
});

// Remove property from portal
portalsRouter.delete('/:portal/publish/:propertyId', authenticate, async (req, res, next) => {
  try {
    const { portal, propertyId } = req.params;

    const listing = await prisma.portalListing.findFirst({
      where: {
        propertyId,
        portal: portal.toUpperCase(),
        property: { realEstateId: req.realEstateId },
      },
    });

    if (!listing) {
      throw new AppError(404, 'NOT_FOUND', 'Anuncio nao encontrado');
    }

    // TODO: Call portal API to remove

    await prisma.portalListing.update({
      where: { id: listing.id },
      data: { status: 'REMOVED', lastSync: new Date() },
    });

    res.json({ success: true, message: `Imovel removido do ${portal}` });
  } catch (error) {
    next(error);
  }
});

// Sync all properties with portal
portalsRouter.post('/:portal/sync', authenticate, requireRole(['ADMIN', 'OWNER']), async (req, res, next) => {
  try {
    const { portal } = req.params;
    const featureCode = PORTAL_FEATURES[portal.toUpperCase()];

    if (!featureCode) {
      throw new AppError(400, 'INVALID_PORTAL', 'Portal invalido');
    }

    const integration = await prisma.portalIntegration.findFirst({
      where: {
        realEstateId: req.realEstateId,
        portal: portal.toUpperCase(),
        isActive: true,
      },
    });

    if (!integration) {
      throw new AppError(400, 'NOT_CONFIGURED', `Integracao ${portal} nao configurada`);
    }

    // Get all publishable properties
    const properties = await prisma.property.findMany({
      where: {
        realEstateId: req.realEstateId,
        status: 'AVAILABLE',
        publishToPortals: true,
      },
    });

    // Create sync job
    const syncJob = await prisma.portalSyncJob.create({
      data: {
        integrationId: integration.id,
        status: 'PENDING',
        totalProperties: properties.length,
        syncedProperties: 0,
      },
    });

    // TODO: Queue background job for actual sync
    // For now, mark as completed
    await prisma.portalSyncJob.update({
      where: { id: syncJob.id },
      data: {
        status: 'COMPLETED',
        syncedProperties: properties.length,
        completedAt: new Date(),
      },
    });

    await prisma.portalIntegration.update({
      where: { id: integration.id },
      data: { lastSync: new Date() },
    });

    res.json({
      success: true,
      data: {
        jobId: syncJob.id,
        totalProperties: properties.length,
        status: 'COMPLETED',
      },
      message: `Sincronizacao com ${portal} iniciada`,
    });
  } catch (error) {
    next(error);
  }
});

// Generate XML feed for portal
portalsRouter.get('/:portal/feed', async (req, res, next) => {
  try {
    const { portal } = req.params;
    const { token } = req.query;

    if (!token) {
      throw new AppError(401, 'UNAUTHORIZED', 'Token obrigatorio');
    }

    // Find integration by token
    const integration = await prisma.portalIntegration.findFirst({
      where: {
        feedToken: token as string,
        portal: portal.toUpperCase(),
        isActive: true,
      },
      include: { realEstate: true },
    });

    if (!integration) {
      throw new AppError(401, 'UNAUTHORIZED', 'Token invalido');
    }

    // Get properties
    const properties = await prisma.property.findMany({
      where: {
        realEstateId: integration.realEstateId,
        status: 'AVAILABLE',
        publishToPortals: true,
      },
      include: { owner: true },
    });

    // Build XML based on portal format
    const xmlBuilder = new XMLBuilder({
      ignoreAttributes: false,
      format: true,
    });

    const listings = properties.map((p) => ({
      CodigoImovel: p.code,
      TipoImovel: mapPropertyType(p.type),
      SubTipoImovel: p.subType || '',
      CategoriaImovel: p.purpose === 'SALE' ? 'Padrão' : 'Padrão',
      Endereco: p.address,
      Numero: p.number || '',
      Complemento: p.complement || '',
      Bairro: p.neighborhood,
      Cidade: p.city,
      UF: p.state,
      CEP: p.zipCode || '',
      PrecoVenda: p.purpose !== 'RENT' ? p.salePrice : '',
      PrecoLocacao: p.purpose !== 'SALE' ? p.rentPrice : '',
      AreaUtil: p.area,
      AreaTotal: p.totalArea || p.area,
      QtdDormitorios: p.bedrooms || 0,
      QtdSuites: p.suites || 0,
      QtdBanheiros: p.bathrooms || 0,
      QtdVagas: p.parkingSpaces || 0,
      Observacao: p.description,
      Fotos: {
        Foto: ((p.images as string[]) || []).map((url, idx) => ({
          NomeArquivo: `foto${idx + 1}.jpg`,
          URLArquivo: url,
          Principal: idx === 0 ? 'Sim' : 'Não',
        })),
      },
    }));

    const xml = xmlBuilder.build({
      ListingDataFeed: {
        '@_xmlns': 'http://www.vivareal.com/schemas/1.0/VRSync',
        Header: {
          Provider: 'Imob360',
          Email: integration.realEstate.email,
          ContactName: integration.realEstate.name,
        },
        Listings: { Listing: listings },
      },
    });

    res.type('application/xml').send(xml);
  } catch (error) {
    next(error);
  }
});

// Generate feed token
portalsRouter.post('/:portal/feed-token', authenticate, requireRole(['ADMIN', 'OWNER']), async (req, res, next) => {
  try {
    const { portal } = req.params;

    const integration = await prisma.portalIntegration.findFirst({
      where: {
        realEstateId: req.realEstateId,
        portal: portal.toUpperCase(),
      },
    });

    if (!integration) {
      throw new AppError(404, 'NOT_FOUND', 'Integracao nao encontrada');
    }

    const feedToken = crypto.randomUUID();

    await prisma.portalIntegration.update({
      where: { id: integration.id },
      data: { feedToken },
    });

    const feedUrl = `${process.env.API_URL}/portals/${portal.toLowerCase()}/feed?token=${feedToken}`;

    res.json({
      success: true,
      data: {
        feedToken,
        feedUrl,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get sync history
portalsRouter.get('/:portal/history', authenticate, async (req, res, next) => {
  try {
    const { portal } = req.params;
    const { page = '1', limit = '20' } = req.query;

    const integration = await prisma.portalIntegration.findFirst({
      where: {
        realEstateId: req.realEstateId,
        portal: portal.toUpperCase(),
      },
    });

    if (!integration) {
      return res.json({ success: true, data: [], meta: { total: 0 } });
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [jobs, total] = await Promise.all([
      prisma.portalSyncJob.findMany({
        where: { integrationId: integration.id },
        skip,
        take: parseInt(limit as string),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.portalSyncJob.count({ where: { integrationId: integration.id } }),
    ]);

    res.json({
      success: true,
      data: jobs,
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

// Helper function to map property types
function mapPropertyType(type: string): string {
  const typeMap: Record<string, string> = {
    APARTMENT: 'Apartamento',
    HOUSE: 'Casa',
    CONDO_HOUSE: 'Casa de Condomínio',
    COMMERCIAL: 'Comercial',
    LAND: 'Terreno',
    RURAL: 'Rural',
  };
  return typeMap[type] || type;
}
