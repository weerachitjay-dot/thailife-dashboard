import React, { useMemo } from 'react';
import { useData } from '../context/DataContext';
import DateRangePicker from '../components/common/DateRangePicker';
import { Target } from 'lucide-react';
import { startOfWeek, format } from 'date-fns';

import { PaceStatusCard } from '../components/target-monitor/PaceStatusCard';
import { TargetMonitorChart } from '../components/target-monitor/TargetMonitorChart';
import { TargetMonitorTable } from '../components/target-monitor/TargetMonitorTable';

function getStatus(percentage) {
    if (percentage < 90) return 'PUSH';
    if (percentage > 110) return 'STOP';
    return 'MAINTAIN';
}

const MonitorTargetPage = () => {
    const { sentData, targetData, dateRange, setDateRange } = useData();
    const [estDays, setEstDays] = React.useState(25);

    const selectedDate = new Date(dateRange.end);

    const daysInWeek = useMemo(() => {
        const dayOfWeek = selectedDate.getDay();
        return dayOfWeek === 0 ? 7 : dayOfWeek;
    }, [selectedDate]);

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
        const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
        const weekStartStr = format(weekStart, 'yyyy-MM-dd');

        const processedSent = sentData.map(d => {
            return { ...d, Leads_Sent: Number(d.Leads_Sent || 0) };
        });

        return Object.keys(targetsMap).map(prodName => {
            const t = targetsMap[prodName];

            const todayRows = processedSent.filter(row => row.Product === prodName && row.Day === todayStr);
            const dailyActual = todayRows.reduce((sum, r) => sum + r.Leads_Sent, 0);

            const weekRows = processedSent.filter(row => row.Product === prodName && row.Day >= weekStartStr && row.Day <= todayStr);
            const weekActual = weekRows.reduce((sum, r) => sum + r.Leads_Sent, 0);

            const weekTarget = t.daily * daysInWeek;

            const dailyPercentage = t.daily > 0 ? (dailyActual / t.daily) * 100 : 0;
            const weekPercentage = weekTarget > 0 ? (weekActual / weekTarget) * 100 : 0;

            return {
                productId: prodName,
                productName: prodName,
                owner: t.owner,
                dailyTarget: t.daily,
                dailyActual,
                dailyVariance: dailyActual - t.daily,
                dailyPercentage,
                dailyStatus: getStatus(dailyPercentage),
                weekTarget,
                weekActual,
                weekVariance: weekActual - weekTarget,
                weekPercentage,
                weekStatus: getStatus(weekPercentage)
            };
        }).sort((a, b) => b.dailyActual - a.dailyActual);

    }, [sentData, targetData, selectedDate, daysInWeek, estDays]);

    const summary = useMemo(() => {
        const maintain = paceData.filter(p => p.dailyStatus === 'MAINTAIN').length;
        const push = paceData.filter(p => p.dailyStatus === 'PUSH').length;
        const stop = paceData.filter(p => p.dailyStatus === 'STOP').length;

        const totalDailyTarget = paceData.reduce((sum, p) => sum + p.dailyTarget, 0);
        const totalDailyActual = paceData.reduce((sum, p) => sum + p.dailyActual, 0);

        return { maintain, push, stop, total: paceData.length, totalDailyTarget, totalDailyActual };
    }, [paceData]);

    return (
        <div className="space-y-8 animate-fade-in-up pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div className="flex items-center gap-3">
                    <Target className="h-10 w-10 text-indigo-600" />
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-800">Monitor Target</h1>
                        <p className="text-slate-500 font-medium">
                            ควบคุม Pace การส่ง Lead — วันที่ {format(selectedDate, 'dd/MM/yyyy')} (Day {daysInWeek} of Week)
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

            <div className="grid gap-4 md:grid-cols-4">
                <PaceStatusCard
                    title="ปกติ (MAINTAIN)"
                    count={summary.maintain}
                    total={summary.total}
                    status="MAINTAIN"
                    description="อยู่ในกรอบ 90-110%"
                />
                <PaceStatusCard
                    title="ต้องเร่ง (PUSH)"
                    count={summary.push}
                    total={summary.total}
                    status="PUSH"
                    description="ต่ำกว่า 90%"
                />
                <PaceStatusCard
                    title="ชะลอ (STOP)"
                    count={summary.stop}
                    total={summary.total}
                    status="STOP"
                    description="เกิน 110%"
                />

                <div className="bg-white rounded-xl border-2 border-indigo-100 p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-slate-500">ภาพรวมวันนี้</h3>
                        <Target className="h-5 w-5 text-indigo-500" />
                    </div>
                    <div className="text-3xl font-bold tabular-nums text-slate-800">
                        {summary.totalDailyActual.toLocaleString()}
                        <span className="text-lg text-slate-400 font-normal"> / {Math.round(summary.totalDailyTarget).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                        {summary.totalDailyTarget > 0
                            ? `${((summary.totalDailyActual / summary.totalDailyTarget) * 100).toFixed(1)}% ของเป้ารวม`
                            : 'ไม่มีเป้า'}
                    </p>
                </div>
            </div>

            <TargetMonitorChart data={paceData} />

            <TargetMonitorTable data={paceData} selectedDate={selectedDate} daysInWeek={daysInWeek} />

        </div>
    );
};

export default MonitorTargetPage;
