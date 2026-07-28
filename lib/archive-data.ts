export type World = {
  id: string;
  slug: string;
  title: string;
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
  source: "anilist" | "igdb";
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

const animeCover = "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx16498-hbZ0b5Z29Frs.jpg";
const animeBanner = "https://s4.anilist.co/file/anilistcdn/media/anime/banner/16498-R7m8D7kKMUCM.jpg";

export const worlds: World[] = [
  {
    id: "world-aot",
    slug: "titan-archive",
    title: "Titan Archive",
    type: "anime",
    year: 2013,
    genres: ["Action", "Drama", "Mystery"],
    cover: animeCover,
    banner: animeBanner,
    progress: 68,
    fragments: 12,
    collectibleCount: 18,
    restoredCount: 12,
    description: "Những ký ức sau bức tường, các biểu tượng quân đoàn và nhân vật đã định hình một kỷ nguyên.",
    source: "anilist",
  },
  {
    id: "world-nier",
    slug: "android-requiem",
    title: "Android Requiem",
    type: "game",
    year: 2017,
    genres: ["Action RPG", "Sci-fi"],
    cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co5pcj.jpg",
    banner: "https://images.igdb.com/igdb/image/upload/t_screenshot_huge/sc8m9k.jpg",
    progress: 42,
    fragments: 7,
    collectibleCount: 16,
    restoredCount: 7,
    description: "Một kho lưu trữ u buồn về android, máy móc và câu hỏi làm nên nhân tính.",
    source: "igdb",
  },
  {
    id: "world-persona",
    slug: "velvet-midnight",
    title: "Velvet Midnight",
    type: "game",
    year: 2016,
    genres: ["JRPG", "Social sim"],
    cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1nic.jpg",
    banner: "https://images.igdb.com/igdb/image/upload/t_screenshot_huge/sc6m5f.jpg",
    progress: 25,
    fragments: 4,
    collectibleCount: 20,
    restoredCount: 5,
    description: "Mặt nạ, những mối liên kết và các hiện vật bí ẩn của một thành phố về đêm.",
    source: "igdb",
  },
  {
    id: "world-ghibli",
    slug: "spirit-skies",
    title: "Spirit Skies",
    type: "anime",
    year: 2001,
    genres: ["Fantasy", "Adventure"],
    cover: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx199-H6HjZAq2gYFQ.jpg",
    banner: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/199-HXoIA94FBOCo.jpg",
    progress: 81,
    fragments: 16,
    collectibleCount: 14,
    restoredCount: 11,
    description: "Những linh hồn, địa điểm và khoảnh khắc dịu dàng được lưu lại như các mảnh ký ức.",
    source: "anilist",
  },
  {
    id: "world-valor",
    slug: "protocol-zero",
    title: "Protocol Zero",
    type: "game",
    year: 2020,
    genres: ["Tactical", "Shooter"],
    cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co2mvt.jpg",
    banner: "https://images.igdb.com/igdb/image/upload/t_screenshot_huge/sc8unf.jpg",
    progress: 53,
    fragments: 9,
    collectibleCount: 22,
    restoredCount: 12,
    description: "Hồ sơ chiến thuật của các đặc vụ, vũ khí và biểu tượng từ một tương lai gần.",
    source: "igdb",
  },
  {
    id: "world-ninja",
    slug: "hidden-leaf-records",
    title: "Hidden Leaf Records",
    type: "anime",
    year: 2002,
    genres: ["Action", "Adventure"],
    cover: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx20-YJvLbgJQPCoI.jpg",
    banner: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/20-HHxhPj5JD13a.jpg",
    progress: 36,
    fragments: 6,
    collectibleCount: 24,
    restoredCount: 9,
    description: "Một biên niên sử về ý chí, nhẫn thuật và những mối liên kết vượt qua nhiều thế hệ.",
    source: "anilist",
  },
];

export const challenges: DemoChallenge[] = [
  {
    id: "challenge-hint-1",
    mode: "hint_ladder",
    label: "Hint Ladder",
    worldId: "world-nier",
    prompt: "Archive World nào đang được mô tả?",
    answer: "NieR Automata",
    aliases: ["Nier Automata", "NieR:Automata", "Nier"],
    hints: ["Phát hành năm 2017", "Thuộc thể loại Action RPG", "Nhân vật chính là android", "Được phát triển bởi PlatinumGames"],
  },
  {
    id: "challenge-crop-1",
    mode: "cropped_memory",
    label: "Cropped Memory",
    worldId: "world-aot",
    prompt: "Ký ức hình ảnh này thuộc Archive World nào?",
    answer: "Attack on Titan",
    aliases: ["Shingeki no Kyojin", "AOT"],
    hints: ["Mở rộng vùng ký ức", "Giảm lớp nhiễu", "Hiển thị gần toàn bộ"],
    image: animeBanner,
  },
  {
    id: "challenge-character-1",
    mode: "character_trail",
    label: "Character Trail",
    worldId: "world-nier",
    prompt: "Nhân vật nào để lại dấu vết này?",
    answer: "2B",
    aliases: ["YoRHa No.2 Type B", "YoRHa 2B"],
    hints: ["Là một android chiến đấu", "Thuộc đơn vị YoRHa", "Đồng hành cùng 9S", "Thường che mắt bằng visor"],
  },
  {
    id: "challenge-asset-1",
    mode: "asset_link",
    label: "Asset Link",
    worldId: "world-persona",
    prompt: "Biểu tượng mặt nạ này liên kết với Archive World nào?",
    answer: "Persona 5",
    aliases: ["P5"],
    hints: ["Một JRPG lấy bối cảnh Tokyo"],
    options: ["Persona 5", "Final Fantasy VII", "NieR Automata", "Resident Evil 2"],
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
    id: "challenge-audio-1",
    mode: "anime_opening_guess",
    label: "Anime Opening Guess",
    worldId: "world-aot",
    prompt: "Đoán anime từ đoạn opening được cấp phép.",
    answer: "Attack on Titan",
    aliases: ["Shingeki no Kyojin", "AOT"],
    hints: ["Anime hành động", "Bối cảnh phía sau các bức tường"],
    media: {
      type: "audio",
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      start: 0,
      duration: 30,
      visualMode: "audio_player",
      maxReplays: 1,
      fullPlaybackAllowed: true,
      officialSourceUrl: "https://www.soundhelix.com/audio-examples",
      attribution: "Demo royalty-free audio by SoundHelix. Nội dung demo không đại diện opening thật.",
    },
  },
  {
    id: "challenge-video-1",
    mode: "anime_video_guess",
    label: "Anime Video Guess",
    worldId: "world-ghibli",
    prompt: "Đoán Archive World từ đoạn video có âm thanh.",
    answer: "Spirit Skies",
    aliases: ["Spirited Away"],
    hints: ["Một thế giới linh hồn", "Nhân vật chính bước vào một nơi xa lạ"],
    media: {
      type: "video",
      url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
      start: 0,
      duration: 15,
      visualMode: "covered",
      maxReplays: 1,
      fullPlaybackAllowed: true,
      officialSourceUrl: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video",
      attribution: "CC0 demo video distributed by MDN for media-player testing.",
    },
  },
];

export const collectibles = [
  { id: "c1", worldId: "world-nier", name: "YoRHa Unit 2B", type: "Character", rarity: "legendary", cost: 10, unlocked: true, image: "https://images.igdb.com/igdb/image/upload/t_1080p/sc8m9k.jpg" },
  { id: "c2", worldId: "world-nier", name: "Virtuous Contract", type: "Weapon", rarity: "rare", cost: 5, unlocked: true, image: "https://images.igdb.com/igdb/image/upload/t_1080p/sc8m9l.jpg" },
  { id: "c3", worldId: "world-aot", name: "Wings of Freedom", type: "Symbol", rarity: "epic", cost: 8, unlocked: true, image: animeBanner },
  { id: "c4", worldId: "world-persona", name: "Phantom Mask", type: "Item", rarity: "rare", cost: 5, unlocked: false, image: "https://images.igdb.com/igdb/image/upload/t_1080p/sc6m5f.jpg" },
  { id: "c5", worldId: "world-ghibli", name: "Spirit Token", type: "Special moment", rarity: "secret", cost: 10, unlocked: false, image: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/199-HXoIA94FBOCo.jpg" },
  { id: "c6", worldId: "world-valor", name: "Protocol Blade", type: "Weapon", rarity: "uncommon", cost: 3, unlocked: true, image: "https://images.igdb.com/igdb/image/upload/t_1080p/sc8unf.jpg" },
];

export const leaderboard = [
  { rank: 1, name: "archive.miko", title: "Perfect Restorer", score: 18750, streak: 21 },
  { rank: 2, name: "9S_memory", title: "Signal Hunter", score: 16940, streak: 14 },
  { rank: 3, name: "velvet.room", title: "Midnight Curator", score: 15320, streak: 18 },
  { rank: 4, name: "cloudlimit", title: "Rare Collector", score: 14210, streak: 9 },
  { rank: 5, name: "leaf.archive", title: "Trail Reader", score: 13880, streak: 12 },
];

export const modes = [
  { id: "hint_ladder", label: "Hint Ladder", icon: "01", description: "Mở từng tầng dữ kiện. Càng ít hint, điểm càng cao.", reward: "1–3 fragments" },
  { id: "cropped_memory", label: "Cropped Memory", icon: "02", description: "Khôi phục một hình ảnh từ blur, crop và silhouette.", reward: "1–3 fragments" },
  { id: "character_trail", label: "Character Trail", icon: "03", description: "Lần theo mô tả, quan hệ và dấu vết của nhân vật.", reward: "1–3 fragments" },
  { id: "asset_link", label: "Asset Link", icon: "04", description: "Liên kết weapon, symbol hoặc location với đúng thế giới.", reward: "1–3 fragments" },
  { id: "wrong_information", label: "Wrong Information", icon: "05", description: "Phát hiện dữ kiện sai giữa bốn hồ sơ lưu trữ.", reward: "1–3 fragments" },
  { id: "anime_opening_guess", label: "Opening Guess", icon: "06", description: "Nghe preview tối đa 30 giây từ nguồn được cấp phép.", reward: "1–3 fragments" },
  { id: "anime_video_guess", label: "Video Guess", icon: "07", description: "Xem video nguyên gốc với chế độ blur hoặc covered.", reward: "1–3 fragments" },
];

