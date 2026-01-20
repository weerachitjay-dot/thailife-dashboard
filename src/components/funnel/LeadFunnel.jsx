import React from 'react';
import { ArrowDown } from 'lucide-react';

const FunnelStage = ({ label, count, color, subLabel }) => (
    <div className={`relative w-full h-16 ${color} rounded-lg flex items-center justify-between px-6 shadow-sm`}>
        <div className="flex flex-col">
            <span className="text-white font-bold text-xs uppercase tracking-wider opacity-90">{label}</span>
            <span className="text-white text-[10px] opacity-75">{subLabel}</span>
        </div>
        <span className="text-white font-black text-2xl drop-shadow-sm">{count.toLocaleString()}</span>
    </div>
);

const Connector = ({ dropOffRate, label }) => (
    <div className="flex flex-col items-center justify-center py-2 relative z-10">
        <ArrowDown className="w-5 h-5 text-slate-300 animate-bounce-slow" />
        <div className="text-center bg-white px-2 py-1 rounded border border-slate-100 shadow-sm mt-[-10px]">
            <span className="block text-xs font-bold text-rose-500">↓ {dropOffRate}% drop-off</span>
            <span className="block text-[10px] text-slate-400">{label}</span>
        </div>
    </div>
);

const LeadFunnel = ({ data }) => {
    // Data expected: { meta: number, sent: number, tl: number }
    const { meta, sent, tl } = data;

    // Calculations
    const metaToSentDrop = meta > 0 ? ((meta - sent) / meta * 100).toFixed(1) : 0;
    const sentToTlDrop = sent > 0 ? ((sent - tl) / sent * 100).toFixed(1) : 0;

    const metaToSentRate = meta > 0 ? ((sent / meta) * 100).toFixed(1) : 0;
    const sentToTlRate = sent > 0 ? ((tl / sent) * 100).toFixed(1) : 0;

    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm h-full flex flex-col">
            <h3 className="text-lg font-bold text-slate-800 mb-6 font-primary">Lead Conversion Funnel</h3>

            <div className="flex-1 flex flex-col justify-center space-y-1">
                {/* Stage 1: Meta Leads */}
                <FunnelStage
                    label="Meta Leads"
                    subLabel="Raw Interest"
                    count={meta}
                    color="bg-slate-500" // Updated to match design (grey)
                />

                {/* Connector 1 */}
                <Connector dropOffRate={Math.max(0, metaToSentDrop)} label="Screening Process" />

                {/* Stage 2: Sent Leads */}
                <FunnelStage
                    label="Sent Leads"
                    subLabel="Qualified"
                    count={sent}
                    color="bg-blue-500" // Updated to match design (blue)
                />

                {/* Connector 2 */}
                <Connector dropOffRate={Math.max(0, sentToTlDrop)} label="Customer Unreachable" />

                {/* Stage 3: TL Leads */}
                <FunnelStage
                    label="TL Leads"
                    subLabel="Confirmed Revenue"
                    count={tl}
                    color="bg-emerald-500" // Updated to match design (green)
                />
            </div>

            {/* Footer Stats */}
            <div className="mt-8 pt-4 border-t border-slate-100 flex justify-between px-4">
                <div className="text-center">
                    <p className="text-xs text-slate-400 mb-1">Meta → Sent Rate</p>
                    <p className="text-xl font-black text-blue-600">{metaToSentRate}%</p>
                </div>
                <div className="text-center">
                    <p className="text-xs text-slate-400 mb-1">Sent → TL Rate</p>
                    <p className="text-xl font-black text-emerald-500">{sentToTlRate}%</p>
                </div>
            </div>
        </div>
    );
};

export default LeadFunnel;
