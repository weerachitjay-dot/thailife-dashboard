import React, { useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { normalizeProduct } from '../../utils/formatters';

const DataVerificationTable = () => {
    const { appendTimeData, appendData, targetData, filters, dateRange } = useData();

    // --- LOGIC: Validation / Comparison Data (Leads Analysis vs Time Analysis) ---
    const validationData = useMemo(() => {
        // Source of Truth: appendData (Leads Analysis Source)
        // Actual Raw: appendTimeData (Unfiltered, straight from DB)

        // 1. Group Truth Data by Day
        const truthByDay = {};

        appendData.forEach(row => {
            const d = row.Day;
            if (!d) return;
            // Check filters to match data scope
            if (dateRange.start && d < dateRange.start) return;
            if (dateRange.end && d > dateRange.end) return;

            const normProd = normalizeProduct(row.Product);
            if (filters.product !== 'All' && normProd !== filters.product) return;

            // Owner/Type filter via Target Data
            const targetInfo = targetData.find(t => t.Product_Target === normProd);
            if (filters.owner !== 'All' && targetInfo?.OWNER !== filters.owner) return;
            if (filters.type !== 'All' && targetInfo?.TYPE !== filters.type) return;

            if (!truthByDay[d]) truthByDay[d] = { cost: 0, leads: 0 };
            truthByDay[d].cost += parseFloat(row.Cost || 0);
            truthByDay[d].leads += parseInt(row.Leads || 0);
        });

        // 2. Group Actual RAW Data by Day
        const actualByDay = {};
        const droppedByDay = {}; // Track costs with invalid time

        appendTimeData.forEach(row => {
            // Basic strict filter (Date & Product)
            const d = row.Day;
            if (!d) return;
            if (dateRange.start && d < dateRange.start) return;
            if (dateRange.end && d > dateRange.end) return;

            const normProd = normalizeProduct(row.Product);
            if (filters.product !== 'All' && normProd !== filters.product) return;

            // Owner/Type filter (using same target lookup)
            const targetInfo = targetData.find(t => t.Product_Target === normProd);
            if (filters.owner !== 'All' && targetInfo?.OWNER !== filters.owner) return;
            if (filters.type !== 'All' && targetInfo?.TYPE !== filters.type) return;

            if (!actualByDay[d]) actualByDay[d] = { cost: 0, leads: 0 };
            actualByDay[d].cost += parseFloat(row.Cost || 0);
            actualByDay[d].leads += parseInt(row.Leads || 0);

            // Check for Invalid Time (Dropped Logic)
            const rawTime = row.Time || row.time_of_day || row.Time_of_Day || '';
            let isValidTime = false;
            if (rawTime) {
                let cleanTime = String(rawTime).split(' - ')[0];
                const h = parseInt(cleanTime.split(':')[0], 10);
                if (!isNaN(h)) isValidTime = true;
            }

            if (!isValidTime) {
                if (!droppedByDay[d]) droppedByDay[d] = { cost: 0 };
                droppedByDay[d].cost += parseFloat(row.Cost || 0);
            }
        });

        // 3. Merge & Compare
        const allDays = Array.from(new Set([...Object.keys(truthByDay), ...Object.keys(actualByDay)])).sort();

        return allDays.map(day => {
            const truth = truthByDay[day] || { cost: 0, leads: 0 };
            const actual = actualByDay[day] || { cost: 0, leads: 0 };
            const dropped = droppedByDay[day] || { cost: 0 };

            const diffCost = actual.cost - truth.cost;
            const diffLeads = actual.leads - truth.leads;

            // Mismatch tolerance: 1.0 currency unit
            const isMatch = Math.abs(diffCost) < 1;

            return {
                day,
                truthCost: truth.cost,
                actualCost: actual.cost,
                droppedCost: dropped.cost, // New metric
                diffCost,
                truthLeads: truth.leads,
                actualLeads: actual.leads,
                diffLeads,
                status: isMatch ? 'MATCH' : 'MISMATCH'
            };
        });
    }, [appendData, appendTimeData, targetData, filters, dateRange]);

    return (
        <div className="glass-card rounded-2xl overflow-hidden border border-rose-200/60 shadow-md mt-6">
            <div className="p-6 border-b border-rose-100 bg-rose-50/30 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-rose-600" />
                    <h3 className="text-lg font-bold text-slate-900">
                        Data Verification (Time vs Leads Analysis)
                        <span className="text-xs font-normal text-rose-600 ml-2 px-2 py-0.5 bg-rose-100 rounded-full">Debug Mode</span>
                    </h3>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 text-left">Date</th>
                            <th className="px-6 py-4 text-right bg-emerald-50/50 text-emerald-800">Meta Cost (Truth)</th>
                            <th className="px-6 py-4 text-right bg-indigo-50/50 text-indigo-800">Time Cost (Raw)</th>
                            <th className="px-6 py-4 text-right bg-amber-50/50 text-amber-800">Dropped (No Time)</th>
                            <th className="px-6 py-4 text-right">Cost Diff</th>
                            <th className="px-6 py-4 text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white/60">
                        {validationData.map((row) => (
                            <tr key={row.day} className={`hover:bg-slate-50 transition-colors ${row.status === 'MISMATCH' ? 'bg-rose-50/30' : ''}`}>
                                <td className="px-6 py-4 font-bold text-slate-800">{row.day} ({(new Date(row.day)).toLocaleDateString('en-US', { weekday: 'short' })})</td>
                                <td className="px-6 py-4 text-right font-medium text-slate-900 bg-emerald-50/30">฿{row.truthCost.toLocaleString()}</td>
                                <td className="px-6 py-4 text-right font-medium text-indigo-700 bg-indigo-50/30">฿{row.actualCost.toLocaleString()}</td>
                                <td className="px-6 py-4 text-right font-medium text-amber-700 bg-amber-50/30">
                                    {row.droppedCost > 0 ? `฿${row.droppedCost.toLocaleString()}` : '-'}
                                </td>
                                <td className={`px-6 py-4 text-right font-bold ${row.diffCost === 0 ? 'text-slate-300' : 'text-rose-600'}`}>
                                    {row.diffCost > 0 ? '+' : ''}{Math.round(row.diffCost).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${row.status === 'MATCH'
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-rose-100 text-rose-700'
                                        }`}>
                                        {row.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {validationData.length === 0 && (
                            <tr><td colSpan="6" className="p-8 text-center text-slate-400">No data for selected range</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DataVerificationTable;
