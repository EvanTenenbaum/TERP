/**
 * Open-source cannabis flower image pool for realistic QA/demo seeding.
 *
 * Sources: Wikimedia Commons files with free/open licenses (CC/Public Domain).
 * We keep this list local to avoid flaky network/API dependencies during seed runs.
 */

export interface OpenSourceFlowerImage {
  title: string;
  url: string;
  license: string;
  author: string;
  sourcePageUrl: string;
}

export const OPEN_SOURCE_FLOWER_FALLBACK_ENV =
  "SEED_OPEN_SOURCE_FLOWER_FALLBACK";

const FALSEY_ENV_VALUES = new Set(["0", "false", "off", "no"]);

const OPEN_SOURCE_FLOWER_IMAGES: OpenSourceFlowerImage[] = [
  {
    title: "Marijuana Buds",
    url: "https://upload.wikimedia.org/wikipedia/commons/8/8f/Marijuana_Buds.jpg",
    license: "CC BY-SA 4.0",
    author: "Efiks",
    sourcePageUrl: "https://commons.wikimedia.org/wiki/File:Marijuana_Buds.jpg",
  },
  {
    title: "Medical cannabis bud (large)",
    url: "https://upload.wikimedia.org/wikipedia/commons/a/a5/Medical-cannabis-bud-vlarge.jpg",
    license: "CC BY-SA 2.0",
    author: "Dr. Brainfish",
    sourcePageUrl:
      "https://commons.wikimedia.org/wiki/File:Medical-cannabis-bud-vlarge.jpg",
  },
  {
    title: "Macro cannabis bud",
    url: "https://upload.wikimedia.org/wikipedia/commons/1/1d/Macro_cannabis_bud.jpg",
    license: "CC BY 2.5",
    author: "yogi Bushby",
    sourcePageUrl:
      "https://commons.wikimedia.org/wiki/File:Macro_cannabis_bud.jpg",
  },
  {
    title: "Cannabis buds",
    url: "https://upload.wikimedia.org/wikipedia/commons/8/86/Cannabis_buds.jpg",
    license: "CC BY 2.0",
    author: "r0bz",
    sourcePageUrl: "https://commons.wikimedia.org/wiki/File:Cannabis_buds.jpg",
  },
  {
    title: "Flower buds of cannabis",
    url: "https://upload.wikimedia.org/wikipedia/commons/b/be/Flower_buds_of_cannabis_%28drug%29.jpg",
    license: "CC BY-SA 3.0",
    author: "Schmiddy",
    sourcePageUrl:
      "https://commons.wikimedia.org/wiki/File:Flower_buds_of_cannabis_(drug).jpg",
  },
  {
    title: "Cannabis sativa bud",
    url: "https://upload.wikimedia.org/wikipedia/commons/9/99/Cannabis_sativa_bud_%2801%29.jpg",
    license: "CC BY-SA 4.0",
    author: "Moheen Reeyad",
    sourcePageUrl:
      "https://commons.wikimedia.org/wiki/File:Cannabis_sativa_bud_(01).jpg",
  },
  {
    title: "White Tahoe Cookie",
    url: "https://upload.wikimedia.org/wikipedia/commons/b/b0/White_Tahoe_Cookie.jpg",
    license: "CC BY-SA 4.0",
    author: "Beeblebrox",
    sourcePageUrl:
      "https://commons.wikimedia.org/wiki/File:White_Tahoe_Cookie.jpg",
  },
  {
    title: "PCB top bud",
    url: "https://upload.wikimedia.org/wikipedia/commons/a/a6/PCB_top_bud.jpg",
    license: "CC BY-SA 4.0",
    author: "Beeblebrox",
    sourcePageUrl: "https://commons.wikimedia.org/wiki/File:PCB_top_bud.jpg",
  },
  {
    title: "RBOG",
    url: "https://upload.wikimedia.org/wikipedia/commons/4/4d/RBOG.jpg",
    license: "CC BY-SA 4.0",
    author: "Beeblebrox",
    sourcePageUrl: "https://commons.wikimedia.org/wiki/File:RBOG.jpg",
  },
  {
    title: "White Rhino Dub Macro",
    url: "https://upload.wikimedia.org/wikipedia/commons/e/e4/White_Rhino_Dub_Macro.JPG",
    license: "CC BY 3.0",
    author: "CannabisQ",
    sourcePageUrl:
      "https://commons.wikimedia.org/wiki/File:White_Rhino_Dub_Macro.JPG",
  },
  {
    title: "Cannabis Colors Macro",
    url: "https://upload.wikimedia.org/wikipedia/commons/6/69/Cannabis_Colors_Macro.jpg",
    license: "CC BY 3.0",
    author: "Jbarraco",
    sourcePageUrl:
      "https://commons.wikimedia.org/wiki/File:Cannabis_Colors_Macro.jpg",
  },
  {
    title: "Alaskan thunderfuck marijuana strain",
    url: "https://upload.wikimedia.org/wikipedia/commons/5/57/Alaskan_thunderfuck_marijuana_strain.jpg",
    license: "CC BY-SA 3.0",
    author: "Grospot",
    sourcePageUrl:
      "https://commons.wikimedia.org/wiki/File:Alaskan_thunderfuck_marijuana_strain.jpg",
  },
  {
    title: "Acapulco gold",
    url: "https://upload.wikimedia.org/wikipedia/commons/8/83/Acapulco_gold.jpg",
    license: "CC BY-SA 4.0",
    author: "Anargratos",
    sourcePageUrl: "https://commons.wikimedia.org/wiki/File:Acapulco_gold.jpg",
  },
  {
    title: "Super silver haze cover",
    url: "https://upload.wikimedia.org/wikipedia/commons/4/4c/Super_silver_haze_cover.jpg",
    license: "CC BY-SA 4.0",
    author: "Efiks",
    sourcePageUrl:
      "https://commons.wikimedia.org/wiki/File:Super_silver_haze_cover.jpg",
  },
  {
    title: "Super silver haze hemp",
    url: "https://upload.wikimedia.org/wikipedia/commons/d/d3/Super_silver_haze_hemp.jpg",
    license: "CC BY-SA 4.0",
    author: "Efiks",
    sourcePageUrl:
      "https://commons.wikimedia.org/wiki/File:Super_silver_haze_hemp.jpg",
  },
  {
    title: "Wiettop",
    url: "https://upload.wikimedia.org/wikipedia/commons/0/09/Wiettop.JPG",
    license: "CC BY-SA 3.0",
    author: "CborG82",
    sourcePageUrl: "https://commons.wikimedia.org/wiki/File:Wiettop.JPG",
  },
  {
    title: "ST-3 bud",
    url: "https://upload.wikimedia.org/wikipedia/commons/f/f7/ST-3-bud.jpg",
    license: "CC BY-SA 3.0",
    author: "Hupu2",
    sourcePageUrl: "https://commons.wikimedia.org/wiki/File:ST-3-bud.jpg",
  },
  {
    title: "Bubba Kush",
    url: "https://upload.wikimedia.org/wikipedia/commons/3/36/Bubba_Kush.jpg",
    license: "Public domain",
    author: "Coaster420",
    sourcePageUrl: "https://commons.wikimedia.org/wiki/File:Bubba_Kush.jpg",
  },
  {
    title: "Purple Kush",
    url: "https://upload.wikimedia.org/wikipedia/commons/1/1c/Purple_Kush.jpg",
    license: "Public domain",
    author: "Coaster420",
    sourcePageUrl: "https://commons.wikimedia.org/wiki/File:Purple_Kush.jpg",
  },
  {
    title: "White Widow",
    url: "https://upload.wikimedia.org/wikipedia/commons/3/33/White_Widow.jpg",
    license: "Public domain",
    author: "Coaster420",
    sourcePageUrl: "https://commons.wikimedia.org/wiki/File:White_Widow.jpg",
  },
  {
    title: "OG Kush",
    url: "https://upload.wikimedia.org/wikipedia/commons/3/37/OG_Kush.jpg",
    license: "Public domain",
    author: "Coaster420",
    sourcePageUrl: "https://commons.wikimedia.org/wiki/File:OG_Kush.jpg",
  },
  {
    title: "Green Crack",
    url: "https://upload.wikimedia.org/wikipedia/commons/1/1d/Green_Crack.jpg",
    license: "Public domain",
    author: "Psychonaught",
    sourcePageUrl: "https://commons.wikimedia.org/wiki/File:Green_Crack.jpg",
  },
  {
    title: "Trainwreck Strain",
    url: "https://upload.wikimedia.org/wikipedia/commons/b/b5/Trainwreck_Strain.jpg",
    license: "Public domain",
    author: "Coaster420",
    sourcePageUrl:
      "https://commons.wikimedia.org/wiki/File:Trainwreck_Strain.jpg",
  },
  {
    title: "Blue Octane",
    url: "https://upload.wikimedia.org/wikipedia/commons/1/12/Blue_Octane.jpg",
    license: "Public domain",
    author: "Coaster420",
    sourcePageUrl: "https://commons.wikimedia.org/wiki/File:Blue_Octane.jpg",
  },
  {
    title: "Afghani Kush",
    url: "https://upload.wikimedia.org/wikipedia/commons/3/37/Afghani_Kush.jpg",
    license: "Public domain",
    author: "Coaster420",
    sourcePageUrl: "https://commons.wikimedia.org/wiki/File:Afghani_Kush.jpg",
  },
];

export function pickOpenSourceFlowerImage(
  seed: number
): OpenSourceFlowerImage | null {
  if (OPEN_SOURCE_FLOWER_IMAGES.length === 0) {
    return null;
  }
  const normalized = Math.abs(Math.trunc(seed));
  const index = normalized % OPEN_SOURCE_FLOWER_IMAGES.length;
  return OPEN_SOURCE_FLOWER_IMAGES[index];
}

/**
 * Whether seeding is allowed to inject synthetic open-source fallback photos.
 *
 * Default behavior is enabled to support realistic demo/test environments.
 * Set SEED_OPEN_SOURCE_FLOWER_FALLBACK=false (or 0/off/no) to disable.
 */
export function isOpenSourceFlowerFallbackEnabled(
  rawValue: string | undefined = process.env[OPEN_SOURCE_FLOWER_FALLBACK_ENV]
): boolean {
  if (typeof rawValue !== "string" || rawValue.trim().length === 0) {
    return true;
  }

  return !FALSEY_ENV_VALUES.has(rawValue.trim().toLowerCase());
}

export function formatOpenSourceFlowerCaption(
  image: OpenSourceFlowerImage
): string {
  return `${image.title} - ${image.author} (${image.license}, Wikimedia Commons)`;
}
