import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

export function PeriodPercentageChart({ data }) {
    const chartData = data.map(item => ({
        name: item.productName.length > 15 ? item.productName.substring(0, 15) + '...' : item.productName,
        fullName: item.productName,
        percentage: item.dailyPercentage,
        status: item.dailyStatus,
    }));

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-white border border-slate-200 p-3 shadow-lg rounded-lg text-xs">
                    <p className="font-bold text-slate-800 mb-1">{data.fullName}</p>
                    <p className="text-slate-600">% ของเป้า: <span className="font-mono font-bold">{data.percentage.toFixed(1)}%</span></p>
                </div>
            );
        }
        return null;
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'MAINTAIN': return '#10b981';
            case 'PUSH': return '#f59e0b';
            case 'STOP': return '#f43f5e';
            default: return '#64748b';
        }
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-800">กราฟเส้น % ของเป้าหมาย (วันนี้)</h3>
                <p className="text-sm text-slate-500">
                    พื้นที่เขียว = ปกติ (90-110%), เหลือง = ต้องเร่ง, แดง = เกินเป้า
                </p>
            </div>

            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />

                        {/* Reference lines for zones */}
                        <ReferenceLine y={90} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: '90%', position: 'left', fill: '#f59e0b', fontSize: 10 }} />
                        <ReferenceLine y={110} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: '110%', position: 'left', fill: '#f43f5e', fontSize: 10 }} />

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
                            domain={[0, 150]}
                            ticks={[0, 50, 90, 110, 150]}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#e2e8f0', strokeWidth: 1 }} />

                        <Line
                            type="monotone"
                            dataKey="percentage"
                            stroke="#6366f1"
                            strokeWidth={3}
                            dot={(props) => {
                                const { cx, cy, payload } = props;
                                const color = getStatusColor(payload.status);
                                return (
                                    <circle
                                        cx={cx}
                                        cy={cy}
                                        r={5}
                                        fill={color}
                                        stroke="white"
                                        strokeWidth={2}
                                    />
                                );
                            }}
                            activeDot={{ r: 7 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
