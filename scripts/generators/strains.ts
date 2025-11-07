/**
 * Strain generation with normalization
 */

import { toTitleCase } from "./utils.js";

export interface StrainData {
  id?: number;
  name: string;
  standardizedName: string;
  aliases: string; // JSON array
  category: string;
  description: string;
  createdAt: Date;
}

/**
 * Generate 50 popular strains with normalization
 */
export function generateStrains(): StrainData[] {
  const strainDetails = [
    {
      name: "Blue Dream",
      category: "hybrid",
      description: "Popular sativa-dominant hybrid",
    },
    {
      name: "OG Kush",
      category: "hybrid",
      description: "Classic hybrid with earthy notes",
    },
    {
      name: "Sour Diesel",
      category: "sativa",
      description: "Energizing sativa with diesel aroma",
    },
    {
      name: "Girl Scout Cookies",
      category: "hybrid",
      description: "Sweet hybrid with high THC",
    },
    {
      name: "Granddaddy Purple",
      category: "indica",
      description: "Relaxing indica with grape flavor",
    },
    {
      name: "Jack Herer",
      category: "sativa",
      description: "Uplifting sativa named after cannabis activist",
    },
    {
      name: "White Widow",
      category: "hybrid",
      description: "Balanced hybrid with white crystals",
    },
    {
      name: "AK-47",
      category: "hybrid",
      description: "Potent hybrid with complex aroma",
    },
    {
      name: "Northern Lights",
      category: "indica",
      description: "Classic indica for relaxation",
    },
    {
      name: "Pineapple Express",
      category: "hybrid",
      description: "Tropical sativa-dominant hybrid",
    },
    {
      name: "Gorilla Glue #4",
      category: "hybrid",
      description: "Heavy-hitting hybrid",
    },
    {
      name: "Gelato",
      category: "hybrid",
      description: "Dessert-like hybrid strain",
    },
    {
      name: "Wedding Cake",
      category: "hybrid",
      description: "Sweet indica-dominant hybrid",
    },
    {
      name: "Zkittlez",
      category: "indica",
      description: "Fruity indica with candy flavor",
    },
    {
      name: "Durban Poison",
      category: "sativa",
      description: "Pure African sativa",
    },
    {
      name: "Bubba Kush",
      category: "indica",
      description: "Heavy indica for sleep",
    },
    {
      name: "Strawberry Cough",
      category: "sativa",
      description: "Strawberry-flavored sativa",
    },
    {
      name: "Purple Haze",
      category: "sativa",
      description: "Legendary sativa strain",
    },
    {
      name: "Trainwreck",
      category: "hybrid",
      description: "Fast-acting hybrid",
    },
    {
      name: "Green Crack",
      category: "sativa",
      description: "Energizing sativa",
    },
    {
      name: "Chemdawg",
      category: "hybrid",
      description: "Diesel-scented hybrid",
    },
    {
      name: "Super Silver Haze",
      category: "sativa",
      description: "Award-winning sativa",
    },
    {
      name: "LA Confidential",
      category: "indica",
      description: "Smooth indica from LA",
    },
    { name: "Maui Wowie", category: "sativa", description: "Hawaiian sativa" },
    {
      name: "Blueberry",
      category: "indica",
      description: "Berry-flavored indica",
    },
    { name: "Lemon Haze", category: "sativa", description: "Citrus sativa" },
    {
      name: "Sunset Sherbet",
      category: "indica",
      description: "Sweet indica hybrid",
    },
    {
      name: "Do-Si-Dos",
      category: "indica",
      description: "Cookie-flavored indica",
    },
    {
      name: "Tangie",
      category: "sativa",
      description: "Tangerine-scented sativa",
    },
    {
      name: "Cherry Pie",
      category: "hybrid",
      description: "Sweet cherry hybrid",
    },
    {
      name: "Headband",
      category: "hybrid",
      description: "Pressure-relieving hybrid",
    },
    { name: "Fire OG", category: "hybrid", description: "Potent OG variant" },
    {
      name: "Skywalker OG",
      category: "indica",
      description: "Indica-dominant OG",
    },
    { name: "Tahoe OG", category: "hybrid", description: "Mountain-grown OG" },
    {
      name: "Cookies and Cream",
      category: "hybrid",
      description: "Dessert hybrid",
    },
    { name: "Mimosa", category: "sativa", description: "Citrus sativa hybrid" },
    { name: "Runtz", category: "hybrid", description: "Candy-flavored hybrid" },
    {
      name: "Biscotti",
      category: "indica",
      description: "Cookie-flavored indica",
    },
    {
      name: "Forbidden Fruit",
      category: "indica",
      description: "Tropical indica",
    },
    {
      name: "Tropicana Cookies",
      category: "sativa",
      description: "Citrus sativa",
    },
    { name: "Slurricane", category: "indica", description: "Fruity indica" },
    {
      name: "MAC (Miracle Alien Cookies)",
      category: "hybrid",
      description: "Balanced hybrid",
    },
    {
      name: "Dosidos",
      category: "indica",
      description: "Cookie-lineage indica",
    },
    {
      name: "Wedding Crasher",
      category: "hybrid",
      description: "Wedding Cake variant",
    },
    {
      name: "Ice Cream Cake",
      category: "indica",
      description: "Dessert indica",
    },
    { name: "Jungle Boys", category: "hybrid", description: "Premium hybrid" },
    { name: "Cereal Milk", category: "hybrid", description: "Sweet hybrid" },
    { name: "Jealousy", category: "hybrid", description: "Gelato variant" },
    { name: "Gushers", category: "indica", description: "Fruity indica" },
    { name: "Papaya", category: "indica", description: "Tropical indica" },
    // Additional creative strains for variety (25+ more)
    {
      name: "Purple Punch",
      category: "indica",
      description: "Grape and berry indica",
    },
    {
      name: "Lava Cake",
      category: "indica",
      description: "Chocolate mint indica",
    },
    {
      name: "Banana OG",
      category: "hybrid",
      description: "Tropical banana hybrid",
    },
    {
      name: "Strawberry Banana",
      category: "hybrid",
      description: "Fruity dessert hybrid",
    },
    {
      name: "Pink Rozay",
      category: "indica",
      description: "Floral berry indica",
    },
    {
      name: "London Pound Cake",
      category: "indica",
      description: "Sweet berry indica",
    },
    {
      name: "Grape Ape",
      category: "indica",
      description: "Grape-flavored indica",
    },
    {
      name: "Mango Kush",
      category: "indica",
      description: "Tropical mango indica",
    },
    {
      name: "Watermelon Zkittlez",
      category: "indica",
      description: "Fruity watermelon indica",
    },
    {
      name: "Apple Fritter",
      category: "hybrid",
      description: "Sweet apple hybrid",
    },
    {
      name: "Peanut Butter Breath",
      category: "hybrid",
      description: "Nutty dessert hybrid",
    },
    {
      name: "Sherblato",
      category: "hybrid",
      description: "Sherbet gelato hybrid",
    },
    {
      name: "Zkittlez Cake",
      category: "hybrid",
      description: "Candy cake hybrid",
    },
    { name: "Moonbow", category: "hybrid", description: "Colorful hybrid" },
    {
      name: "Sundae Driver",
      category: "hybrid",
      description: "Creamy dessert hybrid",
    },
    {
      name: "Gary Payton",
      category: "hybrid",
      description: "Premium cookies hybrid",
    },
    {
      name: "Kush Mints",
      category: "hybrid",
      description: "Minty kush hybrid",
    },
    { name: "Motorbreath", category: "indica", description: "Diesel indica" },
    { name: "Jet Fuel", category: "sativa", description: "High-energy sativa" },
    { name: "Clementine", category: "sativa", description: "Citrus sativa" },
    {
      name: "Super Lemon Haze",
      category: "sativa",
      description: "Lemon sativa",
    },
    {
      name: "Sour Tangie",
      category: "sativa",
      description: "Tangerine sativa",
    },
    {
      name: "Amnesia Haze",
      category: "sativa",
      description: "Classic haze sativa",
    },
    {
      name: "Candyland",
      category: "sativa",
      description: "Sweet candy sativa",
    },
    { name: "Golden Goat", category: "sativa", description: "Tropical sativa" },
    { name: "Chocolope", category: "sativa", description: "Chocolate sativa" },
    {
      name: "Ghost Train Haze",
      category: "sativa",
      description: "Potent haze sativa",
    },
    {
      name: "Hawaiian Snow",
      category: "sativa",
      description: "Tropical sativa",
    },
  ];

  return strainDetails.map((strain, index) => {
    const standardizedName = toTitleCase(strain.name);
    return {
      name: strain.name,
      standardizedName: standardizedName,
      aliases: JSON.stringify([
        strain.name.toLowerCase().replace(/ /g, ""),
        strain.name.replace(/ /g, "-"),
      ]),
      category: toTitleCase(strain.category),
      description: strain.description,
      createdAt: new Date(2023, 11, 1 + index),
    };
  });
}
