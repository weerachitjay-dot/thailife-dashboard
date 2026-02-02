import React from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { ArrowUp, ArrowDown, AlertTriangle, XCircle, CheckCircle2 } from 'lucide-react';

const statusConfig = {
    MAINTAIN: { icon: CheckCircle2, bgClass: 'bg-emerald-50', borderClass: 'border-emerald-200', textClass: 'text-emerald-700', label: 'ปกติ' },
    PUSH: { icon: AlertTriangle, bgClass: 'bg-amber-50', borderClass: 'border-amber-200', textClass: 'text-amber-700', label: 'ต้องเร่ง' },
    STOP: { icon: XCircle, bgClass: 'bg-rose-50', borderClass: 'border-rose-200', textClass: 'text-rose-700', label: 'ชะลอ' },
};

function MiniTrendChart({ data, status }) {
    const color = status === 'MAINTAIN' ? '#10b981' : status === 'PUSH' ? '#f59e0b' : '#f43f5e';

    return (
        <ResponsiveContainer width="100%" height={60}>
            <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <Line
                    type="monotone"
                    dataKey="value"
                    stroke={color}
                    strokeWidth={2}
                    dot={false}
                />
            </LineChart>
        </ResponsiveContainer>
    );
}

function ProductTrendCard({ product, trendData }) {
    const config = statusConfig[product.dailyStatus];
    const Icon = config.icon;
    const variance = product.dailyVariance;
    const isPositive = variance > 0;

    return (
        <div className={`${config.bgClass} border-2 ${config.borderClass} rounded-xl p-4`}>
            {/* Header */}
            <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                    <h4 className="font-bold text-sm text-slate-800 truncate">{product.productName}</h4>
                    {product.owner && (
                        <p className="text-[10px] text-slate-500">{product.owner}</p>
                    )}
                </div>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${config.bgClass} ${config.textClass} border ${config.borderClass}`}>
                    <Icon className="h-3 w-3" />
                    {config.label}
                </span>
            </div>

            {/* Mini Chart */}
            <div className="mb-2">
                <MiniTrendChart data={trendData} status={product.dailyStatus} />
            </div>

            {/* Metrics */}
            <div className="flex items-end justify-between">
                <div>
                    <p className="text-xs text-slate-500">จริง: <span className="font-mono font-bold text-slate-700">{product.dailyActual}</span></p>
                    <p className="text-xs text-slate-500">เป้า: <span className="font-mono">{Math.round(product.dailyTarget)}</span></p>
                </div>
                <div className="text-right">
                    <p className={`text-2xl font-bold tabular-nums ${config.textClass}`}>
                        {product.dailyPercentage.toFixed(0)}%
                    </p>
                    <p className={`text-xs font-mono flex items-center gap-0.5 justify-end ${isPositive ? 'text-rose-600' : 'text-amber-600'}`}>
                        {isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                        {isPositive && '+'}{Math.round(variance)}
                    </p>
                </div>
            </div>
        </div>
    );
}

export function ProductTrendGrid({ products }) {
    // Take top 6 by volume
    const topProducts = [...products]
        .sort((a, b) => b.dailyActual - a.dailyActual)
        .slice(0, 6);

    // Generate mock trend data (in real implementation, this would come from historical data)
    const generateTrendData = (product) => {
        // For now, generate dummy data based on current percentage
        const baseValue = product.dailyPercentage;
        return Array.from({ length: 7 }, (_, i) => ({
            value: baseValue + (Math.random() - 0.5) * 20
        }));
    };

    return (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
            <div className="mb-4">
                <h3 className="text-lg font-bold text-slate-800">กราฟแนวโน้ม Product (Top 6)</h3>
                <p className="text-sm text-slate-500">Product ที่มี Leads สูงสุด</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {topProducts.map((product) => (
                    <ProductTrendCard
                        key={product.productId}
                        product={product}
                        trendData={generateTrendData(product)}
                    />
                ))}
            </div>

            {topProducts.length === 0 && (
                <p className="text-center text-slate-400 py-8">ไม่มีข้อมูล</p>
            )}
        </div>
    );
}
