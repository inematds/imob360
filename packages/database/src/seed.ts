import { PrismaClient, PlanType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create feature definitions
  const features = [
    {
      code: 'GOOGLE_MAPS',
      name: 'Google Maps',
      description: 'Integracao com Google Maps para localizacao de imoveis, busca por regiao e pontos de interesse',
      category: 'INTEGRATION',
      monthlyPrice: 49.90,
      isIncludedInPlan: { STARTER: false, PROFESSIONAL: true, ENTERPRISE: true },
    },
    {
      code: 'WHATSAPP',
      name: 'WhatsApp Business',
      description: 'Integracao com WhatsApp para atendimento automatizado, envio de imoveis e notificacoes',
      category: 'INTEGRATION',
      monthlyPrice: 79.90,
      isIncludedInPlan: { STARTER: true, PROFESSIONAL: true, ENTERPRISE: true },
    },
    {
      code: 'AI_LEAD_SCORING',
      name: 'Lead Scoring com IA',
      description: 'Classificacao automatica de leads por probabilidade de conversao usando machine learning',
      category: 'AI',
      monthlyPrice: 99.90,
      isIncludedInPlan: { STARTER: false, PROFESSIONAL: false, ENTERPRISE: true },
    },
    {
      code: 'AI_PRICING',
      name: 'Precificacao Automatica',
      description: 'Sugestao de preco de venda/aluguel baseada em dados de mercado e IA',
      category: 'AI',
      monthlyPrice: 79.90,
      isIncludedInPlan: { STARTER: false, PROFESSIONAL: false, ENTERPRISE: true },
    },
    {
      code: 'AI_SEARCH',
      name: 'Busca Inteligente',
      description: 'Busca de imoveis usando linguagem natural (ex: "apartamento 2 quartos perto do metro")',
      category: 'AI',
      monthlyPrice: 49.90,
      isIncludedInPlan: { STARTER: false, PROFESSIONAL: true, ENTERPRISE: true },
    },
    {
      code: 'DIGITAL_SIGNATURE',
      name: 'Assinatura Digital',
      description: 'Integracao com Clicksign para assinatura digital de contratos',
      category: 'INTEGRATION',
      monthlyPrice: 69.90,
      isIncludedInPlan: { STARTER: false, PROFESSIONAL: true, ENTERPRISE: true },
    },
    {
      code: 'PORTAL_INTEGRATION',
      name: 'Integracao com Portais',
      description: 'Publicacao automatica em ZAP, VivaReal e OLX',
      category: 'INTEGRATION',
      monthlyPrice: 59.90,
      isIncludedInPlan: { STARTER: false, PROFESSIONAL: true, ENTERPRISE: true },
    },
    {
      code: 'VIRTUAL_TOUR',
      name: 'Tours Virtuais 3D',
      description: 'Suporte a tours virtuais Matterport e videos 360',
      category: 'PORTAL',
      monthlyPrice: 29.90,
      isIncludedInPlan: { STARTER: false, PROFESSIONAL: true, ENTERPRISE: true },
    },
    {
      code: 'CLIENT_PORTAL',
      name: 'Portal do Cliente',
      description: 'Portal self-service para inquilinos e proprietarios',
      category: 'PORTAL',
      monthlyPrice: 49.90,
      isIncludedInPlan: { STARTER: false, PROFESSIONAL: true, ENTERPRISE: true },
    },
    {
      code: 'CONDO_MANAGEMENT',
      name: 'Gestao de Condominios',
      description: 'Modulo completo para administracao de condominios',
      category: 'MODULE',
      monthlyPrice: 99.90,
      isIncludedInPlan: { STARTER: false, PROFESSIONAL: false, ENTERPRISE: true },
    },
    {
      code: 'PIX_PAYMENT',
      name: 'Cobranca PIX',
      description: 'Geracao automatica de cobrancas via PIX',
      category: 'INTEGRATION',
      monthlyPrice: 39.90,
      isIncludedInPlan: { STARTER: false, PROFESSIONAL: true, ENTERPRISE: true },
    },
    {
      code: 'BOLETO_PAYMENT',
      name: 'Geracao de Boletos',
      description: 'Geracao automatica de boletos bancarios',
      category: 'INTEGRATION',
      monthlyPrice: 49.90,
      isIncludedInPlan: { STARTER: false, PROFESSIONAL: true, ENTERPRISE: true },
    },
    {
      code: 'ADVANCED_ANALYTICS',
      name: 'Analytics Avancado',
      description: 'Dashboards avancados com metricas detalhadas e exportacao',
      category: 'PORTAL',
      monthlyPrice: 39.90,
      isIncludedInPlan: { STARTER: false, PROFESSIONAL: false, ENTERPRISE: true },
    },
    {
      code: 'API_ACCESS',
      name: 'Acesso a API',
      description: 'API REST completa para integracao com outros sistemas',
      category: 'INTEGRATION',
      monthlyPrice: 99.90,
      isIncludedInPlan: { STARTER: false, PROFESSIONAL: false, ENTERPRISE: true },
    },
    {
      code: 'MULTI_BRANCH',
      name: 'Multi-filiais',
      description: 'Gestao de multiplas filiais da imobiliaria',
      category: 'MODULE',
      monthlyPrice: 149.90,
      isIncludedInPlan: { STARTER: false, PROFESSIONAL: false, ENTERPRISE: true },
    },
  ];

  for (const feature of features) {
    await prisma.featureDefinition.upsert({
      where: { code: feature.code },
      update: feature,
      create: feature,
    });
  }

  console.log(`Created ${features.length} feature definitions`);

  // Create demo real estate
  const demoRealEstate = await prisma.realEstate.upsert({
    where: { slug: 'imobiliaria-demo' },
    update: {},
    create: {
      name: 'Imobiliaria Demo',
      slug: 'imobiliaria-demo',
      cnpj: '00.000.000/0001-00',
      phone: '11999999999',
      email: 'contato@imobiliariademo.com.br',
      city: 'Sao Paulo',
      state: 'SP',
      planType: PlanType.PROFESSIONAL,
      maxUsers: 10,
      maxProperties: 500,
    },
  });

  // Create admin user
  const adminUser = await prisma.user.upsert({
    where: {
      realEstateId_email: {
        realEstateId: demoRealEstate.id,
        email: 'admin@imobiliariademo.com.br',
      },
    },
    update: {},
    create: {
      realEstateId: demoRealEstate.id,
      name: 'Administrador',
      email: 'admin@imobiliariademo.com.br',
      phone: '11999999999',
      role: 'ADMIN',
      // Password: admin123 (hashed with bcrypt)
      passwordHash: '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekdHgTGmrpHEfIoxm',
    },
  });

  // Enable features for demo tenant based on plan
  const allFeatures = await prisma.featureDefinition.findMany();
  for (const feature of allFeatures) {
    const includedInPlan = feature.isIncludedInPlan as Record<string, boolean>;
    const isEnabled = includedInPlan[demoRealEstate.planType] || false;

    await prisma.tenantFeature.upsert({
      where: {
        realEstateId_featureId: {
          realEstateId: demoRealEstate.id,
          featureId: feature.id,
        },
      },
      update: { isEnabled },
      create: {
        realEstateId: demoRealEstate.id,
        featureId: feature.id,
        isEnabled,
        enabledAt: isEnabled ? new Date() : null,
      },
    });
  }

  // Create demo owner
  const demoOwner = await prisma.person.upsert({
    where: {
      realEstateId_cpfCnpj: {
        realEstateId: demoRealEstate.id,
        cpfCnpj: '123.456.789-00',
      },
    },
    update: {},
    create: {
      realEstateId: demoRealEstate.id,
      name: 'Jose Silva (Proprietario)',
      cpfCnpj: '123.456.789-00',
      email: 'jose.silva@email.com',
      phone: '11988888888',
      types: ['OWNER'],
      city: 'Sao Paulo',
      state: 'SP',
    },
  });

  // Create demo properties
  const properties = [
    {
      code: 'APT001',
      title: 'Apartamento 3 quartos em Moema',
      description: 'Lindo apartamento com 3 quartos, sendo 1 suite, 2 vagas de garagem. Lazer completo.',
      type: 'APARTMENT' as const,
      purpose: 'SALE' as const,
      address: 'Alameda dos Arapanes',
      number: '500',
      neighborhood: 'Moema',
      city: 'Sao Paulo',
      state: 'SP',
      zipCode: '04524-001',
      latitude: -23.6008,
      longitude: -46.6658,
      totalArea: 120,
      builtArea: 100,
      bedrooms: 3,
      suites: 1,
      bathrooms: 2,
      parkingSpaces: 2,
      floor: 8,
      hasElevator: true,
      features: ['Piscina', 'Academia', 'Salao de festas', 'Playground'],
      salePrice: 850000,
      condoFee: 1200,
      iptuAnnual: 4800,
    },
    {
      code: 'APT002',
      title: 'Studio moderno na Vila Olimpia',
      description: 'Studio completo, mobiliado, proximo ao metro. Ideal para investimento.',
      type: 'APARTMENT' as const,
      purpose: 'RENT' as const,
      address: 'Rua Funchal',
      number: '200',
      neighborhood: 'Vila Olimpia',
      city: 'Sao Paulo',
      state: 'SP',
      zipCode: '04551-060',
      latitude: -23.5952,
      longitude: -46.6841,
      totalArea: 35,
      builtArea: 35,
      bedrooms: 1,
      suites: 0,
      bathrooms: 1,
      parkingSpaces: 1,
      floor: 15,
      hasElevator: true,
      hasFurniture: true,
      features: ['Piscina', 'Academia', 'Coworking'],
      rentPrice: 3500,
      condoFee: 600,
      iptuAnnual: 1200,
    },
    {
      code: 'CASA001',
      title: 'Casa em condominio no Morumbi',
      description: 'Casa ampla em condominio fechado com seguranca 24h. 4 suites, piscina privativa.',
      type: 'HOUSE' as const,
      purpose: 'SALE_AND_RENT' as const,
      address: 'Rua Particular do Condominio',
      number: '10',
      neighborhood: 'Morumbi',
      city: 'Sao Paulo',
      state: 'SP',
      zipCode: '05659-000',
      latitude: -23.6178,
      longitude: -46.7214,
      totalArea: 500,
      builtArea: 350,
      bedrooms: 4,
      suites: 4,
      bathrooms: 5,
      parkingSpaces: 4,
      hasElevator: false,
      features: ['Piscina', 'Churrasqueira', 'Jardim', 'Seguranca 24h'],
      salePrice: 3500000,
      rentPrice: 18000,
      condoFee: 2500,
      iptuAnnual: 12000,
    },
  ];

  for (const prop of properties) {
    await prisma.property.upsert({
      where: {
        realEstateId_code: {
          realEstateId: demoRealEstate.id,
          code: prop.code,
        },
      },
      update: {},
      create: {
        ...prop,
        realEstateId: demoRealEstate.id,
        ownerId: demoOwner.id,
        responsibleId: adminUser.id,
        status: 'AVAILABLE',
        publishOnSite: true,
        publishOnPortals: true,
      },
    });
  }

  console.log('Created demo real estate, user, and properties');
  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
