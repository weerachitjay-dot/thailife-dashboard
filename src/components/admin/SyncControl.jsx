
import React, { useState } from 'react';
import { RefreshCw, Check, AlertTriangle, FileSpreadsheet, Trash2 } from 'lucide-react';
import { syncSheetToSupabase } from '../../lib/sync';
import { clearCache } from '../../lib/cache';

const SyncRow = ({ label, type }) => {
    const [status, setStatus] = useState('idle'); // idle, syncing, success, error
    const [message, setMessage] = useState('');
    const [lastSync, setLastSync] = useState(null);

    const handleSync = async () => {
        setStatus('syncing');
        setMessage('');
        try {
            const result = await syncSheetToSupabase(type);
            setStatus('success');
            setMessage(`${result.count} rows synced.`);
            setLastSync(new Date());
        } catch (err) {
            console.error(err);
            setStatus('error');
            setMessage(err.message);
        }
    };

    return (
        <div className="flex items-center justify-between p-4 bg-white/50 rounded-xl border border-slate-100 hover:border-indigo-100 transition-all">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                    <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                    <h4 className="font-bold text-slate-700">{label}</h4>
                    <p className="text-xs text-slate-400">
                        {type} • {lastSync ? `Last: ${lastSync.toLocaleTimeString()}` : 'Not synced yet'}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-4">
                {status === 'success' && <span className="text-xs font-bold text-green-600 flex items-center gap-1"><Check className="w-3 h-3" /> {message}</span>}
                {status === 'error' && <span className="text-xs font-bold text-red-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {message}</span>}

                <button
                    onClick={handleSync}
                    disabled={status === 'syncing'}
                    className={`p-2 rounded-lg transition-all ${status === 'syncing'
                        ? 'bg-slate-100 text-slate-400'
                        : 'bg-white border border-slate-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 shadow-sm'
                        }`}
                >
                    <RefreshCw className={`w-4 h-4 ${status === 'syncing' ? 'animate-spin' : ''}`} />
                </button>
            </div>
        </div>
    );
};

const SyncControl = () => {
    const [isClearing, setIsClearing] = useState(false);

    const handleForceRefresh = async () => {
        setIsClearing(true);
        try {
            await clearCache();
            // Reload the page to fetch fresh data
            window.location.reload();
        } catch (err) {
            console.error('Failed to clear cache:', err);
            setIsClearing(false);
        }
    };

    return (
        <div className="glass-card p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-indigo-600" />
                    Data Sync Control
                </h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleForceRefresh}
                        disabled={isClearing}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${isClearing
                                ? 'bg-slate-100 text-slate-400'
                                : 'bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200'
                            }`}
                        title="ล้าง Cache และโหลดข้อมูลใหม่"
                    >
                        <Trash2 className={`w-3.5 h-3.5 ${isClearing ? 'animate-spin' : ''}`} />
                        {isClearing ? 'Clearing...' : 'Force Refresh'}
                    </button>
                    <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded">Manual Mode</span>
                </div>
            </div>

            <div className="space-y-3">
                <SyncRow label="Append Data (Main)" type="append" />
                <SyncRow label="Sent Leads" type="sent" />
                <SyncRow label="Targets & Owners" type="target" />
                <SyncRow label="Time Analysis" type="append_time" />
                {/* Telesales might not be fully ready in config or CSV, check constants */}
                <SyncRow label="Telesales Data" type="telesales" />
            </div>
        </div>
    );
};

export default SyncControl;
