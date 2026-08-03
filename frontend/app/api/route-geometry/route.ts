import { jsonData } from "@/lib/conductor/server/response";
import { ROUTE_COORDS } from "@/config/route-coords";

export function GET() {
  const coordinates = ROUTE_COORDS.filter(
    (coordinate, index, all) =>
      index === 0 ||
      coordinate[0] !== all[index - 1][0] ||
      coordinate[1] !== all[index - 1][1]
  );

  return jsonData({
    coordinates,
    source: "hardcoded-route",
  });
}
