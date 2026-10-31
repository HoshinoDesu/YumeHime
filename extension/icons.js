(() => {
  const paths = {
  "grip": "<circle cx=\"9\" cy=\"5\" r=\"1\"/><circle cx=\"15\" cy=\"5\" r=\"1\"/><circle cx=\"9\" cy=\"12\" r=\"1\"/><circle cx=\"15\" cy=\"12\" r=\"1\"/><circle cx=\"9\" cy=\"19\" r=\"1\"/><circle cx=\"15\" cy=\"19\" r=\"1\"/>",
  "close": "<path d=\"m6 6 12 12M18 6 6 18\"/>",
  "lock": "<rect x=\"5\" y=\"10\" width=\"14\" height=\"11\" rx=\"2\"/><path d=\"M8 10V7a4 4 0 0 1 8 0v3m-4 5v2\"/>",
  "unlock": "<rect x=\"5\" y=\"10\" width=\"14\" height=\"11\" rx=\"2\"/><path d=\"M8 10V7a4 4 0 0 1 7.5-2m-3.5 10v2\"/>",
  "reset": "<path d=\"M3 10a9 9 0 1 1 2.6 8.4M3 4v6h6\"/>",
  "gear": "<path d=\"M19.39,8.94 L19.81,10.25 L21.85,10.28 L21.85,13.72 L19.81,13.75 L19.39,15.06 L18.75,16.29 L20.18,17.75 L17.75,20.18 L16.29,18.75 L15.06,19.39 L13.75,19.81 L13.72,21.85 L10.28,21.85 L10.25,19.81 L8.94,19.39 L7.71,18.75 L6.25,20.18 L3.82,17.75 L5.25,16.29 L4.61,15.06 L4.19,13.75 L2.15,13.72 L2.15,10.28 L4.19,10.25 L4.61,8.94 L5.25,7.71 L3.82,6.25 L6.25,3.82 L7.71,5.25 L8.94,4.61 L10.25,4.19 L10.28,2.15 L13.72,2.15 L13.75,4.19 L15.06,4.61 L16.29,5.25 L17.75,3.82 L20.18,6.25 L18.75,7.71 Z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/>",
  "resize": "<path d=\"m8 20 12-12m-5 12 5-5\"/>",
  "play": "<path d=\"m8 5 11 7-11 7Z\"/>",
  "pause": "<path d=\"M8 5v14M16 5v14\"/>",
  "type": "<path d=\"m3 18 5-12 5 12M5 14h6m5-3c4-2 6 0 5 3v4m0-5c-7-1-7 6 0 4\"/>",
  "book": "<path d=\"M12 5c-3-2-6-2-10-1v15c4-1 7-1 10 1 3-2 6-2 10-1V4c-4-1-7-1-10 1Zm0 0v15\"/>",
  "arrow": "<path d=\"M4 12h16m-6-6 6 6-6 6\"/>",
  "chevron": "<path d=\"m6 9 6 6 6-6\"/>",
  "back": "<path d=\"m14 6-6 6 6 6\"/>",
  "upload": "<path d=\"M12 16V3m-5 5 5-5 5 5M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4\"/>",
  "download": "<path d=\"M12 3v13m-5-5 5 5 5-5M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4\"/>",
  "save": "<path d=\"m5 12 4 4L19 6\"/>",
  "plus": "<path d=\"M12 5v14M5 12h14\"/>",
  "trash": "<path d=\"M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7\"/>",
  "link": "<path d=\"m10 13 4-4m-5 7-2 2a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 0 2-2a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0\"/>",
  "moon": "<path d=\"M20 14.2A8.5 8.5 0 0 1 9.8 4 8.5 8.5 0 1 0 20 14.2Z\"/><path d=\"m18 2 .8 2.2L21 5l-2.2.8L18 8l-.8-2.2L15 5l2.2-.8Z\"/>"
};
  const svg = name => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[name]}</svg>`;
  globalThis.YumeHimeIcons = { svg };
  for (const element of document.querySelectorAll("[data-icon]")) element.innerHTML = svg(element.dataset.icon);
})();
