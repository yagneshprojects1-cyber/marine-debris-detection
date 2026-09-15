"""
Route Optimization Service — Greedy + 2-Opt Local Search TSP Solver.

Solves the Trajectory Optimization for Marine Debris Removal:
1. Distance Matrix using Haversine formula
2. Greedy Nearest Neighbor initial tour
3. 2-Opt Local Search to eliminate edge crossovers and optimize trajectory
"""

import math
from typing import Any, Dict, List

EARTH_RADIUS_KM = 6371.0
KM_TO_NAUTICAL_MILES = 0.539957
DEFAULT_VESSEL_SPEED_KNOTS = 12.0  # knots (~22.2 km/h)
DEFAULT_FUEL_BURN_LPH = 25.0       # Liters per hour


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate geodesic distance in kilometers between two lat/lon coordinates."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return EARTH_RADIUS_KM * c


def build_distance_matrix(locations: List[Dict[str, Any]]) -> List[List[float]]:
    """Build pairwise distance matrix in kilometers for all locations."""
    n = len(locations)
    matrix = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(i + 1, n):
            dist = haversine_distance(
                locations[i]["latitude"],
                locations[i]["longitude"],
                locations[j]["latitude"],
                locations[j]["longitude"],
            )
            matrix[i][j] = dist
            matrix[j][i] = dist
    return matrix


def greedy_nearest_neighbor(matrix: List[List[float]], start_index: int = 0) -> List[int]:
    """Generate initial TSP tour using Greedy Nearest Neighbor heuristic."""
    n = len(matrix)
    visited = [False] * n
    tour = [start_index]
    visited[start_index] = True

    current = start_index
    for _ in range(n - 1):
        next_node = None
        min_dist = float("inf")
        for j in range(n):
            if not visited[j] and matrix[current][j] < min_dist:
                min_dist = matrix[current][j]
                next_node = j
        if next_node is not None:
            visited[next_node] = True
            tour.append(next_node)
            current = next_node

    return tour


def calculate_tour_distance(tour: List[int], matrix: List[List[float]], return_to_start: bool = True) -> float:
    """Calculate total distance of a route index tour."""
    dist = 0.0
    for i in range(len(tour) - 1):
        dist += matrix[tour[i]][tour[i + 1]]
    if return_to_start and len(tour) > 1:
        dist += matrix[tour[-1]][tour[0]]
    return dist


def two_opt_optimize(tour: List[int], matrix: List[List[float]], return_to_start: bool = True) -> List[int]:
    """
    Improve tour using 2-Opt Local Search.
    Reverses sub-segments to remove edge intersections until no further distance improvement can be made.
    """
    best_tour = list(tour)
    best_distance = calculate_tour_distance(best_tour, matrix, return_to_start)
    improved = True
    n = len(best_tour)

    while improved:
        improved = False
        # Do not alter start position (index 0)
        for i in range(1, n - 1):
            for j in range(i + 1, n):
                # 2-Opt swap: reverse the slice from i to j
                new_tour = best_tour[:i] + best_tour[i : j + 1][::-1] + best_tour[j + 1 :]
                new_dist = calculate_tour_distance(new_tour, matrix, return_to_start)
                if new_dist < best_distance - 1e-6:
                    best_tour = new_tour
                    best_distance = new_dist
                    improved = True
                    break
            if improved:
                break

    return best_tour


def solve_debris_removal_route(
    origin: Dict[str, Any],
    targets: List[Dict[str, Any]],
    speed_knots: float = DEFAULT_VESSEL_SPEED_KNOTS,
    fuel_rate_lph: float = DEFAULT_FUEL_BURN_LPH,
) -> Dict[str, Any]:
    """
    Solves the Optimal Debris Removal Route using Greedy + 2-Opt.
    """
    all_locations = [
        {
            "id": origin.get("id", "vessel_origin"),
            "name": origin.get("name", "Vessel Starting Port"),
            "latitude": origin["latitude"],
            "longitude": origin["longitude"],
            "is_origin": True,
        }
    ]

    for idx, t in enumerate(targets):
        all_locations.append({
            "id": t.get("id", f"debris_{idx + 1}"),
            "name": t.get("name", f"Debris #{idx + 1}"),
            "latitude": t["latitude"],
            "longitude": t["longitude"],
            "is_origin": False,
        })

    matrix = build_distance_matrix(all_locations)
    initial_tour = greedy_nearest_neighbor(matrix, start_index=0)
    optimal_tour = two_opt_optimize(initial_tour, matrix, return_to_start=True)

    ordered_waypoints = []
    for step, idx in enumerate(optimal_tour):
        loc = dict(all_locations[idx])
        loc["step_number"] = step + 1
        ordered_waypoints.append(loc)

    # Append return to origin as final waypoint
    return_waypoint = dict(all_locations[optimal_tour[0]])
    return_waypoint["step_number"] = len(optimal_tour) + 1
    return_waypoint["is_return"] = True
    ordered_waypoints.append(return_waypoint)

    total_dist_km = calculate_tour_distance(optimal_tour, matrix, return_to_start=True)
    total_dist_nm = total_dist_km * KM_TO_NAUTICAL_MILES
    speed_kmh = speed_knots * 1.852
    est_hours = total_dist_km / speed_kmh if speed_kmh > 0 else 0.0
    est_fuel = est_hours * fuel_rate_lph

    return {
        "status": "success",
        "message": f"Optimal debris removal route generated with {len(targets)} targets.",
        "algorithm": "Greedy Nearest-Neighbor + 2-Opt Local Search",
        "total_waypoints": len(ordered_waypoints),
        "total_distance_km": round(total_dist_km, 2),
        "total_distance_nautical_miles": round(total_dist_nm, 2),
        "estimated_time_hours": round(est_hours, 2),
        "estimated_fuel_liters": round(est_fuel, 2),
        "waypoints": ordered_waypoints,
    }
