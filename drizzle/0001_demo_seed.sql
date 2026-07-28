INSERT OR IGNORE INTO users (id, email, role) VALUES
  ('guest-demo', 'guest@archive.local', 'user'),
  ('user-miko', 'miko@example.invalid', 'user'),
  ('user-9s', '9s@example.invalid', 'user');

INSERT OR IGNORE INTO user_profiles (id, user_id, username, streak, archive_score) VALUES
  ('profile-guest-demo', 'guest-demo', 'Guest Restorer', 0, 0),
  ('profile-user-miko', 'user-miko', 'archive.miko', 21, 18750),
  ('profile-user-9s', 'user-9s', '9S_memory', 14, 16940);

INSERT OR IGNORE INTO media_sources (id, name, adapter, attribution, terms_url) VALUES
  ('source-anilist', 'AniList', 'anilist', 'Metadata and remote images from AniList', 'https://anilist.co/terms'),
  ('source-igdb', 'IGDB', 'igdb', 'Metadata and remote images from IGDB', 'https://www.igdb.com/api');

INSERT OR IGNORE INTO media_worlds
  (id, source, source_id, type, title, slug, alternative_titles, cover_image_url, banner_image_url, description, genres, release_year, attribution, license_note, metadata, status)
VALUES
  ('world-aot', 'anilist', '16498', 'anime', 'Titan Archive', 'titan-archive', '["Attack on Titan","Shingeki no Kyojin"]', 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx16498-hbZ0b5Z29Frs.jpg', 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/16498-R7m8D7kKMUCM.jpg', 'Những ký ức sau bức tường.', '["Action","Drama","Mystery"]', 2013, 'AniList', 'Remote metadata only', '{}', 'published'),
  ('world-nier', 'igdb', '11208', 'game', 'Android Requiem', 'android-requiem', '["NieR:Automata"]', 'https://images.igdb.com/igdb/image/upload/t_cover_big/co5pcj.jpg', 'https://images.igdb.com/igdb/image/upload/t_screenshot_huge/sc8m9k.jpg', 'Một kho lưu trữ u buồn về android.', '["Action RPG","Sci-fi"]', 2017, 'IGDB', 'Remote metadata only', '{}', 'published'),
  ('world-persona', 'igdb', '11156', 'game', 'Velvet Midnight', 'velvet-midnight', '["Persona 5"]', 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1nic.jpg', 'https://images.igdb.com/igdb/image/upload/t_screenshot_huge/sc6m5f.jpg', 'Mặt nạ và những mối liên kết.', '["JRPG","Social sim"]', 2016, 'IGDB', 'Remote metadata only', '{}', 'published'),
  ('world-ghibli', 'anilist', '199', 'anime', 'Spirit Skies', 'spirit-skies', '["Spirited Away"]', 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx199-H6HjZAq2gYFQ.jpg', 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/199-HXoIA94FBOCo.jpg', 'Những linh hồn và khoảnh khắc dịu dàng.', '["Fantasy","Adventure"]', 2001, 'AniList', 'Remote metadata only', '{}', 'published'),
  ('world-valor', 'igdb', '126459', 'game', 'Protocol Zero', 'protocol-zero', '["Valorant"]', 'https://images.igdb.com/igdb/image/upload/t_cover_big/co2mvt.jpg', 'https://images.igdb.com/igdb/image/upload/t_screenshot_huge/sc8unf.jpg', 'Hồ sơ chiến thuật của các đặc vụ.', '["Tactical","Shooter"]', 2020, 'IGDB', 'Remote metadata only', '{}', 'published'),
  ('world-ninja', 'anilist', '20', 'anime', 'Hidden Leaf Records', 'hidden-leaf-records', '["Naruto"]', 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx20-YJvLbgJQPCoI.jpg', 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/20-HHxhPj5JD13a.jpg', 'Biên niên sử về ý chí và nhẫn thuật.', '["Action","Adventure"]', 2002, 'AniList', 'Remote metadata only', '{}', 'published');

INSERT OR IGNORE INTO collectibles
  (id, world_id, name, slug, type, description, remote_image_url, source, rarity, fragment_requirement, unlock_requirement, metadata, status)
VALUES
  ('c1', 'world-nier', 'YoRHa Unit 2B', 'yorha-unit-2b', 'character', 'Android chiến đấu của YoRHa.', 'https://images.igdb.com/igdb/image/upload/t_1080p/sc8m9k.jpg', 'igdb', 'legendary', 10, '{"type":"fragment"}', '{}', 'active'),
  ('c2', 'world-nier', 'Virtuous Contract', 'virtuous-contract', 'weapon', 'Thanh kiếm ký ức.', 'https://images.igdb.com/igdb/image/upload/t_1080p/sc8m9l.jpg', 'igdb', 'rare', 5, '{"type":"fragment"}', '{}', 'active'),
  ('c3', 'world-aot', 'Wings of Freedom', 'wings-of-freedom', 'symbol', 'Biểu tượng của những người tìm tự do.', 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/16498-R7m8D7kKMUCM.jpg', 'anilist', 'epic', 8, '{"type":"fragment"}', '{}', 'active'),
  ('c4', 'world-persona', 'Phantom Mask', 'phantom-mask', 'item', 'Một chiếc mặt nạ đánh thức bản ngã.', 'https://images.igdb.com/igdb/image/upload/t_1080p/sc6m5f.jpg', 'igdb', 'rare', 5, '{"type":"fragment"}', '{}', 'active'),
  ('c5', 'world-ghibli', 'Spirit Token', 'spirit-token', 'special_moment', 'Một mảnh ký ức từ cõi linh hồn.', 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/199-HXoIA94FBOCo.jpg', 'anilist', 'secret', 10, '{"type":"fragment"}', '{}', 'active'),
  ('c6', 'world-valor', 'Protocol Blade', 'protocol-blade', 'weapon', 'Một vũ khí từ giao thức chiến thuật.', 'https://images.igdb.com/igdb/image/upload/t_1080p/sc8unf.jpg', 'igdb', 'uncommon', 3, '{"type":"fragment"}', '{}', 'active');

INSERT OR IGNORE INTO challenges
  (id, world_id, game_mode, prompt, answer_type, correct_answer, base_score, reward_config, visual_mode, max_replays, time_limit_seconds, status)
VALUES
  ('challenge-hint-1', 'world-nier', 'hint_ladder', 'Archive World nào đang được mô tả?', 'text', 'NieR Automata', 1000, '{"fragments":3}', NULL, 1, 45, 'active'),
  ('challenge-crop-1', 'world-aot', 'cropped_memory', 'Ký ức hình ảnh này thuộc Archive World nào?', 'text', 'Attack on Titan', 1000, '{"fragments":3}', 'blurred', 1, 45, 'active'),
  ('challenge-character-1', 'world-nier', 'character_trail', 'Nhân vật nào để lại dấu vết này?', 'text', '2B', 1000, '{"fragments":3}', NULL, 1, 45, 'active'),
  ('challenge-asset-1', 'world-persona', 'asset_link', 'Biểu tượng mặt nạ này liên kết với Archive World nào?', 'multiple_choice', 'Persona 5', 1000, '{"fragments":3}', NULL, 1, 45, 'active'),
  ('challenge-wrong-1', 'world-nier', 'wrong_information', 'Chọn thông tin sai về NieR:Automata.', 'multiple_choice', 'Được phát triển bởi Ubisoft', 1000, '{"fragments":3}', NULL, 1, 45, 'active'),
  ('challenge-audio-1', 'world-aot', 'anime_opening_guess', 'Đoán anime từ đoạn opening được cấp phép.', 'text', 'Attack on Titan', 1000, '{"fragments":3}', 'audio_player', 1, 45, 'active'),
  ('challenge-video-1', 'world-ghibli', 'anime_video_guess', 'Đoán Archive World từ đoạn video có âm thanh.', 'text', 'Spirit Skies', 1000, '{"fragments":3}', 'covered', 1, 45, 'active');

INSERT OR IGNORE INTO daily_challenges (id, challenge_date, timezone, reward_config, status)
VALUES ('daily-demo', date('now'), 'UTC', '{"fragments":10,"badge":"Daily Signal"}', 'published');

INSERT OR IGNORE INTO daily_challenge_items (daily_challenge_id, challenge_id, position) VALUES
  ('daily-demo', 'challenge-hint-1', 1),
  ('daily-demo', 'challenge-crop-1', 2),
  ('daily-demo', 'challenge-character-1', 3),
  ('daily-demo', 'challenge-asset-1', 4),
  ('daily-demo', 'challenge-wrong-1', 5);
