export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role:
    | 'admin'
    | 'hospital_staff'
    | 'driver'
    | 'health_department'
    | 'public_viewer'
    | 'warehouse_manager'
    | 'logistics_manager'
    | 'hospital_receiver';
  department: string;
  phone?: string;
  avatar?: string;
}

export interface ShipmentItem {
  _id: string;
  trackingId: string;
  vaccineName: string;
  batchNumber: string;
  quantity: number;
  origin: string;
  destination: string;
  currentTemperature: number;
  safeMinTemperature: number;
  safeMaxTemperature: number;
  expectedTravelTime: number;
  remainingTravelTime: number;
  status: 'IN_TRANSIT' | 'DELIVERED' | 'DELAYED' | 'FLAGGED' | 'ACCEPTED' | 'AT_RISK';
  departureTime: string;
  eta: string;
  riskScore: number;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  predictedExcursionMinutes: number;
  recommendedAction: string;
  currentRoute: string;
  driverName: string;
  driverPhone: string;
  vehicleReg: string;
  storageUnit: string;
  receivedStatus?: 'PENDING' | 'ACCEPTED' | 'FLAGGED';
  receivedAt?: string;
  receivedBy?: string;
  receivingNotes?: string;
  createdAt: string;
}

export interface TemperatureLogItem {
  _id: string;
  shipmentId: string;
  trackingId: string;
  temperature: number;
  ambientTemperature: number;
  location: string;
  recordedAt: string;
  source: 'SENSOR_AUTOMATED' | 'MANUAL_ENTRY' | 'SIMULATION';
  isExcursion: boolean;
  batteryLevel?: number;
  humidity?: number;
}

export interface HistoricalTrendPoint {
  id: string;
  time: string;
  timestamp: string;
  temperature: number;
  ambientTemperature: number;
  predictedRiskScore: number;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  safeMin: number;
  safeMax: number;
  isExcursion: boolean;
  rateOfChangePerHour: number;
  predictedExcursionMinutes: number;
  location: string;
  recommendation: string;
}

export interface PredictiveRiskResult {
  riskScore: number;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  predictedExcursionMinutes: number;
  temperatureTrend: 'RISING_FAST' | 'RISING_MODERATE' | 'STABLE' | 'COOLING_MODERATE' | 'COOLING_FAST';
  rateOfChangePerHour: number;
  isCurrentExcursion: boolean;
  recommendedAction: string;
  factorBreakdown: {
    proximityScore: number;
    velocityScore: number;
    durationExposureScore: number;
    travelVulnerabilityScore: number;
  };
  explanation: string;
}

export interface RouteOption {
  name: string;
  routeName: string;
  distanceKm: number;
  estimatedTimeHours: number;
  coldStoragePoints: number;
  pointsDetails: string[];
  coldChainRisk: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  riskScore: number;
  routeScore: number;
  isRecommended: boolean;
  reason: string;
  roadCondition: string;
  avgAmbientTemp: number;
  congestionLevel: string;
  waypoints: Array<{ name: string; lat: number; lng: number; isHub: boolean }>;
}

export interface WarehouseItem {
  _id: string;
  name: string;
  code: string;
  location: string;
  state: string;
  storageCapacity: number;
  currentOccupancy: number;
  safeMinTemperature: number;
  safeMaxTemperature: number;
  currentTemperature: number;
  targetTemperature: number;
  powerStatus: 'ON' | 'OFF';
  refrigerationStatus: 'NORMAL' | 'WARNING' | 'FAILURE';
  backupPowerAvailable: boolean;
  backupPowerStatus: 'STANDBY' | 'ACTIVE' | 'OFFLINE';
  estimatedSafeHoldingTime: number;
  activeAlertsCount: number;
  managerName: string;
  managerContact: string;
  roomCount: number;
  ambientTemperature: number;
  lastInspectionDate?: string;
}

export interface WarehouseMaintenanceRecord {
  id: string;
  warehouseId: string;
  assetName: string;
  serviceType: 'COMPRESSOR_REPAIR' | 'REFRIGERANT_LEAK' | 'BACKUP_DG_LOAD' | 'SENSOR_CALIBRATION' | 'DOOR_INSULATION' | 'PREVENTATIVE_AUDIT';
  serviceDate: string;
  technicianName: string;
  technicianOrg?: string;
  costInr?: number;
  partsReplaced?: string[];
  findings: string;
  postServiceTemp: number;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'SCHEDULED';
  complianceCertificate?: string;
  nextScheduledDate?: string;
}

export interface UpcomingServiceSchedule {
  id: string;
  warehouseId: string;
  assetName: string;
  serviceTitle: string;
  targetDate: string;
  daysRemaining: number;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'PROACTIVE';
  assignedTechnician: string;
  scopeSummary: string;
  status: 'SCHEDULED' | 'PENDING_APPROVAL' | 'OVERDUE';
}

export interface HospitalItem {
  _id: string;
  name: string;
  code: string;
  district: string;
  city: string;
  address: string;
  type: 'GOVERNMENT_MEDICAL_COLLEGE' | 'DISTRICT_HEADQUARTERS' | 'PRIMARY_HEALTH_CENTRE' | 'COMMUNITY_HEALTH_CENTRE' | 'TERTIARY_HOSPITAL';
  inChargeName: string;
  inChargePhone: string;
  inChargeEmail: string;
  coldStorageType: string;
  coldStorageCapacityLitres: number;
  currentTemperature: number;
  temperatureStatus: 'NORMAL' | 'WARNING' | 'EXCURSION';
  activeVaccineDoses: number;
  lastStockUpdate: string;
  status: 'ACTIVE' | 'MAINTENANCE' | 'ALERT';
}

export interface InventoryItem {
  _id: string;
  vaccineName: string;
  batchNumber: string;
  manufacturer: string;
  facilityType: 'HOSPITAL' | 'REGIONAL_WAREHOUSE';
  facilityId: string;
  facilityName: string;
  availableDoses: number;
  reservedDoses: number;
  lowStockThreshold: number;
  isLowStock: boolean;
  safeMinTemperature: number;
  safeMaxTemperature: number;
  currentStorageTemperature: number;
  expiryDate: string;
  lastAuditedAt: string;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'CRITICAL_SHORTAGE' | 'EXPIRED';
}

export interface PublicHospitalAvailability {
  hospitalId: string;
  name: string;
  code: string;
  district: string;
  city: string;
  address: string;
  coldStorageStatus: 'NORMAL' | 'WARNING' | 'EXCURSION';
  currentTemperature: number;
  totalDosesAvailable: number;
  vaccines: Array<{
    vaccineName: string;
    availableDoses: number;
    status: string;
    expiryDate: string;
  }>;
  contactPhone: string;
}

export interface AlertItem {
  _id: string;
  alertId: string;
  type:
    | 'Temperature Excursion'
    | 'Predictive High Risk'
    | 'Refrigeration Failure'
    | 'Route Risk'
    | 'Low Inventory'
    | 'Shipment Delay';
  severity: 'LOW' | 'WARNING' | 'HIGH' | 'CRITICAL';
  relatedShipmentId?: string;
  relatedShipmentTracking?: string;
  relatedWarehouseId?: string;
  relatedWarehouseName?: string;
  message: string;
  details: string;
  recommendedAction: string;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
  timestamp: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
}

export interface DashboardStats {
  activeShipments: number;
  dosesInTransit: number;
  highRiskShipments: number;
  activeAlerts: number;
  criticalAlerts: number;
  coldStorageHubs: number;
  coldChainHealth: number;
  totalShipments: number;
  deliveredShipments: number;
  resolvedAlerts: number;
  refrigerationFailures: number;
  totalTempLogs: number;
  excursionsCount: number;
  totalWarehouseCapacity: number;
  currentWarehouseOccupancy: number;
}

export interface EquipmentFailurePrediction {
  equipmentId: string;
  equipmentName: string;
  equipmentType: 'REEFER_COMPRESSOR' | 'STORAGE_CHILLER' | 'CRYOGENIC_DEWAR' | 'AUX_GENERATOR';
  relatedEntityId: string; // shipment trackingId or warehouse code
  relatedEntityName: string;
  currentTemp: number;
  safeMin: number;
  safeMax: number;
  ambientTemp: number;
  thermalDriftPerHour: number; // °C/hr
  compressorDutyCycle: number; // percentage, e.g. 88%
  equipmentHealthScore: number; // 0 - 100%
  failureProbability: number; // 0 - 100%
  spoilageRiskScore: number; // 0 - 100%
  predictedTimeToFailureHours: number; // e.g. 2.4 hrs
  predictedTimeToCriticalExcursionMinutes: number; // e.g. 78 min
  failureStage: 'OPTIMAL' | 'DEGRADING' | 'IMMINENT_FAILURE' | 'CRITICAL_FAILURE';
  rootCause: string;
  diagnosticNotes: string[];
  recommendedAction: string;
  preventiveDispatchRoute?: string;
  lastServiceDate?: string;
  metrics: {
    condenserPressurePsi: number;
    powerDrawAmps: number;
    vibrationIndex: number; // 0-10
    refrigerantLevelPct: number; // 0-100
  };
}

export interface ReeferBatteryStatus {
  shipmentId: string;
  trackingId: string;
  vaccineName: string;
  vehicleReg: string;
  storageUnit: string;
  origin: string;
  destination: string;
  currentTemperature: number;
  batteryPercentage: number; // 0 - 100%
  batteryVoltage: number; // e.g. 24.6V
  dischargeRateAmps: number; // -12.4A or +5.2A
  powerSource: 'AUX_BATTERY' | 'VEHICLE_ALTERNATOR' | 'SOLAR_HYBRID' | 'SHORE_GRID';
  batteryHealthSoH: number; // % State of Health
  batteryTempCelsius: number; // °C
  timeToEmptyMinutes: number; // minutes until 0%
  timeToEmptyHours: number; // hours until 0%
  remainingTravelHours: number; // shipment remaining travel time
  deficitHours: number; // travel time - TTE (positive means battery runs out before arrival!)
  powerRiskLevel: 'NOMINAL' | 'ELEVATED' | 'CRITICAL_DEPLETION';
  recommendedIntervention: string;
  estimatedSpoilageOnsetMinutes: number;
}


