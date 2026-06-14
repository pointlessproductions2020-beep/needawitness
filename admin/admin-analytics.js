/* ============================================================
   NEW ANALYTICS ENGINE – Need A Witness UK
   Luxury Gold + Champagne Gradient Line Chart
   ============================================================ */

let revenueFilter = "month"; // default
let revenueChartInstance = null;

/* ------------------------------ FILTER HANDLER ------------------------------ */
function setRevenueFilter(type) {
    revenueFilter = type;

    // Update button UI
    document.querySelectorAll(".filter-btn").forEach(btn => btn.classList.remove("active"));
    event.target.classList.add("active");

    loadRevenueData();
}

/* ------------------------------ LOAD REVENUE DATA ------------------------------ */
function loadRevenueData() {
    db.collection("jobs").onSnapshot(snapshot => {
        const jobs = [];
        snapshot.forEach(doc => jobs.push(doc.data()));

        // Apply filter
        const filtered = applyRevenueFilter(jobs, revenueFilter);

        // Build chart
        buildRevenueChart(filtered);

        // Update mini cards
        updateMiniCards(jobs);
    });
}

/* ------------------------------ FILTER LOGIC ------------------------------ */
function applyRevenueFilter(jobs, filter) {
    const now = new Date();
    const result = {};

    jobs.forEach(j => {
        if (!j.date) return;

        const jobDate = new Date(j.date);
        const key = j.date; // daily buckets

        let include = false;

        switch (filter) {
            case "week":
                const weekAgo = new Date();
                weekAgo.setDate(now.getDate() - 7);
                include = jobDate >= weekAgo;
                break;

            case "month":
                include = jobDate.getMonth() === now.getMonth() &&
                          jobDate.getFullYear() === now.getFullYear();
                break;

            case "year":
                include = jobDate.getFullYear() === now.getFullYear();
                break;

            case "12months":
                const yearAgo = new Date();
                yearAgo.setFullYear(now.getFullYear() - 1);
                include = jobDate >= yearAgo;
                break;

            case "all":
                include = true;
                break;
        }

        if (!include) return;

        if (!result[key]) result[key] = 0;
        result[key] += j.amountPaid || 0;
    });

    return result;
}

/* ------------------------------ BUILD LINE CHART ------------------------------ */
function buildRevenueChart(data) {
    const labels = Object.keys(data).sort();
    const values = labels.map(k => data[k]);

    const ctx = document.getElementById("revenueChart").getContext("2d");

    if (revenueChartInstance) revenueChartInstance.destroy();

    // GOLD → CHAMPAGNE → TRANSPARENT gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, "#C19A2B");      // luxury gold
    gradient.addColorStop(0.5, "#E8D7A8");    // champagne glow
    gradient.addColorStop(1, "rgba(255,255,255,0)"); // fade out

    revenueChartInstance = new Chart(ctx, {
        type: "line",
        data: {
            labels,
            datasets: [{
                label: "Revenue",
                data: values,
                borderColor: "#C19A2B",
                backgroundColor: gradient,
                borderWidth: 3,
                tension: 0.35,
                fill: true,
                pointRadius: 3,
                pointBackgroundColor: "#C19A2B"
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: true }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

/* ------------------------------ MINI CARD STATS ------------------------------ */
function updateMiniCards(jobs) {
    let totalJobs = jobs.length;
    let completedJobs = 0;
    let pendingPayments = 0;
    let revenueThisMonth = 0;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    jobs.forEach(j => {
        const paid = j.amountPaid || 0;
        const due = j.amountDue || 0;

        if (j.status === "completed") completedJobs++;
        if (due > 0) pendingPayments += due;

        if (j.date) {
            const d = new Date(j.date);
            if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
                revenueThisMonth += paid;
            }
        }
    });

    statTotalJobs.innerText = totalJobs;
    statCompletedJobs.innerText = completedJobs;
    statPendingPayments.innerText = "£" + pendingPayments;
    statRevenueMonth.innerText = "£" + revenueThisMonth;
}

/* ------------------------------ MONTHLY REVENUE (SECOND CHART) ------------------------------ */
function loadMonthlyRevenue() {
    db.collection("jobs").onSnapshot(snapshot => {
        const buckets = {};

        snapshot.forEach(doc => {
            const j = doc.data();
            if (!j.date) return;

            const monthKey = j.date.slice(0, 7); // YYYY-MM
            if (!buckets[monthKey]) buckets[monthKey] = 0;

            buckets[monthKey] += j.amountPaid || 0;
        });

        const labels = Object.keys(buckets).sort();
        const values = labels.map(k => buckets[k]);

        const ctx = document.getElementById("monthlyRevenueChart").getContext("2d");

        if (window.monthlyRevenueChartInstance)
            window.monthlyRevenueChartInstance.destroy();

        window.monthlyRevenueChartInstance = new Chart(ctx, {
            type: "bar",
            data: {
                labels,
                datasets: [{
                    label: "Monthly Revenue",
                    data: values,
                    backgroundColor: "#C19A2B"
                }]
            },
            options: {
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    });
}

/* ------------------------------ INIT ------------------------------ */
loadRevenueData();
