# Prompt de Instrucao: Sistema para Imobiliarias

**Baseado no projeto Bela360**
**Data:** 05/01/2026

---

# PARTE 1: ANALISE DO PROJETO BELA360 (REFERENCIA)

## 1.1 O Que Foi Construido

### Arquitetura Geral
```
bela360/
├── apps/
│   ├── api/          # Backend Express.js + TypeScript
│   │   ├── src/
│   │   │   ├── modules/      # Modulos de dominio
│   │   │   │   ├── auth/
│   │   │   │   ├── appointments/
│   │   │   │   ├── clients/
│   │   │   │   ├── services/
│   │   │   │   ├── business/
│   │   │   │   ├── analytics/
│   │   │   │   ├── automation/
│   │   │   │   ├── waitlist/
│   │   │   │   ├── finance/
│   │   │   │   ├── marketing/
│   │   │   │   ├── loyalty/
│   │   │   │   ├── inventory/
│   │   │   │   ├── professional/
│   │   │   │   └── whatsapp/
│   │   │   ├── common/       # Middlewares, errors
│   │   │   └── config/       # Env, logger, database
│   │   └── prisma/           # Schema do banco
│   │
│   └── web/          # Frontend Next.js 14
│       └── src/
│           ├── app/          # App Router (pages)
│           ├── components/   # Componentes React
│           └── lib/          # API client, utils
│
├── packages/
│   └── shared/       # Tipos compartilhados
│
├── docker/           # Dockerfiles e configs
│   ├── api/
│   ├── web/
│   ├── nginx/
│   └── postgres/
│
└── docs/             # Documentacao
```

### Tecnologias Utilizadas
- **Frontend:** Next.js 14, React 18, TailwindCSS, TypeScript
- **Backend:** Express.js, TypeScript, Prisma ORM
- **Banco de Dados:** PostgreSQL 15
- **Cache/Filas:** Redis 7
- **Mensageria:** Evolution API v2 (WhatsApp)
- **Monorepo:** pnpm workspaces
- **Deploy:** Docker Compose
- **Proxy:** Nginx com SSL

### Funcionalidades Implementadas
1. Dashboard com KPIs
2. Agenda visual por profissional
3. Cadastro de clientes
4. Cadastro de servicos
5. Controle financeiro (caixa, comissoes)
6. Marketing (campanhas, segmentacao)
7. Fidelidade (pontos, tiers)
8. Estoque (produtos, movimentacoes)
9. Automacoes (templates de mensagens)
10. Lista de espera
11. Configuracoes de WhatsApp

---

## 1.2 Problemas Superados

### Problema 1: CORS em Producao
**Sintoma:** Frontend nao conseguia chamar API ("failed to fetch")
**Causa:** Docker Compose de dev estava sendo mesclado com producao, usando `FRONTEND_URL=http://localhost:3000`
**Solucao:** Usar apenas `docker-compose.prod.yml` em producao
```bash
docker compose -f docker-compose.prod.yml up -d
```

### Problema 2: Evolution API 403
**Sintoma:** Erro 403 ao criar instancia WhatsApp
**Causa:** Evolution API retorna 403 quando instancia ja existe
**Solucao:** Verificar se instancia existe antes de criar
```typescript
async createInstance(): Promise<InstanceInfo> {
  // Primeiro verifica se ja existe
  const existingInstances = await this.client.get('/instance/fetchInstances');
  const existing = existingInstances.data?.find(
    (inst: { name: string }) => inst.name === this.instanceName
  );
  if (existing) {
    return { instanceName: this.instanceName, state: existing.connectionStatus };
  }
  // Se nao existe, cria
  const response = await this.client.post('/instance/create', {...});
  return response.data;
}
```

### Problema 3: Container Web em Modo Dev
**Sintoma:** Site nao carregava, container reiniciando
**Causa:** Dockerfile nao tinha target de producao configurado
**Solucao:** Adicionar multi-stage build com target production
```dockerfile
FROM node:20-alpine AS production
# ... build steps
CMD ["node", "server.js"]
```

### Problema 4: QR Code WhatsApp
**Sintoma:** QR Code nao aparecia no modal
**Causa:** Evolution API v2 mudou formato de resposta
**Solucao:** Tratar multiplos formatos de resposta
```typescript
return response.data.base64 || response.data.qrcode?.base64 || response.data.qrcode;
```

### Problema 5: Autenticacao JWT
**Sintoma:** Todas as rotas retornavam 401
**Causa:** Cookie/Token nao estava sendo enviado do frontend
**Aprendizado:** Configurar `credentials: 'include'` no fetch e CORS

### Problema 6: Mock Data vs API Real
**Sintoma:** Dados nao persistiam
**Causa:** Frontend usando dados hardcoded ao inves de chamar API
**Aprendizado:** Desenvolver UI primeiro e foi rapido, mas deixou divida tecnica

---

## 1.3 Licoes Aprendidas

1. **Sempre use docker-compose separados** para dev e prod
2. **Teste integracao API-Frontend cedo** - nao deixe para depois
3. **Evolution API e sensivel** - verifique documentacao da versao exata
4. **CORS e a causa de 90% dos "failed to fetch"**
5. **Healthchecks sao essenciais** para debugging em containers
6. **Logs estruturados (Pino)** facilitam muito o debug
7. **Prisma migrations** - sempre rode em producao com `migrate deploy`

---

# PARTE 2: PROMPT DE INSTRUCAO PARA SISTEMA IMOBILIARIO

## 2.1 Descricao do Sistema

### Nome Sugerido: **Imob360** ou **GestorImob**

### Publico-Alvo
Pequenas e medias imobiliarias que:
- Vendem imoveis
- Alugam imoveis
- Administram condominios

### Proposta de Valor
Sistema completo de gestao imobiliaria com:
- Automacao de atendimento via WhatsApp
- CRM de clientes (compradores, vendedores, inquilinos)
- Gestao de imoveis (venda, aluguel)
- Administracao de condominios
- Controle financeiro (comissoes, taxas, boletos)
- Marketing automatizado

---

## 2.2 Estrutura de Modulos

### Modulo 1: Imoveis
```
- Cadastro de imoveis (venda/aluguel)
- Fotos e videos
- Caracteristicas (quartos, area, etc)
- Localizacao (mapa)
- Status (disponivel, reservado, vendido/alugado)
- Proprietario vinculado
- Historico de visitas
- Documentacao
```

### Modulo 2: CRM de Pessoas
```
- Proprietarios (donos de imoveis)
- Compradores/Interessados
- Inquilinos
- Fiadores
- Sindicos
- Historico de interacoes
- Preferencias de busca
- Score de credito (integracao)
```

### Modulo 3: Negocios/Transacoes
```
- Pipeline de vendas (funil)
- Contratos de aluguel
- Contratos de venda
- Propostas
- Visitas agendadas
- Documentacao de transacao
```

### Modulo 4: Administracao de Condominios
```
- Cadastro de condominios
- Unidades (apartamentos, casas)
- Moradores
- Taxa condominial
- Boletos/Cobrancas
- Assembleias
- Comunicados
- Reserva de areas comuns
- Ocorrencias/Chamados
```

### Modulo 5: Financeiro
```
- Comissoes de corretores
- Taxas de administracao
- Repasses para proprietarios
- Boletos de aluguel
- IPTU, condominio
- Fluxo de caixa
- Relatorios financeiros
```

### Modulo 6: WhatsApp/Comunicacao
```
- Atendimento automatizado
- Envio de imoveis
- Lembretes de visita
- Cobrancas
- Avisos de condominio
- Follow-up automatico
```

### Modulo 7: Marketing
```
- Portais (ZAP, OLX, VivaReal)
- Site proprio
- Campanhas WhatsApp
- Email marketing
- Redes sociais
```

---

## 2.3 Schema do Banco de Dados (Prisma)

```prisma
// ============================================
// ENUMS
// ============================================

enum PropertyType {
  APARTMENT
  HOUSE
  COMMERCIAL
  LAND
  RURAL
  GARAGE
}

enum PropertyPurpose {
  SALE
  RENT
  SALE_AND_RENT
}

enum PropertyStatus {
  AVAILABLE
  RESERVED
  SOLD
  RENTED
  INACTIVE
}

enum PersonType {
  OWNER           // Proprietario
  BUYER           // Comprador
  TENANT          // Inquilino
  GUARANTOR       // Fiador
  SYNDIC          // Sindico
  BROKER          // Corretor
}

enum ContractType {
  SALE
  RENT
  ADMINISTRATION
}

enum ContractStatus {
  DRAFT
  ACTIVE
  EXPIRED
  CANCELLED
  RENEWED
}

enum TransactionType {
  RENT_PAYMENT        // Pagamento aluguel
  CONDO_FEE           // Taxa condominio
  COMMISSION          // Comissao
  OWNER_TRANSFER      // Repasse proprietario
  IPTU
  MAINTENANCE
  OTHER
}

enum OccurrenceStatus {
  OPEN
  IN_PROGRESS
  RESOLVED
  CANCELLED
}

// ============================================
// CORE MODELS
// ============================================

model RealEstate {
  id             String   @id @default(cuid())
  name           String
  slug           String   @unique
  cnpj           String   @unique
  phone          String
  email          String?

  // Address
  address        String?
  city           String?
  state          String?

  // WhatsApp
  whatsappInstanceId  String?
  whatsappConnected   Boolean @default(false)

  // Settings
  settings       Json     @default("{}")

  // Timestamps
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  // Relations
  users          User[]
  properties     Property[]
  people         Person[]
  contracts      Contract[]
  condominiums   Condominium[]
  transactions   Transaction[]

  @@map("real_estates")
}

model User {
  id             String   @id @default(cuid())
  realEstateId   String
  name           String
  email          String
  phone          String
  role           String   // ADMIN, BROKER, MANAGER
  creci          String?  // Registro do corretor
  isActive       Boolean  @default(true)

  // Auth
  passwordHash   String?
  otpCode        String?
  otpExpiresAt   DateTime?

  // Commission
  commissionRate Decimal? @db.Decimal(5,2)

  // Timestamps
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  // Relations
  realEstate     RealEstate @relation(fields: [realEstateId], references: [id])
  propertiesResponsible Property[] @relation("ResponsibleBroker")
  visits         Visit[]
  contracts      Contract[] @relation("ContractBroker")
  commissions    Commission[]

  @@unique([realEstateId, email])
  @@map("users")
}

// ============================================
// IMOVEIS
// ============================================

model Property {
  id             String         @id @default(cuid())
  realEstateId   String
  ownerId        String         // Proprietario
  responsibleId  String?        // Corretor responsavel

  // Identificacao
  code           String         // Codigo interno
  title          String
  description    String?

  // Tipo e proposito
  type           PropertyType
  purpose        PropertyPurpose
  status         PropertyStatus @default(AVAILABLE)

  // Localizacao
  address        String
  number         String?
  complement     String?
  neighborhood   String
  city           String
  state          String
  zipCode        String
  latitude       Decimal?       @db.Decimal(10,8)
  longitude      Decimal?       @db.Decimal(11,8)

  // Caracteristicas
  totalArea      Decimal?       @db.Decimal(10,2)
  builtArea      Decimal?       @db.Decimal(10,2)
  bedrooms       Int?
  bathrooms      Int?
  parkingSpaces  Int?
  floor          Int?
  hasElevator    Boolean        @default(false)
  hasFurniture   Boolean        @default(false)
  features       String[]       // Pool, gym, etc

  // Valores
  salePrice      Decimal?       @db.Decimal(12,2)
  rentPrice      Decimal?       @db.Decimal(10,2)
  condoFee       Decimal?       @db.Decimal(10,2)
  iptuAnnual     Decimal?       @db.Decimal(10,2)

  // Media
  images         String[]
  videoUrl       String?
  virtualTourUrl String?

  // Condominio (se aplicavel)
  condominiumId  String?
  unitNumber     String?        // Numero da unidade no condominio

  // SEO/Marketing
  publishOnSite  Boolean        @default(true)
  publishOnPortals Boolean      @default(true)
  highlightUntil DateTime?

  // Stats
  viewCount      Int            @default(0)

  // Timestamps
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  // Relations
  realEstate     RealEstate     @relation(fields: [realEstateId], references: [id])
  owner          Person         @relation("PropertyOwner", fields: [ownerId], references: [id])
  responsible    User?          @relation("ResponsibleBroker", fields: [responsibleId], references: [id])
  condominium    Condominium?   @relation(fields: [condominiumId], references: [id])
  visits         Visit[]
  contracts      Contract[]
  leads          Lead[]

  @@unique([realEstateId, code])
  @@index([realEstateId, status])
  @@index([city, neighborhood])
  @@index([type, purpose, status])
  @@map("properties")
}

// ============================================
// PESSOAS (CRM)
// ============================================

model Person {
  id             String      @id @default(cuid())
  realEstateId   String
  type           PersonType[]

  // Dados pessoais
  name           String
  cpfCnpj        String?
  email          String?
  phone          String
  phone2         String?

  // Endereco
  address        String?
  city           String?
  state          String?

  // Documentos
  rgNumber       String?
  rgIssuer       String?
  birthDate      DateTime?
  maritalStatus  String?
  profession     String?
  monthlyIncome  Decimal?    @db.Decimal(10,2)

  // Preferencias de busca (para compradores)
  searchPreferences Json?    // {minPrice, maxPrice, neighborhoods, etc}

  // Score
  creditScore    Int?
  notes          String?

  // Timestamps
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt

  // Relations
  realEstate     RealEstate  @relation(fields: [realEstateId], references: [id])
  propertiesOwned Property[] @relation("PropertyOwner")
  contractsAsBuyer Contract[] @relation("ContractBuyer")
  contractsAsTenant Contract[] @relation("ContractTenant")
  contractsAsGuarantor Contract[] @relation("ContractGuarantor")
  visits         Visit[]
  leads          Lead[]
  condoUnits     CondoUnit[] @relation("UnitResident")

  @@unique([realEstateId, cpfCnpj])
  @@index([realEstateId, phone])
  @@map("people")
}

// ============================================
// VISITAS E LEADS
// ============================================

model Visit {
  id             String   @id @default(cuid())
  propertyId     String
  personId       String   // Interessado
  brokerId       String   // Corretor

  // Agendamento
  scheduledAt    DateTime
  duration       Int      @default(30) // minutos

  // Status
  status         String   @default("SCHEDULED") // SCHEDULED, DONE, CANCELLED, NO_SHOW

  // Feedback
  feedback       String?
  interestLevel  Int?     // 1-5

  // Timestamps
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  // Relations
  property       Property @relation(fields: [propertyId], references: [id])
  person         Person   @relation(fields: [personId], references: [id])
  broker         User     @relation(fields: [brokerId], references: [id])

  @@index([propertyId])
  @@index([personId])
  @@index([brokerId, scheduledAt])
  @@map("visits")
}

model Lead {
  id             String   @id @default(cuid())
  realEstateId   String
  propertyId     String?
  personId       String?

  // Origem
  source         String   // SITE, WHATSAPP, PORTAL_ZAP, PORTAL_OLX, REFERRAL

  // Dados do lead (se pessoa nao cadastrada)
  name           String?
  phone          String
  email          String?
  message        String?

  // Status do funil
  stage          String   @default("NEW") // NEW, CONTACTED, QUALIFIED, PROPOSAL, WON, LOST
  lostReason     String?

  // Atribuicao
  assignedTo     String?  // User ID

  // Timestamps
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  contactedAt    DateTime?
  convertedAt    DateTime?

  // Relations
  property       Property? @relation(fields: [propertyId], references: [id])
  person         Person?   @relation(fields: [personId], references: [id])

  @@index([realEstateId, stage])
  @@index([phone])
  @@map("leads")
}

// ============================================
// CONTRATOS
// ============================================

model Contract {
  id             String         @id @default(cuid())
  realEstateId   String
  propertyId     String
  type           ContractType
  status         ContractStatus @default(DRAFT)

  // Partes
  buyerTenantId  String         // Comprador ou Inquilino
  guarantorId    String?        // Fiador (para aluguel)
  brokerId       String?        // Corretor responsavel

  // Valores
  value          Decimal        @db.Decimal(12,2) // Valor venda ou aluguel mensal
  commissionRate Decimal?       @db.Decimal(5,2)
  commissionValue Decimal?      @db.Decimal(10,2)

  // Datas
  startDate      DateTime
  endDate        DateTime?      // Para aluguel
  signedAt       DateTime?

  // Pagamento (aluguel)
  dueDay         Int?           // Dia vencimento
  adjustmentIndex String?       // IGPM, IPCA, etc

  // Documentos
  documentUrl    String?

  // Timestamps
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  // Relations
  realEstate     RealEstate     @relation(fields: [realEstateId], references: [id])
  property       Property       @relation(fields: [propertyId], references: [id])
  buyerTenant    Person         @relation("ContractBuyer", fields: [buyerTenantId], references: [id])
  guarantor      Person?        @relation("ContractGuarantor", fields: [guarantorId], references: [id])
  broker         User?          @relation("ContractBroker", fields: [brokerId], references: [id])
  payments       RentPayment[]

  @@index([realEstateId, status])
  @@index([propertyId])
  @@map("contracts")
}

model RentPayment {
  id             String   @id @default(cuid())
  contractId     String

  // Referencia
  referenceMonth Int      // 1-12
  referenceYear  Int

  // Valores
  rentValue      Decimal  @db.Decimal(10,2)
  condoValue     Decimal  @default(0) @db.Decimal(10,2)
  iptuValue      Decimal  @default(0) @db.Decimal(10,2)
  otherCharges   Decimal  @default(0) @db.Decimal(10,2)
  discount       Decimal  @default(0) @db.Decimal(10,2)
  lateFee        Decimal  @default(0) @db.Decimal(10,2)
  totalValue     Decimal  @db.Decimal(10,2)

  // Vencimento e pagamento
  dueDate        DateTime
  paidAt         DateTime?
  paidValue      Decimal? @db.Decimal(10,2)
  paymentMethod  String?

  // Boleto
  boletoUrl      String?
  boletoBarcode  String?

  // Status
  status         String   @default("PENDING") // PENDING, PAID, OVERDUE, CANCELLED

  // Timestamps
  createdAt      DateTime @default(now())

  // Relations
  contract       Contract @relation(fields: [contractId], references: [id])

  @@unique([contractId, referenceMonth, referenceYear])
  @@index([contractId])
  @@index([dueDate, status])
  @@map("rent_payments")
}

// ============================================
// CONDOMINIOS
// ============================================

model Condominium {
  id             String   @id @default(cuid())
  realEstateId   String

  // Dados
  name           String
  cnpj           String?
  address        String
  city           String
  state          String

  // Contato
  phone          String?
  email          String?
  syndicId       String?  // Sindico (Person ID)

  // Configuracoes
  totalUnits     Int
  commonAreas    String[] // Pool, gym, etc

  // Financeiro
  defaultCondoFee Decimal? @db.Decimal(10,2)
  paymentDay     Int      @default(10)

  // Timestamps
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  // Relations
  realEstate     RealEstate @relation(fields: [realEstateId], references: [id])
  units          CondoUnit[]
  properties     Property[]
  announcements  Announcement[]
  assemblies     Assembly[]
  reservations   AreaReservation[]
  occurrences    Occurrence[]

  @@index([realEstateId])
  @@map("condominiums")
}

model CondoUnit {
  id             String   @id @default(cuid())
  condominiumId  String

  // Identificacao
  block          String?  // Bloco
  number         String   // Numero
  floor          Int?

  // Morador
  residentId     String?
  residentType   String?  // OWNER, TENANT

  // Contato
  phone          String?
  email          String?

  // Financeiro
  condoFee       Decimal? @db.Decimal(10,2) // Se diferente do padrao

  // Timestamps
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  // Relations
  condominium    Condominium @relation(fields: [condominiumId], references: [id])
  resident       Person?     @relation("UnitResident", fields: [residentId], references: [id])
  payments       CondoPayment[]

  @@unique([condominiumId, block, number])
  @@map("condo_units")
}

model CondoPayment {
  id             String   @id @default(cuid())
  unitId         String

  // Referencia
  referenceMonth Int
  referenceYear  Int

  // Valores
  condoFee       Decimal  @db.Decimal(10,2)
  extraCharges   Decimal  @default(0) @db.Decimal(10,2)
  discount       Decimal  @default(0) @db.Decimal(10,2)
  lateFee        Decimal  @default(0) @db.Decimal(10,2)
  totalValue     Decimal  @db.Decimal(10,2)

  // Vencimento
  dueDate        DateTime
  paidAt         DateTime?
  paidValue      Decimal? @db.Decimal(10,2)

  // Status
  status         String   @default("PENDING")

  // Boleto
  boletoUrl      String?

  // Relations
  unit           CondoUnit @relation(fields: [unitId], references: [id])

  @@unique([unitId, referenceMonth, referenceYear])
  @@map("condo_payments")
}

model Announcement {
  id             String   @id @default(cuid())
  condominiumId  String

  title          String
  content        String
  priority       String   @default("NORMAL") // LOW, NORMAL, HIGH, URGENT

  // Envio
  sendViaWhatsApp Boolean @default(false)
  sentAt         DateTime?

  // Timestamps
  createdAt      DateTime @default(now())

  // Relations
  condominium    Condominium @relation(fields: [condominiumId], references: [id])

  @@index([condominiumId])
  @@map("announcements")
}

model Assembly {
  id             String   @id @default(cuid())
  condominiumId  String

  title          String
  description    String?
  scheduledAt    DateTime
  location       String?

  // Pauta
  agenda         String[]

  // Ata
  minutesUrl     String?

  // Status
  status         String   @default("SCHEDULED") // SCHEDULED, DONE, CANCELLED

  // Relations
  condominium    Condominium @relation(fields: [condominiumId], references: [id])

  @@map("assemblies")
}

model AreaReservation {
  id             String   @id @default(cuid())
  condominiumId  String
  unitId         String

  area           String   // Nome da area
  date           DateTime @db.Date
  startTime      String   // HH:MM
  endTime        String

  // Status
  status         String   @default("PENDING") // PENDING, APPROVED, REJECTED, CANCELLED

  // Timestamps
  createdAt      DateTime @default(now())

  // Relations
  condominium    Condominium @relation(fields: [condominiumId], references: [id])

  @@index([condominiumId, date])
  @@map("area_reservations")
}

model Occurrence {
  id             String   @id @default(cuid())
  condominiumId  String
  unitId         String?

  title          String
  description    String
  category       String   // MAINTENANCE, NOISE, SECURITY, OTHER
  status         OccurrenceStatus @default(OPEN)

  // Fotos
  images         String[]

  // Resolucao
  resolution     String?
  resolvedAt     DateTime?

  // Timestamps
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  // Relations
  condominium    Condominium @relation(fields: [condominiumId], references: [id])

  @@index([condominiumId, status])
  @@map("occurrences")
}

// ============================================
// FINANCEIRO
// ============================================

model Transaction {
  id             String   @id @default(cuid())
  realEstateId   String
  type           TransactionType

  // Valores
  amount         Decimal  @db.Decimal(10,2)

  // Referencia
  contractId     String?
  propertyId     String?
  description    String?

  // Status
  status         String   @default("PENDING") // PENDING, COMPLETED, CANCELLED

  // Datas
  dueDate        DateTime?
  paidAt         DateTime?

  // Timestamps
  createdAt      DateTime @default(now())

  // Relations
  realEstate     RealEstate @relation(fields: [realEstateId], references: [id])

  @@index([realEstateId, type])
  @@map("transactions")
}

model Commission {
  id             String   @id @default(cuid())
  userId         String   // Corretor
  contractId     String?

  // Valores
  saleValue      Decimal  @db.Decimal(12,2)
  commissionRate Decimal  @db.Decimal(5,2)
  commissionValue Decimal @db.Decimal(10,2)

  // Status
  status         String   @default("PENDING") // PENDING, PAID
  paidAt         DateTime?

  // Timestamps
  createdAt      DateTime @default(now())

  // Relations
  user           User     @relation(fields: [userId], references: [id])

  @@index([userId])
  @@map("commissions")
}

// ============================================
// WHATSAPP
// ============================================

model WhatsAppMessage {
  id             String   @id @default(cuid())
  realEstateId   String

  // WhatsApp
  remoteJid      String
  messageId      String?  @unique

  // Conteudo
  direction      String   // INBOUND, OUTBOUND
  content        String
  mediaUrl       String?

  // Status
  status         String   @default("SENT")

  // Timestamps
  createdAt      DateTime @default(now())

  @@index([realEstateId])
  @@index([remoteJid])
  @@map("whatsapp_messages")
}

model MessageTemplate {
  id             String   @id @default(cuid())
  realEstateId   String

  name           String
  type           String   // PROPERTY_SHARE, VISIT_REMINDER, PAYMENT_REMINDER, etc
  content        String

  isActive       Boolean  @default(true)

  @@unique([realEstateId, type])
  @@map("message_templates")
}
```

---

## 2.4 Endpoints da API

### Autenticacao
```
POST   /api/auth/login          # Login com email/senha ou OTP
POST   /api/auth/register       # Registro de imobiliaria
POST   /api/auth/otp/request    # Solicitar OTP via WhatsApp
POST   /api/auth/otp/verify     # Verificar OTP
POST   /api/auth/logout         # Logout
GET    /api/auth/me             # Usuario atual
```

### Imoveis
```
GET    /api/properties          # Listar imoveis (com filtros)
GET    /api/properties/:id      # Detalhes do imovel
POST   /api/properties          # Criar imovel
PUT    /api/properties/:id      # Atualizar imovel
DELETE /api/properties/:id      # Remover imovel
POST   /api/properties/:id/images # Upload de imagens
GET    /api/properties/search   # Busca avancada
GET    /api/properties/stats    # Estatisticas
```

### Pessoas (CRM)
```
GET    /api/people              # Listar pessoas
GET    /api/people/:id          # Detalhes
POST   /api/people              # Criar pessoa
PUT    /api/people/:id          # Atualizar
DELETE /api/people/:id          # Remover
GET    /api/people/:id/history  # Historico de interacoes
```

### Visitas
```
GET    /api/visits              # Listar visitas
POST   /api/visits              # Agendar visita
PUT    /api/visits/:id          # Atualizar
POST   /api/visits/:id/complete # Marcar como realizada
POST   /api/visits/:id/cancel   # Cancelar
```

### Leads
```
GET    /api/leads               # Listar leads
POST   /api/leads               # Criar lead
PUT    /api/leads/:id           # Atualizar
PUT    /api/leads/:id/stage     # Mover no funil
```

### Contratos
```
GET    /api/contracts           # Listar contratos
GET    /api/contracts/:id       # Detalhes
POST   /api/contracts           # Criar contrato
PUT    /api/contracts/:id       # Atualizar
POST   /api/contracts/:id/sign  # Assinar
```

### Pagamentos de Aluguel
```
GET    /api/rent-payments       # Listar pagamentos
POST   /api/rent-payments       # Gerar boletos
PUT    /api/rent-payments/:id/pay # Registrar pagamento
```

### Condominios
```
GET    /api/condominiums              # Listar
POST   /api/condominiums              # Criar
GET    /api/condominiums/:id          # Detalhes
GET    /api/condominiums/:id/units    # Unidades
POST   /api/condominiums/:id/announcements # Comunicado
GET    /api/condominiums/:id/payments # Pagamentos
POST   /api/condominiums/:id/assemblies # Assembleia
```

### Ocorrencias
```
GET    /api/occurrences         # Listar
POST   /api/occurrences         # Criar
PUT    /api/occurrences/:id     # Atualizar
POST   /api/occurrences/:id/resolve # Resolver
```

### WhatsApp
```
POST   /api/whatsapp/system/setup     # Configurar instancia
GET    /api/whatsapp/system/status    # Status conexao
GET    /api/whatsapp/system/qrcode    # QR Code
POST   /api/whatsapp/send/text        # Enviar texto
POST   /api/whatsapp/send/property    # Enviar imovel
POST   /api/whatsapp/webhooks         # Receber mensagens
```

### Analytics
```
GET    /api/analytics/dashboard       # KPIs principais
GET    /api/analytics/properties      # Metricas de imoveis
GET    /api/analytics/leads           # Funil de leads
GET    /api/analytics/financial       # Relatorios financeiros
```

---

## 2.5 Paginas do Frontend

```
/                           # Landing page publica
/login                      # Login
/register                   # Registro

/dashboard                  # Dashboard principal
/imoveis                    # Lista de imoveis
/imoveis/novo              # Cadastrar imovel
/imoveis/:id               # Detalhes do imovel
/imoveis/:id/editar        # Editar imovel

/pessoas                    # CRM - Lista de pessoas
/pessoas/novo              # Cadastrar pessoa
/pessoas/:id               # Detalhes/Historico

/visitas                    # Agenda de visitas
/leads                      # Pipeline de leads (kanban)

/contratos                  # Lista de contratos
/contratos/novo            # Novo contrato
/contratos/:id             # Detalhes do contrato

/condominios               # Lista de condominios
/condominios/:id           # Dashboard do condominio
/condominios/:id/unidades  # Unidades
/condominios/:id/financeiro # Financeiro
/condominios/:id/comunicados # Comunicados
/condominios/:id/ocorrencias # Ocorrencias
/condominios/:id/reservas  # Reservas de areas

/financeiro                # Dashboard financeiro
/financeiro/comissoes      # Comissoes de corretores
/financeiro/repasses       # Repasses proprietarios

/whatsapp                  # Configuracao WhatsApp
/configuracoes             # Configuracoes gerais
```

---

## 2.6 Docker Compose de Producao

```yaml
# docker-compose.prod.yml
services:
  postgres:
    image: postgres:15-alpine
    container_name: imob360-postgres
    restart: always
    ports:
      - "127.0.0.1:5432:5432"
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - imob360-network

  redis:
    image: redis:7-alpine
    container_name: imob360-redis
    restart: always
    command: redis-server --appendonly yes --maxmemory 256mb
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
    networks:
      - imob360-network

  evolution-api:
    image: evoapicloud/evolution-api:v2.3.7
    container_name: imob360-evolution
    restart: always
    environment:
      - SERVER_URL=${EVOLUTION_PUBLIC_URL}
      - AUTHENTICATION_TYPE=apikey
      - AUTHENTICATION_API_KEY=${EVOLUTION_API_KEY}
      - DATABASE_ENABLED=true
      - DATABASE_PROVIDER=postgresql
      - DATABASE_CONNECTION_URI=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?schema=evolution
      - CACHE_REDIS_ENABLED=true
      - CACHE_REDIS_URI=redis://redis:6379
      - WEBHOOK_GLOBAL_URL=http://api:3001/api/webhooks/whatsapp
      - WEBHOOK_GLOBAL_ENABLED=true
    volumes:
      - evolution_instances:/evolution/instances
      - evolution_store:/evolution/store
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD-SHELL", "wget -q --spider http://localhost:8080/ || exit 1"]
      interval: 10s
      start_period: 30s
    networks:
      - imob360-network

  api:
    build:
      context: .
      dockerfile: docker/api/Dockerfile
      target: production
    container_name: imob360-api
    restart: always
    environment:
      - NODE_ENV=production
      - PORT=3001
      - DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - EVOLUTION_API_URL=http://evolution-api:8080
      - EVOLUTION_API_KEY=${EVOLUTION_API_KEY}
      - FRONTEND_URL=${FRONTEND_URL}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - imob360-network

  web:
    build:
      context: .
      dockerfile: docker/web/Dockerfile
      target: production
      args:
        - NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
    container_name: imob360-web
    restart: always
    depends_on:
      - api
    networks:
      - imob360-network

  nginx:
    image: nginx:alpine
    container_name: imob360-nginx
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./docker/nginx/certs:/etc/nginx/certs:ro
    depends_on:
      - web
      - api
    networks:
      - imob360-network

networks:
  imob360-network:
    driver: bridge

volumes:
  postgres_data:
  redis_data:
  evolution_instances:
  evolution_store:
```

---

## 2.7 Variaveis de Ambiente (.env.example)

```env
# Database
POSTGRES_USER=imob360
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=imob360

# API
NODE_ENV=production
JWT_SECRET=your_jwt_secret_32_chars_minimum
JWT_REFRESH_SECRET=your_refresh_secret

# Evolution API (WhatsApp)
EVOLUTION_API_KEY=your_evolution_api_key
EVOLUTION_PUBLIC_URL=https://evolution.yourdomain.com
EVOLUTION_INSTANCE_NAME=imob360_main

# Frontend
FRONTEND_URL=https://yourdomain.com
NEXT_PUBLIC_API_URL=https://yourdomain.com/api
```

---

## 2.8 Automacoes WhatsApp Sugeridas

### Para Corretores
1. **Lead novo:** Notificar corretor responsavel
2. **Visita agendada:** Lembrete para corretor e cliente
3. **Proposta recebida:** Avisar proprietario

### Para Inquilinos
1. **Boleto gerado:** Enviar link do boleto
2. **Lembrete de vencimento:** 3 dias antes
3. **Boleto atrasado:** Cobrar apos vencimento
4. **Contrato vencendo:** 60 dias antes do fim

### Para Condominios
1. **Boleto de condominio:** Envio mensal
2. **Assembleia:** Convocacao
3. **Comunicados:** Avisos urgentes
4. **Ocorrencia resolvida:** Notificar morador

### Para Proprietarios
1. **Repasse disponivel:** Valor creditado
2. **Imovel visitado:** Quantas visitas no mes
3. **Proposta recebida:** Nova oferta
4. **Contrato assinado:** Confirmacao

---

## 2.9 Integracao com Portais

### ZAP Imoveis / Viva Real / OLX
- Exportar XML no formato exigido
- Sincronizar automaticamente
- Atualizar status (vendido/alugado)

### Endpoint de Export
```
GET /api/integrations/zap/xml
GET /api/integrations/olx/xml
GET /api/integrations/vivareal/xml
```

---

## 2.10 Checklist de Implementacao

### Fase 1: Foundation (MVP)
- [ ] Setup do projeto (monorepo pnpm)
- [ ] Docker Compose dev e prod
- [ ] Schema Prisma basico
- [ ] Auth (login/registro)
- [ ] CRUD de Imoveis
- [ ] CRUD de Pessoas
- [ ] Dashboard basico

### Fase 2: Core Business
- [ ] Agenda de visitas
- [ ] Pipeline de leads (kanban)
- [ ] Contratos (venda e aluguel)
- [ ] Pagamentos de aluguel
- [ ] Comissoes

### Fase 3: Condominios
- [ ] Cadastro de condominios
- [ ] Gestao de unidades
- [ ] Cobranca de condominio
- [ ] Comunicados
- [ ] Ocorrencias

### Fase 4: WhatsApp
- [ ] Integracao Evolution API
- [ ] Templates de mensagens
- [ ] Envio de imoveis
- [ ] Automacoes

### Fase 5: Marketing
- [ ] Site publico de imoveis
- [ ] Integracao portais
- [ ] SEO
- [ ] Campanhas

### Fase 6: Analytics
- [ ] Dashboard avancado
- [ ] Relatorios financeiros
- [ ] Metricas de conversao
- [ ] Export PDF/Excel

---

# PARTE 3: DIFERENCIAIS COMPETITIVOS SUGERIDOS

1. **WhatsApp nativo** - Atendimento direto pelo app mais usado
2. **CRM visual** - Pipeline estilo Kanban para leads
3. **Gestao de condominios integrada** - Diferencial para imobiliarias que administram
4. **Boletos automaticos** - Integracao com bancos
5. **Portal do inquilino** - App para inquilinos verem boletos, abrir chamados
6. **Portal do proprietario** - Acompanhar rendimentos
7. **Assinatura digital** - Integracao com DocuSign/Clicksign
8. **Precificacao inteligente** - Sugestao baseada em mercado

---

*Documento gerado em 05/01/2026*
*Baseado no projeto Bela360*
