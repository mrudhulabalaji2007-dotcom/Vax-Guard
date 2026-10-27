import { WarehouseMaintenanceRecord, UpcomingServiceSchedule } from '../types/index.js';

const INITIAL_PAST_REPAIRS: Record<string, WarehouseMaintenanceRecord[]> = {
  'WH-CHN-01': [
    {
      id: 'maint-chn-01',
      warehouseId: 'WH-CHN-01',
      assetName: 'Bitzer Semi-Hermetic Reciprocating Compressor #1 (Room A)',
      serviceType: 'COMPRESSOR_REPAIR',
      serviceDate: new Date(Date.now() - 14 * 86400000).toISOString(),
      technicianName: 'K. Balakrishnan',
      technicianOrg: 'Carrier Transicold Authorized Industrial HVAC',
      costInr: 42500,
      partsReplaced: ['Discharge valve reed assembly', 'Synthetic polyolester oil (POE-32)', 'Crankcase heater element'],
      findings: 'Suction pressure variance detected during peak ambient midday cycle. Replaced worn valve reeds and purged moisture. Operating suction pressure normalized at 2.4 bar.',
      postServiceTemp: 4.1,
      status: 'COMPLETED',
      complianceCertificate: 'CERT-HVAC-CHN-2026-091',
      nextScheduledDate: new Date(Date.now() + 76 * 86400000).toISOString(),
    },
    {
      id: 'maint-chn-02',
      warehouseId: 'WH-CHN-01',
      assetName: 'Refrigerant R404A Dual Expansion Loop #2',
      serviceType: 'REFRIGERANT_LEAK',
      serviceDate: new Date(Date.now() - 38 * 86400000).toISOString(),
      technicianName: 'S. Ramanathan',
      technicianOrg: 'State Public Health Engineering Division',
      costInr: 18000,
      partsReplaced: ['Schrader core service valve', 'Danfoss TEV flare gasket'],
      findings: 'Micro-leak detected at suction service port with halogen sniffer. Evacuated to 250 microns, pressure-held with dry nitrogen at 25 bar for 12 hours. Re-charged 5.2 kg R404A.',
      postServiceTemp: 3.9,
      status: 'COMPLETED',
      complianceCertificate: 'CERT-LEAK-CHN-2026-044',
      nextScheduledDate: new Date(Date.now() + 52 * 86400000).toISOString(),
    },
    {
      id: 'maint-chn-03',
      warehouseId: 'WH-CHN-01',
      assetName: 'Cummins 125 kVA Standby Diesel Generator & ATS Panel',
      serviceType: 'BACKUP_DG_LOAD',
      serviceDate: new Date(Date.now() - 62 * 86400000).toISOString(),
      technicianName: 'M. Senthilkumar',
      technicianOrg: 'Kirloskar-Cummins PowerCare Services',
      costInr: 31000,
      partsReplaced: ['Fuel pre-filter cartridge', 'Heavy duty 12V 120Ah battery bank (x2)', 'Engine coolant (EG-50)'],
      findings: 'Full load bank test conducted for 60 minutes at 100 kW. Auto-transfer switch engagement verified within 7.2 seconds of simulated utility grid cutoff (WHO standard < 15s).',
      postServiceTemp: 4.2,
      status: 'COMPLETED',
      complianceCertificate: 'CERT-DG-CHN-2026-018',
      nextScheduledDate: new Date(Date.now() + 28 * 86400000).toISOString(),
    },
    {
      id: 'maint-chn-04',
      warehouseId: 'WH-CHN-01',
      assetName: 'NIST-Traceable 4-Channel Platinum RTD (PT100) Telemetry Probes',
      serviceType: 'SENSOR_CALIBRATION',
      serviceDate: new Date(Date.now() - 95 * 86400000).toISOString(),
      technicianName: 'Dr. Anandhi Natarajan',
      technicianOrg: 'National Accreditation Metrology Institute (NABL)',
      costInr: 15500,
      partsReplaced: ['Teflon-shielded probe lead #3'],
      findings: '3-point thermometric calibration completed against primary triple-point-of-water reference at 0.0°C, 4.0°C, and 8.0°C. Drift observed < 0.03°C across all probes.',
      postServiceTemp: 4.0,
      status: 'COMPLETED',
      complianceCertificate: 'NABL-WHO-PQS-CAL-2026-781',
      nextScheduledDate: new Date(Date.now() + 85 * 86400000).toISOString(),
    },
  ],
  'WH-CBE-02': [
    {
      id: 'maint-cbe-01',
      warehouseId: 'WH-CBE-02',
      assetName: 'Copeland Scroll Compressor Unit (Chiller Room #1)',
      serviceType: 'COMPRESSOR_REPAIR',
      serviceDate: new Date(Date.now() - 21 * 86400000).toISOString(),
      technicianName: 'R. Karpagam',
      technicianOrg: 'Coimbatore District Refrigeration Works',
      costInr: 28000,
      partsReplaced: ['High pressure safety switch', 'Filter drier core'],
      findings: 'Tripped on intermittent high pressure during hot ambient spike. Cleaned air-cooled condenser coils with alkaline foam. Clean airflow and condensation cycle restored.',
      postServiceTemp: 4.3,
      status: 'COMPLETED',
      complianceCertificate: 'CERT-HVAC-CBE-2026-102',
      nextScheduledDate: new Date(Date.now() + 69 * 86400000).toISOString(),
    },
  ],
  'WH-MDU-03': [
    {
      id: 'maint-mdu-01',
      warehouseId: 'WH-MDU-03',
      assetName: 'Cold Room #3 Thermal Air Curtain & Magnetic Door Gasket',
      serviceType: 'DOOR_INSULATION',
      serviceDate: new Date(Date.now() - 11 * 86400000).toISOString(),
      technicianName: 'M. Senthilkumar',
      technicianOrg: 'Southern Cold Corridor Services',
      costInr: 12400,
      partsReplaced: ['Heavy-duty dual magnetic perimeter gasket', 'Infrared motion sensor door switch'],
      findings: 'Condensation line buildup observed around cold room outer threshold. Replaced compressed perimeter seal. Thermal leakage reduced to 0.0% as verified with FLIR camera.',
      postServiceTemp: 4.9,
      status: 'COMPLETED',
      complianceCertificate: 'CERT-SEAL-MDU-2026-033',
      nextScheduledDate: new Date(Date.now() + 79 * 86400000).toISOString(),
    },
  ],
};

const INITIAL_UPCOMING_SERVICES: Record<string, UpcomingServiceSchedule[]> = {
  'WH-CHN-01': [
    {
      id: 'serv-chn-01',
      warehouseId: 'WH-CHN-01',
      assetName: 'Standby Diesel Generator & ATS Switch 90-Day Preventive Service',
      serviceTitle: 'Diesel Generator Battery & Fuel Oil Routine Overhaul',
      targetDate: new Date(Date.now() + 14 * 86400000).toISOString(),
      daysRemaining: 14,
      priority: 'HIGH',
      assignedTechnician: 'Kirloskar Power Team',
      scopeSummary: 'Battery electrolyte specific gravity inspection, fuel filter replacement, crank starter voltage calibration under 100% full load simulation.',
      status: 'SCHEDULED',
    },
    {
      id: 'serv-chn-02',
      warehouseId: 'WH-CHN-01',
      assetName: 'Cold Rooms 1 - 4 Evaporator Defrost Coils & Biocide Pan Flush',
      serviceTitle: 'Biannual Defrost Heater Element Check & Coil Sanitization',
      targetDate: new Date(Date.now() + 27 * 86400000).toISOString(),
      daysRemaining: 27,
      priority: 'MEDIUM',
      assignedTechnician: 'HVAC Maintenance Cell',
      scopeSummary: 'Check electric defrost element resistance, clean drip trays, clear frost build-up, and dose condensation drain lines with anti-microbial tablets.',
      status: 'SCHEDULED',
    },
    {
      id: 'serv-chn-03',
      warehouseId: 'WH-CHN-01',
      assetName: 'Compressor Unit B & Inverter Drive Thermographic Analysis',
      serviceTitle: 'FLIR Infrared Thermal Scan & Compressor Oil Acidity Test',
      targetDate: new Date(Date.now() + 48 * 86400000).toISOString(),
      daysRemaining: 48,
      priority: 'PROACTIVE',
      assignedTechnician: 'Carrier Transicold Technical Division',
      scopeSummary: 'Non-invasive infrared imaging across terminal box contacts and motor windings; lab titration test of compressor lubricant for moisture and acid levels.',
      status: 'SCHEDULED',
    },
  ],
  'WH-CBE-02': [
    {
      id: 'serv-cbe-01',
      warehouseId: 'WH-CBE-02',
      assetName: 'Refrigeration Chiller Room 2 Condenser Fan Motors',
      serviceTitle: 'Fan Motor Bearing Greasing & Vibration Spectrum Analysis',
      targetDate: new Date(Date.now() + 19 * 86400000).toISOString(),
      daysRemaining: 19,
      priority: 'MEDIUM',
      assignedTechnician: 'Coimbatore District HVAC Unit',
      scopeSummary: 'Bearing lubrication and dynamic balance measurement to prevent compressor head pressure excursion during hot summer midday periods.',
      status: 'SCHEDULED',
    },
  ],
  'WH-MDU-03': [
    {
      id: 'serv-mdu-01',
      warehouseId: 'WH-MDU-03',
      assetName: 'Sub-Zero Walk-in Deep Freezer (-20°C) Insulation Audit',
      serviceTitle: 'Polyurethane Panel Seal & Heated Relief Port Testing',
      targetDate: new Date(Date.now() + 8 * 86400000).toISOString(),
      daysRemaining: 8,
      priority: 'CRITICAL',
      assignedTechnician: 'Southern Cold Hub Metrology Specialist',
      scopeSummary: 'Inspect heated vacuum relief port and door perimeter anti-freeze cables to ensure sub-zero vaccine storage stability for bOPV stocks.',
      status: 'SCHEDULED',
    },
  ],
};

function getStorageKey(type: 'repairs' | 'upcoming', whCode: string) {
  return `vaxguard_maint_${type}_${whCode}`;
}

export const warehouseMaintenanceService = {
  // Normalize code or ID (e.g. WH-CHN-01)
  normalizeCode(idOrCode: string): string {
    if (idOrCode.startsWith('WH-')) return idOrCode;
    // Default to WH-CHN-01 if unknown mongo id
    return 'WH-CHN-01';
  },

  getMaintenanceHistory(idOrCode: string): WarehouseMaintenanceRecord[] {
    const code = this.normalizeCode(idOrCode);
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(getStorageKey('repairs', code));
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {}
      }
    }
    return INITIAL_PAST_REPAIRS[code] || INITIAL_PAST_REPAIRS['WH-CHN-01'];
  },

  getUpcomingServices(idOrCode: string): UpcomingServiceSchedule[] {
    const code = this.normalizeCode(idOrCode);
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(getStorageKey('upcoming', code));
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {}
      }
    }
    return INITIAL_UPCOMING_SERVICES[code] || INITIAL_UPCOMING_SERVICES['WH-CHN-01'];
  },

  addMaintenanceRecord(
    idOrCode: string,
    record: Omit<WarehouseMaintenanceRecord, 'id'>
  ): WarehouseMaintenanceRecord {
    const code = this.normalizeCode(idOrCode);
    const existing = this.getMaintenanceHistory(code);
    const newRecord: WarehouseMaintenanceRecord = {
      ...record,
      id: `maint-${Date.now()}`,
    };
    const updated = [newRecord, ...existing];
    if (typeof window !== 'undefined') {
      localStorage.setItem(getStorageKey('repairs', code), JSON.stringify(updated));
    }
    return newRecord;
  },

  scheduleUpcomingService(
    idOrCode: string,
    service: Omit<UpcomingServiceSchedule, 'id' | 'daysRemaining'>
  ): UpcomingServiceSchedule {
    const code = this.normalizeCode(idOrCode);
    const existing = this.getUpcomingServices(code);
    const targetMs = new Date(service.targetDate).getTime();
    const nowMs = Date.now();
    const daysRemaining = Math.max(1, Math.round((targetMs - nowMs) / 86400000));

    const newService: UpcomingServiceSchedule = {
      ...service,
      id: `serv-${Date.now()}`,
      daysRemaining,
    };
    const updated = [newService, ...existing].sort(
      (a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()
    );
    if (typeof window !== 'undefined') {
      localStorage.setItem(getStorageKey('upcoming', code), JSON.stringify(updated));
    }
    return newService;
  },
};
