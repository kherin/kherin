---
title: "How I Analyse My Trail Races with Python & Garmin GPS Data"
description: "From raw GPX files to interactive pace charts — a walkthrough of the Python pipeline I use to break down my trail running races using gpxpy, pandas, and matplotlib."
publishedAt: "2026-02-15"
tags: ["Python", "Data Science", "Trail Running", "GPS", "Pandas"]
draft: false
---

# Analysing Trail Races with Python

I'm a trail runner and a data scientist — so naturally I wrote code to analyse my own races. This post walks through the pipeline I built after the [2025 Raid West Trail](https://github.com/kherin/raid-west-trail-analysis) to compare my race performance against a previous recon run on the same course.

## The Data Source

Garmin Connect exports GPX files containing timestamped GPS coordinates, elevation, and heart rate. A single race produces roughly 5,000–15,000 trackpoints depending on duration.

```python
import gpxpy

with open('race.gpx') as f:
    gpx = gpxpy.parse(f)

points = [
    {
        'lat': pt.latitude,
        'lon': pt.longitude,
        'ele': pt.elevation,
        'time': pt.time,
    }
    for track in gpx.tracks
    for segment in track.segments
    for pt in segment.points
]
```

## Calculating Pace

Raw GPS data gives you position and time. Pace is derived from Haversine distance between consecutive points:

```python
from math import radians, sin, cos, sqrt, atan2

def haversine(p1, p2):
    R = 6371000  # Earth radius in metres
    lat1, lat2 = map(radians, [p1['lat'], p2['lat']])
    lon1, lon2 = map(radians, [p1['lon'], p2['lon']])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat/2)**2 + cos(lat1)*cos(lat2)*sin(dlon/2)**2
    return R * 2 * atan2(sqrt(a), sqrt(1 - a))

df['dist_m'] = [
    haversine(df.iloc[i-1], df.iloc[i])
    for i in range(1, len(df))
] + [0]

df['pace_min_km'] = (df['elapsed_s'].diff() / 60) / (df['dist_m'] / 1000)
```

## Elevation-Adjusted Effort

On trails, flat pace means nothing — a 7 min/km on a 400m/km climb is elite. I use the **Minetti cost function** to calculate equivalent flat pace:

```python
def minetti_cost(grade):
    """Metabolic cost relative to flat (grade as fraction, e.g. 0.3 = 30%)"""
    g = grade
    return 280.5*g**5 - 58.7*g**4 - 76.8*g**3 + 51.9*g**2 + 19.6*g + 3.6

df['grade'] = df['ele'].diff() / df['dist_m']
df['effort_factor'] = df['grade'].apply(minetti_cost) / minetti_cost(0)
df['adj_pace'] = df['pace_min_km'] / df['effort_factor']
```

## Race vs Recon Comparison

The interesting part — overlaying two GPX files on the same course:

```python
import pandas as pd
import matplotlib.pyplot as plt

fig, axes = plt.subplots(2, 1, figsize=(14, 8), sharex=True)

axes[0].plot(race['cum_km'], race['pace_min_km'],    color='#E10600', label='Race Day',   alpha=0.8)
axes[0].plot(recon['cum_km'], recon['pace_min_km'],  color='#888888', label='Recon Run', alpha=0.6)
axes[0].set_ylabel('Pace (min/km)')
axes[0].legend()
axes[0].set_title('Race vs Recon — Pace Comparison')

axes[1].fill_between(race['cum_km'], race['elevation'], alpha=0.4, color='#E10600')
axes[1].set_ylabel('Elevation (m)')
axes[1].set_xlabel('Distance (km)')
```

## Key Findings from Raid West 2025

| Segment        | Race Pace  | Recon Pace | Delta  |
|----------------|-----------|-----------|--------|
| Col de la Prise| 10:42/km  | 11:15/km  | -33s   |
| Summit plateau | 8:04/km   | 9:12/km   | -68s   |
| Final descent  | 6:31/km   | 7:10/km   | -39s   |

Race adrenaline is real — I was 8–12% faster across every segment compared to the recon run at the same perceived effort.

## What's Next

I'm building a small web dashboard to visualise these comparisons interactively. The scraper at [gtrail_data](https://github.com/kherin/gtrail_data) already pulls race results from the PowerBI dashboards used by Mauritius trail events — next step is combining that with personal GPS data for full race analysis.

---

*Follow the project on [GitHub](https://github.com/kherin/raid-west-trail-analysis) — PRs and issues welcome.*
