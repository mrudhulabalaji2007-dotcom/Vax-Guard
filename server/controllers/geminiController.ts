import { Request, Response } from 'express';
import { processGeminiChat } from '../services/geminiService.js';
import { Shipment } from '../models/Shipment.js';
import { Warehouse } from '../models/Warehouse.js';
import { Alert } from '../models/Alert.js';

export async function handleGeminiChat(req: Request, res: Response): Promise<void> {
  try {
    const { messages, systemRole, model, enableSearchGrounding, enableMapsGrounding, includeTelemetryContext } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ success: false, message: 'Messages array is required.' });
      return;
    }

    let contextData: any = null;
    if (includeTelemetryContext) {
      const [activeShipments, warehouses, activeAlerts] = await Promise.all([
        Shipment.find({ status: { $in: ['IN_TRANSIT', 'AT_RISK'] } }).select('trackingId vaccineName currentTemperature riskLevel status remainingTravelTime destination'),
        Warehouse.find().select('name code currentTemperature powerStatus refrigerationStatus estimatedSafeHoldingTime'),
        Alert.find({ status: 'ACTIVE' }).select('alertId type severity message timestamp'),
      ]);
      contextData = { activeShipments, warehouses, activeAlerts };
    }

    let systemInstruction = 'You are the VAXGUARD AI Cold-Chain Intelligence Assistant. You assist healthcare administrators, logistics officers, and warehouse managers in monitoring vaccine integrity, predicting thermal risks, assessing route hazards, and guiding emergency refrigeration protocols according to WHO standards.';

    if (systemRole === 'emergency_responder') {
      systemInstruction = 'You are the VAXGUARD Emergency Cold-Chain Incident Commander. Provide step-by-step crisis containment instructions for power outages, compressor failures, and critical temperature spikes above 8°C. Be concise, actionable, and prioritize preserving high-sensitivity vaccines (Rotavirus, OPV, Measles).';
    } else if (systemRole === 'logistics_optimizer') {
      systemInstruction = 'You are the VAXGUARD Vaccine Logistics & Route Strategist. Advise on route selection, real-time ambient heat hazards, intermediate cold-hub stops, and carrier transit scheduling to minimize thermal excursion risks.';
    } else if (systemRole === 'who_auditor') {
      systemInstruction = 'You are the WHO-GDP Vaccine Quality & Regulatory Compliance Auditor. Evaluate temperature excursion records, Mean Kinetic Temperature (MKT), and verify compliance with standard 2°C to 8°C storage protocols.';
    }

    const result = await processGeminiChat({
      messages,
      systemInstruction,
      model: model || 'gemini-3.5-flash',
      enableSearchGrounding: enableSearchGrounding !== false,
      enableMapsGrounding: Boolean(enableMapsGrounding),
      contextData,
    });

    res.json({
      success: true,
      reply: result.reply,
      groundingMetadata: result.groundingMetadata,
      modelUsed: result.modelUsed,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error processing AI chat.' });
  }
}

export async function getLiveSearchIntelligence(req: Request, res: Response): Promise<void> {
  try {
    const { query, topic = 'vaccine_weather_transit' } = req.body;

    const searchPrompt = query || 'Find recent severe weather alerts, heatwaves, or road transit advisories affecting South India and Tamil Nadu cold-chain transit corridors today.';

    const result = await processGeminiChat({
      messages: [{ role: 'user', content: searchPrompt }],
      systemInstruction: 'You are a real-time weather, disaster, and cold-chain supply chain risk analyst. Provide live summary insights based on Google Search results.',
      model: 'gemini-3.5-flash',
      enableSearchGrounding: true,
    });

    res.json({
      success: true,
      intelligence: result.reply,
      groundingMetadata: result.groundingMetadata,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}
