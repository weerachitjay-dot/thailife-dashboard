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

    // 1. Get Unique Products
    const products = useMemo(() => {
        if (!sentData) return ['All'];
        const unique = new Set(sentData.map(d => d.Product).filter(Boolean));
        return ['All', ...Array.from(unique).sort()];
    }, [sentData]);

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

    // 3. Aggregate Data for Chart
    const chartData = useMemo(() => {
        // Helpers
        const isInRange = (dDate) => dDate >= dateRange.start && dDate <= dateRange.end;
        const matchesProduct = (prod) => productFilter === 'All' || prod === productFilter;

        // Group by Date first
        const groupedByDate = {};

        (sentData || []).forEach(row => {
            if (isInRange(row.Day) && matchesProduct(row.Product)) {
                if (!groupedByDate[row.Day]) {
                    groupedByDate[row.Day] = {
                        day: row.Day,
                        actual: 0,
                        // targetAccumulator for "All" view depends on which products are active/present?
                        // Simple Logic: If "All", Target = Sum of All Configured Targets (Fixed Goal)
                        // Or Sum of Targets of products present in data?
                        // User prompt "Target 100". Usually implies Fixed Goal.
                        // I will use Sum of Matching Targets.
                    };
                }
                groupedByDate[row.Day].actual += (row.Leads_Sent || 0);
            }
        });

        // Calculate Target Value (Static)
        let staticTarget = 0;
        if (productFilter === 'All') {
            staticTarget = Object.values(targetsMap).reduce((a, b) => a + b, 0);
        } else {
            staticTarget = targetsMap[productFilter] || 0;
        }

        // Convert key-value to array
        let dailyData = Object.values(groupedByDate).sort((a, b) => a.day.localeCompare(b.day));

        // Fill Data
        dailyData = dailyData.map(d => ({
            ...d,
            target: staticTarget,
            lower: staticTarget * 0.9,
            upper: staticTarget * 1.1
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
                // Weekly Target = Daily Target * 7 (Standard)
                // Or Daily Target * DaysPresent? 
                // Control Logic usually assumes Full Week Capacity.
                const weeklyTarget = staticTarget * 7;
                return {
                    day: `Week of ${w.day}`,
                    actual: w.actual,
                    target: weeklyTarget,
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

    }, [sentData, targetsMap, dateRange, productFilter, viewMode]);


    // 4. Status Table Data (Always Daily, Last 2 Days, Per Product)
    const statusData = useMemo(() => {
        // Get list of products to show (filtered or all)
        const productsToShow = productFilter === 'All'
            ? Object.keys(targetsMap)
            : [productFilter];

        return productsToShow.map(prod => {
            const target = targetsMap[prod] || 0;

            // Get all records for this product
            const records = (sentData || [])
                .filter(r => r.Product === prod && r.Day <= dateRange.end) // Respect Date Filter (Time Travel)
                .sort((a, b) => new Date(b.Day) - new Date(a.Day)); // Descending

            // Get last 2 available
            const last2 = records.slice(0, 2); // [Today, Yesterday]

            // Determine Status
            let status = 'Normal';

            // Rule: < -10% consecutive >= 2 days
            if (last2.length === 2) {
                const day0Low = last2[0].Leads_Sent < target * 0.9;
                const day1Low = last2[1].Leads_Sent < target * 0.9;

                if (day0Low && day1Low) {
                    status = 'Critical';
                } else if (last2[0].Leads_Sent > target * 1.1) {
                    status = 'Warning'; // Check sustainability
                }
            } else if (last2.length === 1) {
                // Only 1 day data
                if (last2[0].Leads_Sent < target * 0.9) {
                    // Can't confirm consecutive, but maybe alert?
                    // Strict rule says ">= 2 days". So Normal or just "Watch".
                    // Let's keep Normal unless 2 days.
                } else if (last2[0].Leads_Sent > target * 1.1) {
                    status = 'Warning';
                }
            }

            return {
                product: prod,
                target,
                last2Days: last2.map(r => ({ date: r.Day, leads: r.Leads_Sent })),
                status
            };
        }).sort((a, b) => {
            // Sort Critical first
            const rank = { 'Critical': 0, 'Warning': 1, 'Normal': 2 };
            return rank[a.status] - rank[b.status];
        }).filter(r => r.target > 0); // Only show products with targets

    }, [sentData, targetsMap, productFilter, dateRange.end]); // Dependent on End Date for Time Travel
    // If DateRange is past, "Current Status" calculation might be weird. 
    // But usually Status Reference implies "Current Health". 
    // I'll assume it scans the ENTIRE dataset to find the absolute latest dates, ignoring the Date Filter.
    // This is safer for "Control" which is always "Now".

    return (
        <div className="space-y-6 animate-fade-in-up pb-10">
            {/* Header Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Performance Control</h2>
                    <p className="text-slate-500 text-sm">Monitor Lead/Sent Targets and Control Bounds.</p>
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
            <ControlStatusTable data={statusData} />

            {/* Main Chart */}
            <PerformanceChart data={chartData} viewMode={viewMode} />

        </div>
    );
};

export default PerformanceControlPage;
