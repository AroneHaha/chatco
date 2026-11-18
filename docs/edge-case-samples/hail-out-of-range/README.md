# Hail: commuter outside every unit's 1 km radius

A commuter can only hail a unit when they are within 1 km of it. These samples show the commuter dashboard when the nearest unit is 1.68 km away.

| File | Shows |
|---|---|
| `01-hail-too-far-mobile.png` | Phone. The hail button is disabled and reads **Too far**, with a **?** badge. The unit and its route are still shown on the map. |
| `02-hail-hint-mobile.png` | Phone. Tapping **?** opens **Outside service radius**: "Move within 1 km of a conductor unit to see ETA and hail. Vehicle locations are still visible on the map." |
| `03-unit-radius-mobile.png` | Phone. The unit's 1 km pickup radius, with the commuter outside it, 1.68 km away. |
| `04-hail-hint-desktop.png` | Desktop. The hail button reads **Outside Service Radius**, with the same explanation open. |
| `05-unit-radius-desktop.png` | Desktop. The unit's 1 km pickup radius, with the commuter outside it. |

## About these samples

- **Mock data.** The commuter (Lianne Dizon, Regular) and the unit (plate MCK 1024) are made up. The commuter and unit positions are two real points on the McArthur Highway route line. Everything else on screen is the real app UI.
- **Added labels.** In `03` and `05`, the blue circle outline and the labels ("1 km pickup radius", "1.68 km away") were added for these screenshots. The outline traces the app's own radius circle, which the app draws very faintly when the commuter is outside it. `01` shows that faint circle as the app draws it.
- **Nothing was changed.** No data was saved and no code was edited to take these screenshots.
