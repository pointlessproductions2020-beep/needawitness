// ===============================
// 1. Generate 1-hour slots (9–5)
// ===============================
export function generateSlots() {
    const slots = [];
    for (let hour = 9; hour <= 16; hour++) {
        const h = hour.toString().padStart(2, "0");
        slots.push(`${h}:00`);
    }
    return slots;
}

// ========================================
// 2. Convert a time into a 3-hour block
// ========================================
export function getBlockedWindow(timeStr) {
    const [hour, minute] = timeStr.split(":").map(Number);

    const start = new Date();
    start.setHours(hour - 1, minute, 0, 0);

    const end = new Date();
    end.setHours(hour + 2, minute, 0, 0);

    return { start, end };
}

// ========================================
// 3. Hard-coded UK Bank Holidays (2024–2030)
// ========================================
export const UK_BANK_HOLIDAYS = [
    // 2024
    "2024-01-01", "2024-03-29", "2024-04-01",
    "2024-05-06", "2024-05-27", "2024-08-26",
    "2024-12-25", "2024-12-26",

    // 2025
    "2025-01-01", "2025-04-18", "2025-04-21",
    "2025-05-05", "2025-05-26", "2025-08-25",
    "2025-12-25", "2025-12-26",

    // 2026
    "2026-01-01", "2026-04-03", "2026-04-06",
    "2026-05-04", "2026-05-25", "2026-08-31",
    "2026-12-25", "2026-12-28", // substitute

    // 2027
    "2027-01-01", "2027-03-26", "2027-03-29",
    "2027-05-03", "2027-05-31", "2027-08-30",
    "2027-12-27", "2027-12-28",

    // 2028
    "2028-01-03", "2028-04-14", "2028-04-17",
    "2028-05-01", "2028-05-29", "2028-08-28",
    "2028-12-25", "2028-12-26",

    // 2029
    "2029-01-01", "2029-03-30", "2029-04-02",
    "2029-05-07", "2029-05-28", "2029-08-27",
    "2029-12-25", "2029-12-26",

    // 2030
    "2030-01-01", "2030-04-19", "2030-04-22",
    "2030-05-06", "2030-05-27", "2030-08-26",
    "2030-12-25", "2030-12-26"
];

// ========================================
// 4. Detect Sunday / Bank Holiday
// ========================================
export function isSunday(dateStr) {
    const d = new Date(dateStr);
    return d.getDay() === 0;
}

export function isBankHoliday(dateStr) {
    return UK_BANK_HOLIDAYS.includes(dateStr);
}

// ========================================
// 5. Pricing Engine
// ========================================
export function calculatePrice(witnessType, dateStr) {
    const sunday = isSunday(dateStr);
    const bank = isBankHoliday(dateStr);

    // Base prices
    const base = {
        single: 100,
        couple: 150,
        twosingles: 200
    };

    let price = base[witnessType];

    if (bank) {
        price *= 2; // double
    } else if (sunday) {
        price += 50; // Sunday surcharge
    }

    return price;
}

// ========================================
// 6. Deposit Engine
// ========================================
export function calculateDeposit(dateStr) {
    if (isBankHoliday(dateStr)) return 50;
    if (isSunday(dateStr)) return 40;
    return 20;
}

// ========================================
// 7. Check witness availability for a slot
// ========================================
export async function getAvailableWitnesses(db, dateStr, timeStr) {
    const date = new Date(dateStr);
    const dayName = date.toLocaleDateString("en-GB", { weekday: "long" });

    const { start: blockStart, end: blockEnd } = getBlockedWindow(timeStr);

    const usersSnap = await db.collection("users").get();
    const jobsSnap = await db.collection("jobs")
        .where("date", "==", dateStr)
        .get();

    const jobs = jobsSnap.docs.map(d => d.data());
    const available = [];

    usersSnap.forEach(doc => {
        const w = doc.data();
        const id = doc.id;

        if (w.status === "suspended") return;
        if (!w.availability || !w.availability[dayName]) return;

        const a = w.availability[dayName];
        if (!a.enabled) return;

        // Check working hours
        if (timeStr < a.start || timeStr >= a.end) return;

        // Check job conflicts
        let conflict = false;
        jobs.forEach(job => {
            if (!job.assignedWitnesses?.includes(id)) return;

            const jobBlock = getBlockedWindow(job.time);
            if (blockStart < jobBlock.end && blockEnd > jobBlock.start) {
                conflict = true;
            }
        });

        if (!conflict) available.push({ id, ...w });
    });

    return available;
}

// ========================================
// 8. Check availability for all slots
// ========================================
export async function checkAvailability(db, dateStr) {
    const slots = generateSlots();
    const results = {};

    for (const slot of slots) {
        const witnesses = await getAvailableWitnesses(db, dateStr, slot);
        results[slot] = witnesses.length > 0;
    }

    return results;
}
