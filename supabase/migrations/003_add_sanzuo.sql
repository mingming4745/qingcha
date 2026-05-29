-- 补丁：添加散座虚拟房间 + 关联散座套餐
-- 在 Supabase SQL Editor 中执行

-- 1. 添加散座房间
INSERT INTO rooms (name, capacity_min, capacity_max, type, hourly_rate, image_url)
VALUES ('散座', 1, 4, 'open', 0, '/images/rooms/sanzuo.jpg')
ON CONFLICT DO NOTHING;

-- 2. 关联「非包间散座」套餐到散座房间
-- 先获取散座房间 id 和散座套餐 id
DO $$
DECLARE
  sanzuo_room_id INT;
  sanzuo_pkg_id INT;
BEGIN
  SELECT id INTO sanzuo_room_id FROM rooms WHERE name = '散座' LIMIT 1;
  SELECT id INTO sanzuo_pkg_id FROM packages WHERE name = '非包间散座' LIMIT 1;

  IF sanzuo_room_id IS NOT NULL AND sanzuo_pkg_id IS NOT NULL THEN
    INSERT INTO package_rooms (package_id, room_id)
    VALUES (sanzuo_pkg_id, sanzuo_room_id)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
