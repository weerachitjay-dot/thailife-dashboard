import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

const statusColors = {
    MAINTAIN: '#10b981',
    PUSH: '#f59e0b',
    STOP: '#f43f5e',
};

export function TargetMonitorChart({ data }) {
    const chartData = data.map(item => ({
        name: item.productName.length > 15 ? item.productName.substring(0, 15) + '...' : item.productName,
        fullName: item.productName,
        actual: item.dailyActual,
        target: item.dailyTarget,
        percentage: item.dailyPercentage,
        status: item.dailyStatus,
        variance: item.dailyVariance,
    }));

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-white border border-slate-200 p-3 shadow-lg rounded-lg text-xs">
                    <p className="font-bold text-slate-800 mb-2">{data.fullName}</p>
                    <div className="space-y-1">
                        <p className="flex justify-between gap-4">
                            <span className="text-slate-500">เป้า:</span>
                            <span className="font-mono font-medium">{Math.round(data.target).toLocaleString()}</span>
                        </p>
                        <p className="flex justify-between gap-4">
                            <span className="text-slate-500">จริง:</span>
                            <span className="font-mono font-bold">{data.actual.toLocaleString()}</span>
                        </p>
                        <p className="flex justify-between gap-4">
                            <span className="text-slate-500">ส่วนต่าง:</span>
                            <span className={`font-mono font-bold ${data.variance > 0 ? 'text-rose-600' : data.variance < 0 ? 'text-amber-600' : 'text-slate-600'
                                }`}>
                                {data.variance > 0 ? '+' : ''}{Math.round(data.variance).toLocaleString()}
                            </span>
                        </p>
                        <p className="flex justify-between gap-4">
                            <span className="text-slate-500">% ของเป้า:</span>
                            <span className="font-mono font-bold">{data.percentage.toFixed(1)}%</span>
                        </p>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-800">กราฟเปรียบเทียบ Actual vs Target (วันนี้)</h3>
                <p className="text-sm text-slate-500">
                    แท่งสีเขียว = ปกติ (90-110%), สีเหลือง = ต้องเร่ง (&lt;90%), สีแดง = เกินเป้า (&gt;110%)
                </p>
            </div>

            <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 80 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis
                            dataKey="name"
                            angle={-45}
                            textAnchor="end"
                            height={80}
                            tick={{ fontSize: 11, fill: '#64748b' }}
                            stroke="#cbd5e1"
                            interval={0}
                        />
                        <YAxis
                            stroke="#cbd5e1"
                            tick={{ fontSize: 11, fill: '#64748b' }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                        <Legend verticalAlign="top" height={36} iconType="circle" />

                        <Bar
                            dataKey="target"
                            name="เป้า"
                            fill="#94a3b8"
                            fillOpacity={0.3}
                            radius={[4, 4, 0, 0]}
                        />
                        <Bar dataKey="actual" name="จริง" radius={[4, 4, 0, 0]}>
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={statusColors[entry.status]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
