import Section from "@/components/ui/Section";
import { Icons } from "@/components/icons";

export default function PlatformFeatures() {
  const conductorFeatures = [
    "Offline QR Scanner — scan, input fare, sync later",
    "GCash Proof Verification — confirm, log, done",
    "End-of-Day Tally — cash declaration + passenger count",
    "Hailing Alert Receiver — audible 'Pick Me Up' notifications",
    "Unit Capacity Toggle — Available / Full status",
    "Shift Management — login/logout, boundary remittance",
    "Expense Logger — gas and operational costs",
    "Lost & Found Item Logging",
    "Driver Performance Metrics — punctuality, satisfaction, safety",
  ];

  const adminFeatures = [
    "Financial Dashboard — revenue, expenses, net profit",
    "Remittance Tracker — boundary status, pending flags",
    "Emergency Panic Button Monitoring",
    "Overspeeding Detection via GPS logging",
    "Traffic Congestion Visualization — slow-movement alerts",
    "Commuter Demand Heatmap — 'Pick Me Up' aggregation",
    "Lost & Found Verification Dashboard",
    "Digital Receipt Management — search, audit, report",
  ];

  return (
    <Section id="platform">
      <div className="text-center mb-14">
        <span className="text-xs font-semibold text-[#1A5FB4] uppercase tracking-widest">
          Operator & Conductor
        </span>
        <h2 className="mt-3 text-3xl md:text-4xl font-extrabold tracking-tight">
          Full Fleet Visibility
        </h2>
        <p className="mt-3 text-gray-500 max-w-xl mx-auto">
          Purpose-built tools for the people who keep jeepneys running every day.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Conductor Card */}
        <div className="rounded-2xl border border-gray-100 bg-white p-7 hover:shadow-xl hover:shadow-[#1A5FB4]/5 transition-all duration-300">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-[#F0F7FF] text-[#1A5FB4] flex items-center justify-center">
              {Icons.scan}
            </div>
            <h3 className="text-xl font-bold">Conductor App</h3>
          </div>
          <ul className="space-y-3">
            {conductorFeatures.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2.5 text-sm text-gray-600"
              >
                <svg
                  className="w-4 h-4 text-[#1A5FB4] mt-0.5 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m4.5 12.75 6 6 9-13.5"
                  />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Admin Card */}
        <div className="rounded-2xl border border-gray-100 bg-white p-7 hover:shadow-xl hover:shadow-[#1A5FB4]/5 transition-all duration-300">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-[#F0F7FF] text-[#1A5FB4] flex items-center justify-center">
              {Icons.chart}
            </div>
            <h3 className="text-xl font-bold">Admin Web Portal</h3>
          </div>
          <ul className="space-y-3">
            {adminFeatures.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2.5 text-sm text-gray-600"
              >
                <svg
                  className="w-4 h-4 text-[#1A5FB4] mt-0.5 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m4.5 12.75 6 6 9-13.5"
                  />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}