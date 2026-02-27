# Rescue Data

Label (class) = Response
- Team A: Medical

- Team B: Utility

- Team C: Supply/Rescue


Features (inputs)

- InjurySeverity (0–5): reported injury seriousness

- WaterDepthCm (0–100): water level at location

- PowerOutage (0/1): whether power is out

- RoadBlocked (0/1): whether roads are blocked

- PeopleStranded (0–10): number of people unable to leave

- DistanceKm (0–25): distance from dispatch center

| CallID | InjurySeverity | WaterDepthCm | PowerOutage | RoadBlocked | PeopleStranded | DistanceKm | Response |
|---:|---:|---:|---:|---:|---:|---:|---|
| C1 | 4 | 8 | 0 | 0 | 1 | 6.2 | Team A (Medical) |
| C2 | 1 | 12 | 1 | 0 | 0 | 3.5 | Team B (Utility) |
| C3 | 2 | 55 | 0 | 1 | 5 | 11.0 | Team C (Supply/Rescue) |
| C4 | 3 | 30 | 1 | 0 | 2 | 14.8 | Team A (Medical) |
| C5 | 0 | 70 | 1 | 1 | 6 | 18.3 | Team C (Supply/Rescue) |
| C6 | 2 | 5 | 1 | 1 | 1 | 9.1 | Team B (Utility) |
| C7 | 5 | 40 | 0 | 1 | 0 | 7.4 | Team A (Medical) |
| C8 | 1 | 25 | 0 | 0 | 4 | 4.6 | Team C (Supply/Rescue) |
| C9 | 3 | 15 | 1 | 1 | 3 | 20.0 | Team C (Supply/Rescue) |
| C10 | 2 | 10 | 0 | 0 | 0 | 16.5 | Team B (Utility) |

With this information, you will now MANUALLY make the decision tree and predict the answer!