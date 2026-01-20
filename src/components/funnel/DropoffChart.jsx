import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { AlertTriangle } from 'lucide-react';

const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-white p-3 border border-slate-100 shadow-xl rounded-lg text-xs z-50">
                <p className="font-bold text-slate-800 mb-1">{data.product}</p>
                <div className="space-y-1">
                    <p className="text-slate-500">Screen Rate: <span className={`font-bold ${data.color.replace('bg-', 'text-')}`}>{data.screenRate}%</span></p>
                    <p className="text-slate-500">Meta Leads: {data.meta}</p>
                    <p className="text-slate-500">Sent Leads: {data.sent}</p>
                </div>
            </div>
        );
    }
    return null;
};

const DropoffChart = ({ data }) => {
    // Data expected: array of { product, screenRate (0-100), meta, sent }

    // Color Logic
    const getColor = (rate) => {
        if (rate >= 75) return '#10b981'; // Good (Emerald)
        if (rate >= 65) return '#f59e0b'; // Watch (Amber)
        return '#f97316'; // Risk (Orange/Red) - User design uses Orange for risk
    };

    const processedData = data.map(d => ({
        ...d,
        fill: getColor(d.screenRate)
    }));

    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm h-full flex flex-col relative">
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-slate-800 font-primary">Drop-off Rate by Product</h3>
                <span className="text-xs font-bold text-orange-500 flex items-center gap-1">
                    📉 Screening Loss
                </span>
            </div>

            {data.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
                    <p>No data for selected filter</p>
                </div>
            ) : (
                <div className="flex-1 w-full min-h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis type="category" dataKey="product" hide={true} />
                            <YAxis type="number" dataKey="screenRate" unit="%" domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                            <ReferenceLine y={65} stroke="#f97316" strokeDasharray="3 3" strokeOpacity={0.5} label={{ value: 'Risk Line', position: 'right', fontSize: 10, fill: '#f97316' }} />
                            <Scatter name="Products" data={processedData} fill="#8884d8">
                                {processedData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Scatter>
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Legend */}
            <div className="mt-4 flex justify-center gap-6 text-[10px] text-slate-500 font-medium">
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div> ≥75% Good</div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div> 65-75% Watch</div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-orange-500"></div> &lt;65% Risk</div>
            </div>
        </div>
    );
};

export default DropoffChart;
