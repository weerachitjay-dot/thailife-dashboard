import React, { useMemo } from 'react';
import { useData } from '../context/DataContext';
import DateRangePicker from '../components/common/DateRangePicker';
import { Target, Calendar } from 'lucide-react';
import { startOfWeek, format, differenceInDays } from 'date-fns';

import { PaceStatusCard } from '../components/target-monitor/PaceStatusCard';
import { TargetMonitorChart } from '../components/target-monitor/TargetMonitorChart';
import { TargetMonitorTable } from '../components/target-monitor/TargetMonitorTable';

import { ProductTrendGrid } from '../components/target-monitor/ProductTrendGrid';

function getStatus(percentage) {
    if (percentage < 90) return 'PUSH';
    if (percentage > 110) return 'STOP';
    return 'MAINTAIN';
}

const MonitorTargetPage = () => {
    const { sentData, targetData, dateRange, setDateRange } = useData();
    const [estDays, setEstDays] = React.useState(25);

    // Use actual today for Day/Week calculations
    const today = new Date();
    const selectedDate = today; // Use today instead of dateRange.end
    const periodStart = new Date(dateRange.start);
    const periodEnd = new Date(dateRange.end);

    // Calculate days in different periods
    const daysInWeek = useMemo(() => {
        // Calculate which week we're in based on period start
        const daysSincePeriodStart = differenceInDays(selectedDate, periodStart);
        const currentWeekNumber = Math.floor(daysSincePeriodStart / 7);
        const weekStart = new Date(periodStart);
        weekStart.setDate(weekStart.getDate() + (currentWeekNumber * 7));

        // Days passed in current week (1-7)
        const daysInCurrentWeek = differenceInDays(selectedDate, weekStart) + 1;
        return Math.min(daysInCurrentWeek, 7);
    }, [selectedDate, periodStart]);

    const daysInPeriod = useMemo(() => {
        return differenceInDays(periodEnd, periodStart) + 1;
    }, [periodStart, periodEnd]);

    // Calculate days passed from period start to today (selectedDate)
    const daysPassedInPeriod = useMemo(() => {
        const daysPassed = differenceInDays(today, periodStart) + 1;
        // Clamp to period bounds
        return Math.max(1, Math.min(daysPassed, daysInPeriod));
    }, [periodStart, daysInPeriod]);

    // Main data calculation
    const paceData = useMemo(() => {
        if (!sentData || !targetData) return [];

        const targetsMap = targetData.reduce((acc, curr) => {
            if (curr.Product_Target) {
                const valStr = String(curr.Target_Lead_Sent || "0").replace(/,/g, '');
                const monthlyTarget = parseFloat(valStr) || 0;
                acc[curr.Product_Target] = {
                    monthly: monthlyTarget,
                    daily: monthlyTarget / estDays,
                    owner: curr.OWNER || null
                };
            }
            return acc;
        }, {});

        const todayStr = format(selectedDate, 'yyyy-MM-dd');

        // Week calculation based on period start (not ISO week)
        // Calculate which week we're in based on period start
        const daysSincePeriodStart = differenceInDays(selectedDate, periodStart);
        const currentWeekNumber = Math.floor(daysSincePeriodStart / 7);
        const weekStart = new Date(periodStart);
        weekStart.setDate(weekStart.getDate() + (currentWeekNumber * 7));
        const weekStartStr = format(weekStart, 'yyyy-MM-dd');

        const periodStartStr = format(periodStart, 'yyyy-MM-dd');
        const periodEndStr = format(periodEnd, 'yyyy-MM-dd');

        // DEBUG: Log to identify Week vs Period mismatch
        console.log('=== DEBUG Week Calculation ===');
        console.log('Today:', todayStr);
        console.log('Week Start:', weekStartStr);
        console.log('Period Start:', periodStartStr);
        console.log('Days in Week:', daysInWeek);
        console.log('Days Passed in Period:', daysPassedInPeriod);

        const processedSent = sentData.map(d => {
            return { ...d, Leads_Sent: Number(d.Leads_Sent || 0) };
        });

        return Object.keys(targetsMap).map(prodName => {
            const t = targetsMap[prodName];

            // Daily
            const todayRows = processedSent.filter(row => row.Product === prodName && row.Day === todayStr);
            const dailyActual = todayRows.reduce((sum, r) => sum + r.Leads_Sent, 0);
            const dailyTarget = t.daily;
            const dailyPercentage = dailyTarget > 0 ? (dailyActual / dailyTarget) * 100 : 0;

            // Weekly
            const weekRows = processedSent.filter(row => row.Product === prodName && row.Day >= weekStartStr && row.Day <= todayStr);
            const weekActual = weekRows.reduce((sum, r) => sum + r.Leads_Sent, 0);
            const weekTargetFull = t.daily * 7; // Full week target

            // Weekly estimation logic
            let estimatedWeekTotal = weekActual;
            let weekPercentage = 0;

            if (daysInWeek < 7) {
                // Incomplete week - estimate
                const averagePerDay = daysInWeek > 0 ? weekActual / daysInWeek : 0;
                estimatedWeekTotal = averagePerDay * 7;
                weekPercentage = weekTargetFull > 0 ? (estimatedWeekTotal / weekTargetFull) * 100 : 0;
            } else {
                // Complete week - use actual
                weekPercentage = weekTargetFull > 0 ? (weekActual / weekTargetFull) * 100 : 0;
            }

            // Period
            // CRITICAL FIX: Filter data up to TODAY only, not entire period
            const periodRows = processedSent.filter(row => row.Product === prodName && row.Day >= periodStartStr && row.Day <= todayStr);
            const periodActual = periodRows.reduce((sum, r) => sum + r.Leads_Sent, 0);
            const periodTarget = t.daily * daysInPeriod;

            // Period estimation logic
            let estimatedPeriodTotal = periodActual;
            let periodPercentage = 0;

            if (daysPassedInPeriod < daysInPeriod) {
                // Incomplete period - estimate
                const averagePerDay = daysPassedInPeriod > 0 ? periodActual / daysPassedInPeriod : 0;
                estimatedPeriodTotal = averagePerDay * daysInPeriod;
                periodPercentage = periodTarget > 0 ? (estimatedPeriodTotal / periodTarget) * 100 : 0;
            } else {
                // Complete period - use actual
                periodPercentage = periodTarget > 0 ? (periodActual / periodTarget) * 100 : 0;
            }

            return {
                productId: prodName,
                productName: prodName,
                owner: t.owner,
                // Daily
                dailyTarget,
                dailyActual,
                dailyVariance: dailyActual - dailyTarget,
                dailyPercentage,
                dailyStatus: getStatus(dailyPercentage),
                // Weekly
                weekTarget: weekTargetFull,
                weekActual,
                weekVariance: weekActual - (t.daily * daysInWeek),
                weekPercentage,
                weekStatus: getStatus(weekPercentage), // Now uses estimated %
                estimatedWeekTotal,
                // Period
                periodTarget,
                periodActual,
                periodVariance: periodActual - (t.daily * daysPassedInPeriod),
                periodPercentage,
                periodStatus: getStatus(periodPercentage), // Now uses estimated %
                estimatedPeriodTotal
            };
        }).sort((a, b) => b.dailyActual - a.dailyActual);

    }, [sentData, targetData, selectedDate, daysInWeek, daysInPeriod, periodStart, periodEnd, estDays]);

    // Summary calculations
    const summary = useMemo(() => {
        const maintain = paceData.filter(p => p.dailyStatus === 'MAINTAIN').length;
        const push = paceData.filter(p => p.dailyStatus === 'PUSH').length;
        const stop = paceData.filter(p => p.dailyStatus === 'STOP').length;

        const totalDailyTarget = paceData.reduce((sum, p) => sum + p.dailyTarget, 0);
        const totalDailyActual = paceData.reduce((sum, p) => sum + p.dailyActual, 0);
        const dailyPercentage = totalDailyTarget > 0 ? (totalDailyActual / totalDailyTarget) * 100 : 0;

        const totalWeekTarget = paceData.reduce((sum, p) => sum + p.weekTarget, 0);
        const totalWeekActual = paceData.reduce((sum, p) => sum + p.weekActual, 0);

        // Weekly estimation logic
        const weekTargetFull = totalDailyTarget * 7; // Full week target
        let estimatedWeekTotal = totalWeekActual;
        let weekPercentage = 0;
        let isWeekEstimated = false;

        if (daysInWeek < 7) {
            // Incomplete week - estimate based on daily average
            const averagePerDay = daysInWeek > 0 ? totalWeekActual / daysInWeek : 0;
            estimatedWeekTotal = averagePerDay * 7;
            weekPercentage = weekTargetFull > 0 ? (estimatedWeekTotal / weekTargetFull) * 100 : 0;
            isWeekEstimated = true;
        } else {
            // Complete week - use actual
            weekPercentage = weekTargetFull > 0 ? (totalWeekActual / weekTargetFull) * 100 : 0;
            isWeekEstimated = false;
        }

        const totalPeriodTarget = paceData.reduce((sum, p) => sum + p.periodTarget, 0);
        const totalPeriodActual = paceData.reduce((sum, p) => sum + p.periodActual, 0);

        // Period estimation logic (similar to Week)
        let estimatedPeriodTotal = totalPeriodActual;
        let periodPercentage = 0;
        let isPeriodEstimated = false;

        if (daysPassedInPeriod < daysInPeriod) {
            // Incomplete period - estimate based on daily average
            const averagePerDay = daysPassedInPeriod > 0 ? totalPeriodActual / daysPassedInPeriod : 0;
            estimatedPeriodTotal = averagePerDay * daysInPeriod;
            periodPercentage = totalPeriodTarget > 0 ? (estimatedPeriodTotal / totalPeriodTarget) * 100 : 0;
            isPeriodEstimated = true;
        } else {
            // Complete period - use actual
            periodPercentage = totalPeriodTarget > 0 ? (totalPeriodActual / totalPeriodTarget) * 100 : 0;
            isPeriodEstimated = false;
        }

        // Target for days passed so far
        const targetSoFar = totalDailyTarget * daysPassedInPeriod;

        return {
            maintain, push, stop, total: paceData.length,
            totalDailyTarget, totalDailyActual, dailyPercentage,
            totalWeekTarget, totalWeekActual, weekPercentage,
            weekTargetFull, estimatedWeekTotal, isWeekEstimated,
            totalPeriodTarget, totalPeriodActual, periodPercentage,
            estimatedPeriodTotal, isPeriodEstimated,
            targetSoFar
        };
    }, [paceData, daysInWeek, daysPassedInPeriod]);

    return (
        <div className="space-y-6 animate-fade-in-up pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div className="flex items-center gap-3">
                    <Target className="h-10 w-10 text-slate-800" />
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-800">Monitor Target</h1>
                        <p className="text-slate-500 font-medium flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            รอบนี้: {format(periodStart, 'dd/MM/yy')} - {format(periodEnd, 'dd/MM/yy')} ({daysInPeriod} วัน) |
                            สัปดาห์นี้ผ่านมา {daysInWeek} วัน
                        </p>
                    </div>
                </div>

                <div className="flex gap-3">
                    <div className="bg-white px-3 py-2 rounded-xl shadow-sm border border-slate-200 flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500 uppercase">Est. Days:</span>
                        <select
                            value={estDays}
                            onChange={(e) => setEstDays(Number(e.target.value))}
                            className="bg-transparent font-bold text-indigo-600 outline-none cursor-pointer text-sm"
                        >
                            {[20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31].map(d => (
                                <option key={d} value={d}>{d} Days</option>
                            ))}
                        </select>
                    </div>

                    <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200">
                        <DateRangePicker
                            startDate={dateRange.start}
                            endDate={dateRange.end}
                            onChange={(range) => setDateRange(prev => ({ ...prev, ...range }))}
                        />
                    </div>
                </div>
            </div>

            {/* 3 Period KPI Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <div className={`rounded-xl border-2 p-6 shadow-sm ${summary.dailyPercentage >= 90 && summary.dailyPercentage <= 110
                    ? 'bg-emerald-50 border-emerald-200'
                    : summary.dailyPercentage < 90
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-rose-50 border-rose-200'
                    }`}>
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-slate-500">วันนี้ (Day)</h3>
                        <span className={`text-xs px-2 py-1 rounded-full font-bold ${summary.dailyPercentage >= 90 && summary.dailyPercentage <= 110
                            ? 'bg-emerald-100 text-emerald-700'
                            : summary.dailyPercentage < 90
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-rose-100 text-rose-700'
                            }`}>
                            {summary.dailyPercentage >= 90 && summary.dailyPercentage <= 110 ? 'ปกติ' : summary.dailyPercentage < 90 ? 'ต้องเร่ง' : 'ชะลอ'}
                        </span>
                    </div>
                    <div className="text-4xl font-bold tabular-nums text-slate-800 mb-1">
                        {summary.dailyPercentage.toFixed(0)}%
                    </div>
                    <div className="text-sm text-slate-600 font-mono">
                        {summary.totalDailyActual.toLocaleString()} / {Math.round(summary.totalDailyTarget).toLocaleString()}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                        ส่วนต่าง = {(summary.totalDailyActual - summary.totalDailyTarget) > 0 ? '+' : ''}{Math.round(summary.totalDailyActual - summary.totalDailyTarget).toLocaleString()}
                    </p>
                </div>

                <div className={`rounded-xl border-2 p-6 shadow-sm ${summary.weekPercentage >= 90 && summary.weekPercentage <= 110
                    ? 'bg-emerald-50 border-emerald-200'
                    : summary.weekPercentage < 90
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-rose-50 border-rose-200'
                    }`}>
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-slate-500">
                            สัปดาห์นี้ (Week) <span className="text-xs">{summary.isWeekEstimated ? 'Est.' : ''}</span>
                        </h3>
                        <span className={`text-xs px-2 py-1 rounded-full font-bold ${summary.weekPercentage >= 90 && summary.weekPercentage <= 110
                            ? 'bg-emerald-100 text-emerald-700'
                            : summary.weekPercentage < 90
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-rose-100 text-rose-700'
                            }`}>
                            {summary.weekPercentage >= 90 && summary.weekPercentage <= 110 ? 'ปกติ' : summary.weekPercentage < 90 ? 'ต้องเร่ง' : 'ชะลอ'}
                        </span>
                    </div>
                    <div className="text-4xl font-bold tabular-nums text-slate-800 mb-1">
                        {summary.weekPercentage.toFixed(0)}%
                    </div>
                    <div className="text-sm text-slate-600 font-mono">
                        {summary.isWeekEstimated
                            ? `${summary.totalWeekActual.toLocaleString()} / ${Math.round(summary.weekTargetFull).toLocaleString()}`
                            : `${summary.totalWeekActual.toLocaleString()} / ${Math.round(summary.weekTargetFull).toLocaleString()}`
                        }
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                        {summary.isWeekEstimated
                            ? `จริงสะสม ${daysInWeek} วัน → Estimate 7 วัน = ${Math.round(summary.estimatedWeekTotal).toLocaleString()}`
                            : `สัปดาห์นี้ผ่านครบแล้ว`
                        }
                    </p>
                </div>

                <div className={`rounded-xl border-2 p-6 shadow-sm ${summary.periodPercentage >= 90 && summary.periodPercentage <= 110
                    ? 'bg-emerald-50 border-emerald-200'
                    : summary.periodPercentage < 90
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-rose-50 border-rose-200'
                    }`}>
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-slate-500">
                            รอบนี้ (Period) <span className="text-xs">{summary.isPeriodEstimated ? 'Est.' : ''}</span>
                        </h3>
                        <span className={`text-xs px-2 py-1 rounded-full font-bold ${summary.periodPercentage >= 90 && summary.periodPercentage <= 110
                            ? 'bg-emerald-100 text-emerald-700'
                            : summary.periodPercentage < 90
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-rose-100 text-rose-700'
                            }`}>
                            {summary.periodPercentage >= 90 && summary.periodPercentage <= 110 ? 'ปกติ' : summary.periodPercentage < 90 ? 'ต้องเร่ง' : 'ชะลอ'}
                        </span>
                    </div>
                    <div className="text-4xl font-bold tabular-nums text-slate-800 mb-1">
                        {summary.periodPercentage.toFixed(0)}%
                    </div>
                    <div className="text-sm text-slate-600 font-mono">
                        {summary.totalPeriodActual.toLocaleString()} / {Math.round(summary.totalPeriodTarget).toLocaleString()}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                        {summary.isPeriodEstimated
                            ? `จริงสะสม ${daysPassedInPeriod} วัน → Estimate ${daysInPeriod} วัน = ${Math.round(summary.estimatedPeriodTotal).toLocaleString()}`
                            : `รอบนี้ผ่านครบแล้ว`
                        }
                    </p>
                </div>
            </div>

            {/* Period Overview - Moved to top */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200 shadow-sm p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4">ภาพรวมรอบนี้</h3>
                <div className="grid grid-cols-4 gap-6">
                    <div>
                        <p className="text-xs text-slate-500 mb-1">เป้ารอบ</p>
                        <p className="text-2xl font-bold font-mono text-slate-800">{Math.round(summary.totalPeriodTarget).toLocaleString()}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 mb-1">เป้าที่ผ่านมา ({daysPassedInPeriod} วัน)</p>
                        <p className="text-2xl font-bold font-mono text-indigo-600">{Math.round(summary.targetSoFar).toLocaleString()}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 mb-1">ทำได้จริง</p>
                        <p className="text-2xl font-bold font-mono text-emerald-600">{summary.totalPeriodActual.toLocaleString()}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 mb-1">ทำได้จริง / เป้ารอบ</p>
                        <p className="text-2xl font-bold font-mono text-slate-800">
                            {summary.totalPeriodActual.toLocaleString()} / {Math.round(summary.totalPeriodTarget).toLocaleString()}
                        </p>
                        <p className="text-sm text-slate-600 mt-1">= {summary.periodPercentage.toFixed(1)}%</p>
                    </div>
                </div>
            </div>

            {/* Bar Chart */}
            <TargetMonitorChart data={paceData} />



            {/* Product Trend Grid */}
            <ProductTrendGrid products={paceData} daysInWeek={daysInWeek} daysPassedInPeriod={daysPassedInPeriod} />

            {/* Detailed Table */}
            <TargetMonitorTable
                data={paceData}
                selectedDate={selectedDate}
                daysInWeek={daysInWeek}
                daysInPeriod={daysInPeriod}
            />

        </div>
    );
};

export default MonitorTargetPage;
