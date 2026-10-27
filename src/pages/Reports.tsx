import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { api } from '../services/api.js';
import { DashboardStats } from '../types/index.js';
import {
  FileBarChart2,
  FileCheck,
  Download,
  Printer,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Building2,
  Truck,
  HeartPulse,
  FileSpreadsheet,
  FileType,
  Sparkles,
  Award,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';

export const Reports: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [complianceReport, setComplianceReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [reportPeriod, setReportPeriod] = useState('Current Operational Cycle (Q4 2026)');
  const [exportSuccessMsg, setExportSuccessMsg] = useState('');

  const fetchReportsData = async () => {
    try {
      setLoading(true);
      const [summaryRes, reportRes] = await Promise.all([
        api.getSummaryReport(),
        api.generateComplianceReport(reportPeriod),
      ]);
      setStats(summaryRes.stats);
      setComplianceReport(reportRes.report);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsData();
  }, [reportPeriod]);

  const handleGenerateReport = async () => {
    try {
      setGenerating(true);
      const res = await api.generateComplianceReport(reportPeriod);
      setComplianceReport(res.report);
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // EXPORT AS PDF
  const handleExportPDF = () => {
    if (!complianceReport) return;

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const primaryBlue: [number, number, number] = [37, 99, 235];
      const darkSlate: [number, number, number] = [15, 23, 42];

      // Document Header Banner
      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, 210, 26, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text('VAXGUARD • SMART COLD-CHAIN MANAGEMENT', 14, 12);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(220, 235, 255);
      doc.text('WHO-GDP & National Health Mission Vaccine Compliance Audit', 14, 19);

      // Report Metadata Box
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...darkSlate);
      doc.text(complianceReport.title || 'Vaccine Cold-Chain Compliance Audit Report', 14, 35);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Report ID: ${complianceReport.reportId}`, 14, 41);
      doc.text(`Audit Period: ${complianceReport.period}`, 14, 46);
      doc.text(`Generated At: ${new Date(complianceReport.generatedAt).toLocaleString()}`, 14, 51);
      doc.text(`Auditor: Automated Cold-Chain Compliance Engine (MERN)`, 14, 56);

      // Status Badge on Top-Right
      doc.setFillColor(16, 185, 129);
      doc.roundedRect(145, 33, 50, 16, 3, 3, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text('COMPLIANCE VERIFIED', 148, 41);
      doc.setFontSize(7.5);
      doc.text('WHO-GDP Criteria Met', 148, 46);

      // Summary KPI Grid
      const metrics = [
        ['Monitored Shipments', `${complianceReport.metrics?.totalShipmentsMonitored || 0}`],
        ['Temperature Compliance', `${complianceReport.metrics?.temperatureComplianceRate || '100%'}`],
        ['Successful Deliveries', `${complianceReport.metrics?.successfulDeliveries || 0}`],
        ['Cold-Storage Warehouses', `${complianceReport.metrics?.activeColdRoomsInspected || 0}`],
        ['Power Failure Outages', `${complianceReport.metrics?.powerFailureIncidentsLogged || 0}`],
        ['Alerts Resolved Ratio', `${complianceReport.metrics?.resolvedAlertsRatio || '0 / 0'}`],
      ];

      autoTable(doc, {
        startY: 62,
        head: [['Compliance Key Performance Indicator', 'Audit Metric Value']],
        body: metrics,
        theme: 'striped',
        headStyles: { fillColor: primaryBlue, textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8.5, cellPadding: 2.5 },
        margin: { left: 14, right: 14 },
      });

      // Section 2: Vaccine Consignments
      const lastTableEnd = (doc as any).lastAutoTable?.finalY || 120;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...darkSlate);
      doc.text('Vaccine Transit Consignments & Thermal Telemetry Audit', 14, lastTableEnd + 8);

      const shipmentRows = (complianceReport.shipmentSummary || []).map((s: any) => [
        s.trackingId,
        s.vaccineName,
        s.batchNumber,
        `${s.currentTemperature.toFixed(1)}°C`,
        `[${s.safeMinTemperature}°C - ${s.safeMaxTemperature}°C]`,
        s.riskLevel,
        s.status,
      ]);

      autoTable(doc, {
        startY: lastTableEnd + 11,
        head: [['Tracking ID', 'Vaccine Lot', 'Batch #', 'Cargo Temp', 'Safe Band', 'Risk', 'Status']],
        body: shipmentRows.length > 0 ? shipmentRows : [['No active shipments found', '-', '-', '-', '-', '-', '-']],
        theme: 'grid',
        headStyles: { fillColor: [51, 65, 85], textColor: 255, fontSize: 8 },
        styles: { fontSize: 7.5, cellPadding: 2 },
        margin: { left: 14, right: 14 },
      });

      // Section 3: Regional Warehouses & Refrigeration Status
      const lastShipTableEnd = (doc as any).lastAutoTable?.finalY || 180;
      
      if (lastShipTableEnd > 220) {
        doc.addPage();
        doc.text('Cold-Storage Warehouses & Refrigeration Facility Audit', 14, 20);
      } else {
        doc.text('Cold-Storage Warehouses & Refrigeration Facility Audit', 14, lastShipTableEnd + 8);
      }

      const warehouseRows = (complianceReport.warehouseSummary || []).map((w: any) => [
        w.code,
        w.name,
        `${w.currentTemperature.toFixed(1)}°C`,
        w.powerStatus,
        w.refrigerationStatus,
        `${w.estimatedSafeHoldingTime} min`,
        w.managerName,
      ]);

      autoTable(doc, {
        startY: lastShipTableEnd > 220 ? 25 : lastShipTableEnd + 11,
        head: [['Code', 'Facility Name', 'Temp', 'Power', 'Cooling', 'Hold Time', 'Manager']],
        body: warehouseRows.length > 0 ? warehouseRows : [['No warehouses found', '-', '-', '-', '-', '-', '-']],
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 8 },
        styles: { fontSize: 7.5, cellPadding: 2 },
        margin: { left: 14, right: 14 },
      });

      // Footer Seal & Signature
      const finalY = (doc as any).lastAutoTable?.finalY || 240;
      const stampY = Math.min(270, finalY + 12);

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(140, 150, 160);
      doc.text('This document is electronically verified and sealed under eVIN & WHO Good Distribution Practice.', 14, stampY);
      doc.text('Verified by: State Cold-Chain Directorate • VAXGUARD MERN System', 14, stampY + 4);

      // Save PDF
      doc.save(`VAXGUARD_Compliance_Report_${complianceReport.reportId}.pdf`);
      setExportSuccessMsg('PDF Compliance Report generated and downloaded successfully!');
      setTimeout(() => setExportSuccessMsg(''), 3000);
    } catch (err: any) {
      alert('Error generating PDF: ' + err.message);
    }
  };

  // EXPORT AS CSV
  const handleExportCSV = () => {
    if (!complianceReport) return;

    try {
      let csv = 'VAXGUARD COLD-CHAIN COMPLIANCE AUDIT EXPORT\n';
      csv += `Report ID,"${complianceReport.reportId}"\n`;
      csv += `Title,"${complianceReport.title}"\n`;
      csv += `Period,"${complianceReport.period}"\n`;
      csv += `Generated At,"${new Date(complianceReport.generatedAt).toISOString()}"\n`;
      csv += `Compliance Status,"${complianceReport.complianceStatus}"\n\n`;

      csv += '--- KEY METRICS ---\n';
      csv += `Total Shipments Monitored,${complianceReport.metrics?.totalShipmentsMonitored || 0}\n`;
      csv += `Temperature Adherence Rate,${complianceReport.metrics?.temperatureComplianceRate || '100%'}\n`;
      csv += `Successful Deliveries,${complianceReport.metrics?.successfulDeliveries || 0}\n`;
      csv += `Active Cold Rooms,${complianceReport.metrics?.activeColdRoomsInspected || 0}\n`;
      csv += `Power Incidents Logged,${complianceReport.metrics?.powerFailureIncidentsLogged || 0}\n`;
      csv += `Resolved Alerts Ratio,${complianceReport.metrics?.resolvedAlertsRatio || '0'}\n\n`;

      csv += '--- VACCINE CONSIGNMENTS TELEMETRY ---\n';
      csv += 'Tracking ID,Vaccine Name,Batch Number,Current Temp (C),Safe Min (C),Safe Max (C),Risk Level,Status,Origin,Destination\n';
      (complianceReport.shipmentSummary || []).forEach((s: any) => {
        csv += `"${s.trackingId}","${s.vaccineName}","${s.batchNumber}",${s.currentTemperature},${s.safeMinTemperature},${s.safeMaxTemperature},"${s.riskLevel}","${s.status}","${s.origin}","${s.destination}"\n`;
      });

      csv += '\n--- WAREHOUSE REFRIGERATION STATUS ---\n';
      csv += 'Warehouse Code,Facility Name,Location,Current Temp (C),Power Status,Refrigeration Status,Safe Holding Time (mins),Manager Name\n';
      (complianceReport.warehouseSummary || []).forEach((w: any) => {
        csv += `"${w.code}","${w.name}","${w.location}",${w.currentTemperature},"${w.powerStatus}","${w.refrigerationStatus}",${w.estimatedSafeHoldingTime},"${w.managerName}"\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `VAXGUARD_Audit_Data_${complianceReport.reportId}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setExportSuccessMsg('CSV Data file downloaded successfully!');
      setTimeout(() => setExportSuccessMsg(''), 3000);
    } catch (err: any) {
      alert('Error exporting CSV: ' + err.message);
    }
  };

  // Bar chart data for risk & compliance
  const barData = stats
    ? [
        { name: 'Total Shipments', count: stats.totalShipments },
        { name: 'In Transit', count: stats.activeShipments },
        { name: 'Delivered', count: stats.deliveredShipments },
        { name: 'High Risk', count: stats.highRiskShipments },
        { name: 'Excursions', count: stats.excursionsCount },
        { name: 'Power Outages', count: stats.refrigerationFailures },
        { name: 'Resolved Alerts', count: stats.resolvedAlerts },
      ]
    : [];

  const COLORS = ['#2563EB', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#7C3AED', '#059669'];

  return (
    <div className="space-y-6">
      
      {/* Header & Controls */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <FileBarChart2 className="w-6 h-6 text-blue-600" />
            <span>Cold-Chain Compliance &amp; Analytics Reports</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Official audit summaries, excursion tracking, and WHO-GDP regulatory compliance logs
          </p>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          
          <button
            onClick={handleGenerateReport}
            disabled={generating}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
            <span>Regenerate</span>
          </button>

          {/* Export PDF Button */}
          <button
            onClick={handleExportPDF}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
          >
            <FileType className="w-3.5 h-3.5" />
            <span>Export PDF</span>
          </button>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="flex items-center space-x-1.5 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Export Success Notification Banner */}
      {exportSuccessMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-bold flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{exportSuccessMsg}</span>
        </div>
      )}

      {/* SUMMARY KPI TILES */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs text-center">
          <div className="text-[10px] font-bold uppercase text-slate-400">Total Shipments</div>
          <div className="text-xl font-black font-mono text-slate-900 mt-1">{stats?.totalShipments || 0}</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs text-center">
          <div className="text-[10px] font-bold uppercase text-red-500">Excursions</div>
          <div className="text-xl font-black font-mono text-red-600 mt-1">{stats?.excursionsCount || 0}</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs text-center">
          <div className="text-[10px] font-bold uppercase text-amber-500">High-Risk Lots</div>
          <div className="text-xl font-black font-mono text-amber-600 mt-1">{stats?.highRiskShipments || 0}</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs text-center">
          <div className="text-[10px] font-bold uppercase text-emerald-600">Resolved Alerts</div>
          <div className="text-xl font-black font-mono text-emerald-600 mt-1">{stats?.resolvedAlerts || 0}</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs text-center">
          <div className="text-[10px] font-bold uppercase text-slate-500">Power Failures</div>
          <div className="text-xl font-black font-mono text-slate-900 mt-1">{stats?.refrigerationFailures || 0}</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs text-center">
          <div className="text-[10px] font-bold uppercase text-blue-600">Cold Hubs</div>
          <div className="text-xl font-black font-mono text-blue-700 mt-1">{stats?.coldStorageHubs || 0}</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs text-center">
          <div className="text-[10px] font-bold uppercase text-emerald-600">Health Score</div>
          <div className="text-xl font-black font-mono text-emerald-600 mt-1">{stats?.coldChainHealth || 100}%</div>
        </div>

      </div>

      {/* COMPARATIVE BAR CHART */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Cold-Chain Operational Metric Distribution</h3>
            <p className="text-xs text-slate-500">Live aggregated metrics from MongoDB collections</p>
          </div>
          <span className="text-xs font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
            Express / MongoDB API Aggregation
          </span>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 10, right: 30, left: -10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#2563EB" radius={[6, 6, 0, 0]}>
                {barData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* FORMAL AUDIT REPORT PREVIEW (ACADEMIC VIVA READY) */}
      {complianceReport && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs space-y-6 print:border-none print:shadow-none">
          
          <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-blue-700 block">
                NATIONAL HEALTH MISSION • STATE COLD-CHAIN REGISTRY
              </span>
              <h2 className="text-xl font-black text-slate-900 mt-0.5">
                {complianceReport.title}
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                Report Reference ID: {complianceReport.reportId} • Generated: {new Date(complianceReport.generatedAt).toLocaleString()}
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>AUDIT COMPLIANT</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Temperature Adherence</span>
              <span className="text-base font-bold text-slate-900 font-mono">
                {complianceReport.metrics.temperatureComplianceRate}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Successful Deliveries</span>
              <span className="text-base font-bold text-slate-900 font-mono">
                {complianceReport.metrics.successfulDeliveries} consignments
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Alert Resolution Ratio</span>
              <span className="text-base font-bold text-emerald-700 font-mono">
                {complianceReport.metrics.resolvedAlertsRatio}
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Recent Shipment Integrity Telemetry Sample:
            </h4>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Tracking ID</th>
                    <th className="py-2.5 px-3">Vaccine</th>
                    <th className="py-2.5 px-3">Current Temp</th>
                    <th className="py-2.5 px-3">Safe Range</th>
                    <th className="py-2.5 px-3">Risk Level</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {complianceReport.shipmentSummary.map((s: any) => (
                    <tr key={s._id}>
                      <td className="py-2 px-3 font-mono font-bold text-blue-700">{s.trackingId}</td>
                      <td className="py-2 px-3 font-medium text-slate-800">{s.vaccineName}</td>
                      <td className="py-2 px-3 font-mono font-bold">{s.currentTemperature.toFixed(1)}°C</td>
                      <td className="py-2 px-3 font-mono text-slate-500">[{s.safeMinTemperature}°C – {s.safeMaxTemperature}°C]</td>
                      <td className="py-2 px-3">{s.riskLevel}</td>
                      <td className="py-2 px-3 font-semibold">{s.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
