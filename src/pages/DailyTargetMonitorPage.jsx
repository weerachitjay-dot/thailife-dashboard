import React, { useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import DateRangePicker from '../components/common/DateRangePicker';
import {
    ComposedChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Area,
    Line,
    ReferenceLine
} from 'recharts';
import {
    Target,
    TrendingUp,
    AlertOctagon,
    CheckCircle,
    AlertTriangle,
    ArrowUpRight,
    ArrowDownRight,
    Minus
} from 'lucide-react';

const DailyTargetMonitorPage = () => {
    const { sentData, targetData, dateRange, setDateRange } = useData();
    // Default to "Today" if needed, but user might want to pick a date.
    // For "Monitor", usually it's "Today". But let's respect the picker or default to latest available.

    // 1. Process Data
    const monitorData = useMemo(() => {
        if (!sentData || !targetData) return [];

        // Simple Temporal Fix (2025 -> 2026) same as PerformancePage
        const processed = sentData.map(d => {
            if (d.Day && d.Day.startsWith('2025')) {
                return { ...d, Day: d.Day.replace('2025', '2026') };
            }
            return d;
        });

        // Get Targets Map
        const targetsMap = targetData.reduce((acc, curr) => {
            if (curr.Product_Target) {
                acc[curr.Product_Target] = parseInt(curr.Target_Lead_Sent || 0);
            }
            return acc;
        }, {});

        // Calculate Days Interval for "Daily Target" derivation (Page target uses Total / Days)
        const start = new Date(dateRange.start);
        const end = new Date(dateRange.end);
        const diffDays = Math.max(1, Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1);

        // Aggregate Data by Product for the selected range (usually 1 day for "Today Monitor" but configurable)
        const productStats = {};

        processed.forEach(row => {
            if (row.Day >= dateRange.start && row.Day <= dateRange.end) {
                if (!productStats[row.Product]) {
                    productStats[row.Product] = 0;
                }
                productStats[row.Product] += (row.Leads_Sent || 0);
            }
        });

        // Merge with All Products from Target (to show missing ones too)
        return Object.keys(targetsMap).map(prod => {
            const totalTarget = targetsMap[prod];
            const periodTarget = Math.round(totalTarget / 25 * diffDays); // Rough approx if total is for 25 days
            // Better: Just use the derived daily target logic from PerformancePage if possible.
            // Assuming "Target_Lead_Sent" in CSV is the MONTHLY target or TOTAL ROUND target?
            // User labeled it "Total Target (Round): 3,480 / 25 days = Daily Avg: 139" in the screenshot.
            // So yes, we need to divide by the "Round Duration" (25).
            // Let's hardcode 25 for now or fetch from logic broadly.
            const dailyAvgTarget = Math.round(totalTarget / 25);
            const targetForView = dailyAvgTarget * diffDays;

            const actual = productStats[prod] || 0;
            const diff = actual - targetForView;
            const percent = targetForView > 0 ? Math.round((actual / targetForView) * 100) : 0;

            // Frame Logic (90-110%)
            let status = 'Normal';
            if (percent < 90) status = 'Critical'; // Under
            else if (percent > 110) status = 'Warning'; // Over

            return {
                name: prod,
                target: targetForView,
                actual,
                diff,
                percent,
                status,
                // Chart Helpers
                minFrame: targetForView * 0.9,
                maxFrame: targetForView * 1.1,
                range: [targetForView * 0.9, targetForView * 1.1]
            };
        }).sort((a, b) => b.actual - a.actual); // Sort by highest volume

    }, [sentData, targetData, dateRange]);

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-white p-4 border border-slate-100 shadow-xl rounded-xl text-xs z-50 min-w-[200px]">
                    <p className="font-bold text-slate-800 mb-2 text-sm">{label}</p>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-slate-500">Target Goal:</span>
                            <span className="font-bold text-slate-700">{data.target}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-500">Actual Sent:</span>
                            <span className="font-bold text-indigo-600">{data.actual}</span>
                        </div>
                        <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                            <span className="text-slate-500">Variance:</span>
                            <span className={`font-bold ${data.diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {data.diff > 0 ? '+' : ''}{data.diff} ({data.percent}%)
                            </span>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-8 animate-fade-in-up pb-20">
            {/* Header / Controls */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Target className="w-6 h-6 text-rose-500" />
                        Target Monitor
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">
                        Live Pulse Check: Are we staying within the target frame?
                    </p>
                </div>
                <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                    <DateRangePicker
                        startDate={dateRange.start}
                        endDate={dateRange.end}
                        onChange={(range) => setDateRange(prev => ({ ...prev, ...range }))}
                    />
                </div>
            </div>

            {/* Visual Frame Chart */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <AlertOctagon className="w-4 h-4 text-indigo-500" />
                        Variance Control Frame
                    </h3>
                    <div className="flex gap-4 text-xs font-medium">
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 bg-emerald-100 border border-emerald-200 rounded"></div>
                            <span className="text-slate-500">Safe Frame (90-110%)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 bg-indigo-500 rounded"></div>
                            <span className="text-slate-500">Actual Sent</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-0.5 bg-slate-400 border-dashed border-t"></div>
                            <span className="text-slate-500">Target Line</span>
                        </div>
                    </div>
                </div>

                <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={monitorData} layout="vertical" margin={{ top: 0, right: 30, left: 100, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                            <XAxis type="number" hide />
                            <YAxis
                                dataKey="name"
                                type="category"
                                tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                                width={120}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />

                            {/* The "Frame" - Green Zone */}
                            <Bar dataKey="range" barSize={20} fill="#dcfce7" stackId="a" isAnimationActive={false} />
                            {/* Wait, simple Area won't work easily on vertical layout. 
                                 A common trick for "Range" bar is generic stacked bar: 
                                 [0 to minFrame] (transparent), [minFrame to maxFrame] (Green)
                              */}
                            {/* Let's try ReferenceArea equivalent or just customized shape. 
                                 Actually, let's keep it simple: "Target Line" + "Actual Bar".
                                 And maybe color the BAR itself based on status? 
                             */}

                            {/* Target Line (Vertical Dash) */}
                            <Bar dataKey="target" barSize={2} fill="#94a3b8" />

                            {/* Actual Bar - Dynamic Color */}
                            <Bar dataKey="actual" barSize={12} radius={[0, 4, 4, 0]}>
                                {
                                    monitorData.map((entry, index) => (
                                        <cell key={`cell-${index}`} fill={
                                            entry.status === 'Critical' ? '#f43f5e' : // Red
                                                entry.status === 'Warning' ? '#f59e0b' : // Amber
                                                    '#10b981' // Green
                                        } />
                                    ))
                                }
                            </Bar>
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Detailed Monitor Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider">
                        <tr>
                            <th className="px-6 py-4 text-left">Product</th>
                            <th className="px-6 py-4 text-center">Target</th>
                            <th className="px-6 py-4 text-center">Actual</th>
                            <th className="px-6 py-4 text-center">Variance (Diff)</th>
                            <th className="px-6 py-4 text-center">Frame Status</th>
                            <th className="px-6 py-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {monitorData.map((row) => (
                            <tr key={row.name} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4 font-bold text-slate-700">{row.name}</td>
                                <td className="px-6 py-4 text-center text-slate-500 font-medium">{row.target}</td>
                                <td className="px-6 py-4 text-center">
                                    <span className="font-bold text-slate-800 text-base">{row.actual}</span>
                                </td>

                                {/* Variance Column */}
                                <td className="px-6 py-4 text-center">
                                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg border ${row.diff > 0 ? 'bg-amber-50 border-amber-100 text-amber-700' :
                                            row.diff < 0 ? 'bg-rose-50 border-rose-100 text-rose-700' :
                                                'bg-slate-50 border-slate-100 text-slate-500'
                                        }`}>
                                        <span className="font-bold text-sm">
                                            {row.diff > 0 ? '+' : ''}{row.diff}
                                        </span>
                                        <span className="text-xs opacity-75 hidden sm:inline">
                                            ({row.percent}%)
                                        </span>
                                    </div>
                                </td>

                                {/* Frame Status */}
                                <td className="px-6 py-4 text-center">
                                    {row.status === 'Normal' && (
                                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                                            <CheckCircle className="w-3.5 h-3.5" /> In Frame
                                        </span>
                                    )}
                                    {row.status === 'Warning' && (
                                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">
                                            <TrendingUp className="w-3.5 h-3.5" /> Over Limit
                                        </span>
                                    )}
                                    {row.status === 'Critical' && (
                                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-100">
                                            <AlertTriangle className="w-3.5 h-3.5" /> Under Target
                                        </span>
                                    )}
                                </td>

                                {/* Action */}
                                <td className="px-6 py-4 text-right">
                                    {row.status === 'Critical' && (
                                        <div className="flex flex-col items-end">
                                            <span className="text-rose-600 font-bold text-xs flex items-center gap-1">
                                                <ArrowUpRight className="w-3 h-3" /> Push Leads
                                            </span>
                                            <span className="text-[10px] text-slate-400">Need ~{Math.abs(row.diff)} more</span>
                                        </div>
                                    )}
                                    {row.status === 'Warning' && (
                                        <div className="flex flex-col items-end">
                                            <span className="text-amber-600 font-bold text-xs flex items-center gap-1">
                                                <ArrowDownRight className="w-3 h-3" /> Throttle
                                            </span>
                                            <span className="text-[10px] text-slate-400">Exceeded by {row.diff}</span>
                                        </div>
                                    )}
                                    {row.status === 'Normal' && (
                                        <span className="text-slate-400 text-xs font-medium">Maintain</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DailyTargetMonitorPage;
