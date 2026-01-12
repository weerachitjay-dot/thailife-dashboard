
import React from 'react';
import FacebookLogin from '../components/admin/FacebookLogin';
import SyncControl from '../components/admin/SyncControl';
import { ShieldAlert } from 'lucide-react';

const AdminPage = () => {
    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">System Administration</h2>
                    <p className="text-slate-500">Manage connections and data synchronization</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-xs font-bold border border-amber-100">
                    <ShieldAlert className="w-3 h-3" />
                    Restricted Area
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column: Connections */}
                <div className="space-y-6">
                    <FacebookLogin />

                    {/* Future: Google Auth, etc. */}
                </div>

                {/* Right Column: Sync Controls */}
                <div>
                    <SyncControl />
                </div>
            </div>
        </div>
    );
};

export default AdminPage;
