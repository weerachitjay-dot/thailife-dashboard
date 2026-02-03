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

function ProductTrendCard({ product, trendData, daysInWeek, daysPassedInPeriod }) {
    // Determine overall status (use Week status as primary)
    const status = product.weekStatus;
    const config = statusConfig[status];
    const Icon = config.icon;

    // Calculate current avg/day and target avg/day
    const currentAvgPerDay = daysPassedInPeriod > 0 ? product.periodActual / daysPassedInPeriod : 0;
    const targetAvgPerDay = product.periodTarget / (product.periodTarget / (product.dailyTarget || 1)); // Approximate days in period

    // Calculate action needed
    let actionText = '';
    let actionDetail = '';

    if (status === 'PUSH') {
        // Need to increase
        const needed = targetAvgPerDay - currentAvgPerDay;
        actionText = `⚡ เพิ่ม ${needed.toFixed(1)} leads/วัน`;
        actionDetail = `จาก ${currentAvgPerDay.toFixed(1)} → ${targetAvgPerDay.toFixed(1)} leads/วัน`;
    } else if (status === 'STOP') {
        // Need to reduce
        const reductionPct = ((currentAvgPerDay - targetAvgPerDay) / currentAvgPerDay * 100);
        actionText = `🛑 ลด ${reductionPct.toFixed(0)}%`;
        actionDetail = `จาก ${currentAvgPerDay.toFixed(1)} → ${targetAvgPerDay.toFixed(1)} leads/วัน`;
    } else {
        // Maintain
        actionText = `✅ รักษา ${currentAvgPerDay.toFixed(1)} leads/วัน`;
        actionDetail = 'อยู่ในกรอบเป้าหมาย';
    }

    return (
        <div className={`${config.bgClass} border-2 ${config.borderClass} rounded-xl p-4`}>
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
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

            {/* Week & Period Status */}
            <div className="space-y-2 mb-3 pb-3 border-b border-slate-200">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">📊 Week:</span>
                    <div className="text-right">
                        <span className={`text-sm font-bold ${config.textClass}`}>{product.weekPercentage.toFixed(0)}%</span>
                        <span className="text-xs text-slate-500 ml-2">({product.weekActual}/{Math.round(product.weekTarget)})</span>
                    </div>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">📈 Period:</span>
                    <div className="text-right">
                        <span className={`text-sm font-bold ${config.textClass}`}>{product.periodPercentage.toFixed(0)}%</span>
                        <span className="text-xs text-slate-500 ml-2">({product.periodActual}/{Math.round(product.periodTarget)})</span>
                    </div>
                </div>
            </div>

            {/* Action Recommendation */}
            <div className="bg-white bg-opacity-50 rounded-lg p-2">
                <p className="text-xs font-bold text-slate-700 mb-1">{actionText}</p>
                <p className="text-[10px] text-slate-600">{actionDetail}</p>
            </div>
        </div>
    );
}

export function ProductTrendGrid({ products, daysInWeek, daysPassedInPeriod }) {
    // Take top 6 by volume
    const topProducts = [...products]
        .sort((a, b) => b.periodActual - a.periodActual) // Sort by period actual instead of daily
        .slice(0, 6);

    // Generate mock trend data (in real implementation, this would come from historical data)
    const generateTrendData = (product) => {
        // For now, generate dummy data based on current percentage
        const baseValue = product.weekPercentage;
        return Array.from({ length: 7 }, (_, i) => ({
            value: baseValue + (Math.random() - 0.5) * 20
        }));
    };

    return (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
            <div className="mb-4">
                <h3 className="text-lg font-bold text-slate-800">แนวโน้ม Product (Top 6)</h3>
                <p className="text-sm text-slate-500">Product ที่มี Leads สูงสุด พร้อมคำแนะนำ</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {topProducts.map((product) => (
                    <ProductTrendCard
                        key={product.productId}
                        product={product}
                        trendData={generateTrendData(product)}
                        daysInWeek={daysInWeek}
                        daysPassedInPeriod={daysPassedInPeriod}
                    />
                ))}
            </div>

            {topProducts.length === 0 && (
                <p className="text-center text-slate-400 py-8">ไม่มีข้อมูล</p>
            )}
        </div>
    );
}
