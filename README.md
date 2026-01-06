# Imob360

Sistema completo de gestao imobiliaria para pequenas e medias imobiliarias brasileiras.

## Tecnologias

- **Frontend**: Next.js 14, React 18, TailwindCSS, Radix UI
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL 16, Prisma ORM
- **Cache**: Redis
- **Containerizacao**: Docker, Docker Compose

## Funcionalidades

### Core
- Gestao de imoveis (CRUD completo)
- CRM de leads com Kanban
- Agendamento de visitas
- Gestao de contratos
- Cadastro de pessoas (proprietarios, inquilinos, compradores)
- Dashboard com metricas

### Features Modulares (ativaveis/desativaveis)
- Integracao WhatsApp (Evolution API)
- Google Maps para busca geografica
- Publicacao em portais (ZAP, VivaReal, OLX)
- Assinatura digital (Clicksign)
- AI Lead Scoring
- AI Precificacao (AVM)
- Busca inteligente com linguagem natural
- PIX e Boleto automatico
- Tour virtual

## Estrutura do Projeto

```
imob360/
├── apps/
│   ├── api/          # Backend Express
│   └── web/          # Frontend Next.js
├── packages/
│   ├── database/     # Prisma schema e client
│   └── shared/       # Tipos e utilitarios compartilhados
├── nginx/            # Configuracao Nginx
├── docker-compose.yml
└── docker-compose.dev.yml
```

## Desenvolvimento

### Pre-requisitos

- Node.js 20+
- pnpm 9+
- Docker e Docker Compose

### Setup

1. Clone o repositorio:
```bash
git clone https://github.com/inematds/imob360.git
cd imob360
```

2. Copie o arquivo de ambiente:
```bash
cp .env.example .env
```

3. Inicie os servicos de desenvolvimento:
```bash
docker compose -f docker-compose.dev.yml up -d
```

4. Instale as dependencias:
```bash
pnpm install
```

5. Gere o Prisma client:
```bash
pnpm db:generate
```

6. Execute as migrations:
```bash
pnpm db:migrate
```

7. Popule o banco com dados iniciais:
```bash
pnpm db:seed
```

8. Inicie o servidor de desenvolvimento:
```bash
pnpm dev
```

A aplicacao estara disponivel em:
- Frontend: http://localhost:3000
- API: http://localhost:3001
- pgAdmin: http://localhost:5050 (com profile tools)

## Producao

### Docker

```bash
# Build e start
docker compose up -d --build

# Com WhatsApp (Evolution API)
docker compose --profile whatsapp up -d --build

# Com Nginx (producao)
docker compose --profile production up -d --build
```

## Licenca

Proprietario - Todos os direitos reservados.
