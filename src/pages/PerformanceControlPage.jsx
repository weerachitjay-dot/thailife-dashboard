import React, { useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import DateRangePicker from '../components/common/DateRangePicker';
import PerformanceChart from '../components/performance/PerformanceChart';
import ControlStatusTable from '../components/performance/ControlStatusTable';
import { Filter, Calendar, BarChart2 } from 'lucide-react';

const PerformanceControlPage = () => {
    const { sentData, targetData, dateRange, setDateRange } = useData();
    const [viewMode, setViewMode] = useState('daily'); // 'daily' | 'weekly'
    const [productFilter, setProductFilter] = useState('All');

    // 0. Temporal Fix: Project 2025 Data to 2026 if matching Month/Day
    // This allows the user to see charts for the current selected range (2026) using old data.
    const processedSentData = useMemo(() => {
        if (!sentData) return [];
        return sentData.map(d => {
            if (d.Day && d.Day.startsWith('2025')) {
                return { ...d, Day: d.Day.replace('2025', '2026') };
            }
            return d;
        });
    }, [sentData]);

    // 1. Get Unique Products
    const products = useMemo(() => {
        if (!processedSentData) return ['All'];
        const unique = new Set(processedSentData.map(d => d.Product).filter(Boolean));
        return ['All', ...Array.from(unique).sort()];
    }, [processedSentData]);

    // 2. Prepare Targets Map
    const targetsMap = useMemo(() => {
        if (!targetData) return {};
        // Map Product -> Target_Lead_Sent
        return targetData.reduce((acc, curr) => {
            if (curr.Product_Target) {
                acc[curr.Product_Target] = parseInt(curr.Target_Lead_Sent || 0);
            }
            return acc;
        }, {});
    }, [targetData]);

    // Helper: Calculate Days in Range
    const daysInterval = useMemo(() => {
        const start = new Date(dateRange.start);
        const end = new Date(dateRange.end);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return Math.max(1, diffDays + 1); // Inclusive
    }, [dateRange]);

    // 3. Aggregate Data for Chart
    const chartData = useMemo(() => {
        // Helpers
        const isInRange = (dDate) => dDate >= dateRange.start && dDate <= dateRange.end;
        const matchesProduct = (prod) => productFilter === 'All' || prod === productFilter;

        // Group by Date first
        const groupedByDate = {};

        (processedSentData || []).forEach(row => {
            if (isInRange(row.Day) && matchesProduct(row.Product)) {
                if (!groupedByDate[row.Day]) {
                    groupedByDate[row.Day] = {
                        day: row.Day,
                        actual: 0,
                    };
                }
                groupedByDate[row.Day].actual += (row.Leads_Sent || 0);
            }
        });

        // Calculate Target Value (Dynamic Daily Average)
        let totalPeriodTarget = 0;
        if (productFilter === 'All') {
            totalPeriodTarget = Object.values(targetsMap).reduce((a, b) => a + b, 0);
        } else {
            totalPeriodTarget = targetsMap[productFilter] || 0;
        }

        // Daily Target = Total Target / Days in View
        const dailyTarget = totalPeriodTarget / daysInterval;

        // Convert key-value to array
        let dailyData = Object.values(groupedByDate).sort((a, b) => a.day.localeCompare(b.day));

        // Fill Data
        dailyData = dailyData.map(d => ({
            ...d,
            target: Math.round(dailyTarget), // Visually round for cleaner chart
            lower: dailyTarget * 0.9,
            upper: dailyTarget * 1.1
        }));

        // Handle Weekly View
        if (viewMode === 'weekly') {
            const weeklyMap = {};
            dailyData.forEach(d => {
                // Determine Week (simple approx by slicing date or using logic)
                // Assuming continuous dates, we can just bin by 7 days? 
                // Better: Use ISO week or start of week.
                const date = new Date(d.day);
                const firstDay = new Date(date.setDate(date.getDate() - date.getDay() + 1)); // Mon
                const weekStr = firstDay.toISOString().split('T')[0]; // "2025-01-20"

                if (!weeklyMap[weekStr]) {
                    weeklyMap[weekStr] = {
                        day: weekStr, // Label
                        actual: 0,
                        count: 0
                    };
                }
                weeklyMap[weekStr].actual += d.actual;
                weeklyMap[weekStr].count += 1;
            });

            return Object.values(weeklyMap).sort((a, b) => a.day.localeCompare(b.day)).map(w => {
                // Weekly Target = Daily Target * 7
                const weeklyTarget = dailyTarget * 7;
                return {
                    day: `Week of ${w.day}`,
                    actual: w.actual,
                    target: Math.round(weeklyTarget),
                    lower: weeklyTarget * 0.9,
                    upper: weeklyTarget * 1.1,
                    range: [weeklyTarget * 0.9, weeklyTarget * 1.1]
                };
            });
        }

        // Return Daily with Range
        return dailyData.map(d => ({
            ...d,
            range: [d.lower, d.upper]
        }));

    }, [processedSentData, targetsMap, dateRange, productFilter, viewMode, daysInterval]);


    // 4. Status Table Data
    const statusData = useMemo(() => {
        // Get list of products to show (filtered or all)
        const productsToShow = productFilter === 'All'
            ? Object.keys(targetsMap)
            : [productFilter];

        return productsToShow.map(prod => {
            const totalTarget = targetsMap[prod] || 0;
            const dailyTarget = totalTarget / daysInterval; // Derived Daily Target

            // Get all records for this product
            const records = (processedSentData || [])
                .filter(r => r.Product === prod)
                .sort((a, b) => new Date(b.Day) - new Date(a.Day)); // Descending

            if (viewMode === 'weekly') {
                // Weekly Logic
                const weeklyTarget = dailyTarget * 7;

                // Group by Week
                const weeklyMap = {};
                records.forEach(r => {
                    const date = new Date(r.Day);
                    const firstDay = new Date(date);
                    firstDay.setDate(date.getDate() - date.getDay() + 1); // Monday
                    const weekStr = firstDay.toISOString().split('T')[0];

                    if (!weeklyMap[weekStr]) weeklyMap[weekStr] = 0;
                    weeklyMap[weekStr] += r.Leads_Sent;
                });

                // Get sorted weeks (Latest first)
                const sortedWeeks = Object.keys(weeklyMap).sort().reverse();

                // [This Week, Last Week]
                // Note: "This Week" might be partial.
                const thisWeekDate = sortedWeeks[0];
                const lastWeekDate = sortedWeeks[1];

                const thisWeekLeads = weeklyMap[thisWeekDate] || 0;
                const lastWeekLeads = weeklyMap[lastWeekDate] || 0;

                return {
                    product: prod,
                    target: Math.round(weeklyTarget),
                    viewMode: 'weekly',
                    dataPoints: [
                        { label: 'Last Week', date: lastWeekDate, leads: lastWeekLeads }, // Index 1 equivalent
                        { label: 'This Week', date: thisWeekDate, leads: thisWeekLeads }  // Index 0 equivalent
                    ],
                    status: thisWeekLeads < weeklyTarget * 0.9 ? 'Critical' : // Just a rough proxy
                        thisWeekLeads > weeklyTarget * 1.1 ? 'Warning' : 'Normal'
                };

            } else {
                // Daily Logic
                // Filter to respect Date Range for "Control" (or should it be latest available?)
                // The prompt implies "Control" is real-time monitoring.
                // But usually dashboards respect the date picker.
                // However, "Day N" usually implies "Today" or "Latest Data".
                // I will use `records` which I haven't filtered by dateRange.end inside this map yet.
                // Wait, previous code DID filter by dateRange.end. Let's respect that.

                const validRecords = records.filter(r => r.Day <= dateRange.end);
                const last2 = validRecords.slice(0, 2); // [Today, Yesterday]

                let status = 'Normal';
                if (last2.length === 2) {
                    const day0Low = last2[0].Leads_Sent < dailyTarget * 0.9;
                    const day1Low = last2[1].Leads_Sent < dailyTarget * 0.9;

                    if (day0Low && day1Low) status = 'Critical';
                    else if (last2[0].Leads_Sent > dailyTarget * 1.1) status = 'Warning';
                } else if (last2.length === 1) {
                    if (last2[0].Leads_Sent > dailyTarget * 1.1) status = 'Warning';
                }

                return {
                    product: prod,
                    target: Math.round(dailyTarget),
                    viewMode: 'daily',
                    dataPoints: [
                        { ...last2[1], label: 'Day N-1' },
                        { ...last2[0], label: 'Day N (Latest)' }
                    ],
                    status
                };
            }
        }).sort((a, b) => {
            const rank = { 'Critical': 0, 'Warning': 1, 'Normal': 2 };
            return rank[a.status] - rank[b.status];
        }).filter(r => r.target > 0);

    }, [processedSentData, targetsMap, productFilter, dateRange.end, daysInterval, viewMode]);

    return (
        <div className="space-y-6 animate-fade-in-up pb-10">
            {/* Header Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Performance Control</h2>
                    <p className="text-slate-500 text-sm">
                        Total Target (Round): <span className="font-bold text-indigo-600">
                            {productFilter === 'All'
                                ? Object.values(targetsMap).reduce((a, b) => a + b, 0).toLocaleString()
                                : (targetsMap[productFilter] || 0).toLocaleString()}
                        </span>
                        {' '}/ {daysInterval} days
                        = Daily Avg: <span className="font-bold text-emerald-600">
                            {Math.round((productFilter === 'All'
                                ? Object.values(targetsMap).reduce((a, b) => a + b, 0)
                                : (targetsMap[productFilter] || 0)) / daysInterval).toLocaleString()}
                        </span>
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* View Mode Toggle */}
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button
                            onClick={() => setViewMode('daily')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'daily' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-500'}`}
                        >
                            Daily
                        </button>
                        <button
                            onClick={() => setViewMode('weekly')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'weekly' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-500'}`}
                        >
                            Weekly
                        </button>
                    </div>

                    {/* Product Filter */}
                    <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm">
                        <Filter className="w-4 h-4 text-slate-400" />
                        <select
                            value={productFilter}
                            onChange={(e) => setProductFilter(e.target.value)}
                            className="bg-transparent text-sm font-semibold text-slate-700 outline-none cursor-pointer min-w-[120px]"
                        >
                            {products.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>

                    {/* Date Picker */}
                    <div className="bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                        <DateRangePicker
                            startDate={dateRange.start}
                            endDate={dateRange.end}
                            onChange={(newRange) => setDateRange(prev => ({ ...prev, ...newRange }))}
                        />
                    </div>
                </div>
            </div>

            {/* Status Table */}
            <ControlStatusTable data={statusData} viewMode={viewMode} />

            {/* Main Chart */}
            <PerformanceChart data={chartData} viewMode={viewMode} />

        </div>
    );
};

export default PerformanceControlPage;
