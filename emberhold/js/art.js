// 美術：手繪素材放在 assets/，出處見 CREDITS.md
const Art = {
  src: key => `assets/${key}.webp`,
  img: (key, cls = '') => `<img class="em ${cls}" src="assets/${key}.webp" alt="" draggable="false">`,
};
