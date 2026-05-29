-- QingCha seed data
-- Run this AFTER 001_schema.sql in Supabase SQL Editor

-- Rooms
INSERT INTO rooms (name, capacity_min, capacity_max, type, hourly_rate, image_url) VALUES
('望岫', 2, 5, 'small', 60, '/images/rooms/wangxiu.jpg'),
('栖棠', 2, 5, 'small', 60, '/images/rooms/qitang.jpg'),
('拾光', 2, 5, 'small', 60, '/images/rooms/shiguang.jpg'),
('听澜', 6, 12, 'large', 200, '/images/rooms/tinglan.jpg'),
('散座', 1, 4, 'open', 0, '/images/rooms/sanzuo.jpg');

-- Packages
INSERT INTO packages (name, price, original_price, duration_hours, max_guests, tea_count, snack_dry_count, snack_pastry_count, includes_parking, parking_hours, spend_threshold) VALUES
('2-5人品茗套餐', 138, NULL, 2, 5, 1, 2, 2, true, 2, 300),
('6-12人会议套餐', 688, NULL, 2, 12, 2, 3, 3, true, 2, 1288),
('非包间散座', 68, NULL, 2, 4, 1, 1, 1, false, 0, NULL);

-- Package rooms (品茗 -> 望岫/栖棠/拾光, 会议 -> 听澜)
INSERT INTO package_rooms (package_id, room_id) VALUES
(1, 1), (1, 2), (1, 3),
(2, 4),
(3, 5);

-- Products
INSERT INTO products (name, category, price, unit, image_url) VALUES
('云南普洱', 'tea', 128, '壶', '/images/products/tea/puer.jpg'),
('福鼎白茶', 'tea', 98, '壶', '/images/products/tea/baicha.jpg'),
('正山小种', 'tea', 88, '壶', '/images/products/tea/zhongshan.jpg'),
('铁观音', 'tea', 78, '壶', '/images/products/tea/tieguanyin.jpg'),
('龙井绿茶', 'tea', 88, '壶', '/images/products/tea/longjing.jpg'),
('茉莉花茶', 'tea', 58, '壶', '/images/products/tea/molihua.jpg'),
('大红袍', 'tea', 138, '壶', '/images/products/tea/dahongpao.jpg'),
('金骏眉', 'tea', 118, '壶', '/images/products/tea/jinjunmei.jpg'),
('琥珀核桃', 'snack', 28, '份', '/images/products/snack/hetao.jpg'),
('盐焗腰果', 'snack', 32, '份', '/images/products/snack/yaoguo.jpg'),
('话梅花生', 'snack', 18, '份', '/images/products/snack/huasheng.jpg'),
('开心果', 'snack', 35, '份', '/images/products/snack/kaixinguo.jpg'),
('绿豆糕', 'snack', 22, '份', '/images/products/snack/lvdougao.jpg'),
('蛋黄酥', 'snack', 25, '份', '/images/products/snack/danhuangsu.jpg'),
('凤梨酥', 'snack', 22, '份', '/images/products/snack/fenglisu.jpg'),
('桂花糕', 'snack', 20, '份', '/images/products/snack/guihuagao.jpg'),
('担担面', 'meal', 28, '份', '/images/products/meal/dandanmian.jpg'),
('红油抄手', 'meal', 26, '份', '/images/products/meal/chaoshou.jpg'),
('卤肉饭', 'meal', 32, '份', '/images/products/meal/luroufan.jpg'),
('酸辣粉', 'meal', 22, '份', '/images/products/meal/suanlafen.jpg'),
('小笼包', 'meal', 18, '笼', '/images/products/meal/xiaolongbao.jpg');
