import React from 'react';
import {
    AlertTriangle,
    CheckCircle,
    TrendingUp,
    AlertOctagon,
    Minus,
    ArrowUpRight,
    ArrowDownRight,
    Target
} from 'lucide-react';

const ControlStatusTable = ({ data }) => {
    // Helper to calculate percentage and variance
    const getVariance = (actual, target) => {
        if (!target) return { percent: 0, isHigh: false };
        const percent = Math.round((actual / target) * 100);
        return { percent };
    };

    const getStatusColor = (leads, target) => {
        if (!target) return 'text-slate-400 bg-slate-50';
        const percent = (leads / target) * 100;
        if (percent < 90) return 'text-rose-600 bg-rose-50 border-rose-100';
        if (percent > 110) return 'text-amber-600 bg-amber-50 border-amber-100';
        return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-8">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white">
                <div>
                    <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-indigo-500" />
                        Control Status Reference
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">Monitoring daily lead performance against targets</p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span className="text-slate-600">On Track (90-110%)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        <span className="text-slate-600">High Variance (&gt;110%)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        <span className="text-slate-600">Critical Low (&lt;90%)</span>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50/80 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-4 text-left w-1/4">Product / Target</th>
                            <th className="px-6 py-4 text-center w-1/5">Day N-1</th>
                            <th className="px-6 py-4 text-center w-1/5">Day N (Latest)</th>
                            <th className="px-6 py-4 text-left">Status & Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {data.map((row, i) => {
                            const dayMinus1 = row.last2Days[1];
                            const dayLatest = row.last2Days[0];

                            return (
                                <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col gap-1">
                                            <span className="font-bold text-slate-700 text-base">{row.product}</span>
                                            <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium bg-slate-100 w-fit px-2 py-0.5 rounded-full">
                                                <Target className="w-3 h-3" />
                                                Target: {row.target}
                                            </div>
                                        </div>
                                    </td>

                                    {/* Day N-1 */}
                                    <td className="px-6 py-5">
                                        {dayMinus1 ? (
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                    {new Date(dayMinus1.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })}
                                                </span>
                                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${getStatusColor(dayMinus1.leads, row.target)}`}>
                                                    <span className="text-lg font-bold">{dayMinus1.leads}</span>
                                                    <div className="flex flex-col items-start leading-none gap-0.5 border-l border-current pl-2 opacity-80">
                                                        <span className="text-[10px] font-bold">
                                                            {dayMinus1.leads - row.target > 0 ? '+' : ''}{dayMinus1.leads - row.target}
                                                        </span>
                                                        <span className="text-[10px]">
                                                            ({getVariance(dayMinus1.leads, row.target).percent}%)
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center text-slate-300">-</div>
                                        )}
                                    </td>

                                    {/* Day N (Latest) */}
                                    <td className="px-6 py-5 bg-slate-50/30">
                                        {dayLatest ? (
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                                                    Latest
                                                </span>
                                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${getStatusColor(dayLatest.leads, row.target)} ransition-transform group-hover:scale-105 duration-200`}>
                                                    <span className="text-lg font-bold">{dayLatest.leads}</span>
                                                    <div className="flex flex-col items-start leading-none gap-0.5 border-l border-current pl-2 opacity-80">
                                                        <span className="text-[10px] font-bold">
                                                            {dayLatest.leads - row.target > 0 ? '+' : ''}{dayLatest.leads - row.target}
                                                        </span>
                                                        <span className="text-[10px]">
                                                            ({getVariance(dayLatest.leads, row.target).percent}%)
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center text-slate-300">-</div>
                                        )}
                                    </td>

                                    <td className="px-6 py-5">
                                        <div className="flex items-start gap-3">
                                            <div className="mt-1">
                                                {row.status === 'Critical' && <AlertOctagon className="w-5 h-5 text-rose-500" />}
                                                {row.status === 'Warning' && <TrendingUp className="w-5 h-5 text-amber-500" />}
                                                {row.status === 'Normal' && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className={`font-bold text-sm ${row.status === 'Critical' ? 'text-rose-700' :
                                                    row.status === 'Warning' ? 'text-amber-700' :
                                                        'text-emerald-700'
                                                    }`}>
                                                    {row.status === 'Critical' ? 'Critical Low Performance' :
                                                        row.status === 'Warning' ? 'High Variance' :
                                                            'On Track'}
                                                </span>
                                                <span className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                                                    {row.status === 'Critical' && "Immediate action required. Review ad spend & creative performance."}
                                                    {row.status === 'Warning' && "Monitor closely. Verify if high volume is sustainable."}
                                                    {row.status === 'Normal' && "Performance is stable. No action required."}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}

                        {data.length === 0 && (
                            <tr>
                                <td colSpan="4" className="p-8 text-center text-slate-400">
                                    No data available
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ControlStatusTable;
