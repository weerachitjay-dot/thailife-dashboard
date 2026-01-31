import React from 'react';
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { BarChart2 } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        // payload[0] usually range area, [1] target, [2] actual
        // Find by dataKey
        const actual = payload.find(p => p.dataKey === 'actual');
        const target = payload.find(p => p.dataKey === 'target');
        const range = payload.find(p => p.dataKey === 'range');

        return (
            <div className="bg-white p-3 border border-slate-100 shadow-xl rounded-lg text-xs z-50">
                <p className="font-bold text-slate-800 mb-1">{label}</p>
                <div className="space-y-1">
                    {actual && (
                        <p className="text-blue-600 font-bold">Actual: {actual.value}</p>
                    )}
                    {target && (
                        <p className="text-emerald-600">Target: {target.value}</p>
                    )}
                    {range && (
                        <p className="text-slate-400 text-[10px]">
                            Control Band: {range.value[0].toFixed(0)} - {range.value[1].toFixed(0)}
                        </p>
                    )}
                </div>
            </div>
        );
    }
    return null;
};

const PerformanceChart = ({ data, viewMode }) => {
    // Data: { day, actual, target, range: [lower, upper] }

    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm h-full flex flex-col">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 font-primary">Performance Overview</h3>
                    <p className="text-xs text-slate-500">Actual Sent Leads vs Target ({viewMode === 'weekly' ? 'Weekly' : 'Daily'})</p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                        <div className="w-6 h-3 bg-emerald-100 border border-emerald-200 rounded"></div>
                        <span className="text-slate-600 font-medium">Safe Zone (Target ±10%)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-0.5 bg-emerald-500 border-dashed border-t"></div>
                        <span className="text-slate-600 font-medium">Target</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-slate-600 font-medium">Actual</span>
                    </div>
                </div>
            </div>

            <div className="w-full h-[400px]">
                {data.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300">
                        <BarChart2 className="w-12 h-12 mb-2 opacity-20" />
                        <p>No performance data in selected range</p>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="day"
                                tick={{ fontSize: 10, fill: '#64748b' }}
                                axisLine={false}
                                tickLine={false}
                                minTickGap={30}
                            />
                            <YAxis
                                tick={{ fontSize: 10, fill: '#64748b' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />

                            {/* Control Band (Area) */}
                            <Area
                                type="monotone"
                                dataKey="range"
                                fill="#dcfce7"
                                stroke="none"
                                fillOpacity={0.6}
                            />

                            {/* Target Line */}
                            <Line
                                type="monotone"
                                dataKey="target"
                                stroke="#10b981"
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                dot={false}
                                activeDot={false}
                            />

                            {/* Actual Line */}
                            <Line
                                type="monotone"
                                dataKey="actual"
                                stroke="#3b82f6"
                                strokeWidth={3}
                                dot={{ r: 3, strokeWidth: 0, fill: '#3b82f6' }}
                                activeDot={{ r: 6, strokeWidth: 0 }}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};

export default PerformanceChart;
