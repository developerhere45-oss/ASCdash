export const dashboardData = {
  stats: [
    { label: "Total Users", value: 12584, delta: "+18.6%", hint: "from last 7 days", icon: "users" },
    { label: "Total Service Partners", value: 2317, delta: "+15.3%", hint: "from last 7 days", icon: "partners" },
    { label: "Active Bookings", value: 512, delta: "+8.2%", hint: "from yesterday", icon: "calendar" },
    { label: "Completed Bookings", value: 1842, delta: "+11.7%", hint: "from last 7 days", icon: "check" },
    { label: "Total Revenue", value: 1875650, delta: "+21.4%", hint: "from last 7 days", icon: "rupee", currency: true },
    { label: "Pending Verifications", value: 74, delta: "-5.3%", hint: "from yesterday", icon: "hourglass", negative: true },
  ],
  bookingTrend: [
    { day: "14 May", bookings: 450, revenue: 52000 },
    { day: "15 May", bookings: 360, revenue: 47000 },
    { day: "16 May", bookings: 590, revenue: 88000 },
    { day: "17 May", bookings: 405, revenue: 61000 },
    { day: "18 May", bookings: 625, revenue: 92000 },
    { day: "19 May", bookings: 835, revenue: 128000 },
    { day: "20 May", bookings: 870, revenue: 136000 },
  ],
  categories: [
    { name: "AC Repair", value: 28, color: "#f92b74" },
    { name: "Plumbing", value: 20, color: "#8b5cf6" },
    { name: "Electrician", value: 18, color: "#22b8cf" },
    { name: "Home Cleaning", value: 12, color: "#35d39b" },
    { name: "Carpentry", value: 8, color: "#f6c85f" },
    { name: "Painting", value: 6, color: "#f59e8b" },
    { name: "Others", value: 8, color: "#fac8d7" },
  ],
  recentActivity: [
    { title: "New booking created", note: "Booking #BK-7846", time: "2 min ago", type: "booking" },
    { title: "Technician verified", note: "Rohit Das", time: "15 min ago", type: "verified" },
    { title: "New user registered", note: "Ankita Sharma", time: "35 min ago", type: "user" },
    { title: "Booking completed", note: "Booking #BK-7831", time: "1 hour ago", type: "done" },
    { title: "Complaint received", note: "Complaint #CMP-129", time: "2 hours ago", type: "alert" },
  ],
  recentBookings: [
    { id: "#BK-7846", customer: "Ramesh Deka", service: "AC Repair", partner: "Rohit Das", status: "On The Way", amount: 850, time: "2 min ago" },
    { id: "#BK-7845", customer: "Priya Saikia", service: "Plumbing", partner: "Sunil Roy", status: "Confirmed", amount: 650, time: "18 min ago" },
    { id: "#BK-7844", customer: "Arindam Borah", service: "Electrician", partner: "Bhaskar Kalita", status: "Pending", amount: 500, time: "35 min ago" },
    { id: "#BK-7843", customer: "Neha Patel", service: "Home Cleaning", partner: "Puja Das", status: "Completed", amount: 750, time: "1 hour ago" },
    { id: "#BK-7842", customer: "Manoj Thakur", service: "Painting", partner: "Ranjit Barman", status: "Cancelled", amount: 0, time: "2 hours ago" },
  ],
  pendingVerifications: [
    { name: "Deepjyoti Bora", skill: "Electrician", city: "Guwahati, Assam", applied: "20 May 2025", avatar: "DB" },
    { name: "Pooja Nath", skill: "Plumbing", city: "Nagaon, Assam", applied: "20 May 2025", avatar: "PN" },
    { name: "Jatin Saikia", skill: "AC Repair", city: "Dibrugarh, Assam", applied: "20 May 2025", avatar: "JS" },
  ],
};

export const moduleRows = {
  users: [
    { id: "USR-1024", name: "Rahul Sharma", phone: "+91 98765 43210", email: "rahul@example.com", bookings: 7, status: "Active", city: "Guwahati" },
    { id: "USR-1025", name: "Ankita Sharma", phone: "+91 80998 12001", email: "ankita@example.com", bookings: 3, status: "Active", city: "Dispur" },
    { id: "USR-1026", name: "Priya Saikia", phone: "+91 87877 12001", email: "priya@example.com", bookings: 12, status: "Blocked", city: "Nagaon" },
  ],
  partners: [
    { id: "ASP12345", name: "Shubham", phone: "+91 69013 31470", skills: "AC Repair, Electrician", status: "Approved", rating: 4.8, jobs: 125 },
    { id: "ASP12346", name: "Rohit Das", phone: "+91 98640 10001", skills: "AC Repair", status: "Pending", rating: 4.7, jobs: 88 },
    { id: "ASP12347", name: "Sunil Roy", phone: "+91 97060 10002", skills: "Plumbing", status: "Suspended", rating: 4.4, jobs: 51 },
  ],
  bookings: dashboardData.recentBookings,
  services: [
    { id: "SRV-AC", name: "AC Repair", category: "Home Repair", basePrice: 499, status: "Active" },
    { id: "SRV-PL", name: "Plumbing", category: "Home Repair", basePrice: 399, status: "Active" },
    { id: "SRV-PC", name: "Pest Control", category: "Cleaning", basePrice: 699, status: "Active" },
  ],
  quotes: [
    { id: "QT-211", booking: "#BK-7846", partner: "Rohit Das", amount: 850, status: "Reviewed", notes: "Gas refill and cleaning" },
    { id: "QT-212", booking: "#BK-7844", partner: "Bhaskar Kalita", amount: 500, status: "Flagged", notes: "Switch board repair" },
  ],
  complaints: [
    { id: "CMP-129", user: "Ramesh Deka", type: "Delay Issue", priority: "High", status: "Pending" },
    { id: "CMP-130", user: "Neha Patel", type: "Service Quality", priority: "Medium", status: "Resolved" },
  ],
  notifications: [
    { id: "NTF-11", title: "Launch Offer", channel: "Push", audience: "All Users", status: "Published" },
    { id: "NTF-12", title: "Technician Alert", channel: "SMS", audience: "Partners", status: "Pending" },
  ],
  banners: [
    { id: "BNR-1", title: "Bihu Launch Banner", placement: "Home Hero", status: "Published" },
    { id: "BNR-2", title: "First Booking Offer", placement: "Offers", status: "Unpublished" },
  ],
  analytics: dashboardData.categories.map((item) => ({ id: item.name, metric: item.name, share: `${item.value}%`, status: "Growing" })),
  "audit-logs": [
    { id: "LOG-1", admin: "Admin User", action: "Technician approved", entity: "ASP12346", time: "10 min ago" },
    { id: "LOG-2", admin: "Ops Manager", action: "Booking reassigned", entity: "#BK-7844", time: "24 min ago" },
  ],
  settings: [
    { id: "SET-1", setting: "Commission Rate", value: "12%", status: "Active" },
    { id: "SET-2", setting: "Support SLA", value: "15 minutes", status: "Active" },
  ],
};
