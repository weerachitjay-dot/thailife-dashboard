import React from 'react';
import { Loader2 } from 'lucide-react';
import { useData } from '../../context/DataContext';

const LoadingBar = () => {
    const { isLoading, loadingProgress, loadingStatus } = useData();

    if (!isLoading) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[9999] flex items-center justify-center">
            <div className="glass-card p-8 rounded-2xl shadow-2xl max-w-md w-full mx-4 text-center">
                {/* Logo/Icon */}
                <div className="mb-6">
                    <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto" />
                </div>

                {/* Title */}
                <h2 className="text-xl font-bold text-slate-700 mb-2">
                    กำลังโหลดข้อมูล
                </h2>

                {/* Status Text */}
                <p className="text-sm text-slate-500 mb-6">
                    {loadingStatus}
                </p>

                {/* Progress Bar */}
                <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden mb-3">
                    <div
                        className="bg-gradient-to-r from-indigo-500 to-violet-500 h-full rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${loadingProgress}%` }}
                    />
                </div>

                {/* Progress Percentage */}
                <p className="text-sm font-bold text-indigo-600">
                    {loadingProgress}%
                </p>
            </div>
        </div>
    );
};

export default LoadingBar;
