# v1.7.3 Graphical Refinement & Stability Fixes

This track covers the version bump to 1.7.3 following the graphical glitches and startup flicker fixes.

## Completed Work (Reflected in this Release)
- Implement 'ready-to-show' in main process to prevent startup flicker
- Add 'disable-gpu-rasterization' switch to fix horizontal bar artifacts
- Add user setting to toggle Hardware Acceleration (GPU)
- Set explicit lineHeight and optimize CSS containment in Terminal component
- Ensure terminal fit calculations run on DOM ready with RAF
