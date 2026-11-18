# OSRS map icons

The key icons the world map can draw, taken from the Old School RuneScape Wiki's
[Category:Map icons](https://oldschool.runescape.wiki/w/Category:Map_icons) on
2026-10-30 with the wiki's API (one PNG per file, named after the wiki page:
`Bank icon.png` → `bank.png`).

They are offered to the map as `osrs/<name>`, next to the original RSC icons in
the folder above, so a name or a point can use either set:

    node scripts/world-map-markers.js add-icon osrs/bank 300 500

They are Jagex's artwork, served by the wiki for reference and reuse on
RuneScape wikis; they are here for the private dev world's staff map
(`::map`), not for redistribution. If this project ever goes public with its
map assets, this folder needs checking against the wiki's licensing first.

Sizes are whatever the wiki has (most are 12-16px, a few larger); the client
draws an icon at its natural size, 1:1 with the map's pixels at zoom 1.
