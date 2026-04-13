import Section from "@/components/ui/Section";
import { Icons } from "@/components/icons";

export default function LoyaltyPerks() {
  return (
    <Section className="bg-[#F0F7FF]">
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <span className="text-xs font-semibold text-[#1A5FB4] uppercase tracking-widest">
            Commuter Perks
          </span>
          <h2 className="mt-3 text-3xl md:text-4xl font-extrabold tracking-tight">
            Ride More,
            <br />
            <span className="text-[#1A5FB4]">Earn Free Rides</span>
          </h2>
          <p className="mt-5 text-gray-500 leading-relaxed">
            Every paid ride is automatically tracked. Hit 10 rides and unlock a
            &ldquo;Free Ride&rdquo; voucher that fully waives your next fare. No
            manual claiming, no hassle — it just works.
          </p>
          <div className="mt-6 flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="font-medium text-gray-700">7 / 10 rides</span>
                <span className="text-[#1A5FB4] font-semibold text-xs">
                  3 more to go
                </span>
              </div>
              <div className="h-3 rounded-full bg-white border border-[#DAEEFF] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#1A5FB4] to-[#3584E4] transition-all duration-1000"
                  style={{ width: "70%" }}
                />
              </div>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-[#1A5FB4]/10 flex items-center justify-center flex-shrink-0 text-[#1A5FB4]">
              {Icons.gift}
            </div>
          </div>
        </div>

        {/* Visual — voucher card */}
        <div className="flex justify-center">
          <div className="w-80 bg-white rounded-2xl shadow-xl shadow-gray-200/50 overflow-hidden border border-gray-100">
            <div className="h-2 bg-gradient-to-r from-[#1A5FB4] via-[#3584E4] to-[#62A0EA]" />
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Reward Voucher
                </span>
                <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold">
                  UNLOCKED
                </span>
              </div>
              <div className="text-3xl font-extrabold text-[#1A5FB4] mb-1">
                Free Ride
              </div>
              <div className="text-sm text-gray-400 mb-4">
                Valid for any CHATCO jeepney route
              </div>
              <div className="border-t border-dashed border-gray-200 pt-4 flex items-center justify-between">
                <div className="text-[11px] text-gray-400">
                  Code:{" "}
                  <span className="font-mono font-bold text-gray-600">
                    FREE-10X-A7K2
                  </span>
                </div>
                <div className="text-[11px] text-gray-400">
                  Expires: Dec 31, 2025
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}