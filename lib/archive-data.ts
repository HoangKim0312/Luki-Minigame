export type World = {
  id: string;
  sourceId: string;
  slug: string;
  title: string;
  alternativeTitles: string[];
  type: "anime" | "game";
  year: number;
  genres: string[];
  cover: string;
  banner: string;
  progress: number;
  fragments: number;
  collectibleCount: number;
  restoredCount: number;
  description: string;
  source: "anilist" | "igdb" | "animethemes";
};

export type ChallengeMode =
  | "hint_ladder"
  | "cropped_memory"
  | "character_trail"
  | "asset_link"
  | "wrong_information"
  | "anime_opening_guess"
  | "game_soundtrack_guess"
  | "anime_video_guess";

export type DemoChallenge = {
  id: string;
  mode: ChallengeMode;
  label: string;
  worldId: string;
  prompt: string;
  answer: string;
  aliases: string[];
  hints: string[];
  options?: string[];
  image?: string;
  media?: {
    type: "audio" | "video";
    url: string;
    start: number;
    duration: number;
    visualMode: "visible" | "blurred" | "covered" | "audio_player";
    maxReplays: number;
    fullPlaybackAllowed: boolean;
    officialSourceUrl: string;
    attribution: string;
  };
};

export type Collectible = {
  id: string;
  worldId: string;
  name: string;
  type: string;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary" | "secret";
  cost: number;
  unlocked: boolean;
  image: string;
};

const aotCover = "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx16498-buvcRTBx4NSm.jpg";
const aotBanner = "https://s4.anilist.co/file/anilistcdn/media/anime/banner/16498-8jpFCOcDmneX.jpg";

// Đây là catalog fallback đã xác minh từ AniList/IGDB. Dữ liệu runtime được lấy từ
// Supabase qua Railway; fallback chỉ giúp GitHub Pages không trắng khi API tạm lỗi.
export const worlds: World[] = [
  {
    id: "world-aot",
    sourceId: "16498",
    slug: "attack-on-titan",
    title: "Attack on Titan",
    alternativeTitles: ["Shingeki no Kyojin", "進撃の巨人"],
    type: "anime",
    year: 2013,
    genres: ["Action", "Drama", "Fantasy", "Mystery"],
    cover: aotCover,
    banner: aotBanner,
    progress: 0,
    fragments: 0,
    collectibleCount: 0,
    restoredCount: 0,
    description: "Metadata và hình ảnh từ AniList. Nội dung collectible được đồng bộ từ danh sách nhân vật của nguồn.",
    source: "anilist",
  },
  {
    id: "world-nier",
    sourceId: "11208",
    slug: "nier-automata",
    title: "NieR:Automata",
    alternativeTitles: ["Nier Automata"],
    type: "game",
    year: 2017,
    genres: ["Action RPG", "Science fiction"],
    cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co5pcj.jpg",
    banner: "https://images.igdb.com/igdb/image/upload/t_screenshot_huge/sc8m9k.jpg",
    progress: 0,
    fragments: 0,
    collectibleCount: 0,
    restoredCount: 0,
    description: "Metadata và remote image từ IGDB. Chưa tự tạo collectible khi nguồn chưa cung cấp dữ liệu nhân vật phù hợp.",
    source: "igdb",
  },
  {
    id: "world-persona",
    sourceId: "11156",
    slug: "persona-5",
    title: "Persona 5",
    alternativeTitles: ["P5"],
    type: "game",
    year: 2016,
    genres: ["Role-playing", "Social simulation"],
    cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1nic.jpg",
    banner: "https://images.igdb.com/igdb/image/upload/t_screenshot_huge/sc6m5f.jpg",
    progress: 0,
    fragments: 0,
    collectibleCount: 0,
    restoredCount: 0,
    description: "Metadata và remote image từ IGDB.",
    source: "igdb",
  },
  {
    id: "world-ghibli",
    sourceId: "199",
    slug: "spirited-away",
    title: "Spirited Away",
    alternativeTitles: ["Sen to Chihiro no Kamikakushi", "千と千尋の神隠し"],
    type: "anime",
    year: 2001,
    genres: ["Adventure", "Drama", "Fantasy", "Supernatural"],
    cover: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx199-sWefXJvXkDOb.jpg",
    banner: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/199-Sm2RU5PSqw7T.jpg",
    progress: 0,
    fragments: 0,
    collectibleCount: 0,
    restoredCount: 0,
    description: "Metadata và hình ảnh từ AniList.",
    source: "anilist",
  },
  {
    id: "world-valor",
    sourceId: "126459",
    slug: "valorant",
    title: "VALORANT",
    alternativeTitles: ["Valorant"],
    type: "game",
    year: 2020,
    genres: ["Shooter", "Tactical"],
    cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co2mvt.jpg",
    banner: "https://images.igdb.com/igdb/image/upload/t_screenshot_huge/sc8unf.jpg",
    progress: 0,
    fragments: 0,
    collectibleCount: 0,
    restoredCount: 0,
    description: "Metadata và remote image từ IGDB.",
    source: "igdb",
  },
  {
    id: "world-ninja",
    sourceId: "20",
    slug: "naruto",
    title: "Naruto",
    alternativeTitles: ["NARUTO", "NARUTO -ナルト-"],
    type: "anime",
    year: 2002,
    genres: ["Action", "Adventure", "Comedy", "Drama", "Fantasy"],
    cover: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx20-dE6UHbFFg1A5.jpg",
    banner: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/20-HHxhPj5JD13a.jpg",
    progress: 0,
    fragments: 0,
    collectibleCount: 0,
    restoredCount: 0,
    description: "Metadata và hình ảnh từ AniList.",
    source: "anilist",
  },
];

// Chỉ giữ challenge văn bản/hình ảnh có dữ liệu khớp. Audio/video không có asset
// hợp lệ sẽ không được giả lập bằng media ngẫu nhiên.
export const challenges: DemoChallenge[] = [
  {
    id: "challenge-hint-1",
    mode: "hint_ladder",
    label: "Hint Ladder",
    worldId: "world-nier",
    prompt: "Game nào đang được mô tả?",
    answer: "NieR Automata",
    aliases: ["Nier Automata", "NieR:Automata"],
    hints: ["Phát hành năm 2017", "Thuộc thể loại Action RPG", "Nhân vật chính là android", "Được phát triển bởi PlatinumGames"],
  },
  {
    id: "challenge-crop-1",
    mode: "cropped_memory",
    label: "Cropped Memory",
    worldId: "world-aot",
    prompt: "Hình ảnh này thuộc anime nào?",
    answer: "Attack on Titan",
    aliases: ["Shingeki no Kyojin", "AOT"],
    hints: ["Mở rộng vùng hình ảnh", "Giảm blur", "Hiển thị gần toàn bộ ảnh"],
    image: aotBanner,
  },
  {
    id: "challenge-character-1",
    mode: "character_trail",
    label: "Character Trail",
    worldId: "world-nier",
    prompt: "Nhân vật nào đang được mô tả?",
    answer: "2B",
    aliases: ["YoRHa No.2 Type B", "YoRHa 2B"],
    hints: ["Là một android chiến đấu", "Thuộc đơn vị YoRHa", "Đồng hành cùng 9S", "Thường che mắt bằng visor"],
  },
  {
    id: "challenge-asset-1",
    mode: "asset_link",
    label: "Asset Link",
    worldId: "world-nier",
    prompt: "Virtuous Contract thuộc game nào?",
    answer: "NieR Automata",
    aliases: ["Nier Automata", "NieR:Automata"],
    hints: ["Đây là vũ khí gắn với 2B"],
    options: ["NieR:Automata", "Persona 5", "Final Fantasy VII", "Resident Evil 2"],
  },
  {
    id: "challenge-wrong-1",
    mode: "wrong_information",
    label: "Wrong Information",
    worldId: "world-nier",
    prompt: "Chọn thông tin sai về NieR:Automata.",
    answer: "Được phát triển bởi Ubisoft",
    aliases: [],
    hints: ["Hãy tập trung vào studio phát triển"],
    options: ["Phát hành năm 2017", "Có các android 2B và 9S", "Là một Action RPG", "Được phát triển bởi Ubisoft"],
  },
  {
    id: "animethemes-5279",
    mode: "anime_opening_guess",
    label: "Anime Opening Guess",
    worldId: "world-aot",
    prompt: "Đoán anime từ opening này.",
    answer: "Attack on Titan",
    aliases: ["Shingeki no Kyojin", "AOT", "進撃の巨人"],
    hints: ["Anime phát hành năm 2013", "Opening do Linked Horizon trình bày"],
    media: {
      type: "video",
      url: "https://v.animethemes.moe/ShingekiNoKyojin-OP1.webm",
      start: 0,
      duration: 30,
      visualMode: "visible",
      maxReplays: 0,
      fullPlaybackAllowed: true,
      officialSourceUrl: "https://animethemes.moe/anime/shingeki_no_kyojin",
      attribution: "Guren no Yumiya · Linked Horizon · Attack on Titan OP1. Metadata và remote video từ AnimeThemes.moe.",
    },
  },
];

// Collectible runtime đến từ Supabase. Không dùng item hoặc ảnh giả làm fallback.
export const collectibles: Collectible[] = [];
export const leaderboard: Array<{ rank: number; name: string; title: string; score: number; streak: number }> = [];

export const modes = [
  { id: "hint_ladder", label: "Hint Ladder", icon: "01", description: "Mở từng tầng dữ kiện. Càng ít hint, điểm càng cao.", reward: "1–3 fragments", available: true },
  { id: "cropped_memory", label: "Cropped Memory", icon: "02", description: "Khôi phục hình ảnh từ blur, crop và silhouette.", reward: "1–3 fragments", available: true },
  { id: "character_trail", label: "Character Trail", icon: "03", description: "Lần theo mô tả, quan hệ và dấu vết của nhân vật.", reward: "1–3 fragments", available: true },
  { id: "asset_link", label: "Asset Link", icon: "04", description: "Liên kết weapon, symbol hoặc location với đúng thế giới.", reward: "1–3 fragments", available: true },
  { id: "wrong_information", label: "Wrong Information", icon: "05", description: "Phát hiện dữ kiện sai giữa bốn thông tin.", reward: "1–3 fragments", available: true },
  { id: "anime_opening_guess", label: "Opening / Ending Guess", icon: "06", description: "Video opening/ending thật từ AnimeThemes API, không tách audio.", reward: "1–3 fragments", available: true },
  { id: "game_soundtrack_guess", label: "Game Soundtrack Guess", icon: "07", description: "Chỉ mở khi soundtrack khớp game và nguồn phát đã được duyệt.", reward: "Đang chờ media hợp lệ", available: false },
  { id: "anime_video_guess", label: "Anime Video Guess", icon: "08", description: "Chỉ mở khi video đúng nội dung và quyền phát đã được duyệt.", reward: "Đang chờ media hợp lệ", available: false },
] as const;
