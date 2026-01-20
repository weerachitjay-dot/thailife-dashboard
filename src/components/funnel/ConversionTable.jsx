import React from 'react';

const ConversionTable = ({ data }) => {
    // Expected Data: Array of { product, meta, sent, tl, screenRate, tlConvRate }

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mt-6">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-sm font-bold text-slate-800">Detailed Conversion Breakdown</h3>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-center">
                    <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-wider">
                        <tr>
                            <th className="p-4 text-left">Product</th>
                            <th className="p-4 text-slate-500">Meta Leads</th>
                            <th className="p-4 text-blue-500">Sent Leads</th>
                            <th className="p-4 text-emerald-500">TL Leads</th>
                            <th className="p-4 text-slate-600">Screen Rate</th>
                            <th className="p-4 text-slate-600">TL Conv Rate</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-slate-600">
                        {data.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="p-8 text-center text-slate-400 font-medium">
                                    No data for selected filter
                                </td>
                            </tr>
                        ) : (
                            data.map((row, i) => (
                                <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="p-4 text-left font-bold text-slate-700">{row.product}</td>
                                    <td className="p-4 font-medium">{row.meta.toLocaleString()}</td>
                                    <td className="p-4 font-bold text-blue-600">{row.sent.toLocaleString()}</td>
                                    <td className="p-4 font-bold text-emerald-600">{row.tl.toLocaleString()}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${row.screenRate >= 75 ? 'bg-emerald-100 text-emerald-700' :
                                                row.screenRate >= 65 ? 'bg-amber-100 text-amber-700' :
                                                    'bg-orange-100 text-orange-700'
                                            }`}>
                                            {row.screenRate}%
                                        </span>
                                    </td>
                                    <td className="p-4 font-bold text-slate-700">{row.tlConvRate}%</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ConversionTable;
