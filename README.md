# Imob360 - Sistema de Gestao Imobiliaria

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue.svg" alt="Version">
  <img src="https://img.shields.io/badge/license-Proprietary-red.svg" alt="License">
  <img src="https://img.shields.io/badge/node-%3E%3D20.0.0-green.svg" alt="Node">
  <img src="https://img.shields.io/badge/docker-ready-blue.svg" alt="Docker">
</p>

## O que e o Imob360?

O **Imob360** e um sistema completo de gestao imobiliaria desenvolvido especialmente para **pequenas e medias imobiliarias brasileiras**. Ele permite gerenciar todos os aspectos do seu negocio em um unico lugar: imoveis, clientes, contratos, visitas, leads e muito mais.

### Por que usar o Imob360?

- **Tudo em um so lugar**: Gerencie imoveis, clientes, contratos e financeiro em uma unica plataforma
- **Pague apenas pelo que usar**: Sistema modular onde voce ativa apenas as funcionalidades que precisa
- **Facil de usar**: Interface intuitiva pensada para quem nao e tecnico
- **Seguro**: Seus dados ficam protegidos e isolados de outras imobiliarias
- **Integracoes**: Conecte com WhatsApp, portais de imoveis, sistemas de pagamento e mais

---

## Indice

1. [Funcionalidades](#funcionalidades)
2. [Como o Sistema Funciona](#como-o-sistema-funciona)
3. [Requisitos para Instalacao](#requisitos-para-instalacao)
4. [Guia de Instalacao Passo a Passo](#guia-de-instalacao-passo-a-passo)
5. [Primeiros Passos Apos Instalacao](#primeiros-passos-apos-instalacao)
6. [Guia de Uso do Sistema](#guia-de-uso-do-sistema)
7. [Modulos e Funcionalidades](#modulos-e-funcionalidades)
8. [Configuracoes Avancadas](#configuracoes-avancadas)
9. [Perguntas Frequentes (FAQ)](#perguntas-frequentes-faq)
10. [Solucao de Problemas](#solucao-de-problemas)
11. [Suporte](#suporte)

---

## Funcionalidades

### Funcionalidades Principais (Incluidas)

| Funcionalidade | Descricao |
|----------------|-----------|
| **Gestao de Imoveis** | Cadastre imoveis para venda ou aluguel com fotos, videos e todas as caracteristicas |
| **CRM de Leads** | Acompanhe potenciais clientes em um quadro Kanban visual |
| **Agendamento de Visitas** | Organize visitas com calendario integrado e notificacoes |
| **Gestao de Contratos** | Crie e gerencie contratos de aluguel e venda |
| **Cadastro de Pessoas** | Registre proprietarios, inquilinos, compradores e corretores |
| **Dashboard** | Visualize metricas importantes do seu negocio em tempo real |
| **Multi-usuarios** | Varios usuarios podem acessar com diferentes niveis de permissao |

### Funcionalidades Opcionais (Pague apenas se usar)

| Funcionalidade | Descricao | Custo Mensal* |
|----------------|-----------|---------------|
| **WhatsApp Business** | Envie mensagens automaticas e atenda clientes pelo WhatsApp | R$ 49,90 |
| **Google Maps** | Mostre localizacao dos imoveis no mapa e busca por regiao | R$ 29,90 |
| **Portais de Imoveis** | Publique automaticamente no ZAP, VivaReal e OLX | R$ 79,90 |
| **Assinatura Digital** | Assine contratos digitalmente com validade juridica | R$ 39,90 |
| **IA - Lead Scoring** | Inteligencia artificial identifica os melhores leads | R$ 59,90 |
| **IA - Precificacao** | Sugestao automatica de preco baseada no mercado | R$ 49,90 |
| **Busca Inteligente** | Encontre imoveis usando linguagem natural | R$ 29,90 |
| **PIX e Boleto** | Gere cobrancas automaticas de aluguel | R$ 39,90 |
| **Tour Virtual 360** | Adicione tours virtuais aos seus imoveis | R$ 29,90 |

*Valores ilustrativos, configuraveis pelo administrador do sistema

---

## Como o Sistema Funciona

### Arquitetura Simplificada

```
+------------------+     +------------------+     +------------------+
|                  |     |                  |     |                  |
|   Seu Navegador  |<--->|   Servidor Web   |<--->|  Banco de Dados  |
|   (Chrome, etc)  |     |   (Imob360)      |     |  (PostgreSQL)    |
|                  |     |                  |     |                  |
+------------------+     +------------------+     +------------------+
                               |
                               v
                    +--------------------+
                    |    Integracoes     |
                    | WhatsApp, Portais, |
                    | Pagamentos, etc    |
                    +--------------------+
```

### Explicacao para Leigos

1. **Voce acessa pelo navegador**: Abra o Chrome, Firefox ou qualquer navegador e digite o endereco do sistema
2. **O servidor processa**: O servidor recebe sua solicitacao, processa e retorna as informacoes
3. **Dados ficam seguros**: Todas as informacoes sao guardadas em um banco de dados seguro
4. **Integracoes automaticas**: O sistema pode se conectar com WhatsApp, portais de imoveis e outros servicos

### Sistema Multi-tenant (Multi-imobiliaria)

O Imob360 permite que **varias imobiliarias** usem o mesmo sistema, mas cada uma ve **apenas seus proprios dados**. E como se cada imobiliaria tivesse seu proprio sistema separado, mas compartilhando a mesma infraestrutura.

---

## Requisitos para Instalacao

### O que voce precisa ter instalado no computador/servidor:

| Requisito | Versao Minima | Como verificar | Link para download |
|-----------|---------------|----------------|-------------------|
| **Node.js** | 20.0.0 | `node --version` | [nodejs.org](https://nodejs.org/) |
| **pnpm** | 9.0.0 | `pnpm --version` | [pnpm.io](https://pnpm.io/installation) |
| **Docker** | 24.0.0 | `docker --version` | [docker.com](https://www.docker.com/get-started/) |
| **Docker Compose** | 2.20.0 | `docker compose version` | Incluso no Docker Desktop |
| **Git** | 2.40.0 | `git --version` | [git-scm.com](https://git-scm.com/) |

### Requisitos de Hardware (minimo recomendado)

| Recurso | Desenvolvimento | Producao |
|---------|-----------------|----------|
| **CPU** | 2 nucleos | 4 nucleos |
| **RAM** | 4 GB | 8 GB |
| **Disco** | 20 GB | 100 GB |
| **Internet** | Banda larga | Link dedicado |

---

## Guia de Instalacao Passo a Passo

### Passo 1: Instalar os Pre-requisitos

#### No Windows:

1. **Instale o Node.js**:
   - Acesse [nodejs.org](https://nodejs.org/)
   - Baixe a versao LTS (Long Term Support)
   - Execute o instalador e siga as instrucoes

2. **Instale o pnpm**:
   - Abra o Prompt de Comando (CMD) ou PowerShell
   - Digite: `npm install -g pnpm`

3. **Instale o Docker Desktop**:
   - Acesse [docker.com/get-started](https://www.docker.com/get-started/)
   - Baixe o Docker Desktop para Windows
   - Execute o instalador
   - Reinicie o computador quando solicitado

4. **Instale o Git**:
   - Acesse [git-scm.com](https://git-scm.com/)
   - Baixe e instale

#### No Linux (Ubuntu/Debian):

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar pnpm
npm install -g pnpm

# Instalar Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Instalar Git
sudo apt install -y git

# Reinicie o terminal ou faca logout/login
```

#### No macOS:

```bash
# Instalar Homebrew (se nao tiver)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Instalar Node.js
brew install node@20

# Instalar pnpm
npm install -g pnpm

# Instalar Docker Desktop
brew install --cask docker

# Instalar Git
brew install git
```

### Passo 2: Baixar o Imob360

Abra o terminal (Prompt de Comando no Windows) e execute:

```bash
# Navegue ate a pasta onde deseja instalar
cd ~/projetos  # ou qualquer pasta de sua preferencia

# Clone o repositorio
git clone https://github.com/inematds/imob360.git

# Entre na pasta do projeto
cd imob360
```

### Passo 3: Configurar Variaveis de Ambiente

1. **Copie o arquivo de exemplo**:

```bash
cp .env.example .env
```

2. **Edite o arquivo .env** com suas configuracoes:

No Windows, abra o arquivo com o Bloco de Notas:
```bash
notepad .env
```

No Linux/macOS:
```bash
nano .env
```

3. **Configure os valores principais**:

```env
# === CONFIGURACOES OBRIGATORIAS ===

# Banco de Dados (pode manter o padrao para desenvolvimento)
POSTGRES_USER=imob360
POSTGRES_PASSWORD=SuaSenhaSegura123!
POSTGRES_DB=imob360
DATABASE_URL=postgresql://imob360:SuaSenhaSegura123!@localhost:5432/imob360

# Redis (mantenha o padrao)
REDIS_URL=redis://localhost:6379

# Seguranca (IMPORTANTE: troque estes valores!)
JWT_SECRET=sua-chave-secreta-com-pelo-menos-32-caracteres-aqui
NEXTAUTH_SECRET=outra-chave-secreta-diferente-aqui

# URLs (ajuste para seu dominio em producao)
FRONTEND_URL=http://localhost:3000
API_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3001

# === CONFIGURACOES OPCIONAIS (ative conforme necessidade) ===

# WhatsApp (Evolution API)
# EVOLUTION_API_URL=http://localhost:8080
# EVOLUTION_API_KEY=sua-chave-api

# Google Maps
# GOOGLE_MAPS_API_KEY=sua-chave-google

# E-mail (SendGrid)
# SMTP_HOST=smtp.sendgrid.net
# SMTP_USER=apikey
# SMTP_PASS=sua-chave-sendgrid
```

### Passo 4: Iniciar os Servicos de Banco de Dados

```bash
# Inicia PostgreSQL e Redis em containers Docker
docker compose -f docker-compose.dev.yml up -d
```

**Verificar se iniciou corretamente**:
```bash
docker compose -f docker-compose.dev.yml ps
```

Voce deve ver algo como:
```
NAME                      STATUS
imob360-postgres-dev      Up (healthy)
imob360-redis-dev         Up (healthy)
```

### Passo 5: Instalar Dependencias do Projeto

```bash
pnpm install
```

Isso pode demorar alguns minutos na primeira vez.

### Passo 6: Configurar o Banco de Dados

```bash
# Gerar o cliente do Prisma (ferramenta de banco de dados)
pnpm db:generate

# Criar as tabelas no banco de dados
pnpm db:migrate

# Popular com dados iniciais (usuario admin, configuracoes)
pnpm db:seed
```

### Passo 7: Iniciar o Sistema

```bash
pnpm dev
```

### Passo 8: Acessar o Sistema

Abra seu navegador e acesse:

| Servico | URL | Descricao |
|---------|-----|-----------|
| **Sistema Principal** | http://localhost:3000 | Interface do Imob360 |
| **API** | http://localhost:3001 | Backend (para desenvolvedores) |

**Credenciais padrao de acesso**:
- **Email**: admin@imob360.com.br
- **Senha**: admin123

> **IMPORTANTE**: Troque a senha padrao imediatamente apos o primeiro acesso!

---

## Primeiros Passos Apos Instalacao

### 1. Trocar a Senha do Administrador

1. Faca login com as credenciais padrao
2. Clique no seu nome no canto superior direito
3. Selecione "Configuracoes"
4. Va em "Seguranca" e altere a senha

### 2. Configurar sua Imobiliaria

1. Acesse "Configuracoes" > "Empresa"
2. Preencha os dados:
   - Nome da imobiliaria
   - CNPJ
   - Endereco
   - Telefone
   - Logo (opcional)

### 3. Cadastrar Usuarios

1. Acesse "Configuracoes" > "Equipe"
2. Clique em "Novo Usuario"
3. Preencha nome, e-mail e selecione o perfil:
   - **Administrador**: Acesso total
   - **Gerente**: Gerencia equipe e relatorios
   - **Corretor**: Cadastra imoveis e atende clientes
   - **Assistente**: Acesso limitado

### 4. Ativar Funcionalidades Extras

1. Acesse "Configuracoes" > "Funcionalidades"
2. Veja a lista de modulos disponiveis
3. Ative os que deseja usar clicando no botao "Ativar"
4. Configure cada modulo conforme instrucoes na tela

---

## Guia de Uso do Sistema

### Dashboard - Visao Geral

O Dashboard e a primeira tela que voce ve ao entrar no sistema. Ele mostra:

```
+------------------------------------------------------------------+
|  DASHBOARD                                          [Seu Nome v] |
+------------------------------------------------------------------+
|                                                                   |
|  +---------------+  +---------------+  +---------------+          |
|  | Total Imoveis |  | Leads Ativos  |  | Visitas Mes   |          |
|  |     127       |  |      34       |  |      45       |          |
|  +---------------+  +---------------+  +---------------+          |
|                                                                   |
|  +---------------------------+  +---------------------------+     |
|  |  LEADS POR ESTAGIO        |  |  IMOVEIS POR TIPO         |     |
|  |  [Grafico de Barras]      |  |  [Grafico de Pizza]       |     |
|  +---------------------------+  +---------------------------+     |
|                                                                   |
|  +----------------------------------------------------------+    |
|  |  ULTIMAS ATIVIDADES                                       |    |
|  |  - Joao cadastrou novo imovel - ha 5 min                 |    |
|  |  - Maria agendou visita - ha 15 min                      |    |
|  |  - Novo lead recebido - ha 30 min                        |    |
|  +----------------------------------------------------------+    |
+------------------------------------------------------------------+
```

### Gestao de Imoveis

#### Cadastrar Novo Imovel

1. Clique em "Imoveis" no menu lateral
2. Clique no botao "+ Novo Imovel"
3. Preencha as informacoes:

**Aba Dados Basicos**:
- Tipo (Apartamento, Casa, Terreno, Comercial, etc.)
- Finalidade (Venda, Aluguel, Venda e Aluguel)
- Titulo do anuncio
- Descricao detalhada
- Preco de venda e/ou valor do aluguel

**Aba Caracteristicas**:
- Area total e area util
- Numero de quartos, suites, banheiros
- Vagas de garagem
- Caracteristicas (piscina, churrasqueira, etc.)

**Aba Endereco**:
- CEP (preenche automaticamente)
- Logradouro, numero, complemento
- Bairro, cidade, estado

**Aba Fotos e Videos**:
- Arraste ou clique para adicionar fotos
- Cole link do YouTube para videos
- Adicione tour virtual 360 (se ativado)

**Aba Documentacao**:
- Situacao do imovel
- Documentos anexos
- Observacoes internas

4. Clique em "Salvar"

#### Buscar Imoveis

Use a barra de busca para encontrar imoveis:

- Por codigo: "IMV-001"
- Por endereco: "Rua das Flores"
- Por caracteristicas: "3 quartos Jardins"
- Por preco: "ate 500mil"

### CRM de Leads (Quadro Kanban)

O CRM organiza seus potenciais clientes em um quadro visual:

```
+------------------------------------------------------------------+
|  LEADS                                        [+ Novo Lead]      |
+------------------------------------------------------------------+
|  NOVO      |  CONTATO   |  QUALIFICADO |  PROPOSTA  |  FECHADO  |
|------------|------------|--------------|------------|-----------|
| [Lead 1]   | [Lead 4]   | [Lead 7]     | [Lead 9]   | [Lead 11] |
| [Lead 2]   | [Lead 5]   | [Lead 8]     | [Lead 10]  |           |
| [Lead 3]   | [Lead 6]   |              |            |           |
+------------------------------------------------------------------+
```

**Como usar**:
1. Novos leads entram na coluna "NOVO"
2. Arraste o card para mover entre estagios
3. Clique no card para ver detalhes e historico
4. Adicione anotacoes e agende follow-ups

### Agendamento de Visitas

#### Agendar Nova Visita

1. Acesse "Visitas" no menu
2. Clique em "+ Nova Visita"
3. Selecione:
   - Imovel a ser visitado
   - Cliente/Lead
   - Data e horario
   - Corretor responsavel
4. Adicione observacoes se necessario
5. Clique em "Agendar"

O sistema enviara:
- Lembrete por e-mail para o corretor
- Notificacao WhatsApp para o cliente (se ativado)

### Gestao de Contratos

#### Criar Novo Contrato

1. Acesse "Contratos" no menu
2. Clique em "+ Novo Contrato"
3. Selecione o tipo:
   - Contrato de Aluguel
   - Contrato de Venda
   - Contrato de Administracao
4. Selecione o imovel e as partes envolvidas
5. Defina valores e condicoes
6. O sistema gera o contrato automaticamente
7. Envie para assinatura digital (se ativado)

---

## Modulos e Funcionalidades

### Modulo WhatsApp Business

**O que faz**: Integra o sistema com WhatsApp para comunicacao com clientes.

**Funcionalidades**:
- Enviar mensagens automaticas de confirmacao de visita
- Responder perguntas frequentes automaticamente
- Enviar fichas de imoveis pelo WhatsApp
- Receber mensagens de interessados
- Chatbot para atendimento inicial

**Como ativar**:
1. Acesse "Configuracoes" > "Funcionalidades"
2. Ative "WhatsApp Business"
3. Va em "Configuracoes" > "WhatsApp"
4. Escaneie o QR Code com seu celular
5. Pronto! O sistema esta conectado

**Exemplo de uso**:
```
Cliente envia: "Ola, quero saber mais sobre o apartamento de 3 quartos"

Bot responde: "Ola! Temos 5 apartamentos de 3 quartos disponiveis.
Posso enviar a ficha dos imoveis? Digite:
1 - Sim, envie todos
2 - Quero filtrar por bairro
3 - Falar com um corretor"
```

### Modulo Portais de Imoveis

**O que faz**: Publica seus imoveis automaticamente nos principais portais.

**Portais suportados**:
- ZAP Imoveis
- VivaReal
- OLX

**Como ativar**:
1. Acesse "Configuracoes" > "Funcionalidades"
2. Ative "Integracao com Portais"
3. Va em "Configuracoes" > "Portais"
4. Cadastre suas credenciais de cada portal
5. Selecione quais imoveis publicar

**Sincronizacao automatica**:
- Novos imoveis sao publicados automaticamente
- Alteracoes sao sincronizadas em tempo real
- Imoveis vendidos/alugados sao removidos

### Modulo Assinatura Digital

**O que faz**: Permite assinar contratos digitalmente com validade juridica.

**Vantagens**:
- Agilidade: contrato assinado em minutos
- Economia: sem custos de impressao e cartorio
- Seguranca: validade juridica garantida (ICP-Brasil)
- Praticidade: assine de qualquer lugar

**Como usar**:
1. Crie o contrato normalmente
2. Clique em "Enviar para Assinatura"
3. O sistema envia link por e-mail para todas as partes
4. Cada parte assina pelo celular ou computador
5. Contrato assinado fica salvo automaticamente

### Modulo IA - Lead Scoring

**O que faz**: Usa inteligencia artificial para identificar os leads com maior chance de fechar negocio.

**Como funciona**:
- Analisa comportamento do lead (imoveis visualizados, tempo no site)
- Avalia perfil financeiro
- Compara com historico de vendas anteriores
- Atribui uma pontuacao de 0 a 100

**Interpretacao**:
- 80-100: Lead quente (prioridade maxima)
- 60-79: Lead morno (acompanhar de perto)
- 40-59: Lead frio (nutrir com conteudo)
- 0-39: Lead nao qualificado

### Modulo PIX e Boleto

**O que faz**: Gera cobrancas automaticas de aluguel.

**Funcionalidades**:
- Gera boleto ou QR Code PIX automaticamente
- Envia cobranca por e-mail e WhatsApp
- Registra pagamentos automaticamente
- Envia lembretes antes do vencimento
- Gera segunda via

**Configuracao**:
1. Acesse "Configuracoes" > "Funcionalidades"
2. Ative "PIX e Boleto"
3. Cadastre sua conta bancaria
4. Defina dia de vencimento padrao
5. Configure lembretes automaticos

---

## Configuracoes Avancadas

### Instalacao para Producao

Para colocar o sistema em producao (ambiente real):

```bash
# Build das imagens
docker compose build

# Iniciar todos os servicos
docker compose up -d

# Com WhatsApp
docker compose --profile whatsapp up -d

# Producao completa (com Nginx)
docker compose --profile production up -d
```

### Configuracao de Dominios

1. Edite o arquivo `.env`:
```env
FRONTEND_URL=https://app.suaimobiliaria.com.br
API_URL=https://api.suaimobiliaria.com.br
```

2. Configure seu DNS apontando para o servidor

3. Configure SSL (HTTPS):
```bash
# Com Let's Encrypt (gratuito)
sudo certbot --nginx -d app.suaimobiliaria.com.br -d api.suaimobiliaria.com.br
```

### Backup do Banco de Dados

**Backup manual**:
```bash
docker exec imob360-postgres pg_dump -U imob360 imob360 > backup_$(date +%Y%m%d).sql
```

**Restaurar backup**:
```bash
docker exec -i imob360-postgres psql -U imob360 imob360 < backup_20240115.sql
```

**Backup automatico** (adicione ao crontab):
```bash
0 2 * * * docker exec imob360-postgres pg_dump -U imob360 imob360 > /backups/imob360_$(date +\%Y\%m\%d).sql
```

---

## Perguntas Frequentes (FAQ)

### Sobre o Sistema

**P: Preciso ter conhecimento tecnico para usar o Imob360?**
R: Nao! O sistema foi projetado para ser intuitivo. Qualquer pessoa que sabe usar e-mail e redes sociais consegue usar.

**P: Meus dados ficam seguros?**
R: Sim. Usamos criptografia, backups automaticos e cada imobiliaria tem seus dados completamente isolados.

**P: Posso acessar de qualquer lugar?**
R: Sim, basta ter internet. Funciona no computador, tablet e celular.

**P: Quantos usuarios posso ter?**
R: Ilimitados! Cadastre toda sua equipe sem custo adicional.

### Sobre Instalacao

**P: Posso instalar no meu proprio servidor?**
R: Sim, o Imob360 pode ser instalado em servidor proprio ou em nuvem (AWS, Google Cloud, etc).

**P: Quanto custa para manter o servidor?**
R: Depende do tamanho da sua operacao. Para uma imobiliaria pequena, um servidor de R$50-100/mes e suficiente.

**P: Preciso de um tecnico para instalar?**
R: Recomendamos ter alguem com conhecimento basico de informatica. O guia acima e detalhado, mas alguns passos podem requerer ajuda tecnica.

### Sobre Funcionalidades

**P: Posso testar as funcionalidades extras antes de ativar?**
R: Sim! Todas as funcionalidades tem periodo de teste gratuito de 7 dias.

**P: E se eu ativar uma funcionalidade e nao gostar?**
R: Voce pode desativar a qualquer momento, sem burocracia.

**P: As integracoes funcionam com qualquer portal?**
R: Atualmente suportamos ZAP, VivaReal e OLX. Outros portais podem ser adicionados sob demanda.

---

## Solucao de Problemas

### Problema: Sistema nao inicia

**Sintoma**: Erro ao executar `pnpm dev`

**Solucoes**:
1. Verifique se o Docker esta rodando:
```bash
docker ps
```

2. Verifique se os containers estao saudaveis:
```bash
docker compose -f docker-compose.dev.yml ps
```

3. Reinicie os containers:
```bash
docker compose -f docker-compose.dev.yml down
docker compose -f docker-compose.dev.yml up -d
```

### Problema: Erro de conexao com banco de dados

**Sintoma**: "Connection refused" ou "ECONNREFUSED"

**Solucoes**:
1. Verifique se o PostgreSQL esta rodando:
```bash
docker logs imob360-postgres-dev
```

2. Verifique a variavel DATABASE_URL no arquivo .env

3. Teste a conexao:
```bash
docker exec -it imob360-postgres-dev psql -U imob360 -d imob360
```

### Problema: Pagina em branco no navegador

**Sintoma**: Acessa localhost:3000 mas nao aparece nada

**Solucoes**:
1. Verifique o console do navegador (F12)
2. Verifique os logs do frontend:
```bash
# Se rodando com pnpm dev
# Verifique a saida no terminal

# Se rodando com Docker
docker logs imob360-web
```

### Problema: WhatsApp nao conecta

**Sintoma**: QR Code nao aparece ou conexao falha

**Solucoes**:
1. Verifique se o modulo esta ativo
2. Verifique os logs da Evolution API:
```bash
docker logs imob360-evolution
```
3. Reinicie o servico:
```bash
docker compose restart evolution
```

### Logs Uteis para Diagnostico

```bash
# Ver logs do backend
docker logs imob360-api -f --tail 100

# Ver logs do frontend
docker logs imob360-web -f --tail 100

# Ver logs do banco de dados
docker logs imob360-postgres -f --tail 100

# Ver todos os logs
docker compose logs -f
```

---

## Estrutura do Projeto (Para Desenvolvedores)

```
imob360/
├── apps/
│   ├── api/                    # Backend (Express + TypeScript)
│   │   ├── src/
│   │   │   ├── common/         # Middlewares, utils
│   │   │   ├── config/         # Configuracoes (DB, Redis, Logger)
│   │   │   └── modules/        # Modulos da API
│   │   │       ├── auth/       # Autenticacao
│   │   │       ├── properties/ # Imoveis
│   │   │       ├── people/     # Pessoas
│   │   │       ├── leads/      # Leads/CRM
│   │   │       ├── visits/     # Visitas
│   │   │       ├── contracts/  # Contratos
│   │   │       ├── dashboard/  # Metricas
│   │   │       ├── features/   # Feature flags
│   │   │       ├── whatsapp/   # Integracao WhatsApp
│   │   │       ├── portals/    # Integracao portais
│   │   │       ├── payments/   # Pagamentos
│   │   │       └── settings/   # Configuracoes
│   │   └── Dockerfile
│   │
│   └── web/                    # Frontend (Next.js 14)
│       ├── src/
│       │   ├── app/            # App Router (paginas)
│       │   ├── components/     # Componentes React
│       │   ├── lib/            # Utilitarios
│       │   └── store/          # Estado global (Zustand)
│       └── Dockerfile
│
├── packages/
│   ├── database/               # Prisma (schema e migrations)
│   │   └── prisma/
│   │       └── schema.prisma   # Modelo de dados
│   └── shared/                 # Codigo compartilhado
│
├── nginx/                      # Configuracao Nginx
├── docker-compose.yml          # Producao
├── docker-compose.dev.yml      # Desenvolvimento
└── .env.example                # Variaveis de ambiente
```

---

## Tecnologias Utilizadas

| Camada | Tecnologia | Versao |
|--------|------------|--------|
| **Frontend** | Next.js | 14.x |
| **Frontend** | React | 18.x |
| **Frontend** | TailwindCSS | 3.x |
| **Frontend** | Radix UI | Latest |
| **Backend** | Node.js | 20.x |
| **Backend** | Express | 4.x |
| **Backend** | TypeScript | 5.x |
| **Database** | PostgreSQL | 16.x |
| **ORM** | Prisma | 5.x |
| **Cache** | Redis | 7.x |
| **Containers** | Docker | 24.x |
| **Proxy** | Nginx | Latest |

---

## Suporte

### Precisa de Ajuda?

- **Documentacao**: Voce esta aqui!
- **Issues**: [github.com/inematds/imob360/issues](https://github.com/inematds/imob360/issues)
- **E-mail**: suporte@imob360.com.br

### Contribuicoes

Contribuicoes sao bem-vindas! Por favor, leia nosso guia de contribuicao antes de enviar um Pull Request.

---

## Licenca

Software proprietario. Todos os direitos reservados.

---

<p align="center">
  Feito com dedicacao para imobiliarias brasileiras
</p>
