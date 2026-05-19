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

            // 1. Total received
            totalReceived += paid;

            // 2. Deposit revenue (your actual earnings)
            if (paid >= deposit) {
                depositRevenue += deposit;
            }

            // 3. Witness payout liability
            if (paid === total) {
                witnessPayouts += (total - deposit);
            }

            // 4. Outstanding
            outstanding += due;
        });

        // Update HTML
        revenueTotals.innerHTML = `
            <p><strong>Total Received:</strong> £${totalReceived}</p>
            <p><strong>Your Earnings (Deposits):</strong> £${depositRevenue}</p>
            <p><strong>Witness Payout Liability:</strong> £${witnessPayouts}</p>
            <p><strong>Outstanding Payments:</strong> £${outstanding}</p>
        `;

        // Draw pie chart
        const ctx = document.getElementById("revenueChart").getContext("2d");

        if (window.revenueChartInstance) {
            window.revenueChartInstance.destroy();
        }

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
