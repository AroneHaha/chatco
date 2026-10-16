"use client";

import { useEffect,useMemo,useState } from "react";
import {
  loadFareMatrix,
  getPointAreas,
  getFareBetween as apiGetFareBetween,
  getBarangaysTraversed as apiGetBarangaysTraversed,
  getFareConfig,
  type PointArea,
} from "@/lib/shared/fare/fare-matrix.service";
import { formatCurrency,getCommuterTypeLabel,type CommuterType } from "@/lib/shared/fare/fare-calculator";

interface FareContentProps {
  variant?: "page"|"modal";
}

function subDropoffPoints(point: PointArea): string[] {
  return Array.from(new Set(
    [...(point.subStops??[]),...(point.landmarks??[])]
      .map((name) => name.trim())
      .filter(Boolean)
  ));
}

export default function FareContent({ variant="page" }: FareContentProps) {
  const [pointAreas,setPointAreas]=useState<PointArea[]>([]);
  const [pickupPoint,setPickupPoint]=useState<PointArea|null>(null);
  const [dropoffPoint,setDropoffPoint]=useState<PointArea|null>(null);
  const [commuterType,setCommuterType]=useState<CommuterType>("REGULAR");
  const [searchQuery,setSearchQuery]=useState("");
  const [selectingField,setSelectingField]=useState<"pickup"|"dropoff">("pickup");
  const [expandedBarangay,setExpandedBarangay]=useState<number|null>(null);
  const [pickupLandmark,setPickupLandmark]=useState<string|null>(null);
  const [dropoffLandmark,setDropoffLandmark]=useState<string|null>(null);
  const [isLoading,setIsLoading]=useState(true);

  useEffect(() => {
    let active=true;
    void loadFareMatrix({ force: true }).then(() => {
      if(!active) return;
      setPointAreas(getPointAreas());
      setIsLoading(false);
    });
    return () => { active=false; };
  },[]);

  const selectField=(field: "pickup"|"dropoff") => {
    setSelectingField(field);
    const point=field==="pickup"? pickupPoint:dropoffPoint;
    setExpandedBarangay(point&&subDropoffPoints(point).length>0? point.pointNumber:null);
  };

  const fareInfo=useMemo(() => {
    if(!pickupPoint||!dropoffPoint) return null;

    const isDiscounted=commuterType!=="REGULAR";
    const barangaysTraveled=apiGetBarangaysTraversed(
      pickupPoint.pointNumber,
      dropoffPoint.pointNumber
    );
    const regularFare=apiGetFareBetween(
      pickupPoint.pointNumber,
      dropoffPoint.pointNumber,
      false
    );
    const discountedFare=apiGetFareBetween(
      pickupPoint.pointNumber,
      dropoffPoint.pointNumber,
      true
    );
    const finalFare=isDiscounted? discountedFare:regularFare;
    const discountAmount=regularFare-discountedFare;
    const config=getFareConfig();
    const succeedingCount=Math.max(
      0,
      barangaysTraveled-config.baseBarangayCount
    );

    return {
      barangaysTraveled,
      regularFare,
      discountedFare,
      finalFare,
      hasDiscount: isDiscounted,
      discountAmount,
      succeedingCount,
      baseBarangayCount: config.baseBarangayCount,
    };
  },[pickupPoint,dropoffPoint,commuterType]);

  const filteredPoints=searchQuery
    ? pointAreas.filter(
      (p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())||
        p.code.toLowerCase().includes(searchQuery.toLowerCase())||
        subDropoffPoints(p).some((l) =>
          l.toLowerCase().includes(searchQuery.toLowerCase())
        )
    )
    :pointAreas;

  const isSameBarangay=!!(pickupPoint&&dropoffPoint&&pickupPoint.pointNumber===dropoffPoint.pointNumber);

  // Color utility classes for pickup/dropoff indicators
  const pickupDotClass=isSameBarangay? "bg-violet-500":"bg-emerald-500";
  const dropoffDotClass=isSameBarangay? "bg-violet-500":"bg-emerald-500";
  const pickupBorderClass=isSameBarangay? "border-violet-500/50 bg-violet-500/10":"border-emerald-500/50 bg-emerald-500/10";
  const dropoffBorderClass=isSameBarangay? "border-violet-500/50 bg-violet-500/10":"border-emerald-500/50 bg-emerald-500/10";
  const pickupBadgeClass=isSameBarangay? "text-violet-400 bg-violet-500/10 light:text-violet-700":"text-emerald-400 bg-emerald-500/10 light:text-emerald-700";
  const dropoffBadgeClass=isSameBarangay? "text-violet-400 bg-violet-500/10 light:text-violet-700":"text-emerald-400 bg-emerald-500/10 light:text-emerald-700";
  const pickupTagClass=isSameBarangay? "bg-violet-500 text-white":"bg-emerald-500 text-white";
  const dropoffTagClass=isSameBarangay? "bg-violet-500 text-white":"bg-emerald-500 text-white";
  const pickupLabelClass=isSameBarangay? "text-violet-400":"text-emerald-400";
  const dropoffLabelClass=isSameBarangay? "text-violet-400":"text-emerald-400";

  const clearPickup=() => {
    setPickupPoint(null);
    setPickupLandmark(null);
    setSelectingField("pickup");
    // Collapse expanded barangay if it belonged to the cleared pickup
    if(expandedBarangay===pickupPoint?.pointNumber) {
      setExpandedBarangay(null);
    }
  };

  const clearDropoff=() => {
    setDropoffPoint(null);
    setDropoffLandmark(null);
    setSelectingField("dropoff");
    if(expandedBarangay===dropoffPoint?.pointNumber) {
      setExpandedBarangay(null);
    }
  };

  return (
    <div className={`flex h-full min-h-0 flex-col bg-[#050F1A] text-white light:bg-[#F8FAFC] light:text-gray-900 ${variant==="page"? "pb-20 lg:pb-0":""}`}>
      <div className="flex-shrink-0 bg-[#071A2E] border-b border-white/10 light:bg-white light:border-gray-200 pt-safe">
        <div className="flex items-center justify-between px-4 py-3">
          {variant==="modal"? (
            <h2 id="commuter-fare-title" className="text-base sm:text-lg font-bold text-white light:text-gray-900 truncate">Fare Calculator</h2>
          ):(
            <h1 className="text-base sm:text-lg font-bold text-white light:text-gray-900 truncate">Fare Calculator</h1>
          )}
        </div>
        <div className="px-4 pb-3 space-y-2.5">
          {/* Pickup Card */}
          <div className="relative">
            <button
              onClick={() => selectField("pickup")}
              className={`w-full text-left p-3 rounded-xl border transition-all duration-200 pr-9 ${selectingField==="pickup"
                  ? pickupBorderClass+" border"
                  :pickupPoint
                    ? "border-white/10 bg-white/5 light:border-gray-200 light:bg-gray-50"
                    :"border-white/10 bg-white/5 light:border-gray-200 light:bg-gray-50"
                }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${pickupPoint? pickupDotClass+' shadow-sm':'bg-white/20 light:bg-gray-300'}`} />
                <span className="text-[10px] font-semibold text-white/40 light:text-gray-500 uppercase tracking-wider">
                  Pickup
                </span>
              </div>
              <div className="flex items-center justify-between mt-1 ml-[18px]">
                <span className={`text-sm font-medium ${pickupPoint? 'text-white light:text-gray-900':'text-white/30 light:text-gray-400'}`}>
                  {pickupPoint
                    ? pickupLandmark
                      ? `${pickupPoint.name} · ${pickupLandmark}`
                      :pickupPoint.name
                    :"Select pickup location"}
                </span>
                {pickupPoint&&(
                  <span className={`text-[10px] ${pickupBadgeClass} px-2 py-0.5 rounded-full ml-2 flex-shrink-0`}>
                    Brgy {pickupPoint.pointNumber}
                  </span>
                )}
              </div>
            </button>
            {/* Clear Pickup Button (X) */}
            {pickupPoint&&(
              <button
                onClick={(e) => { e.stopPropagation(); clearPickup(); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/30 hover:text-white hover:bg-red-500/20 hover:border-red-500/30 light:bg-white light:border-gray-200 light:text-gray-400 light:hover:text-red-600 light:hover:bg-red-50 light:hover:border-red-200 transition-colors"
                title="Clear pickup"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Swap icon */}
          <div className="flex justify-center">
            <button
              onClick={() => {
                if(pickupPoint&&dropoffPoint) {
                  const tmpPoint=pickupPoint;
                  const tmpLandmark=pickupLandmark;
                  setPickupPoint(dropoffPoint);
                  setPickupLandmark(dropoffLandmark);
                  setDropoffPoint(tmpPoint);
                  setDropoffLandmark(tmpLandmark);
                }
              }}
              className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 light:bg-white light:border-gray-200 light:hover:bg-gray-100 transition-colors"
            >
              <svg className="w-3.5 h-3.5 text-white/40 light:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
              </svg>
            </button>
          </div>

          {/* Dropoff Card */}
          <div className="relative">
            <button
              onClick={() => selectField("dropoff")}
              className={`w-full text-left p-3 rounded-xl border transition-all duration-200 pr-9 ${selectingField==="dropoff"
                  ? dropoffBorderClass+" border"
                  :dropoffPoint
                    ? "border-white/10 bg-white/5 light:border-gray-200 light:bg-gray-50"
                    :"border-white/10 bg-white/5 light:border-gray-200 light:bg-gray-50"
                }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dropoffDotClass} ${dropoffPoint? 'shadow-sm':'bg-white/20 light:bg-gray-300'}`} />
                <span className="text-[10px] font-semibold text-white/40 light:text-gray-500 uppercase tracking-wider">
                  Drop-off
                </span>
              </div>
              <div className="flex items-center justify-between mt-1 ml-[18px]">
                <span className={`text-sm font-medium ${dropoffPoint? 'text-white light:text-gray-900':'text-white/30 light:text-gray-400'}`}>
                  {dropoffPoint
                    ? dropoffLandmark
                      ? `${dropoffPoint.name} · ${dropoffLandmark}`
                      :dropoffPoint.name
                    :"Select drop-off location"}
                </span>
                {dropoffPoint&&(
                  <span className={`text-[10px] ${dropoffBadgeClass} px-2 py-0.5 rounded-full ml-2 flex-shrink-0`}>
                    Brgy {dropoffPoint.pointNumber}
                  </span>
                )}
              </div>
            </button>
            {/* Clear Dropoff Button (X) */}
            {dropoffPoint&&(
              <button
                onClick={(e) => { e.stopPropagation(); clearDropoff(); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/30 hover:text-white hover:bg-red-500/20 hover:border-red-500/30 light:bg-white light:border-gray-200 light:text-gray-400 light:hover:text-red-600 light:hover:bg-red-50 light:hover:border-red-200 transition-colors"
                title="Clear drop-off"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Same barangay warning */}
          {isSameBarangay&&(
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
              <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse flex-shrink-0" />
              <span className="text-[10px] text-violet-300 light:text-violet-700 font-medium">Same pickup & drop-off — both locations shown in violet</span>
            </div>
          )}

          <div className="mt-1">
            <span className="text-[10px] font-semibold text-white/40 light:text-gray-500 uppercase tracking-wider">Commuter Type</span>
            <div className="flex gap-1.5 mt-1.5 overflow-x-auto pb-1 -mx-1 px-1">
              {(
                ["REGULAR","STUDENT","SENIOR_CITIZEN","PWD"] as CommuterType[]
              ).map((type) => (
                <button
                  key={type}
                  onClick={() => setCommuterType(type)}
                  aria-pressed={commuterType===type}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors whitespace-nowrap flex-shrink-0 ${commuterType===type
                      ? "bg-[#1A5FB4] text-white"
                      :"bg-white/5 text-white/50 hover:bg-white/10 light:bg-gray-100 light:text-gray-600 light:hover:bg-gray-200"
                    }`}
                >
                  {getCommuterTypeLabel(type)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="flex-shrink-0 px-4 pt-3 pb-2 bg-[#050F1A] light:bg-[#F8FAFC]">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 light:text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search barangay or landmark..."
            aria-label="Search barangay or landmark"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-white/30 light:bg-white light:border-gray-200 light:text-gray-900 light:placeholder:text-gray-400 focus:outline-none focus:border-emerald-500/50 transition-colors"
          />
        </div>
        <p className="text-[10px] text-white/30 light:text-gray-500 mt-2">
          {selectingField==="pickup"
            ? "Tap your boarding Point Area — then select a sub pickup point"
            :"Tap your destination Point Area — then select a sub drop-off point"}
          {" "}&middot; Auto-opens after selection
        </p>
      </div>

      {/* ── Barangay List (fills remaining space) ── */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-3 overscroll-contain modal-scroll">
        {isLoading&&<p role="status" className="py-6 text-center text-sm text-white/40 light:text-gray-500">Loading locations...</p>}
        {!isLoading&&filteredPoints.length===0&&<p className="py-6 text-center text-sm text-white/40 light:text-gray-500">No locations found.</p>}
        {filteredPoints.map((point) => {
          const isPickup=pickupPoint?.pointNumber===point.pointNumber;
          const isDropoff=dropoffPoint?.pointNumber===point.pointNumber;
          const isSelected=isPickup||isDropoff;
          const isExpanded=expandedBarangay===point.pointNumber;
          const pointSubDropoffs=subDropoffPoints(point);

          // Color classes for barangay list items (green default, violet when same)
          const itemPickupBg=isSameBarangay? "bg-violet-500/15 border-violet-500/40":"bg-emerald-500/15 border-emerald-500/40";
          const itemDropoffBg=isSameBarangay? "bg-violet-500/15 border-violet-500/40":"bg-emerald-500/15 border-emerald-500/40";
          const itemBothBg="bg-violet-500/20 border-violet-500/40";
          const itemPickupLabel=isSameBarangay? pickupLabelClass:pickupLabelClass;
          const itemDropoffLabel=isSameBarangay? dropoffLabelClass:dropoffLabelClass;

          return (
            <div key={point.pointNumber} className="mb-1">
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  if(selectingField==="pickup") {
                    setPickupPoint(point);
                    setPickupLandmark(null);
                    if(pointSubDropoffs.length>0) {
                      setExpandedBarangay(point.pointNumber);
                    } else {
                      selectField("dropoff");
                    }
                  } else {
                    setDropoffPoint(point);
                    setDropoffLandmark(null);
                    if(pointSubDropoffs.length>0) {
                      setExpandedBarangay(point.pointNumber);
                    }
                  }
                  setSearchQuery("");
                }}
                onKeyDown={(e) => { if(e.key==="Enter"||e.key===" ") { e.preventDefault(); (e.target as HTMLElement).click(); } }}
                className={`w-full text-left p-3 rounded-xl transition-colors cursor-pointer border ${isSelected
                    ? isPickup&&isDropoff
                      ? itemBothBg
                      :isPickup
                        ? itemPickupBg
                        :itemDropoffBg
                    :"border-white/[0.04] hover:bg-white/[0.04] light:border-transparent light:hover:bg-gray-100"
                  }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex flex-col items-center flex-shrink-0">
                      <span className="text-[9px] font-bold text-white/25 light:text-gray-400 leading-none">PT</span>
                      <span className="text-sm font-bold text-white/60 light:text-gray-600 leading-none mt-0.5">{point.pointNumber}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-white light:text-gray-900 truncate">{point.name}</span>
                        <span className="text-[9px] font-semibold text-white/20 light:text-gray-400 flex-shrink-0">Brgy {point.pointNumber}</span>
                      </div>
                      {pointSubDropoffs.length>0&&(
                        <p className="text-[10px] text-white/30 light:text-gray-500 mt-0.5 truncate">
                          {pointSubDropoffs.join(" · ")}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                    {isPickup&&(
                      <span className={`text-[8px] font-bold ${itemPickupLabel} ${pickupTagClass} px-1.5 py-0.5 rounded`}>PICKUP</span>
                    )}
                    {isDropoff&&(
                      <span className={`text-[8px] font-bold ${itemDropoffLabel} ${dropoffTagClass} px-1.5 py-0.5 rounded`}>DROP-OFF</span>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedBarangay(isExpanded? null:point.pointNumber);
                      }}
                      className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 light:bg-white light:border-gray-200 light:hover:bg-gray-100 transition-colors"
                    >
                      <svg
                        className={`w-3.5 h-3.5 text-white/40 light:text-gray-500 transition-transform duration-200 ${isExpanded? "rotate-180":""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m19.5 8.25-7.5 7.5-7.5-7.5"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded sub pickup/drop-off points */}
              {isExpanded&&(
                <div className="ml-11 mt-1 mb-2 space-y-1">
                  <p className="text-[10px] text-white/20 light:text-gray-400 uppercase tracking-wider font-medium mb-1.5">
                    Sub pickup/drop-off points in {point.name} <span className="text-white/10 light:text-gray-300">· tap to select</span>
                  </p>
                  {/* Skip sub-point button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if(selectingField==="pickup") {
                        selectField("dropoff");
                      }
                      setExpandedBarangay(null);
                      if(selectingField==="pickup") selectField("dropoff");
                    }}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md w-full text-left transition-colors border cursor-pointer bg-white/[0.02] border-transparent hover:bg-amber-500/5 hover:border-amber-500/20"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400/50" />
                    <span className="text-[11px] text-amber-400/70 light:text-amber-700">
                      Use Point Area only
                    </span>
                  </button>
                  {pointSubDropoffs.map((landmark,idx) => {
                    const isLandmarkPickup=pickupPoint?.pointNumber===point.pointNumber&&pickupLandmark===landmark;
                    const isLandmarkDropoff=dropoffPoint?.pointNumber===point.pointNumber&&dropoffLandmark===landmark;
                    const isLandmarkSelected=isLandmarkPickup||isLandmarkDropoff;

                    // Landmark color classes with green/violet logic
                    const lmPickupBgCls=isSameBarangay? "bg-violet-500/10 border-violet-500/30":"bg-emerald-500/10 border-emerald-500/30";
                    const lmDropoffBgCls=isSameBarangay? "bg-violet-500/10 border-violet-500/30":"bg-emerald-500/10 border-emerald-500/30";
                    const lmPickupDotCls=isSameBarangay? "bg-violet-400":"bg-emerald-400";
                    const lmDropoffDotCls=isSameBarangay? "bg-violet-400":"bg-emerald-400";
                    const lmPickupTextCls=isSameBarangay? "text-violet-400 light:text-violet-700":"text-emerald-400 light:text-emerald-700";
                    const lmDropoffTextCls=isSameBarangay? "text-violet-400 light:text-violet-700":"text-emerald-400 light:text-emerald-700";

                    return (
                      <div
                        role="button"
                        tabIndex={0}
                        key={idx}
                        onClick={(e) => {
                          e.stopPropagation();
                          if(selectingField==="pickup") {
                            if(pickupPoint?.pointNumber!==point.pointNumber) {
                              setPickupPoint(point);
                            }
                            setPickupLandmark(landmark);
                          } else {
                            if(dropoffPoint?.pointNumber!==point.pointNumber) {
                              setDropoffPoint(point);
                            }
                            setDropoffLandmark(landmark);
                          }
                          setExpandedBarangay(null);
                          if(selectingField==="pickup") selectField("dropoff");
                        }}
                        onKeyDown={(e) => { if(e.key==="Enter"||e.key===" ") { e.preventDefault(); (e.target as HTMLElement).click(); } }}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded-md w-full text-left transition-colors border cursor-pointer ${isLandmarkSelected
                            ? isLandmarkPickup&&isLandmarkDropoff
                              ? "bg-violet-500/15 border-violet-500/30"
                              :isLandmarkPickup
                                ? lmPickupBgCls
                                :lmDropoffBgCls
                            :"bg-white/[0.02] border-transparent hover:bg-white/5 light:hover:bg-gray-100"
                          }`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${isLandmarkSelected
                            ? isLandmarkPickup? lmPickupDotCls:lmDropoffDotCls
                            :"bg-white/20 light:bg-gray-300"
                          }`} />
                        <span className={`text-[11px] ${isLandmarkSelected
                            ? isLandmarkPickup? lmPickupTextCls:lmDropoffTextCls
                            :"text-white/40 light:text-gray-600"
                          }`}>
                          {landmark}
                        </span>
                        {isLandmarkPickup&&!isLandmarkDropoff&&(
                          <span className={`text-[8px] font-bold ${lmPickupTextCls} bg-white/5 light:bg-white px-1 py-0.5 rounded ml-auto`}>PICKUP</span>
                        )}
                        {isLandmarkDropoff&&!isLandmarkPickup&&(
                          <span className={`text-[8px] font-bold ${lmDropoffTextCls} bg-white/5 light:bg-white px-1 py-0.5 rounded ml-auto`}>DROP-OFF</span>
                        )}
                        {isLandmarkPickup&&isLandmarkDropoff&&(
                          <span className="text-[8px] font-bold text-violet-400 light:text-violet-700 bg-violet-500/10 px-1 py-0.5 rounded ml-auto">BOTH</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Bottom Action Area ── */}
      {fareInfo&&(
        <div className="flex-shrink-0 border-t border-white/10 bg-[#050F1A] light:border-gray-200 light:bg-white px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
          {/* Route confirmation with dynamic color indicators */}
          <div className="mb-2 flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${pickupDotClass}`} />
              <span className="text-xs text-white/70 light:text-gray-700 font-medium">{pickupPoint?.name}{pickupLandmark? ` · ${pickupLandmark}`:""}</span>
            </div>
            <svg className="w-3 h-3 text-white/20 light:text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
            <div className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${dropoffDotClass}`} />
              <span className="text-xs text-white/70 light:text-gray-700 font-medium">{dropoffPoint?.name}{dropoffLandmark? ` · ${dropoffLandmark}`:""}</span>
            </div>
          </div>

          {/* Fare Explanation */}
          <div className="mb-3 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5 light:bg-gray-50 light:border-gray-200">
            <p className="text-[10px] text-white/30 light:text-gray-500 leading-relaxed">
              {fareInfo.barangaysTraveled} barangay{fareInfo.barangaysTraveled!==1? "s":""} traversed
              {fareInfo.succeedingCount>0&&
                ` · Base fare covers first ${fareInfo.baseBarangayCount} + ${fareInfo.succeedingCount} succeeding`}
            </p>
          </div>

          <div className="flex items-center justify-between mb-3">
            <div className="min-w-0">
              <p className="text-[10px] text-white/40 light:text-gray-500 uppercase tracking-wider truncate">
                {pickupPoint?.name}{pickupLandmark? ` · ${pickupLandmark}`:""} →{" "}
                {dropoffPoint?.name}{dropoffLandmark? ` · ${dropoffLandmark}`:""}
              </p>
            </div>
            <div className="text-right flex-shrink-0 ml-2">
              {fareInfo.hasDiscount&&(
                <p className="text-xs text-white/30 light:text-gray-400 line-through">
                  {formatCurrency(fareInfo.regularFare)}
                </p>
              )}
              <p className="text-2xl font-extrabold text-white light:text-gray-900">
                {formatCurrency(fareInfo.finalFare)}
              </p>
              {fareInfo.hasDiscount&&(
                <p className="text-[10px] text-green-400 light:text-green-600">
                  You save {formatCurrency(fareInfo.discountAmount)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {!fareInfo&&(
        <div className="flex-shrink-0 border-t border-white/10 bg-[#050F1A] light:border-gray-200 light:bg-white px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
          <div className="text-center py-2">
            <p className="text-[11px] text-white/30 light:text-gray-500">Select both pickup and drop-off to calculate fare</p>
          </div>
        </div>
      )}
    </div>
  );
}
