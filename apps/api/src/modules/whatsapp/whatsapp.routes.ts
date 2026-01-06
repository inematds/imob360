import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { authenticate, requireRole } from '../../common/middleware/auth.js';
import { requireFeature, incrementUsage } from '../../common/middleware/feature-check.js';
import { AppError } from '../../common/middleware/error-handler.js';

export const whatsappRouter = Router();

// Evolution API configuration
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';

async function evolutionRequest(endpoint: string, method: string = 'GET', body?: any) {
  const response = await fetch(`${EVOLUTION_API_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': EVOLUTION_API_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new AppError(response.status, 'EVOLUTION_API_ERROR', error);
  }

  return response.json();
}

// Get WhatsApp instance status
whatsappRouter.get('/status', authenticate, requireFeature('WHATSAPP'), async (req, res, next) => {
  try {
    const instance = await prisma.whatsappInstance.findFirst({
      where: { realEstateId: req.realEstateId },
    });

    if (!instance) {
      return res.json({
        success: true,
        data: {
          connected: false,
          instanceExists: false,
        },
      });
    }

    // Check Evolution API status
    try {
      const status = await evolutionRequest(`/instance/connectionState/${instance.instanceName}`);
      res.json({
        success: true,
        data: {
          connected: status.state === 'open',
          instanceExists: true,
          instanceName: instance.instanceName,
          phone: instance.phone,
          status: status.state,
        },
      });
    } catch {
      res.json({
        success: true,
        data: {
          connected: false,
          instanceExists: true,
          instanceName: instance.instanceName,
          error: 'Nao foi possivel verificar status',
        },
      });
    }
  } catch (error) {
    next(error);
  }
});

// Create WhatsApp instance
whatsappRouter.post('/instance', authenticate, requireFeature('WHATSAPP'), requireRole(['ADMIN', 'OWNER']), async (req, res, next) => {
  try {
    const existingInstance = await prisma.whatsappInstance.findFirst({
      where: { realEstateId: req.realEstateId },
    });

    if (existingInstance) {
      throw new AppError(409, 'INSTANCE_EXISTS', 'Ja existe uma instancia WhatsApp configurada');
    }

    const instanceName = `imob360_${req.realEstateId}`;

    // Create instance in Evolution API
    const instance = await evolutionRequest('/instance/create', 'POST', {
      instanceName,
      token: EVOLUTION_API_KEY,
      qrcode: true,
    });

    // Save instance in database
    const dbInstance = await prisma.whatsappInstance.create({
      data: {
        realEstateId: req.realEstateId!,
        instanceName,
        apiKey: instance.hash || '',
        status: 'DISCONNECTED',
      },
    });

    res.status(201).json({
      success: true,
      data: {
        instance: dbInstance,
        qrcode: instance.qrcode,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get QR Code for connection
whatsappRouter.get('/qrcode', authenticate, requireFeature('WHATSAPP'), async (req, res, next) => {
  try {
    const instance = await prisma.whatsappInstance.findFirst({
      where: { realEstateId: req.realEstateId },
    });

    if (!instance) {
      throw new AppError(404, 'NOT_FOUND', 'Instancia WhatsApp nao encontrada');
    }

    const qrcode = await evolutionRequest(`/instance/connect/${instance.instanceName}`);

    res.json({
      success: true,
      data: {
        qrcode: qrcode.base64,
        pairingCode: qrcode.pairingCode,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Disconnect WhatsApp
whatsappRouter.post('/disconnect', authenticate, requireFeature('WHATSAPP'), requireRole(['ADMIN', 'OWNER']), async (req, res, next) => {
  try {
    const instance = await prisma.whatsappInstance.findFirst({
      where: { realEstateId: req.realEstateId },
    });

    if (!instance) {
      throw new AppError(404, 'NOT_FOUND', 'Instancia WhatsApp nao encontrada');
    }

    await evolutionRequest(`/instance/logout/${instance.instanceName}`, 'DELETE');

    await prisma.whatsappInstance.update({
      where: { id: instance.id },
      data: {
        status: 'DISCONNECTED',
        phone: null,
      },
    });

    res.json({ success: true, message: 'WhatsApp desconectado' });
  } catch (error) {
    next(error);
  }
});

// Send text message
const sendMessageSchema = z.object({
  phone: z.string().min(10),
  message: z.string().min(1),
});

whatsappRouter.post('/send', authenticate, requireFeature('WHATSAPP'), async (req, res, next) => {
  try {
    const { phone, message } = sendMessageSchema.parse(req.body);

    const instance = await prisma.whatsappInstance.findFirst({
      where: { realEstateId: req.realEstateId, status: 'CONNECTED' },
    });

    if (!instance) {
      throw new AppError(400, 'NOT_CONNECTED', 'WhatsApp nao esta conectado');
    }

    // Format phone number
    const formattedPhone = phone.replace(/\D/g, '');
    const fullPhone = formattedPhone.startsWith('55') ? formattedPhone : `55${formattedPhone}`;

    // Send message via Evolution API
    const result = await evolutionRequest(`/message/sendText/${instance.instanceName}`, 'POST', {
      number: fullPhone,
      options: { delay: 1200 },
      textMessage: { text: message },
    });

    // Log message
    await prisma.whatsappMessage.create({
      data: {
        instanceId: instance.id,
        direction: 'OUTBOUND',
        phone: fullPhone,
        message,
        status: 'SENT',
        messageId: result.key?.id,
        sentBy: req.user!.id,
      },
    });

    // Increment usage
    await incrementUsage(req.realEstateId!, 'WHATSAPP');

    res.json({
      success: true,
      data: {
        messageId: result.key?.id,
        status: 'SENT',
      },
    });
  } catch (error) {
    next(error);
  }
});

// Send message with media
whatsappRouter.post('/send-media', authenticate, requireFeature('WHATSAPP'), async (req, res, next) => {
  try {
    const { phone, mediaUrl, mediaType, caption } = req.body;

    const instance = await prisma.whatsappInstance.findFirst({
      where: { realEstateId: req.realEstateId, status: 'CONNECTED' },
    });

    if (!instance) {
      throw new AppError(400, 'NOT_CONNECTED', 'WhatsApp nao esta conectado');
    }

    const formattedPhone = phone.replace(/\D/g, '');
    const fullPhone = formattedPhone.startsWith('55') ? formattedPhone : `55${formattedPhone}`;

    const result = await evolutionRequest(`/message/sendMedia/${instance.instanceName}`, 'POST', {
      number: fullPhone,
      options: { delay: 1200 },
      mediaMessage: {
        mediatype: mediaType, // image, video, audio, document
        media: mediaUrl,
        caption,
      },
    });

    await prisma.whatsappMessage.create({
      data: {
        instanceId: instance.id,
        direction: 'OUTBOUND',
        phone: fullPhone,
        message: caption || `[${mediaType}]`,
        mediaUrl,
        mediaType,
        status: 'SENT',
        messageId: result.key?.id,
        sentBy: req.user!.id,
      },
    });

    await incrementUsage(req.realEstateId!, 'WHATSAPP');

    res.json({
      success: true,
      data: {
        messageId: result.key?.id,
        status: 'SENT',
      },
    });
  } catch (error) {
    next(error);
  }
});

// Send property details
whatsappRouter.post('/send-property', authenticate, requireFeature('WHATSAPP'), async (req, res, next) => {
  try {
    const { phone, propertyId, includeImages = true } = req.body;

    const instance = await prisma.whatsappInstance.findFirst({
      where: { realEstateId: req.realEstateId, status: 'CONNECTED' },
    });

    if (!instance) {
      throw new AppError(400, 'NOT_CONNECTED', 'WhatsApp nao esta conectado');
    }

    const property = await prisma.property.findFirst({
      where: { id: propertyId, realEstateId: req.realEstateId },
    });

    if (!property) {
      throw new AppError(404, 'NOT_FOUND', 'Imovel nao encontrado');
    }

    const formattedPhone = phone.replace(/\D/g, '');
    const fullPhone = formattedPhone.startsWith('55') ? formattedPhone : `55${formattedPhone}`;

    // Build message
    const typeLabels: Record<string, string> = {
      APARTMENT: 'Apartamento',
      HOUSE: 'Casa',
      COMMERCIAL: 'Comercial',
      LAND: 'Terreno',
      RURAL: 'Rural',
      CONDO_HOUSE: 'Casa em Condominio',
    };

    let message = `*${property.title}*\n\n`;
    message += `📍 ${property.address}, ${property.neighborhood}\n`;
    message += `${property.city}/${property.state}\n\n`;
    message += `🏠 Tipo: ${typeLabels[property.type] || property.type}\n`;

    if (property.area) message += `📐 Area: ${property.area}m²\n`;
    if (property.bedrooms) message += `🛏️ Quartos: ${property.bedrooms}\n`;
    if (property.bathrooms) message += `🚿 Banheiros: ${property.bathrooms}\n`;
    if (property.parkingSpaces) message += `🚗 Vagas: ${property.parkingSpaces}\n`;

    message += '\n';

    if (property.purpose === 'SALE' || property.purpose === 'BOTH') {
      message += `💰 Venda: R$ ${property.salePrice?.toLocaleString('pt-BR')}\n`;
    }
    if (property.purpose === 'RENT' || property.purpose === 'BOTH') {
      message += `💵 Aluguel: R$ ${property.rentPrice?.toLocaleString('pt-BR')}/mês\n`;
    }

    message += `\n📞 Entre em contato para mais informacoes!`;
    message += `\nCodigo: ${property.code}`;

    // Send text first
    await evolutionRequest(`/message/sendText/${instance.instanceName}`, 'POST', {
      number: fullPhone,
      options: { delay: 1200 },
      textMessage: { text: message },
    });

    // Send images if requested
    const images = property.images as string[];
    if (includeImages && images?.length > 0) {
      const imagesToSend = images.slice(0, 4); // Max 4 images
      for (const imageUrl of imagesToSend) {
        await evolutionRequest(`/message/sendMedia/${instance.instanceName}`, 'POST', {
          number: fullPhone,
          options: { delay: 1500 },
          mediaMessage: {
            mediatype: 'image',
            media: imageUrl,
          },
        });
      }
    }

    await prisma.whatsappMessage.create({
      data: {
        instanceId: instance.id,
        direction: 'OUTBOUND',
        phone: fullPhone,
        message: `[Ficha do Imovel] ${property.title}`,
        status: 'SENT',
        sentBy: req.user!.id,
        metadata: { propertyId, imagesCount: includeImages ? (images?.length || 0) : 0 },
      },
    });

    await incrementUsage(req.realEstateId!, 'WHATSAPP');

    res.json({
      success: true,
      data: { status: 'SENT', propertyCode: property.code },
    });
  } catch (error) {
    next(error);
  }
});

// Get message history
whatsappRouter.get('/messages', authenticate, requireFeature('WHATSAPP'), async (req, res, next) => {
  try {
    const { phone, page = '1', limit = '50' } = req.query;

    const instance = await prisma.whatsappInstance.findFirst({
      where: { realEstateId: req.realEstateId },
    });

    if (!instance) {
      throw new AppError(404, 'NOT_FOUND', 'Instancia WhatsApp nao encontrada');
    }

    const where: any = { instanceId: instance.id };
    if (phone) {
      const formattedPhone = (phone as string).replace(/\D/g, '');
      where.phone = { contains: formattedPhone };
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [messages, total] = await Promise.all([
      prisma.whatsappMessage.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { createdAt: 'desc' },
        include: {
          sender: { select: { id: true, name: true } },
        },
      }),
      prisma.whatsappMessage.count({ where }),
    ]);

    res.json({
      success: true,
      data: messages,
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

// Get contacts
whatsappRouter.get('/contacts', authenticate, requireFeature('WHATSAPP'), async (req, res, next) => {
  try {
    const instance = await prisma.whatsappInstance.findFirst({
      where: { realEstateId: req.realEstateId, status: 'CONNECTED' },
    });

    if (!instance) {
      throw new AppError(400, 'NOT_CONNECTED', 'WhatsApp nao esta conectado');
    }

    const contacts = await evolutionRequest(`/chat/findContacts/${instance.instanceName}`, 'POST', {});

    res.json({ success: true, data: contacts });
  } catch (error) {
    next(error);
  }
});

// Webhook for incoming messages (called by Evolution API)
whatsappRouter.post('/webhook', async (req, res, next) => {
  try {
    const { event, instance: instanceName, data } = req.body;

    const instance = await prisma.whatsappInstance.findFirst({
      where: { instanceName },
    });

    if (!instance) {
      return res.status(200).json({ received: true });
    }

    switch (event) {
      case 'messages.upsert':
        // Incoming message
        if (data.key?.fromMe === false) {
          await prisma.whatsappMessage.create({
            data: {
              instanceId: instance.id,
              direction: 'INBOUND',
              phone: data.key?.remoteJid?.replace('@s.whatsapp.net', '') || '',
              message: data.message?.conversation || data.message?.extendedTextMessage?.text || '[Media]',
              messageId: data.key?.id,
              status: 'RECEIVED',
              metadata: data,
            },
          });

          // Check if it's a lead or create one
          const phone = data.key?.remoteJid?.replace('@s.whatsapp.net', '');
          if (phone) {
            const existingLead = await prisma.lead.findFirst({
              where: {
                realEstateId: instance.realEstateId,
                phone: { contains: phone.slice(-8) },
                stage: { notIn: ['WON', 'LOST'] },
              },
            });

            if (!existingLead) {
              await prisma.lead.create({
                data: {
                  realEstateId: instance.realEstateId,
                  phone,
                  name: data.pushName || 'WhatsApp Lead',
                  source: 'WHATSAPP',
                  stage: 'NEW',
                  sourceDetails: { whatsappMessage: data.message },
                },
              });
            }
          }
        }
        break;

      case 'connection.update':
        // Connection status update
        const status = data.state === 'open' ? 'CONNECTED' : 'DISCONNECTED';
        await prisma.whatsappInstance.update({
          where: { id: instance.id },
          data: {
            status,
            phone: data.connection?.wid?.user || instance.phone,
          },
        });
        break;

      case 'messages.update':
        // Message status update (delivered, read, etc.)
        if (data.key?.id) {
          await prisma.whatsappMessage.updateMany({
            where: { messageId: data.key.id },
            data: { status: data.status || 'DELIVERED' },
          });
        }
        break;
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    res.status(200).json({ received: true });
  }
});

// Message templates
whatsappRouter.get('/templates', authenticate, requireFeature('WHATSAPP'), async (req, res, next) => {
  try {
    const templates = await prisma.messageTemplate.findMany({
      where: { realEstateId: req.realEstateId, channel: 'WHATSAPP' },
      orderBy: { name: 'asc' },
    });

    res.json({ success: true, data: templates });
  } catch (error) {
    next(error);
  }
});

// Create template
whatsappRouter.post('/templates', authenticate, requireFeature('WHATSAPP'), async (req, res, next) => {
  try {
    const { name, content, variables } = req.body;

    const template = await prisma.messageTemplate.create({
      data: {
        realEstateId: req.realEstateId!,
        channel: 'WHATSAPP',
        name,
        content,
        variables: variables || [],
      },
    });

    res.status(201).json({ success: true, data: template });
  } catch (error) {
    next(error);
  }
});
