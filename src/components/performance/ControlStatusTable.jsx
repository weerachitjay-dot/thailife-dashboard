import React from 'react';
import { AlertTriangle, CheckCircle, TrendingUp, AlertOctagon, Minus } from 'lucide-react';

const ControlStatusTable = ({ data }) => {
    // Data: Array of { product, target, last2Days: [day1, day2], status: 'Critical'|'Warning'|'Normal' }

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-8">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-800">Control Status Reference</h3>
                <span className="text-xs text-slate-400">Status determined by last 2 days of data</span>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-center">
                    <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-wider">
                        <tr>
                            <th className="p-4 text-left">Product</th>
                            <th className="p-4 text-slate-600">Daily Target</th>
                            <th className="p-4 text-blue-500">Day N-1</th>
                            <th className="p-4 text-blue-600">Day N (Latest)</th>
                            <th className="p-4 text-left">Status</th>
                            <th className="p-4 text-right">Action Required</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-slate-600">
                        {data.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="p-8 text-center text-slate-400 font-medium">
                                    No data available for status check
                                </td>
                            </tr>
                        ) : (
                            data.map((row, i) => (
                                <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="p-4 text-left font-bold text-slate-700">{row.product}</td>
                                    <td className="p-4 font-medium">{row.target}</td>
                                    <td className="p-4">
                                        {row.last2Days[1] ? (
                                            <div className="flex flex-col items-center">
                                                <span className="text-[10px] text-slate-400 mb-1">{row.last2Days[1].date.substring(5)}</span>
                                                <span className={
                                                    row.last2Days[1].leads < row.target * 0.9 ? 'text-red-500 font-bold' :
                                                        row.last2Days[1].leads > row.target * 1.1 ? 'text-amber-500 font-bold' :
                                                            'text-slate-600'
                                                }>
                                                    {row.last2Days[1].leads}
                                                </span>
                                            </div>
                                        ) : '-'}
                                    </td>
                                    <td className="p-4">
                                        {row.last2Days[0] ? (
                                            <div className="flex flex-col items-center">
                                                <span className="text-[10px] text-slate-400 mb-1">{row.last2Days[0].date.substring(5)}</span>
                                                <span className={
                                                    row.last2Days[0].leads < row.target * 0.9 ? 'text-red-500 font-bold' :
                                                        row.last2Days[0].leads > row.target * 1.1 ? 'text-amber-500 font-bold' :
                                                            'text-slate-600'
                                                }>
                                                    {row.last2Days[0].leads}
                                                </span>
                                            </div>
                                        ) : '-'}
                                    </td>
                                    <td className="p-4 text-left">
                                        {row.status === 'Critical' && (
                                            <div className="flex items-center gap-2 text-rose-600 font-bold bg-rose-50 px-2 py-1 rounded w-fit">
                                                <AlertOctagon className="w-4 h-4" />
                                                Critical Low
                                            </div>
                                        )}
                                        {row.status === 'Warning' && (
                                            <div className="flex items-center gap-2 text-amber-600 font-bold bg-amber-50 px-2 py-1 rounded w-fit">
                                                <TrendingUp className="w-4 h-4" />
                                                High Variance
                                            </div>
                                        )}
                                        {row.status === 'Normal' && (
                                            <div className="flex items-center gap-2 text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded w-fit">
                                                <CheckCircle className="w-4 h-4" />
                                                On Track
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4 text-right font-bold">
                                        {row.status === 'Critical' && <span className="text-rose-600 animate-pulse">Optimize / Fix</span>}
                                        {row.status === 'Warning' && <span className="text-amber-600">Verify Sustainability</span>}
                                        {row.status === 'Normal' && <span className="text-slate-400 font-normal">No Action</span>}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ControlStatusTable;
