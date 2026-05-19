// ---------- 1. Revenue Pie (already wired) ----------
function loadRevenue() {
    db.collection("jobs").onSnapshot(snapshot => {
        let totalReceived = 0;
        let depositRevenue = 0;
        let witnessPayouts = 0;
        let outstanding = 0;

        snapshot.forEach(doc => {
            const j = doc.data();

            const total = j.totalPrice || 0;
            const deposit = j.depositAmount || 0;
            const paid = j.amountPaid || 0;
            const due = j.amountDue || 0;

            totalReceived += paid;

            if (paid >= deposit) {
                depositRevenue += deposit;
            }

            if (paid === total) {
                witnessPayouts += (total - deposit);
            }

            outstanding += due;
        });

        revenueTotals.innerHTML = `
            <p><strong>Total Received:</strong> £${totalReceived}</p>
            <p><strong>Your Earnings (Deposits):</strong> £${depositRevenue}</p>
            <p><strong>Witness Payout Liability:</strong> £${witnessPayouts}</p>
            <p><strong>Outstanding Payments:</strong> £${outstanding}</p>
        `;

        const ctx = document.getElementById("revenueChart").getContext("2d");
        if (window.revenueChartInstance) window.revenueChartInstance.destroy();

        window.revenueChartInstance = new Chart(ctx, {
            type: "pie",
            data: {
                labels: [
                    "Your Earnings (Deposits)",
                    "Witness Payouts",
                    "Outstanding",
                    "Total Received"
                ],
                datasets: [{
                    data: [
                        depositRevenue,
                        witnessPayouts,
                        outstanding,
                        totalReceived
                    ],
                    backgroundColor: [
                        "#D4AF37",
                        "#6c8cff",
                        "#ff6b6b",
                        "#8affc1"
                    ]
                }]
            }
        });
    });
}

// ---------- 2. Monthly Revenue Line Chart ----------
function loadMonthlyRevenue() {
    db.collection("jobs").onSnapshot(snapshot => {
        const buckets = {}; // key: YYYY-MM, value: { total, deposits }

        snapshot.forEach(doc => {
            const j = doc.data();
            if (!j.date) return;

            const monthKey = j.date.slice(0, 7); // "2026-05"
            if (!buckets[monthKey]) {
                buckets[monthKey] = { total: 0, deposits: 0 };
            }

            const paid = j.amountPaid || 0;
            const deposit = j.depositAmount || 0;

            buckets[monthKey].total += paid;
            if (paid >= deposit) {
                buckets[monthKey].deposits += deposit;
            }
        });

        const labels = Object.keys(buckets).sort();
        const totalData = labels.map(m => buckets[m].total);
        const depositData = labels.map(m => buckets[m].deposits);

        const ctx = document.getElementById("monthlyRevenueChart").getContext("2d");
        if (window.monthlyRevenueChartInstance) window.monthlyRevenueChartInstance.destroy();

        window.monthlyRevenueChartInstance = new Chart(ctx, {
            type: "line",
            data: {
                labels,
                datasets: [
                    {
                        label: "Total Received",
                        data: totalData,
                        borderColor: "#6c8cff",
                        backgroundColor: "rgba(108,140,255,0.1)",
                        fill: true
                    },
                    {
                        label: "Deposits (Your Earnings)",
                        data: depositData,
                        borderColor: "#D4AF37",
                        backgroundColor: "rgba(212,175,55,0.1)",
                        fill: true
                    }
                ]
            },
            options: {
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    });
}

// ---------- 3. Today & This Week Jobs ----------
function loadTodayAndWeekJobs() {
    db.collection("jobs").onSnapshot(snapshot => {
        const today = new Date();
        const todayStr = today.toISOString().slice(0, 10); // YYYY-MM-DD

        const weekEnd = new Date();
        weekEnd.setDate(today.getDate() + 7);

        let todayHTML = "";
        let weekHTML = "";

        snapshot.forEach(doc => {
            const j = doc.data();
            if (!j.date) return;

            const jobDate = new Date(j.date);
            const id = doc.id;
            const name = j.customer?.name || "Unknown";

            // Today
            if (j.date === todayStr) {
                todayHTML += `
                    <div class="item" onclick="viewJob('${id}')">
                        <strong>${name}</strong><br>
                        ${j.date} at ${j.time}<br>
                        <span class="status-badge ${j.status}">${j.status}</span>
                    </div>
                `;
            }

            // This week (next 7 days, excluding today already shown)
            if (jobDate > today && jobDate <= weekEnd) {
                weekHTML += `
                    <div class="item" onclick="viewJob('${id}')">
                        <strong>${name}</strong><br>
                        ${j.date} at ${j.time}<br>
                        <span class="status-badge ${j.status}">${j.status}</span>
                    </div>
                `;
            }
        });

        todayJobs.innerHTML = todayHTML || "<p>No jobs today.</p>";
        weekJobs.innerHTML = weekHTML || "<p>No jobs in the next 7 days.</p>";
    });
}

// ---------- 4. Witness Leaderboard ----------
function loadWitnessLeaderboard() {
    // We need jobs + users to compute revenue per witness
    Promise.all([
        db.collection("users").get(),
        db.collection("jobs").get()
    ]).then(([usersSnap, jobsSnap]) => {
        const witnesses = {};
        usersSnap.forEach(doc => {
            const u = doc.data();
            const id = doc.id;
            witnesses[id] = {
                id,
                name: u.type === "couple"
                    ? `${u.partner1Name} & ${u.partner2Name} (${u.teamName})`
                    : u.name,
                revenue: 0,
                jobs: 0,
                rating: u.rating || 0
            };
        });

        jobsSnap.forEach(doc => {
            const j = doc.data();
            const total = j.totalPrice || 0;
            const assigned = j.assignedWitnesses || [];
            if (!assigned.length) return;

            const share = total / assigned.length;
            assigned.forEach(wid => {
                if (!witnesses[wid]) return;
                witnesses[wid].revenue += share;
                witnesses[wid].jobs += 1;
            });
        });

        const list = Object.values(witnesses)
            .filter(w => w.jobs > 0)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);

        if (!list.length) {
            witnessLeaderboard.innerHTML = "<p>No witness revenue data yet.</p>";
            return;
        }

        let html = "<ol>";
        list.forEach(w => {
            html += `
                <li>
                    <strong>${w.name}</strong><br>
                    Jobs: ${w.jobs} • Revenue: £${w.revenue.toFixed(2)} • Rating: ${w.rating}
                </li>
            `;
        });
        html += "</ol>";

        witnessLeaderboard.innerHTML = html;
    });
}
