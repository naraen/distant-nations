Issues
--------
- [ ] Cannot click on Marshall Islands,  Kiribati etc.
- [ ] Horizontal overflow of threshold ring should on one side should wrap around to the other side.
- [x] Countries in the intersection of the two rings is black in color instead of a hatch pattern
- [ ] how to do automated tests for validating functionality
- [ ] Prevent page from scrolling past map area.  Currently page pans part map and shows a light gray background.
- [ ] Clicking on an already selected country should deselect it

Wishlist
--------
* Simplify overlays
  - English names only
* Features 
  - [x] host it somewhere
  - [x] show lat long lines
  - [x] should not color selected country. 
  - [x] change this file to markdown
  - [ ] Make slider movements discrete.  Clicking on the right/left side of the slider should move by 1 step.
  - [ ] Allow dragging of the marker for placement on another country.
  - [ ] Enable deleting a selected city
* Ideas for a different application - Create a version like sporcle quiz
  - Identify a country
  - timed activity
  - Complete the game once all countries have been identified
  - use color coding to indicate UN status
  - Show missed countries in red
* Future project
  - This person was not able to get his projec working via github pages. https://github.com/kathleengraham/visualizing-global-data-with-leaflet-js?tab=readme-ov-file.   Get it working  


Learning
--------
* Take the time to learn turf
* Take the time to learn leaflet
* Take the time to learn openstreetmap
- WGS84 format
- Why does setting fill:null on the style for the layer, prevent the click event from firing.
- Learn how to use markers.   Why does only marker show a tooltip
- Apollo dev tools

Resources
---------
geojson.io - to get lat/long for a location by clicking on the map
Leaflet.js - has tutorials 
Map tile providers - ???
For new icons - google search (marker icon maps)
  - concept : figure out icon anchor to position the icon correctly across different zoom levels
- https://osiris-indoor.github.io/index.html.   Create map for indoor buildings
- https://overpass-turbo.eu/ to write a query and generate geojson
