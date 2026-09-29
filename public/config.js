(function (root) {
  const config = {
    width: 400,
    height: 570,
    dangerLine: 86,
    // Replace image paths here to use your own SVGs, transparent PNGs, or WebPs.
    levels: [
      {
        name: "Brown",
        rarity: "Common",
        radius: 22,
        color: "#423014",
        image: "/assets/poop-1.svg",
      },
      {
        name: "Green",
        rarity: "Uncommon",
        radius: 32,
        color: "#2a6c21",
        image: "/assets/poop-2.svg",
      },
      {
        name: "Red",
        rarity: "Rare",
        radius: 46,
        color: "#87271f",
        image: "/assets/poop-3.svg",
      },
      {
        name: "Black",
        rarity: "Epic",
        radius: 63,
        color: "#222020",
        image: "/assets/poop-4.svg",
      },
      {
        name: "Gold",
        rarity: "Legendary",
        radius: 83,
        color: "#cd9336",
        image: "/assets/poop-5.svg",
      },
      {
        name: "Rainbow",
        rarity: "Mythic",
        radius: 108,
        color: "#9f37ff",
        image: "/assets/poop-6.svg",
      },
      {
        name: "Crystal",
        rarity: "Ascendant",
        radius: 114,
        color: "#cbb5ff",
        image: "/assets/poop-crystal.svg",
      },
      {
        name: "Plasma",
        rarity: "Transcendent",
        radius: 120,
        color: "#76f3df",
        image: "/assets/poop-plasma.svg",
      },
      {
        name: "Void",
        rarity: "Eternal",
        radius: 126,
        color: "#ad82ff",
        image: "/assets/poop-void.svg",
      },
      {
        name: "Cosmic",
        rarity: "Cosmic",
        radius: 132,
        color: "#fff0b7",
        image: "/assets/poop-cosmic.svg",
      },
    ],
  };
  if (typeof module !== "undefined") module.exports = config;
  else root.POOP = config;
})(typeof window !== "undefined" ? window : globalThis);
