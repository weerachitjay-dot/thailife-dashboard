import React from 'react';
import { format } from 'date-fns';
import { ArrowUp, ArrowDown, Minus, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

const getStatusInfo = (status) => {
    switch (status) {
        case 'MAINTAIN':
            return {
                icon: CheckCircle2,
                label: 'ปกติ',
                bgClass: 'bg-emerald-100 text-emerald-700',
            };
        case 'PUSH':
            return {
                icon: AlertTriangle,
                label: 'ต้องเร่ง',
                bgClass: 'bg-amber-100 text-amber-700',
            };
        case 'STOP':
            return {
                icon: XCircle,
                label: 'ชะลอ',
                bgClass: 'bg-rose-100 text-rose-700',
            };
        default:
            return { icon: Minus, label: '-', bgClass: 'bg-slate-100' };
    }
};

function StatusBadge({ status }) {
    const info = getStatusInfo(status);
    const Icon = info.icon;

    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-bold uppercase ${info.bgClass}`}>
            <Icon className="h-3.5 w-3.5" />
            {info.label}
        </span>
    );
}

function VarianceDisplay({ value, showIcon = true }) {
    const isPositive = value > 0;
    const isNegative = value < 0;

    return (
        <span className={`inline-flex items-center gap-1 font-mono text-sm ${isPositive ? 'text-rose-600' : isNegative ? 'text-amber-600' : 'text-slate-400'
            }`}>
            {showIcon && (
                isPositive ? <ArrowUp className="h-3.5 w-3.5" /> :
                    isNegative ? <ArrowDown className="h-3.5 w-3.5" /> :
                        <Minus className="h-3.5 w-3.5" />
            )}
            {isPositive && '+'}{Math.round(value).toLocaleString()}
        </span>
    );
}

function PercentageBar({ percentage, status }) {
    const clampedPercentage = Math.min(Math.max(percentage, 0), 150);

    const barColor = status === 'MAINTAIN'
        ? 'bg-emerald-500'
        : status === 'PUSH'
            ? 'bg-amber-500'
            : 'bg-rose-500';

    return (
        <div className="flex items-center gap-2">
            <div className="relative h-2 w-24 bg-slate-100 rounded-full overflow-hidden">
                <div
                    className="absolute top-0 bottom-0 w-0.5 bg-slate-400 z-10"
                    style={{ left: `${Math.min((100 / 150) * 100, 100)}%` }}
                />
                <div
                    className={`h-full transition-all ${barColor}`}
                    style={{ width: `${(clampedPercentage / 150) * 100}%` }}
                />
            </div>
            <span className="font-mono text-xs w-12 text-slate-500">{percentage.toFixed(0)}%</span>
        </div>
    );
}

export function TargetMonitorTable({ data, selectedDate, daysInWeek, daysInPeriod }) {
    const sortedData = [...data].sort((a, b) => {
        const priority = { PUSH: 0, STOP: 1, MAINTAIN: 2 };
        return priority[a.dailyStatus] - priority[b.dailyStatus];
    });

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-800">รายละเอียดตาม Product</h3>
                <p className="text-sm text-slate-500">
                    วันที่ {format(new Date(selectedDate), 'dd/MM/yyyy')} — สัปดาห์นี้ผ่านมา {daysInWeek} วัน — รอบนี้ {daysInPeriod} วัน
                </p>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                        <tr>
                            <th className="sticky left-0 z-20 bg-slate-50 px-4 py-3 w-[200px]">Product</th>
                            <th className="px-4 py-3 text-center border-l border-slate-200" colSpan={4}>
                                วันนี้ (TODAY)
                            </th>
                            <th className="px-4 py-3 text-center border-l border-slate-200" colSpan={4}>
                                สัปดาห์นี้ (WEEK)
                            </th>
                            <th className="px-4 py-3 text-center border-l border-slate-200" colSpan={4}>
                                รอบนี้ (PERIOD)
                            </th>
                        </tr>
                        <tr className="text-xs uppercase tracking-wider">
                            <th className="sticky left-0 z-20 bg-slate-50 px-4 py-2"></th>
                            <th className="px-4 py-2 text-right border-l border-slate-200">เป้า</th>
                            <th className="px-4 py-2 text-right">จริง</th>
                            <th className="px-4 py-2 text-center">%</th>
                            <th className="px-4 py-2 text-center">สถานะ</th>
                            <th className="px-4 py-2 text-right border-l border-slate-200">เป้าสะสม</th>
                            <th className="px-4 py-2 text-right">จริงสะสม</th>
                            <th className="px-4 py-2 text-center">%</th>
                            <th className="px-4 py-2 text-center">สถานะ</th>
                            <th className="px-4 py-2 text-right border-l border-slate-200">เป้ารอบ</th>
                            <th className="px-4 py-2 text-right">จริงรอบ</th>
                            <th className="px-4 py-2 text-center">%</th>
                            <th className="px-4 py-2 text-center">สถานะ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {sortedData.map((item) => (
                            <tr key={item.productId} className="group hover:bg-slate-50 transition-colors">
                                <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 px-4 py-4 font-medium text-slate-700 border-r border-slate-200 transition-colors">
                                    <div>
                                        <p>{item.productName}</p>
                                        {item.owner && (
                                            <p className="text-[10px] text-slate-400">{item.owner}</p>
                                        )}
                                    </div>
                                </td>

                                {/* TODAY */}
                                <td className="px-4 py-4 text-right font-mono text-slate-500 border-l border-slate-100">
                                    {Math.round(item.dailyTarget).toLocaleString()}
                                </td>
                                <td className="px-4 py-4 text-right">
                                    <div className="flex flex-col items-end">
                                        <span className="font-mono font-bold text-slate-700">{item.dailyActual.toLocaleString()}</span>
                                        <VarianceDisplay value={item.dailyVariance} />
                                    </div>
                                </td>
                                <td className="px-4 py-4">
                                    <PercentageBar percentage={item.dailyPercentage} status={item.dailyStatus} />
                                </td>
                                <td className="px-4 py-4 text-center">
                                    <StatusBadge status={item.dailyStatus} />
                                </td>

                                {/* WEEK */}
                                <td className="px-4 py-4 text-right font-mono text-slate-500 border-l border-slate-100">
                                    {Math.round(item.weekTarget).toLocaleString()}
                                </td>
                                <td className="px-4 py-4 text-right">
                                    <div className="flex flex-col items-end">
                                        <span className="font-mono font-bold text-slate-700">{item.weekActual.toLocaleString()}</span>
                                        <VarianceDisplay value={item.weekVariance} />
                                    </div>
                                </td>
                                <td className="px-4 py-4">
                                    <PercentageBar percentage={item.weekPercentage} status={item.weekStatus} />
                                </td>
                                <td className="px-4 py-4 text-center">
                                    <StatusBadge status={item.weekStatus} />
                                </td>

                                {/* PERIOD */}
                                <td className="px-4 py-4 text-right font-mono text-slate-500 border-l border-slate-100">
                                    {Math.round(item.periodTarget).toLocaleString()}
                                </td>
                                <td className="px-4 py-4 text-right">
                                    <div className="flex flex-col items-end">
                                        <span className="font-mono font-bold text-slate-700">{item.periodActual.toLocaleString()}</span>
                                        <VarianceDisplay value={item.periodVariance} />
                                    </div>
                                </td>
                                <td className="px-4 py-4">
                                    <PercentageBar percentage={item.periodPercentage} status={item.periodStatus} />
                                </td>
                                <td className="px-4 py-4 text-center">
                                    <StatusBadge status={item.periodStatus} />
                                </td>
                            </tr>
                        ))}

                        {sortedData.length === 0 && (
                            <tr>
                                <td colSpan={13} className="px-4 py-12 text-center text-slate-400">
                                    ไม่มีข้อมูลสำหรับวันที่เลือก
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

