export default function AdminOverviewPage() {
  const stats = [
    { label: "Total Orders", value: "128" },
    { label: "Revenue", value: "$4,382" },
    { label: "Products", value: "6" },
    { label: "Customers", value: "94" },
  ];

  return (
    <div className="p-10">
      <h1 className="font-body text-2xl font-medium text-charcoal mb-1">
        Overview
      </h1>
      <p className="font-body text-sm text-charcoal/60 mb-8">
        Welcome back — here's what's happening with Tea Atelier.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white border border-charcoal/10 p-5"
          >
            <span className="font-body text-xs text-charcoal/50 block mb-2">
              {stat.label}
            </span>
            <span className="font-display text-2xl text-charcoal">
              {stat.value}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-10 bg-white border border-charcoal/10 p-6">
        <span className="font-body text-xs text-charcoal/40">
          Note: placeholder data — connects to real numbers once the database is
          wired up.
        </span>
      </div>
    </div>
  );
}
