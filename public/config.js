(function (root) {
  const config = {
    width: 400,
    height: 570,
    dangerLine: 86,
    // Replace image paths here to use your own transparent PNGs or WebPs.
    levels: [
      {
        name: "Brown",
        radius: 22,
        color: "#614321",
        image: "/assets/poop-1.png",
      },
      {
        name: "Green",
        radius: 32,
        color: "#527b25",
        image: "/assets/poop-2.png",
      },
      {
        name: "Red",
        radius: 46,
        color: "#c82218",
        image: "/assets/poop-3.png",
      },
      {
        name: "Black",
        radius: 63,
        color: "#191919",
        image: "/assets/poop-4.png",
      },
      {
        name: "Gold",
        radius: 83,
        color: "#e9b51e",
        image: "/assets/poop-5.png",
      },
      {
        name: "Rainbow",
        radius: 108,
        color: "#cd85b4",
        image: "/assets/poop-6.png",
      },
    ],
  };
  if (typeof module !== "undefined") module.exports = config;
  else root.POOP = config;
})(typeof window !== "undefined" ? window : globalThis);
