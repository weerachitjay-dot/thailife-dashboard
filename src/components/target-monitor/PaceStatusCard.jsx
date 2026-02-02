import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

const statusConfig = {
    MAINTAIN: {
        icon: CheckCircle2,
        bgClass: 'bg-emerald-50',
        borderClass: 'border-emerald-200',
        iconClass: 'text-emerald-600',
        barClass: 'bg-emerald-500'
    },
    PUSH: {
        icon: AlertTriangle,
        bgClass: 'bg-amber-50',
        borderClass: 'border-amber-200',
        iconClass: 'text-amber-600',
        barClass: 'bg-amber-500'
    },
    STOP: {
        icon: XCircle,
        bgClass: 'bg-rose-50',
        borderClass: 'border-rose-200',
        iconClass: 'text-rose-600',
        barClass: 'bg-rose-500'
    },
};

export function PaceStatusCard({ title, count, total, status, description }) {
    const config = statusConfig[status];
    const Icon = config.icon;
    const percentage = total > 0 ? (count / total) * 100 : 0;

    return (
        <div className={`bg-white rounded-xl border-2 p-5 shadow-sm ${config.borderClass}`}>
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-slate-500">
                    {title}
                </h3>
                <Icon className={`h-5 w-5 ${config.iconClass}`} />
            </div>

            <div className="text-3xl font-bold tabular-nums text-slate-800">
                {count} <span className="text-lg text-slate-400 font-normal">/ {total}</span>
            </div>

            <div className="mt-2 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                    className={`h-full transition-all rounded-full ${config.barClass}`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
            <p className="text-xs text-slate-500 mt-2">{description}</p>
        </div>
    );
}
