#!/usr/bin/env python3
"""
Batch-calculates geographic latitude and longitude for ALL objects in a CSV file.

Each row contains the ship's (vehicle) position, heading, target range and
azimuth (relative to vehicle heading). The script:
  1. Reads the CSV
  2. Converts relative azimuth to absolute azimuth (from North, clockwise):
       absolute_azimuth = vehicle_heading + target_azimuth
  3. Applies Vincenty's direct formula (WGS-84) per row to compute
     the object's calculated latitude and longitude.
  4. Optionally compares against the ground-truth target_lat / target_lon
     already present in the CSV and reports error statistics.
  5. Saves the full result to a new CSV in the download folder.

Usage:
    python3 calculate_objects_from_csv.py <input_csv>
    python3 calculate_objects_from_csv.py <input_csv> --ship-lat 18.922 --ship-lon 72.8347
    python3 calculate_objects_from_csv.py <input_csv> --no-compare
"""

import csv
import math
import argparse
import sys
import os
import json


# ── WGS-84 ellipsoid constants ────────────────────────────────────────────────
WGS84_A = 6378137.0            # semi-major axis  (m)
WGS84_F = 1 / 298.257223563    # flattening
WGS84_B = WGS84_A * (1 - WGS84_F)  # semi-minor axis (m)


# ── Vincenty's direct formula ────────────────────────────────────────────────
def vincenty_direct(lat1: float, lon1: float, azimuth_deg: float,
                     distance_m: float) -> tuple[float, float]:
    """Return (lat2, lon2) in decimal degrees given start point, azimuth
    (clockwise from North) and surface distance on the WGS-84 ellipsoid."""
    if distance_m == 0:
        return lat1, lon1

    a, f, b = WGS84_A, WGS84_F, WGS84_B
    lat1_r = math.radians(lat1)
    lon1_r = math.radians(lon1)
    alpha1 = math.radians(azimuth_deg)
    s = distance_m

    tan_u1 = (1 - f) * math.tan(lat1_r)
    cos_u1 = 1.0 / math.sqrt(1 + tan_u1 ** 2)
    sin_u1 = tan_u1 * cos_u1

    sigma1 = math.atan2(sin_u1, cos_u1 * math.cos(alpha1))
    sin_alpha = cos_u1 * math.sin(alpha1)
    cos2_alpha = 1 - sin_alpha ** 2

    u2 = cos2_alpha * (a ** 2 - b ** 2) / b ** 2
    a_c = 1 + (u2 / 16384) * (4096 + u2 * (-768 + u2 * (320 - 175 * u2)))
    b_c = (u2 / 1024) * (256 + u2 * (-128 + u2 * (74 - 47 * u2)))

    sigma = s / (b * a_c)
    for _ in range(200):
        two_sm = 2 * sigma1 + sigma
        ds = b_c * math.sin(sigma) * (
            math.sin(two_sm) + (b_c / 4) * (
                math.cos(sigma) * (-1 + 2 * math.sin(two_sm) ** 2) -
                (b_c / 6) * math.cos(two_sm) *
                (-3 + 4 * math.sin(sigma) ** 2) * (-3 + 4 * math.sin(two_sm) ** 2)
            )
        )
        new_sigma = s / (b * a_c) + ds
        if abs(new_sigma - sigma) < 1e-12:
            break
        sigma = new_sigma

    two_sm = 2 * sigma1 + sigma
    lat2 = math.atan2(
        sin_u1 * math.cos(sigma) + cos_u1 * math.sin(sigma) * math.cos(alpha1),
        (1 - f) * math.sqrt(
            sin_alpha ** 2 + (sin_u1 * math.sin(sigma) -
             cos_u1 * math.cos(sigma) * math.cos(alpha1)) ** 2
        )
    )
    lam = math.atan2(
        math.sin(sigma) * math.sin(alpha1),
        cos_u1 * math.cos(sigma) - sin_u1 * math.sin(sigma) * math.cos(alpha1)
    )
    c = (f / 16) * cos2_alpha * (4 + f * (4 - 3 * cos2_alpha))
    L = lam - (1 - c) * f * sin_alpha * (
        sigma + c * math.sin(sigma) * (
            math.sin(two_sm) + c * math.cos(sigma) * (-1 + 2 * math.sin(two_sm) ** 2)
        )
    )
    lon2 = lon1_r + L

    return math.degrees(lat2), math.degrees(lon2)


# ── Haversine distance (for error computation) ───────────────────────────────
def haversine(lat1, lon1, lat2, lon2):
    """Return distance in metres between two lat/lon points."""
    R = 6371000  # mean Earth radius
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ── Main ─────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="Calculate object lat/lon for all rows in a sonar CSV dataset."
    )
    parser.add_argument("csv_file", help="Path to the input CSV file")
    parser.add_argument("--ship-lat", type=float, default=None,
                        help="Override vehicle latitude for all rows")
    parser.add_argument("--ship-lon", type=float, default=None,
                        help="Override vehicle longitude for all rows")
    parser.add_argument("--no-compare", action="store_true",
                        help="Skip comparison with ground-truth target_lat/target_lon")
    parser.add_argument("--limit", type=int, default=None,
                        help="Process only the first N rows (for quick testing)")
    parser.add_argument("--output", type=str, default=None,
                        help="Output CSV path (default: auto-generated in download/)")
    args = parser.parse_args()

    # ── 1. Read CSV ─────────────────────────────────────────────────────────
    if not os.path.isfile(args.csv_file):
        print(f"Error: file not found: {args.csv_file}", file=sys.stderr)
        sys.exit(1)

    rows = []
    with open(args.csv_file, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        for row in reader:
            rows.append(row)
            if args.limit and len(rows) >= args.limit:
                break

    total = len(rows)
    print(f"Loaded {total} rows from: {args.csv_file}")
    if args.limit:
        print(f"(Limited to first {args.limit} rows)")
    print()

    # ── 2. Process each row ────────────────────────────────────────────────
    results = []
    errors = []

    for i, row in enumerate(rows):
        # Ship (vehicle) position — use CSV value or user override
        v_lat = args.ship_lat if args.ship_lat is not None else float(row["vehicle_lat"])
        v_lon = args.ship_lon if args.ship_lon is not None else float(row["vehicle_lon"])
        v_heading = float(row["vehicle_heading_deg"])
        tgt_range = float(row["target_range_m"])
        tgt_az_rel = float(row["target_azimuth_deg"])   # relative to heading

        # Absolute azimuth from North (clockwise)
        abs_azimuth = v_heading + tgt_az_rel

        # Calculate object position
        calc_lat, calc_lon = vincenty_direct(v_lat, v_lon, abs_azimuth, tgt_range)

        out = {
            "image_name"      : row["image_name"],
            "object_class"    : row["object_class"],
            "vehicle_lat"     : v_lat,
            "vehicle_lon"     : v_lon,
            "vehicle_heading_deg": v_heading,
            "target_range_m"  : tgt_range,
            "target_azimuth_deg": tgt_az_rel,
            "absolute_azimuth_deg": round(abs_azimuth, 4),
            "calc_lat"        : round(calc_lat, 8),
            "calc_lon"        : round(calc_lon, 8),
        }

        # Ground-truth comparison (if available and not skipped)
        if not args.no_compare and "target_lat" in row and "target_lon" in row:
            gt_lat = float(row["target_lat"])
            gt_lon = float(row["target_lon"])
            out["gt_lat"] = gt_lat
            out["gt_lon"] = gt_lon
            err_m = haversine(calc_lat, calc_lon, gt_lat, gt_lon)
            out["error_m"] = round(err_m, 4)
            errors.append(err_m)

        # Carry forward bbox and split columns
        for col in ["bbox_xmin", "bbox_ymin", "bbox_xmax", "bbox_ymax", "split"]:
            if col in row:
                out[col] = row[col]

        results.append(out)

    # ── 3. Print summary ────────────────────────────────────────────────────
    print(f"{'='*60}")
    print(f"  RESULTS  —  {total} objects processed")
    print(f"{'='*60}")
    print(f"  {'#':<6}{'Class':<14}{'Calc Lat':<14}{'Calc Lon':<14}", end="")
    if not args.no_compare and errors:
        print(f"{'GT Lat':<14}{'GT Lon':<14}{'Error(m)':<10}")
    else:
        print()
    print(f"  {'-'*6}{'-'*14}{'-'*14}{'-'*14}", end="")
    if not args.no_compare and errors:
        print(f"{'-'*14}{'-'*14}{'-'*10}")
    else:
        print()

    # Show first 20 rows + last 5 rows
    show_indices = list(range(min(20, total)))
    if total > 25:
        show_indices += list(range(total - 5, total))
        show_indices.append(None)  # gap marker
        show_indices.sort(key=lambda x: (x is None, x))

    for idx in show_indices:
        if idx is None:
            print(f"  {'  ...':>6}"
                  f"{''}  (skipping {total - 25} middle rows)")
            continue
        r = results[idx]
        line = (f"  {idx+1:<6}{r['object_class']:<14}"
                f"{r['calc_lat']:<14}{r['calc_lon']:<14}")
        if not args.no_compare and "error_m" in r:
            line += (f"{r['gt_lat']:<14}{r['gt_lon']:<14}"
                    f"{r['error_m']:<10}")
        print(line)

    # ── 4. Error statistics ─────────────────────────────────────────────────
    if errors:
        print(f"\n{'='*60}")
        print(f"  ERROR STATISTICS  (calculated vs ground-truth)")
        print(f"{'='*60}")
        avg_err = sum(errors) / len(errors)
        max_err = max(errors)
        min_err = min(errors)
        within_1m  = sum(1 for e in errors if e <= 1.0)
        within_5m  = sum(1 for e in errors if e <= 5.0)
        within_10m = sum(1 for e in errors if e <= 10.0)
        print(f"  Mean error   : {avg_err:.4f} m")
        print(f"  Min  error   : {min_err:.4f} m")
        print(f"  Max  error   : {max_err:.4f} m")
        print(f"  Within 1 m   : {within_1m} / {len(errors)}  ({100*within_1m/len(errors):.1f}%)")
        print(f"  Within 5 m   : {within_5m} / {len(errors)}  ({100*within_5m/len(errors):.1f}%)")
        print(f"  Within 10 m  : {within_10m} / {len(errors)}  ({100*within_10m/len(errors):.1f}%)")

    # ── 5. Save output JSON ─────────────────────────────────────────────────
    # ── 5. Save output JSON ─────────────────────────────────────────────────
    out_path = args.output

    if out_path is None:
        base = os.path.splitext(os.path.basename(args.csv_file))[0]
        out_path = f"{base}_calculated.json"

    json_results = []

    for row, r in zip(rows, results):
        json_results.append({
            **row,
            "object_latitude": r["calc_lat"],
            "object_longitude": r["calc_lon"],
        })

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(json_results, f, indent=4)

    print(f"\n  Output saved to: {out_path}")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
