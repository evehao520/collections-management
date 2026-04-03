-- 收藏品資料表
create table items (
  id bigint generated always as identity primary key,
  ip text not null,
  character text not null,
  type text not null default '其他',
  brand text default '',
  series text default '',
  status text not null default '已入手',
  condition text default '全新',
  price integer default 0,
  date text default '',
  note text default '',
  emoji text default '⭐',
  created_at timestamptz default now()
);

-- IP 列表資料表
create table ip_list (
  id bigint generated always as identity primary key,
  name text not null unique,
  created_at timestamptz default now()
);

-- 照片資料表（多張對應一件收藏）
create table photos (
  id bigint generated always as identity primary key,
  item_id bigint references items(id) on delete cascade,
  url text not null,
  created_at timestamptz default now()
);

-- 預設 IP 資料
insert into ip_list (name) values
  ('咒術迴戰'),
  ('原神'),
  ('SPY×FAMILY'),
  ('Hololive');

-- 開放存取（之後可加登入機制）
alter table items enable row level security;
alter table ip_list enable row level security;
alter table photos enable row level security;

create policy "public read items" on items for select using (true);
create policy "public insert items" on items for insert with check (true);
create policy "public update items" on items for update using (true);
create policy "public delete items" on items for delete using (true);

create policy "public read ip_list" on ip_list for select using (true);
create policy "public insert ip_list" on ip_list for insert with check (true);
create policy "public update ip_list" on ip_list for update using (true);
create policy "public delete ip_list" on ip_list for delete using (true);

create policy "public read photos" on photos for select using (true);
create policy "public insert photos" on photos for insert with check (true);
create policy "public delete photos" on photos for delete using (true);
